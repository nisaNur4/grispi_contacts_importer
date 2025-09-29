from __future__ import annotations
from sqlalchemy import String, Integer, DateTime, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from database import Base

class Template(Base):
    __tablename__="templates"
    id: Mapped[int]= mapped_column(Integer, primary_key=True, index=True)
    name:Mapped[str]= mapped_column(String(120), unique=True, index=True)
    column_map:Mapped[dict] = mapped_column(JSON)
    created_at:Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class ImportJob(Base):
    __tablename__="import_jobs"
    id: Mapped[int]= mapped_column(Integer, primary_key=True, index=True)
    filename: Mapped[str]=mapped_column(String(255))
    status:Mapped[str] =mapped_column(String(50), default="created")
    total:Mapped[int] = mapped_column(Integer, default=0)
    success_count: Mapped[int]= mapped_column(Integer, default=0)
    error_count:Mapped[int]=mapped_column(Integer, default=0)
    report:Mapped[dict | None]=mapped_column(JSON, nullable=True)
    created_at:Mapped[datetime]= mapped_column(DateTime, default=datetime.utcnow)

class Contact(Base):
    __tablename__ ="contacts"
    id:Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    first_name:  Mapped[str | None] = mapped_column(String(120), nullable=True)
    last_name:Mapped[str | None] = mapped_column(String(120), nullable=True)
    email:Mapped[str |None]=mapped_column(String(120), unique=True, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(120), unique=True, nullable=True)
    company: Mapped[str | None]=mapped_column(String(120), nullable=True)
    title:Mapped[str | None]=mapped_column(String(120), nullable=True)
    notes:Mapped[str | None]= mapped_column(Text, nullable=True)
    created_at:Mapped[datetime]= mapped_column(DateTime, default=datetime.utcnow)