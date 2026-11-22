import os
import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models.models import ResumeFile, User, Job, Candidate
from app.api.auth import get_current_user
from app.services.duplicates import compute_file_sha256
from app.services.queue import background_batch_worker, process_single_resume

router = APIRouter(prefix="/uploads", tags=["uploads"])
logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}
MAX_FILE_SIZE = 15 * 1024 * 1024 # 15 MB per file
MAX_FILES_PER_BATCH = 200

@router.post("/bulk")
async def bulk_upload_resumes(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    job_id: Optional[int] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if len(files) > MAX_FILES_PER_BATCH:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_FILES_PER_BATCH} files allowed per batch upload.")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    batch_id = str(uuid.uuid4())
    uploaded_files_records = []
    rejected_files = []
    file_ids_to_process = []

    for file in files:
        # Validate extension
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            rejected_files.append({"file_name": file.filename, "reason": "Invalid file format. Only PDF and DOCX files are supported."})
            continue

        try:
            content = await file.read()
            if len(content) > MAX_FILE_SIZE:
                rejected_files.append({"file_name": file.filename, "reason": "File size exceeds 15MB limit."})
                continue
            if len(content) == 0:
                rejected_files.append({"file_name": file.filename, "reason": "File is empty (0 bytes)."})
                continue

            file_hash = compute_file_sha256(content)
            saved_name = f"{uuid.uuid4()}_{file.filename}"
            saved_path = os.path.join(settings.UPLOAD_DIR, saved_name)

            with open(saved_path, "wb") as f:
                f.write(content)

            # Create ResumeFile record
            res_record = ResumeFile(
                batch_id=batch_id,
                file_name=file.filename,
                file_hash=file_hash,
                file_path=saved_path,
                file_size=len(content),
                mime_type=file.content_type or "application/octet-stream",
                status="queued"
            )
            db.add(res_record)
            db.commit()
            db.refresh(res_record)

            uploaded_files_records.append({
                "id": res_record.id,
                "file_name": res_record.file_name,
                "status": res_record.status,
                "file_size": res_record.file_size
            })
            file_ids_to_process.append(res_record.id)

        except Exception as e:
            logger.error(f"Error saving uploaded file {file.filename}: {e}")
            rejected_files.append({"file_name": file.filename, "reason": str(e)})

    # Dispatch processing in background queue so UI never blocks!
    if file_ids_to_process:
        background_tasks.add_task(background_batch_worker, file_ids_to_process, job_id, current_user.id)

    return {
        "batch_id": batch_id,
        "total_received": len(files),
        "total_queued": len(file_ids_to_process),
        "uploaded_files": uploaded_files_records,
        "rejected_files": rejected_files
    }

@router.get("/status")
def get_recent_uploads_status(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns recent upload status across all files for live polling."""
    # Find files belonging to candidates of current_user or unassigned files
    files = db.query(ResumeFile).order_by(ResumeFile.created_at.desc()).limit(limit).all()
    res = []
    for f in files:
        res.append({
            "id": f.id,
            "batch_id": f.batch_id,
            "file_name": f.file_name,
            "status": f.status,
            "error_message": f.error_message,
            "candidate_id": f.candidate_id,
            "created_at": f.created_at
        })
    return res

@router.get("/status/{batch_id}")
def get_batch_status(
    batch_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns real-time progress for a specific upload batch with summary counts and overall percent."""
    files = db.query(ResumeFile).filter(ResumeFile.batch_id == batch_id).all()
    if not files:
        raise HTTPException(status_code=404, detail="Batch not found")

    counts = {"queued": 0, "extracting": 0, "parsing": 0, "scoring": 0, "done": 0, "failed": 0}
    for f in files:
        counts[f.status] = counts.get(f.status, 0) + 1

    total = len(files)
    completed = counts["done"] + counts["failed"]
    overall_progress = round((completed / total) * 100.0, 1) if total > 0 else 100.0

    return {
        "batch_id": batch_id,
        "total": total,
        "counts": counts,
        "overall_progress": overall_progress,
        "is_complete": completed == total,
        "files": [
            {
                "id": f.id,
                "file_name": f.file_name,
                "status": f.status,
                "error_message": f.error_message,
                "candidate_id": f.candidate_id
            }
            for f in files
        ]
    }

@router.post("/retry/{file_id}")
async def retry_failed_file(
    file_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    res_file = db.query(ResumeFile).filter(ResumeFile.id == file_id).first()
    if not res_file:
        raise HTTPException(status_code=404, detail="File not found")

    res_file.status = "queued"
    res_file.error_message = None
    db.commit()

    background_tasks.add_task(process_single_resume, file_id, None, current_user.id)
    return {"message": "File queued for retry", "id": file_id, "status": "queued"}
