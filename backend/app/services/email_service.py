import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.config import settings
from app.models.models import EmailLog, Candidate, Job, User

logger = logging.getLogger(__name__)

DEFAULT_TEMPLATES = [
    {
        "name": "Shortlisted Notification",
        "stage_trigger": "Shortlisted",
        "subject": "TalentLens Update: Your application for {{job_title}} at {{company}}",
        "body_template": """Hi {{name}},

Congratulations! We were very impressed by your background and credentials, and we have shortlisted your application for the {{job_title}} position at {{company}}.

Our engineering hiring team is currently reviewing your profile to schedule the initial technical conversation. You can expect to hear from us regarding next steps within the next 48 hours.

Best regards,
The Talent Acquisition Team
{{company}}"""
    },
    {
        "name": "Interview Invitation",
        "stage_trigger": "Interview",
        "subject": "Interview Invitation: {{job_title}} at {{company}}",
        "body_template": """Hi {{name}},

We would love to invite you to a 45-minute technical interview for the {{job_title}} role at {{company}}.

During this session, we will discuss your technical experience, review your core projects, and dive into system architecture relevant to our team.

Date / Time: {{date}}
Location: Google Meet / Virtual Room

Please confirm if this timing works well for you or let us know alternative slots.

Warm regards,
{{company}} Recruitment Team"""
    },
    {
        "name": "Official Offer Letter",
        "stage_trigger": "Offer",
        "subject": "Job Offer: {{job_title}} at {{company}}",
        "body_template": """Dear {{name}},

On behalf of {{company}}, it is our absolute pleasure to extend an offer of employment for the position of {{job_title}}!

The team was thoroughly impressed by your performance throughout the interviews, technical evaluation, and alignment with our mission. We are excited about what we will build together.

Our formal offer packet and benefits breakdown are attached. Please review and feel free to reach out with any questions.

Congratulations once again!

Sincerely,
Leadership Team
{{company}}"""
    },
    {
        "name": "Application Status Update",
        "stage_trigger": "Rejected",
        "subject": "Update on your application for {{job_title}} at {{company}}",
        "body_template": """Dear {{name}},

Thank you for taking the time to speak with us and for your interest in the {{job_title}} role at {{company}}.

While your credentials and technical foundation are very strong, we have decided to move forward with another candidate whose specific domain experience more closely aligns with our immediate technical needs.

We truly appreciated learning about your work and will keep your profile in our talent community for relevant future openings. We wish you every success in your ongoing search.

Best regards,
Talent Team
{{company}}"""
    }
]

def render_email_template(
    template_str: str,
    candidate: Candidate,
    job: Optional[Job] = None,
    user: Optional[User] = None,
    custom_date: Optional[str] = None
) -> str:
    """Replaces {{variable}} placeholders in subject and body."""
    company_name = user.company_name if user and user.company_name else "TalentLens Org"
    job_title = job.title if job else "Engineering Role"
    cand_name = candidate.name
    date_str = custom_date or (candidate.interview_date.strftime("%B %d, %Y at %I:%M %p") if candidate.interview_date else "To be scheduled")

    replacements = {
        "{{name}}": cand_name,
        "{{candidate_name}}": cand_name,
        "{{job_title}}": job_title,
        "{{role}}": job_title,
        "{{company}}": company_name,
        "{{date}}": date_str,
        "{{interview_date}}": date_str,
        "{{email}}": candidate.email or "",
        "{{location}}": candidate.location or "Remote"
    }

    result = template_str
    for placeholder, val in replacements.items():
        result = result.replace(placeholder, str(val))
    return result

def send_email_message(
    db: Session,
    user_id: int,
    candidate_id: int,
    recipient_email: str,
    subject: str,
    body: str,
    template_name: Optional[str] = None,
    dry_run: bool = True
) -> EmailLog:
    """
    Sends email or logs dry-run dispatch.
    Always records entry in email_logs table for audit and UI display.
    """
    status = "dry_run" if (dry_run or settings.SMTP_DRY_RUN or not settings.SMTP_USER) else "sent"
    error_msg = None

    if not dry_run and not settings.SMTP_DRY_RUN and settings.SMTP_USER:
        try:
            msg = MIMEMultipart()
            msg["From"] = settings.SMTP_FROM_EMAIL
            msg["To"] = recipient_email
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "plain"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
            status = "sent"
        except Exception as e:
            logger.error(f"Failed to send email to {recipient_email}: {e}")
            status = "failed"
            error_msg = str(e)

    # Save to EmailLog table
    log_entry = EmailLog(
        user_id=user_id,
        candidate_id=candidate_id,
        recipient_email=recipient_email,
        template_name=template_name,
        subject=subject,
        body_rendered=body,
        status=status,
        error_message=error_msg,
        sent_at=datetime.utcnow()
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry
