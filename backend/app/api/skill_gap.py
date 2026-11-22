import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Candidate, Job, User
from app.schemas.schemas import SkillGapResponse
from app.api.auth import get_current_user
from app.services.skill_gap import analyze_skill_gap

router = APIRouter(prefix="/skill-gap", tags=["skill-gap"])
logger = logging.getLogger(__name__)

@router.get("/{candidate_id}/{job_id}", response_model=SkillGapResponse)
async def get_candidate_skill_gap(
    candidate_id: int,
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cand = db.query(Candidate).filter(Candidate.id == candidate_id, Candidate.user_id == current_user.id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    job = db.query(Job).filter(Job.id == job_id, Job.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    result = await analyze_skill_gap(
        candidate_id=cand.id,
        job_id=job.id,
        candidate_skills=cand.skills or [],
        required_skills=job.required_skills or [],
        nice_skills=job.nice_skills or [],
        job_title=job.title
    )
    return result
