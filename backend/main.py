from __future__ import annotations
import os
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, Query, Response, Request
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
from database import Base, engine, get_db
from models import Template, ImportJob, Contact
from schemas import TemplateCreate, TemplateOut, PreviewOut, TransformRequest, TransformResult, ImportJobOut
from crud import create_template as crud_create_template, get_template_by_name, list_templates, create_job, update_job, bulk_insert_contacts, get_job
from utils import save_upload, preview_excel, suggest_mapping, apply_mapping, export_json, export_csv, UPLOAD_DIR, EXPORT_DIR, _read_dataframe, STANDARD_FIELDS, STANDARD_FIELDS_BY_TYPE
import pandas as pd
from fastapi.concurrency import run_in_threadpool
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
from settings import settings

app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION)

@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or os.urandom(8).hex()
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=(settings.cors_origins or ["*"]),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Veri tabanı tablolarını oluştur
Base.metadata.create_all(bind=engine)

@app.get("/", tags=["meta"])
def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "endpoints": [
            "/",
            "/health",
            "/upload",
            "/templates [GET, POST]",
            "/transform/{job_id}",
            "/jobs/{job_id}",
            "/contacts",
            "/exports/{filename}",
        ],
    }

@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)

@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}

@app.post("/upload", response_model=PreviewOut, tags=["import"])
async def upload_excel(
    file: UploadFile = File(...),
    sheet: Optional[str] = Query(None, description="Önizleme için sheet adı (opsiyonel)"),
    db: Session = Depends(get_db)
):
    if not file.filename.lower().endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(status_code=400, detail="Sadece .xlsx/.xls/.csv dosyaları desteklenir.")

    contents = await file.read()
    try:
        if len(contents) > settings.MAX_UPLOAD_MB * 1024 * 1024:
            raise HTTPException(status_code=413, detail=f"Dosya boyutu {settings.MAX_UPLOAD_MB}MB sınırını aşıyor.")
        saved_path = await run_in_threadpool(save_upload, contents, file.filename)
        saved_name = Path(saved_path).name
        job = await run_in_threadpool(create_job, db, saved_name)
        
        used_sheet, sheets, columns, rows = await run_in_threadpool(
            preview_excel, saved_path, sheet
        )
        
        return PreviewOut(
            sheet=used_sheet,
            sheets=sheets,
            columns=columns,
            rows=rows,
            job_id=job.id
        )

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"Dosya bulunamadı: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dosya işlenirken bir hata oluştu: {e}")

