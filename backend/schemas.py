from __future__ import annotations
from typing import Optional, Dict, Any, List, Literal
from pydantic import BaseModel, Field
from datetime import datetime

STANDARD_FIELDS = [
    "first_name",
    "last_name",
    "email",
    "phone",
    "company",
    "title",
    "notes",
]

class TemplateCreate(BaseModel):
    name:str= Field(..., min_length=1, max_length=120)
    column_map: Dict[str, str] = Field(
        ...,description="Excel sütun adı -> standard alan eşlemesi (örn: 'Ad' -> 'first_name')"
    )

class TemplateOut(BaseModel):
    id:int
    name:str
    column_map:Dict[str,str]

    class Config:
        from_attributes = True

class PreviewOut(BaseModel):
    sheet:str
    sheets:List[str]
    columns:List[str]
    rows: List[Dict[str, Any]]
    job_id:int

class TransformRequest(BaseModel):
    template_name:Optional[str] = None
    mapping:Optional[Dict[str, str]] =None
    sheet:Optional[str] = None
    save_mode: Literal["json", "sqlite", "csv", "none"] = "none"
    import_type: Literal["contact", "ticket", "organization"] = "contact"

class TransformResult(BaseModel):
    total: int
    success:int
    errors:int
    report:Dict[str, Any]
    export_path: Optional[str]=None
class ImportJobOut(BaseModel):
    id:int
    filename:str
    status:str
    total:int
    success_count:int
    error_count: int
    report: Optional[Dict[str, Any]]=None
    created_at: datetime
    
    class Config:
        from_attributes = True