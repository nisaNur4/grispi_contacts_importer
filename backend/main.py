from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
import io
import json
from typing import List, Dict, Any, Optional
import sqlite3
from datetime import datetime
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Grispi Contacts Importer", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def init_db():
    conn = sqlite3.connect('contacts.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT,
            last_name TEXT,
            email TEXT,
            phone TEXT,
            company TEXT,
            position TEXT,
            address TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'active'
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS import_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            mappings TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS import_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT,
            total_records INTEGER,
            successful_records INTEGER,
            failed_records INTEGER,
            errors TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

init_db()

MAX_FILE_SIZE_MB = 5  
REQUIRED_FIELDS = ['first_name', 'last_name', 'email']

@app.get("/")
async def root():
    return {
        "message": "Grispi Contacts Importer API", 
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "upload": "/upload-excel",
            "process": "/process-import",
            "contacts": "/contacts",
            "templates": "/templates",
            "logs": "/import-logs"
        }
    }

@app.get("/health")
async def health_check():
    try:
        conn = sqlite3.connect('contacts.db')
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM contacts")
        contact_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM import_templates")
        template_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM import_logs")
        log_count = cursor.fetchone()[0]
        conn.close()
        
        return {
            "status": "healthy",
            "database": "connected",
            "stats": {
                "contacts": contact_count,
                "templates": template_count,
                "import_logs": log_count
            }
        }
    except Exception as e:
        logger.error(f"Health check hatası: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }

@app.post("/upload-excel")
async def upload_excel(file: UploadFile = File(...)):
    try:
        if not file.filename.endswith((".xlsx", ".xls")):
            raise HTTPException(status_code=400, detail="Sadece Excel dosyaları (.xlsx, .xls) kabul edilir")
        
        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE_MB * 1024 * 1024:
            raise HTTPException(status_code=400, detail=f"Dosya boyutu {MAX_FILE_SIZE_MB}MB'den büyük olamaz.")
        
        df = pd.read_excel(io.BytesIO(contents))
        df = df.fillna('')
        
        preview_data = []
        for _, row in df.head().iterrows():
            row_dict = {}
            for col in df.columns:
                value = row[col]
                if pd.isna(value) or value == '':
                    row_dict[col] = ""
                elif isinstance(value, (int, float)):
                    if abs(value) > 1e15:
                        row_dict[col] = str(value)
                    else:
                        row_dict[col] = value
                else:
                    row_dict[col] = str(value)
            preview_data.append(row_dict)
        
        columns = df.columns.tolist()
        logger.info(f"Excel dosyası başarıyla yüklendi: {file.filename}, {len(df)} satır")
        
        return {
            "filename": file.filename,
            "total_rows": len(df),
            "columns": columns,
            "preview": preview_data
        }
    except Exception as e:
        logger.error(f"Excel dosyası yükleme hatası: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Dosya okuma hatası: {str(e)}")

@app.post("/map-columns")
async def map_columns(
    filename: str = Form(...),
    mappings: str = Form(...),
    save_template: bool = Form(False),
    template_name: str = Form("")
):
    try:
        mappings_dict = json.loads(mappings)
        
        if save_template and template_name:
            conn = sqlite3.connect('contacts.db')
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO import_templates (name, mappings) VALUES (?, ?)",
                (template_name, mappings)
            )
            conn.commit()
            conn.close()
            logger.info(f"Şablon kaydedildi: {template_name}")
        
        return {
            "message": "Sütun eşleştirmeleri başarıyla kaydedildi",
            "template_saved": save_template and template_name
        }
    except Exception as e:
        logger.error(f"Eşleştirme hatası: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Eşleştirme hatası: {str(e)}")

@app.post("/process-import")
async def process_import(
    file: UploadFile = File(...),
    mappings: str = Form(...)
):
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        df = df.fillna('')
        
        mappings_dict = json.loads(mappings)
        if not any(field in mappings_dict and mappings_dict[field] for field in REQUIRED_FIELDS):
            raise HTTPException(status_code=400, detail=f"En az bir zorunlu alan eşleştirilmeli: {', '.join(REQUIRED_FIELDS)}")
        
        transformed_data = []
        errors = []
        successful_count = 0
        failed_count = 0
        
        for index, row in df.iterrows():
            try:
                contact_data = {}
                for grispi_field, excel_column in mappings_dict.items():
                    if excel_column in row:
                        value = row[excel_column]
                        if pd.isna(value) or value == '':
                            contact_data[grispi_field] = ""
                        elif isinstance(value, (int, float)):
                            if abs(value) > 1e15:
                                contact_data[grispi_field] = str(value).strip()
                            else:
                                contact_data[grispi_field] = str(value).strip()
                        else:
                            contact_data[grispi_field] = str(value).strip()
                    else:
                        contact_data[grispi_field] = ""
                
                transformed_data.append(contact_data)
                successful_count += 1
            except Exception as e:
                errors.append(f"Satır {index + 1}: {str(e)}")
                failed_count += 1
        
        conn = sqlite3.connect('contacts.db')
        cursor = conn.cursor()
        
        for contact in transformed_data:
            cursor.execute('''
                INSERT INTO contacts (first_name, last_name, email, phone, company, position, address, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                contact.get('first_name', ''),
                contact.get('last_name', ''),
                contact.get('email', ''),
                contact.get('phone', ''),
                contact.get('company', ''),
                contact.get('position', ''),
                contact.get('address', ''),
                contact.get('notes', '')
            ))
        
        cursor.execute('''
            INSERT INTO import_logs (filename, total_records, successful_records, failed_records, errors)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            file.filename,
            len(df),
            successful_count,
            failed_count,
            json.dumps(errors) if errors else ""
        ))
        
        conn.commit()
        conn.close()
        
        logger.info(f"Import tamamlandı: {file.filename}, {successful_count} başarılı, {failed_count} başarısız")
        
        return {
            "message": "Import işlemi tamamlandı",
            "total_records": len(df),
            "successful_records": successful_count,
            "failed_records": failed_count,
            "errors": errors
        }
        
    except Exception as e:
        logger.error(f"Import hatası: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Import hatası: {str(e)}")

@app.get("/templates")
async def get_templates():
    try:
        conn = sqlite3.connect('contacts.db')
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, mappings, created_at FROM import_templates ORDER BY created_at DESC")
        templates = cursor.fetchall()
        conn.close()
        
        return [
            {
                "id": template[0],
                "name": template[1],
                "mappings": json.loads(template[2]),
                "created_at": template[3]
            }
            for template in templates
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Şablonlar getirilirken hata: {str(e)}")

@app.get("/contacts")
async def get_contacts(skip: int = 0, limit: int = 100):
    try:
        conn = sqlite3.connect('contacts.db')
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM contacts ORDER BY created_at DESC LIMIT ? OFFSET ?", (limit, skip))
        contacts = cursor.fetchall()
        conn.close()
        
        columns = ['id', 'first_name', 'last_name', 'email', 'phone', 'company', 'position', 'address', 'notes', 'created_at', 'status']
        return [dict(zip(columns, contact)) for contact in contacts]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kontaklar getirilirken hata: {str(e)}")

@app.get("/import-logs")
async def get_import_logs():
    try:
        conn = sqlite3.connect('contacts.db')
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM import_logs ORDER BY created_at DESC")
        logs = cursor.fetchall()
        conn.close()
        
        columns = ['id', 'filename', 'total_records', 'successful_records', 'failed_records', 'errors', 'created_at']
        return [dict(zip(columns, log)) for log in logs]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import logları getirilirken hata: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 