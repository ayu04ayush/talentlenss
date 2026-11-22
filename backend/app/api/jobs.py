import re
import json
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
import httpx

from app.database import get_db
from app.config import settings
from app.models.models import Job, User, Candidate, Score
from app.schemas.schemas import JobCreate, JobUpdate, JobResponse, JobParseTextRequest
from app.api.auth import get_current_user
from app.utils.aliases import normalize_skills_list, ALL_KNOWN_SKILLS
from app.services.matcher import calculate_candidate_match

router = APIRouter(prefix="/jobs", tags=["jobs"])
logger = logging.getLogger(__name__)

async def rescore_all_candidates_for_job(job_id: int):
    """Recomputes match scores for all active candidates against this job."""
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return
        candidates = db.query(Candidate).filter(Candidate.user_id == job.user_id).all()
        for cand in candidates:
            score_data = await calculate_candidate_match(cand, job)
            existing = db.query(Score).filter(Score.candidate_id == cand.id, Score.job_id == job.id).first()
            if existing:
                for k, v in score_data.items():
                    setattr(existing, k, v)
            else:
                db.add(Score(**score_data))
        db.commit()
    except Exception as e:
        logger.error(f"Error rescoring job {job_id}: {e}")
    finally:
        db.close()

def parse_jd_text_fallback(text: str) -> Dict[str, Any]:
    """Extracts structured fields from raw pasted JD without an API key."""
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    title = lines[0] if lines else "Software Engineer"
    # Clean title
    title = re.sub(r'^(?:Job Title|Role|Position)[:\s-]*', '', title, flags=re.IGNORECASE).strip()

    # Detect skills
    found_skills = set()
    t_lower = text.lower()
    for s in ALL_KNOWN_SKILLS:
        if re.search(r'(?<![a-z0-9#\+])' + re.escape(s) + r'(?![a-z0-9#\+])', t_lower):
            found_skills.add(s)
    all_skills = normalize_skills_list(list(found_skills))

    # Split into required vs nice
    req_skills = all_skills[:max(len(all_skills)//2, 3)] if all_skills else ["python", "fastapi"]
    nice_skills = all_skills[max(len(all_skills)//2, 3):] if len(all_skills) > 3 else ["docker", "aws"]

    # Experience detection (e.g. 3-5 years or 3+ years)
    min_exp = 2.0
    max_exp = 6.0
    exp_match = re.search(r'(\d{1,2})\s*(?:-|to|\+)\s*(\d{1,2})?\s*(?:years|yrs)', text, re.IGNORECASE)
    if exp_match:
        try:
            min_exp = float(exp_match.group(1))
            if exp_match.group(2):
                max_exp = float(exp_match.group(2))
            else:
                max_exp = min_exp + 3.0
        except Exception:
            pass

    # Location
    loc = "Remote / Hybrid"
    for c in ["Bangalore", "San Francisco", "New York", "Remote", "London", "Hyderabad", "Pune", "Delhi", "Seattle"]:
        if re.search(r'\b' + re.escape(c) + r'\b', text, re.IGNORECASE):
            loc = c
            break

    return {
        "title": title[:100],
        "department": "Engineering",
        "description": text,
        "required_skills": req_skills,
        "nice_skills": nice_skills,
        "min_experience": min_exp,
        "max_experience": max_exp,
        "min_cgpa": 7.0,
        "location": loc,
        "education_req": "Bachelor's in Computer Science or equivalent",
        "weights": {
            "semantic": 25.0,
            "skills": 35.0,
            "experience": 20.0,
            "education": 10.0,
            "location": 10.0
        }
    }

@router.post("/parse-from-text")
async def parse_jd_from_text(req: JobParseTextRequest):
    """Auto-extracts structured JD parameters from pasted text with LLM or fallback."""
    if not settings.GEMINI_API_KEY:
        return parse_jd_text_fallback(req.raw_text)

    prompt = f"""You are a job specification analyzer.
Extract the structured fields from this job description text:
{req.raw_text[:4000]}

Return STRICT JSON:
{{
  "title": string,
  "department": string,
  "description": string,
  "required_skills": [string],
  "nice_skills": [string],
  "min_experience": float,
  "max_experience": float,
  "min_cgpa": float,
  "location": string,
  "education_req": string,
  "weights": {{
    "semantic": 25.0,
    "skills": 35.0,
    "experience": 20.0,
    "education": 10.0,
    "location": 10.0
  }}
}}"""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.1, "responseMimeType": "application/json"}
            })
            if resp.status_code == 200:
                text_content = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(text_content)
                parsed["required_skills"] = normalize_skills_list(parsed.get("required_skills", []))
                parsed["nice_skills"] = normalize_skills_list(parsed.get("nice_skills", []))
                return parsed
    except Exception as e:
        logger.warning(f"LLM JD parsing failed: {e}. Using deterministic fallback.")

    return parse_jd_text_fallback(req.raw_text)

@router.get("", response_model=List[JobResponse])
def get_jobs(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Job).filter(Job.user_id == current_user.id).order_by(Job.created_at.desc()).all()

@router.post("", response_model=JobResponse)
def create_job(
    job_in: JobCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = Job(
        user_id=current_user.id,
        title=job_in.title,
        department=job_in.department,
        description=job_in.description,
        raw_text=job_in.raw_text,
        required_skills=normalize_skills_list(job_in.required_skills),
        nice_skills=normalize_skills_list(job_in.nice_skills),
        min_experience=job_in.min_experience,
        max_experience=job_in.max_experience,
        min_cgpa=job_in.min_cgpa,
        location=job_in.location,
        education_req=job_in.education_req,
        weights=job_in.weights or {
            "semantic": 25.0,
            "skills": 35.0,
            "experience": 20.0,
            "education": 10.0,
            "location": 10.0
        },
        is_active=job_in.is_active
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Automatically rescore candidates for the new job in the background
    background_tasks.add_task(rescore_all_candidates_for_job, job.id)
    return job

@router.get("/{id}", response_model=JobResponse)
def get_job(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == id, Job.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.put("/{id}", response_model=JobResponse)
def update_job(
    id: int,
    job_in: JobUpdate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = db.query(Job).filter(Job.id == id, Job.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    update_dict = job_in.model_dump(exclude_unset=True)
    if "required_skills" in update_dict:
        update_dict["required_skills"] = normalize_skills_list(update_dict["required_skills"])
    if "nice_skills" in update_dict:
        update_dict["nice_skills"] = normalize_skills_list(update_dict["nice_skills"])

    for k, v in update_dict.items():
        setattr(job, k, v)

    db.commit()
    db.refresh(job)

    # Auto-rescore candidates since JD or weights updated
    background_tasks.add_task(rescore_all_candidates_for_job, job.id)
    return job

@router.delete("/{id}")
def delete_job(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == id, Job.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(job)
    db.commit()
    return {"message": "Job deleted successfully"}

@router.post("/{id}/rescore")
async def rescore_job_endpoint(id: int, background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == id, Job.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    background_tasks.add_task(rescore_all_candidates_for_job, job.id)
    return {"message": "Rescoring triggered in background"}
