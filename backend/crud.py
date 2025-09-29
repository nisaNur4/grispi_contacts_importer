from __future__ import annotations
from typing import Optional, Dict
from sqlalchemy.orm import Session
from models import Template, ImportJob, Contact
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy import inspect

def create_template(db: Session, name: str, column_map: dict) -> Template:
    tpl = Template(name=name, column_map=column_map)
    db.add(tpl)
    db.commit()
    db.refresh(tpl)
    return tpl

def get_template_by_name(db: Session, name: str) -> Optional[Template]:
    return db.query(Template).filter(Template.name == name).first()

def list_templates(db: Session) -> list[Template]:
    return db.query(Template).order_by(Template.created_at.desc()).all()

def create_job(db: Session, filename: str) -> ImportJob:
    job = ImportJob(filename=filename, status="created")
    db.add(job)
    db.commit()
    db.refresh(job)
    return job

def update_job(db: Session, job: ImportJob, **kwargs) -> ImportJob:
    for k, v in kwargs.items():
        setattr(job, k, v)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job

def bulk_insert_contacts(db: Session, records: list[dict]) -> Dict[str, int]:
    objs = [Contact(**r) for r in records]
    
    total_count = len(objs)
    success_count = 0
    duplicate_count = 0
    
    for obj in objs:
        try:
            db.add(obj)
            db.flush() 
            success_count += 1
        except IntegrityError:
            db.rollback()
            duplicate_count += 1
    
    db.commit()
    
    return {
        "total": total_count,
        "success": success_count,
        "duplicates": duplicate_count,
    }

def get_job(db: Session, job_id: int) -> Optional[ImportJob]:
    return db.query(ImportJob).filter(ImportJob.id == job_id).first()