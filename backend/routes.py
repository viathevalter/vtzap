from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException
from typing import List, Optional
import pandas as pd
import json
import os
import time
import asyncio
import pyautogui
import random
from datetime import datetime, timezone
from .models import (
    CalibrationProfile, Template, Contact, SendRequest,
    JobInfo, LogEntry, JobStatus, ContactStatus, PreviewRequest
)
from backend.services.whatsapp import WhatsAppService

router = APIRouter()
whatsapp_service = WhatsAppService()

DATA_DIR = "backend/data"
TEMPLATES_FILE = os.path.join(DATA_DIR, "templates.json")
PROFILES_FILE = os.path.join(DATA_DIR, "profiles.json")
JOBS = {}

def load_json(path, model_cls):
    if not os.path.exists(path):
        return []
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        return [model_cls(**item) for item in data]

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump([item.dict() for item in data], f, indent=2)

@router.post("/preview", response_model=List[Contact])
async def preview_contacts(file: UploadFile = File(...)):
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file.file)
        elif file.filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file.file)
        else:
            raise HTTPException(status_code=400, detail="Invalid file format")
            
        # Normalize headers
        df.columns = [str(c).strip().lower() for c in df.columns]
        
        # Try to find name column
        name_col = next((c for c in df.columns if c in ['nome', 'name', 'contato', 'cliente', '0', 'nome do negócio']), None)
        # Try to find phone column
        phone_col = next((c for c in df.columns if c in ['telefone', 'phone', 'celular', 'numero', 'whatsapp', 'zap', '1', 'contato: telefone de trabalho']), None)
        # Try to find specific billing columns
        due_date_col = next((c for c in df.columns if c in ['data de vencimento', 'vencimento', 'data de vencimento atual']), None)
        value_col = next((c for c in df.columns if c in ['valor', 'valor vencido', 'montante']), None)
        link_col = next((c for c in df.columns if c in ['link', 'link cobrança', 'link de cobrança']), None)
        
        # Fallback to positional columns if not found
        if not name_col and len(df.columns) > 0:
            name_col = df.columns[0]
        if not phone_col and len(df.columns) > 1:
            phone_col = df.columns[1]

        contacts = []
        for _, row in df.iterrows():
            name_val = str(row[name_col]) if name_col and pd.notna(row[name_col]) else "Unknown"
            
            phone_val = str(row[phone_col]) if phone_col and pd.notna(row[phone_col]) else ""
            
            due_date_val = str(row[due_date_col]) if due_date_col and pd.notna(row[due_date_col]) else None
            value_val = str(row[value_col]) if value_col and pd.notna(row[value_col]) else None
            link_val = str(row[link_col]) if link_col and pd.notna(row[link_col]) else None
            
            # Clean phone number (remove non-digits)
            # Remove '+', '-', ' ', '(', ')'
            clean_phone = ''.join(filter(str.isdigit, phone_val))

            if clean_phone: # only add if there is a phone number
                # Fix pandas converting dates to floats/datetime unexpectedly sometimes
                if due_date_val and due_date_val.endswith(' 00:00:00'):
                    due_date_val = due_date_val.split()[0]
                    
                contacts.append(Contact(
                    name=name_val,
                    phone=clean_phone,
                    status=ContactStatus.PENDING,
                    due_date=due_date_val,
                    value=value_val,
                    link=link_val
                ))
        return contacts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def process_job(job_id: str, request: SendRequest):
    job = JOBS.get(job_id)
    if not job or job.status == JobStatus.STOPPED:
        return
        
    job.status = JobStatus.RUNNING
    
    # Load profile for coordinates
    profiles = load_json(PROFILES_FILE, CalibrationProfile)
    profile = next((p for p in profiles if p.id == request.profileId), None)
    
    # Load template
    templates = load_json(TEMPLATES_FILE, Template)
    template = next((t for t in templates if t.id == request.templateId), None)

    if not profile or not template:
        job.status = JobStatus.STOPPED
        return

    # Bring browser to foreground and initialize
    try:
        whatsapp_service.initialize(profile)
    except Exception as e:
        print(f"Failed to initialize browser tab: {e}")
        job.status = JobStatus.STOPPED
        return

    for i, contact in enumerate(job.results):
        if job.status == JobStatus.STOPPED:
            break
            
        try:
            success = whatsapp_service.send_message(contact, template, profile)
            contact.status = ContactStatus.SUCCESS if success else ContactStatus.FAILED
        except Exception as e:
            contact.status = ContactStatus.FAILED
            contact.error = str(e)
        
        job.progress = i + 1
        
        # Determine delay from request safely
        min_d = getattr(request, 'minDelay', 2)
        max_d = getattr(request, 'maxDelay', 6)
        # Ensure min <= max
        if min_d > max_d: min_d, max_d = max_d, min_d
        
        # Add random delay to prevent blocks
        await asyncio.sleep(random.randint(min_d, max_d))

    job.status = JobStatus.COMPLETED