@app.get("/preview/{job_id}", response_model=PreviewOut, tags=["import"])
async def get_preview(job_id: int, sheet: Optional[str] = Query(None, description="Önizleme için sheet adı (opsiyonel)"), db: Session = Depends(get_db)):
    job = get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job bulunamadı.")
    file_path = UPLOAD_DIR / job.filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Yüklenen dosya bulunamadı.")
    try:
        used_sheet, sheets, columns, rows = await run_in_threadpool(preview_excel, str(file_path), sheet)
        return PreviewOut(
            sheet=used_sheet,
            sheets=sheets,
            columns=columns,
            rows=rows,
            job_id=job.id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ön izleme alınırken bir hata oluştu: {e}")

@app.get("/templates", response_model=List[TemplateOut], tags=["templates"])
def get_templates(db: Session = Depends(get_db)):
    return list_templates(db)

@app.post("/templates", status_code=201, tags=["templates"])
def create_template_endpoint(template: TemplateCreate, db: Session = Depends(get_db)):
    existing = get_template_by_name(db, template.name)
    if existing:
        raise HTTPException(status_code=409, detail="Bu isimde bir şablon zaten mevcut.")
    return crud_create_template(db, template.name, template.column_map)

@app.get("/templates/fields", tags=["templates"])
def get_standard_fields(type: str = Query("contact", pattern="^(contact|ticket|organization)$")):
    fields = STANDARD_FIELDS_BY_TYPE.get(type, STANDARD_FIELDS)
    return {"fields": fields, "type": type}

@app.post("/suggest-mapping", tags=["import"])
def suggest_mapping_endpoint(columns: List[str]):
    mapping = suggest_mapping(columns)
    return {"mapping": mapping}

@app.post("/transform/{job_id}", response_model=TransformResult, tags=["import"])
async def transform_data(
    job_id: int,
    body: TransformRequest,
    db: Session = Depends(get_db)
):
    job = get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job bulunamadı.")
    
    file_path = UPLOAD_DIR / job.filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Yüklenen dosya bulunamadı.")

    try:
        df, used_sheet, _= await run_in_threadpool(_read_dataframe, str(file_path), body.sheet)
        
        mapping=body.mapping
        if body.template_name:
            tpl=get_template_by_name(db, body.template_name)
            if not tpl:
                raise HTTPException(status_code=404, detail="Şablon bulunamadı.")
            mapping= tpl.column_map
        if not mapping:
            auto_mapping = await run_in_threadpool(suggest_mapping, df.columns.tolist())
            if not auto_mapping:
                raise HTTPException(status_code=400, detail="Eşleştirme verilmedi ve otomatik tahmin yapılamadı. Lütfen bir şablon veya eşleştirme sağlayın.")
            mapping=auto_mapping

        records, report=await run_in_threadpool(apply_mapping, df, mapping, body.import_type)

        export_path = None
        if body.save_mode== "json":
            export_path =await run_in_threadpool(export_json, records)
        elif body.save_mode== "sqlite":
            insertion_result= await run_in_threadpool(bulk_insert_contacts, db, records)
            export_path=f"sqlite: {insertion_result['success']} kayıt eklendi."
        elif body.save_mode == "csv":
            export_path= await run_in_threadpool(export_csv, records)
        
        total=len(df)
        success= report["summary"]["success"]
        errors= report["summary"]["errors"]

        update_job(
            db,
            job,
            status="done",
            total=total,
            success_count=success,
            error_count=errors,
            report=report
        )
        return TransformResult(
            total=total,
            success=success,
            errors=errors,
            report=report,
            export_path=export_path
        )
    
    except Exception as e:
        update_job(db, job, status="failed")
        raise HTTPException(status_code=500, detail=f"İşlem sırasında bir hata oluştu: {e}")

@app.get("/exports/{filename}", tags=["export"])
def download_export(filename: str):
    safe_name = Path(filename).name
    file_path = EXPORT_DIR / safe_name
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Dosya bulunamadı.")
    suffix = file_path.suffix.lower()
    media_type = "application/json" if suffix == ".json" else ("text/csv" if suffix == ".csv" else "application/octet-stream")
    return FileResponse(path=str(file_path), filename=safe_name, media_type=media_type)

@app.get("/jobs/{job_id}", response_model=ImportJobOut, tags=["import"])
def get_job_status(job_id: int, db: Session = Depends(get_db)):
    job = get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job bulunamadı.")
    return job

@app.get("/contacts", tags=["contacts"])
def list_contacts(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    q: Optional[str] = Query(None, description="Arama: ad, soyad, e-posta, telefon, şirket"),
    sort: Optional[str] = Query("created_at", description="Sıralama alanı: created_at, first_name, last_name, email"),
    order: Optional[str] = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    query = db.query(Contact)
    if q:
        like = f"%{q}%"
        query = query.filter(
            (Contact.first_name.ilike(like)) |
            (Contact.last_name.ilike(like)) |
            (Contact.email.ilike(like)) |
            (Contact.phone.ilike(like)) |
            (Contact.company.ilike(like))
        )
    sortable = {
        "created_at": Contact.created_at,
        "first_name": Contact.first_name,
        "last_name": Contact.last_name,
        "email": Contact.email,
    }
    sort_col = sortable.get(sort or "created_at", Contact.created_at)
    query = query.order_by(sort_col.desc() if (order or "desc") == "desc" else sort_col.asc())

    total = query.count()
    rows = query.offset(offset).limit(limit).all()
    items = [{
        "id": c.id,
        "first_name": c.first_name,
        "last_name": c.last_name,
        "email": c.email,
        "phone": c.phone,
        "company": c.company,
        "title": c.title,
        "notes": c.notes,
        "created_at": c.created_at,
    } for c in rows]
    return {"items": items, "count": total, "offset": offset, "limit": limit}