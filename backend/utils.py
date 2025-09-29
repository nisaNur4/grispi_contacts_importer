from __future__ import annotations
import re
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional
import pandas as pd
import json
from datetime import datetime
from werkzeug.utils import secure_filename
import os

DATA_DIR = Path("data")
UPLOAD_DIR = DATA_DIR / "uploads"
EXPORT_DIR = DATA_DIR / "exports"
for p in [UPLOAD_DIR, EXPORT_DIR]:
    p.mkdir(parents=True, exist_ok=True)

STANDARD_FIELDS = [
    "first_name",
    "last_name",
    "email",
    "phone",
    "company",
    "title",
    "notes",
]

STANDARD_FIELDS_BY_TYPE = {
    "contact": STANDARD_FIELDS,
    "ticket": [
        "subject",
        "description",
        "priority",
        "status",
        "requester_email",
        "assignee",
        "created_at",
    ],
    "organization": [
        "name",
        "domain",
        "phone",
        "address",
        "notes",
        "created_at",
    ],
}

TURKISH_GUESSES = {
    "ad": "first_name",
    "adi": "first_name",
    "isim": "first_name",
    "soyad": "last_name",
    "soyadi": "last_name",
    "e-posta": "email",
    "eposta": "email",
    "email": "email",
    "mail": "email",
    "telefon": "phone",
    "tel": "phone",
    "gsm": "phone",
    "firma": "company",
    "şirket": "company",
    "unvan": "title",
    "görev": "title",
    "not": "notes",
    "açıklama": "notes",
}

EMAIL_REGEX = re.compile(r"[^@]+@[^@]+\.[^@]+")
PHONE_REGEX = re.compile(r"^\+?[1-9]\d{1,14}$")

def normalize_phone(phone: Any) -> Optional[str]:
    if not phone:
        return None
    s = str(phone).strip()
    s = re.sub(r"[^0-9+]", "", s)
    if s.startswith("+"):
        return s if PHONE_REGEX.match(s) else None
    digits = re.sub(r"\D", "", s)
    if digits.startswith("0"):
        digits = digits.lstrip("0")
    if len(digits) == 10:
        digits = "90" + digits
    elif len(digits) == 11 and digits.startswith("90") is False:
        pass
    elif len(digits) > 11 and digits.startswith("90") is False:
        pass
    if not digits.startswith("90") and len(digits) == 10:
        digits = "90" + digits
    normalized = "+" + digits
    return normalized if PHONE_REGEX.match(normalized) else None

def save_upload(contents: bytes, filename: str) -> str:
    sec_filename = secure_filename(filename)
    filepath = UPLOAD_DIR / sec_filename
    with open(filepath, "wb") as f:
        f.write(contents)
    return str(filepath)

def _read_dataframe(filepath: str, sheet_name: Optional[str]) -> tuple[pd.DataFrame, str, List[str]]:
    path = Path(filepath)
    suffix = path.suffix.lower()
    if suffix in {".xlsx", ".xls"}:
        xls = pd.ExcelFile(filepath)
        sheets = list(xls.sheet_names)
        used_sheet = sheet_name if (sheet_name and sheet_name in sheets) else (sheets[0] if sheets else None)
        if used_sheet is None:
            return pd.DataFrame(), "", sheets
        df = pd.read_excel(xls, sheet_name=used_sheet, dtype=str)
        return df, used_sheet, sheets
    elif suffix == ".csv":
        df = pd.read_csv(filepath, dtype=str, keep_default_na=False)
        return df, "CSV", ["CSV"]
    else:
        raise ValueError("Unsupported file type. Only .xlsx, .xls, .csv are supported.")

def preview_excel(filepath: str, sheet_name: Optional[str] = None) -> Tuple[str, List[str], List[str], List[Dict[str, Any]]]:
    df, used_sheet, sheets = _read_dataframe(filepath, sheet_name)
    if used_sheet == "":
        return "", sheets, [], []
    df = df.fillna('')
    columns = [str(col) for col in df.columns.tolist()]
    rows = df.head(5).to_dict('records')
    return used_sheet, sheets, columns, rows