@router.post("/send")
async def start_sending(request: SendRequest, background_tasks: BackgroundTasks):
    job_id = str(int(time.time() * 1000))
    job_status = JobStatus.SCHEDULED if request.scheduled_at else JobStatus.PENDING
    
    # Store request object inside JOB as we need it for scheduled jobs
    JOBS[job_id] = JobInfo(
        id=job_id,
        status=job_status,
        total=len(request.contacts),
        progress=0,
        results=request.contacts,
        scheduled_at=request.scheduled_at
    )
    # Temporary hold the request in a dict for the background worker
    if not hasattr(start_sending, 'requests'):
        start_sending.requests = {}
    start_sending.requests[job_id] = request

    if not request.scheduled_at:
        background_tasks.add_task(process_job, job_id, request)
    
    return {"jobId": job_id, "status": job_status}

@router.get("/job/{job_id}", response_model=JobInfo)
async def get_job_status(job_id: str):
    if job_id not in JOBS:
        raise HTTPException(status_code=404, detail="Job not found")
    return JOBS[job_id]

@router.post("/job/{job_id}/stop")
async def stop_job(job_id: str):
    if job_id not in JOBS:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = JOBS[job_id]
    if job.status == JobStatus.PENDING or job.status == JobStatus.RUNNING or job.status == JobStatus.SCHEDULED:
        job.status = JobStatus.STOPPED
        
    return {"status": "success", "jobId": job_id, "current_status": job.status}

@router.get("/jobs", response_model=List[JobInfo])
async def get_jobs():
    return list(JOBS.values())

@router.get("/templates", response_model=List[Template])
async def get_templates():
    return load_json(TEMPLATES_FILE, Template)

@router.post("/templates")
async def save_templates(templates: List[Template]):
    save_json(TEMPLATES_FILE, templates)
    return {"status": "success"}

@router.get("/profiles", response_model=List[CalibrationProfile])
async def get_profiles():
    return load_json(PROFILES_FILE, CalibrationProfile)

@router.post("/profiles")
async def save_profiles(profiles: List[CalibrationProfile]):
    save_json(PROFILES_FILE, profiles)
    return {"status": "success"}

@router.get("/calibration/capture")
async def capture_coordinates():
    # Wait time for the user to position the mouse
    await asyncio.sleep(3)
    x, y = pyautogui.position()
    return {"x": x, "y": y}


async def background_scheduler():
    """Background task to continually check for scheduled jobs to run."""
    print("Background scheduler service started")
    while True:
        now = datetime.now()
        
        for job_id, job in list(JOBS.items()):
            if job.status == JobStatus.SCHEDULED and job.scheduled_at:
                is_due = False
                
                dt_now = datetime.now(timezone.utc)
                job_dt = job.scheduled_at
                
                if job_dt.tzinfo is None:
                    is_due = job_dt <= datetime.now()
                else:
                    is_due = job_dt <= dt_now

                if is_due:
                    print(f"Triggering scheduled job {job_id} at {now}")
                    
                    # Fetch stored request
                    request = getattr(start_sending, 'requests', {}).get(job_id)
                    if request:
                        asyncio.create_task(process_job(job_id, request))
                    else:
                        job.status = JobStatus.FAILED
                        print(f"Failed to find request object for scheduled job: {job_id}")
        
        await asyncio.sleep(30) # check every 30 seconds
