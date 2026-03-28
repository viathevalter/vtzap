from pydantic import BaseModel
from typing import List, Optional, Literal
from enum import Enum
from datetime import datetime

class TemplateType(str, Enum):
    TEXT = 'TEXT'
    TEXT_IMAGE = 'TEXT_IMAGE'
    TEXT_PDF = 'TEXT_PDF'
    TEXT_IMAGE_PDF = 'TEXT_IMAGE_PDF'

class ContactStatus(str, Enum):
    PENDING = 'pending'
    SUCCESS = 'success'
    FAILED = 'failed'

class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    STOPPED = "stopped"
    SCHEDULED = "scheduled"

class Contact(BaseModel):
    name: Optional[str] = "Unknown"
    phone: str
    status: ContactStatus = ContactStatus.PENDING
    error: Optional[str] = None
    due_date: Optional[str] = None
    value: Optional[str] = None
    link: Optional[str] = None
    passaporte: Optional[str] = None
    raw_data: Optional[dict] = None

class Template(BaseModel):
    id: str
    name: str
    category: str
    type: TemplateType
    content: str
    attachmentImage: Optional[str] = None
    attachmentPdf: Optional[str] = None

class CalibrationPoint(BaseModel):
    id: str
    actionName: str
    x: Optional[int]
    y: Optional[int]

class CalibrationProfile(BaseModel):
    id: str
    name: str
    resolution: str
    delay: int = 15
    points: List[CalibrationPoint]

class PreviewRequest(BaseModel):
    file_path: Optional[str] = None # In case we just handle the upload and return path, or handle raw data
    
class SendRequest(BaseModel):
    contacts: List[Contact]
    templateId: str
    profileId: str
    delay: int = 15
    minDelay: int = 2
    maxDelay: int = 6
    scheduled_at: Optional[datetime] = None

class JobInfo(BaseModel):
    id: str
    status: JobStatus = JobStatus.PENDING
    progress: int
    total: int
    results: List[Contact]
    scheduled_at: Optional[datetime] = None

class LogEntry(BaseModel):
    contact: Contact
    timestamp: datetime
    success: bool
    error: Optional[str] = None