def suggest_mapping(columns: List[str]) -> Dict[str, str]:
    def normalize(s: str) -> str:
        s = s.lower().strip()
        tr_map = str.maketrans({
            'ş':'s','ç':'c','ğ':'g','ı':'i','ö':'o','ü':'u',
            '-':'',' ':'','_':'','/':'','\\':'','(': '', ')':'', '.':'', ',':'', ':':'',';':'','"':'','\'':'',
        })
        s = s.translate(tr_map)
        return s

    mapping: Dict[str, str] = {}
    normalized_to_std = {
        'firstname': 'first_name',
        'name': 'first_name',
        'lastname': 'last_name',
        'surname': 'last_name',
        'eposta': 'email',
        'email': 'email',
        'mail': 'email',
        'telefon': 'phone',
        'phone': 'phone',
        'tel': 'phone',
        'gsm': 'phone',
        'company': 'company',
        'firma': 'company',
        'sirket': 'company',
        'title': 'title',
        'unvan': 'title',
        'gorev': 'title',
        'note': 'notes',
        'notes': 'notes',
        'aciklama': 'notes',
    }

    for col in columns:
        raw = str(col)
        col_lower = raw.lower().strip()
        if col_lower in TURKISH_GUESSES:
            mapping[raw] = TURKISH_GUESSES[col_lower]
            continue

        n = normalize(raw)
        if n in normalized_to_std:
            mapping[raw] = normalized_to_std[n]
            continue
        if re.search(r'^first(name)?$', n):
            mapping[raw] = 'first_name'
        elif re.search(r'^last(name)?$', n):
            mapping[raw] = 'last_name'
        elif re.search(r'email|eposta|mail', n):
            mapping[raw] = 'email'
        elif re.search(r'telefon|phone|tel|gsm', n):
            mapping[raw] = 'phone'
        elif re.search(r'company|firma|sirket', n):
            mapping[raw] = 'company'
        elif re.search(r'title|unvan|gorev', n):
            mapping[raw] = 'title'
        elif re.search(r'note|notes|aciklama', n):
            mapping[raw] = 'notes'

    return mapping

def apply_mapping(df: pd.DataFrame, mapping: Dict[str, str], import_type: str = "contact") -> Tuple[list, Dict]:
    records = []
    report = {"rows": [], "summary": {}}
    seen_emails = set()

    std_fields = STANDARD_FIELDS_BY_TYPE.get(import_type, STANDARD_FIELDS)
    mapped_df = pd.DataFrame(columns=std_fields)
    for excel_col, std_field in mapping.items():
        if excel_col in df.columns:
            mapped_df[std_field] = df[excel_col].astype(str)
            mapped_df[std_field] = mapped_df[std_field].replace('nan', '').str.strip()

    for idx, item in mapped_df.iterrows():
        status = "ok"
        missing_required = []
        errors = []

        if import_type == "contact":
            email_val = item.get("email")
            phone_val = item.get("phone")
            # En az bir iletişim alanı zorunlu: email veya telefon
            if not email_val and not phone_val:
                status = "missing_required"
                missing_required.append("email_or_phone")
            elif email_val and not EMAIL_REGEX.match(str(email_val)):
                status = "invalid_email"
                errors.append("email_format")

        if item.get("phone"):
            norm_phone = normalize_phone(item["phone"])
            if not PHONE_REGEX.match(norm_phone or ""):
                errors.append("phone_format")
                item["phone"] = None
            else:
                item["phone"] = norm_phone

        if import_type == "contact":
            if item.get("email") and item["email"] in seen_emails:
                status = "duplicate"
                errors.append("duplicate_email")
            else:
                if item.get("email"):
                    seen_emails.add(item["email"])
        
        report["rows"].append({
            "row": int(idx) + 2,
            "status": status,
            "missing": missing_required,
            "errors": errors,
        })

        if status == "ok":
            records.append(item.to_dict())

    total = len(df)
    report["summary"] = {
        "total": total,
        "success": len(records),
        "errors": total - len(records),
    }
    return records, report

def export_json(records: list[dict]) -> str:
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    filepath = EXPORT_DIR / f"contacts_{timestamp}.json"
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=4)
    return str(filepath)

def export_csv(records: list[dict]) -> str:
    if not records:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        filepath = EXPORT_DIR / f"contacts_{timestamp}.csv"
        pd.DataFrame().to_csv(filepath, index=False)
        return str(filepath)
    df = pd.DataFrame(records)
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    filepath = EXPORT_DIR / f"contacts_{timestamp}.csv"
    df.to_csv(filepath, index=False)
    return str(filepath)