import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import EmailTemplate, EmailLog, Candidate, Job, User
from app.schemas.schemas import (
    EmailTemplateCreate, EmailTemplateResponse, EmailPreviewRequest,
    EmailSendRequest, EmailLogResponse
)
from app.api.auth import get_current_user
from app.services.email_service import render_email_template, send_email_message, DEFAULT_TEMPLATES

router = APIRouter(prefix="/emails", tags=["emails"])
logger = logging.getLogger(__name__)

@router.get("/templates", response_model=List[EmailTemplateResponse])
def get_templates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    templates = db.query(EmailTemplate).filter(EmailTemplate.user_id == current_user.id).all()
    # If user has no templates, initialize default ones
    if not templates:
        for t in DEFAULT_TEMPLATES:
            tpl = EmailTemplate(
                user_id=current_user.id,
                name=t["name"],
                stage_trigger=t["stage_trigger"],
                subject=t["subject"],
                body_template=t["body_template"]
            )
            db.add(tpl)
        db.commit()
        templates = db.query(EmailTemplate).filter(EmailTemplate.user_id == current_user.id).all()

    return templates

@router.post("/templates", response_model=EmailTemplateResponse)
def create_template(
    t_in: EmailTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tpl = EmailTemplate(
        user_id=current_user.id,
        name=t_in.name,
        stage_trigger=t_in.stage_trigger,
        subject=t_in.subject,
        body_template=t_in.body_template
    )
    db.add(tpl)
    db.commit()
    db.refresh(tpl)
    return tpl

@router.put("/templates/{id}", response_model=EmailTemplateResponse)
def update_template(
    id: int,
    t_in: EmailTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tpl = db.query(EmailTemplate).filter(EmailTemplate.id == id, EmailTemplate.user_id == current_user.id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")

    tpl.name = t_in.name
    tpl.stage_trigger = t_in.stage_trigger
    tpl.subject = t_in.subject
    tpl.body_template = t_in.body_template
    db.commit()
    db.refresh(tpl)
    return tpl

@router.post("/preview")
def preview_email(
    req: EmailPreviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cand = db.query(Candidate).filter(Candidate.id == req.candidate_id, Candidate.user_id == current_user.id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    job = None
    if req.job_id:
        job = db.query(Job).filter(Job.id == req.job_id).first()

    subject_tpl = req.subject_template
    body_tpl = req.body_template

    if req.template_id:
        tpl = db.query(EmailTemplate).filter(EmailTemplate.id == req.template_id).first()
        if tpl:
            subject_tpl = tpl.subject
            body_tpl = tpl.body_template

    if not subject_tpl or not body_tpl:
        raise HTTPException(status_code=400, detail="Missing subject or body template")

    rendered_subject = render_email_template(subject_tpl, cand, job, current_user)
    rendered_body = render_email_template(body_tpl, cand, job, current_user)

    return {
        "candidate_id": cand.id,
        "recipient_email": cand.email or "candidate@example.com",
        "subject": rendered_subject,
        "body": rendered_body
    }

@router.post("/send")
def send_bulk_emails(
    req: EmailSendRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    candidates = db.query(Candidate).filter(
        Candidate.id.in_(req.candidate_ids),
        Candidate.user_id == current_user.id
    ).all()

    if not candidates:
        raise HTTPException(status_code=404, detail="No candidates found")

    job = None
    if req.job_id:
        job = db.query(Job).filter(Job.id == req.job_id).first()

    template = None
    if req.template_id:
        template = db.query(EmailTemplate).filter(EmailTemplate.id == req.template_id).first()

    subject_tpl = req.subject or (template.subject if template else "Application Update")
    body_tpl = req.body_template or (template.body_template if template else "Hello {{name}},\nThank you.")

    logs = []
    for cand in candidates:
        rendered_subject = render_email_template(subject_tpl, cand, job, current_user)
        rendered_body = render_email_template(body_tpl, cand, job, current_user)

        log = send_email_message(
            db=db,
            user_id=current_user.id,
            candidate_id=cand.id,
            recipient_email=cand.email or f"{cand.name.lower().replace(' ', '.')}@example.com",
            subject=rendered_subject,
            body=rendered_body,
            template_name=template.name if template else "Custom Outreach",
            dry_run=req.dry_run
        )
        logs.append(log.id)

    return {
        "message": f"Successfully queued/processed {len(candidates)} emails in {'DRY RUN' if req.dry_run else 'LIVE'} mode.",
        "dry_run": req.dry_run,
        "sent_count": len(candidates),
        "log_ids": logs
    }

@router.get("/logs", response_model=List[EmailLogResponse])
def get_email_logs(
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(EmailLog).filter(EmailLog.user_id == current_user.id).order_by(EmailLog.sent_at.desc()).limit(limit).all()
