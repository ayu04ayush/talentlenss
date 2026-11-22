import os
import io
import csv
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, asc

from app.database import get_db
from app.models.models import Candidate, Score, Job, ResumeFile, StageHistory, CandidateNote, CandidateTag, FilterPreset, User
from app.schemas.schemas import (
    CandidateCreate, CandidateUpdate, CandidateResponse, CandidateListResponse,
    ScoreResponse, ResumeFileResponse, NoteCreate, NoteResponse, TagCreate, CandidateComparisonRequest
)
from app.api.auth import get_current_user
from app.utils.aliases import normalize_skills_list, normalize_cgpa

router = APIRouter(prefix="/candidates", tags=["candidates"])
logger = logging.getLogger(__name__)

@router.get("", response_model=CandidateListResponse)
def list_candidates(
    job_id: Optional[int] = Query(None),
    min_score: Optional[float] = Query(None),
    cgpa_min: Optional[float] = Query(None),
    cgpa_max: Optional[float] = Query(None),
    tenth_min: Optional[float] = Query(None),
    tenth_max: Optional[float] = Query(None),
    twelfth_min: Optional[float] = Query(None),
    twelfth_max: Optional[float] = Query(None),
    exp_min: Optional[float] = Query(None),
    exp_max: Optional[float] = Query(None),
    skills: Optional[str] = Query(None), # Comma separated
    skill_mode: Optional[str] = Query("OR"), # "AND" or "OR"
    location: Optional[str] = Query(None),
    grad_year_min: Optional[int] = Query(None),
    grad_year_max: Optional[int] = Query(None),
    stage: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("match_score"), # match_score, cgpa, experience, name, created_at
    sort_order: Optional[str] = Query("desc"),     # asc, desc
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Candidate).filter(Candidate.user_id == current_user.id)

    # Filter: Stage
    if stage and stage.lower() != "all":
        query = query.filter(Candidate.current_stage == stage)

    # Filter: CGPA range
    if cgpa_min is not None:
        query = query.filter(Candidate.cgpa >= cgpa_min)
    if cgpa_max is not None:
        query = query.filter(Candidate.cgpa <= cgpa_max)

    # Filter: 10th & 12th percentage
    if tenth_min is not None:
        query = query.filter(Candidate.tenth_percentage >= tenth_min)
    if tenth_max is not None:
        query = query.filter(Candidate.tenth_percentage <= tenth_max)
    if twelfth_min is not None:
        query = query.filter(Candidate.twelfth_percentage >= twelfth_min)
    if twelfth_max is not None:
        query = query.filter(Candidate.twelfth_percentage <= twelfth_max)

    # Filter: Work Experience range
    if exp_min is not None:
        query = query.filter(Candidate.total_experience_years >= exp_min)
    if exp_max is not None:
        query = query.filter(Candidate.total_experience_years <= exp_max)

    # Filter: Graduation Year range
    if grad_year_min is not None:
        query = query.filter(Candidate.graduation_year >= grad_year_min)
    if grad_year_max is not None:
        query = query.filter(Candidate.graduation_year <= grad_year_max)

    # Filter: Location
    if location:
        loc_terms = [l.strip().lower() for l in location.split(",") if l.strip()]
        if loc_terms:
            loc_filters = [Candidate.location.ilike(f"%{lt}%") for lt in loc_terms]
            query = query.filter(or_(*loc_filters))

    # Filter: Full-text search (name, email, skills, summary)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Candidate.name.ilike(s),
                Candidate.email.ilike(s),
                Candidate.summary.ilike(s),
                Candidate.location.ilike(s)
            )
        )

    # Filter: Match score join if job_id or min_score is present
    if job_id or min_score is not None:
        query = query.outerjoin(Score, and_(Score.candidate_id == Candidate.id, Score.job_id == job_id if job_id else True))
        if min_score is not None:
            query = query.filter(Score.total_score >= min_score)

    # Filter: Skills with AND / OR
    if skills:
        skill_list = [s.strip().lower() for s in skills.split(",") if s.strip()]
        if skill_list:
            if skill_mode and skill_mode.upper() == "AND":
                for sk in skill_list:
                    # SQLite json_each or string search in JSON
                    query = query.filter(Candidate.skills.cast(String).ilike(f"%{sk}%"))
            else:
                sk_filters = [Candidate.skills.cast(String).ilike(f"%{sk}%") for sk in skill_list]
                query = query.filter(or_(*sk_filters))

    total = query.count()

    # Sorting
    is_desc = sort_order.lower() == "desc"
    if sort_by == "match_score" and job_id:
        if not (job_id or min_score is not None):
            query = query.outerjoin(Score, and_(Score.candidate_id == Candidate.id, Score.job_id == job_id))
        order_col = Score.total_score.desc() if is_desc else Score.total_score.asc()
        query = query.order_by(order_col.nullslast())
    elif sort_by == "cgpa":
        query = query.order_by(Candidate.cgpa.desc() if is_desc else Candidate.cgpa.asc())
    elif sort_by == "experience":
        query = query.order_by(Candidate.total_experience_years.desc() if is_desc else Candidate.total_experience_years.asc())
    elif sort_by == "name":
        query = query.order_by(Candidate.name.asc() if not is_desc else Candidate.name.desc())
    else:
        query = query.order_by(Candidate.created_at.desc() if is_desc else Candidate.created_at.asc())

    # Pagination
    items = query.offset((page - 1) * per_page).limit(per_page).all()

    # Attach score for response
    candidate_responses = []
    for c in items:
        # Load match score for active job_id if provided, else highest score
        score_obj = None
        if job_id:
            score_obj = db.query(Score).filter(Score.candidate_id == c.id, Score.job_id == job_id).first()
        else:
            score_obj = db.query(Score).filter(Score.candidate_id == c.id).order_by(Score.total_score.desc()).first()

        c_resp = CandidateResponse.model_validate(c)
        if score_obj:
            c_resp.match_score = ScoreResponse.model_validate(score_obj)
        candidate_responses.append(c_resp)

    total_pages = (total + per_page - 1) // per_page
    return CandidateListResponse(
        items=candidate_responses,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )

from sqlalchemy import String

@router.get("/export")
def export_candidates(
    job_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Exports candidates to CSV format."""
    candidates = db.query(Candidate).filter(Candidate.user_id == current_user.id).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Name", "Email", "Phone", "Location", "Current Stage",
        "Total Exp (Years)", "CGPA", "10th %", "12th %", "Graduation Year",
        "Skills", "Match Score", "LinkedIn", "GitHub"
    ])

    for c in candidates:
        score_val = ""
        if job_id:
            sc = db.query(Score).filter(Score.candidate_id == c.id, Score.job_id == job_id).first()
            if sc:
                score_val = str(sc.total_score)
        
        writer.writerow([
            c.id,
            c.name,
            c.email or "",
            c.phone or "",
            c.location or "",
            c.current_stage,
            c.total_experience_years,
            c.cgpa or "",
            c.tenth_percentage or "",
            c.twelfth_percentage or "",
            c.graduation_year or "",
            ", ".join(c.skills or []),
            score_val,
            c.linkedin_url or "",
            c.github_url or ""
        ])

    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=talentlens_candidates.csv"}
    )

@router.post("/compare")
def compare_candidates(
    req: CandidateComparisonRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns side-by-side comparison matrix for 2-4 candidates with best values flagged."""
    if len(req.candidate_ids) < 2 or len(req.candidate_ids) > 5:
        raise HTTPException(status_code=400, detail="Please select between 2 and 4 candidates to compare.")

    candidates = db.query(Candidate).filter(
        Candidate.id.in_(req.candidate_ids),
        Candidate.user_id == current_user.id
    ).all()

    if not candidates:
        raise HTTPException(status_code=404, detail="No matching candidates found")

    result = []
    for c in candidates:
        sc = None
        if req.job_id:
            sc = db.query(Score).filter(Score.candidate_id == c.id, Score.job_id == req.job_id).first()
        else:
            sc = db.query(Score).filter(Score.candidate_id == c.id).order_by(Score.total_score.desc()).first()

        c_data = {
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "current_stage": c.current_stage,
            "cgpa": c.cgpa or 0.0,
            "tenth_percentage": c.tenth_percentage or 0.0,
            "twelfth_percentage": c.twelfth_percentage or 0.0,
            "experience_years": c.total_experience_years or 0.0,
            "skills": c.skills or [],
            "skills_count": len(c.skills or []),
            "total_score": sc.total_score if sc else 0.0,
            "semantic_score": sc.semantic_score if sc else 0.0,
            "skill_score": sc.skill_score if sc else 0.0,
            "experience_score": sc.experience_score if sc else 0.0,
            "matched_skills": sc.matched_skills if sc else [],
            "missing_skills": sc.missing_skills if sc else [],
            "ai_explanation": sc.ai_explanation if sc else None
        }
        result.append(c_data)

    # Calculate best performers per row for UI highlights
    best_cgpa_id = max(result, key=lambda x: x["cgpa"])["id"] if result else None
    best_exp_id = max(result, key=lambda x: x["experience_years"])["id"] if result else None
    best_score_id = max(result, key=lambda x: x["total_score"])["id"] if result else None
    best_skills_id = max(result, key=lambda x: x["skills_count"])["id"] if result else None

    return {
        "candidates": result,
        "best_highlights": {
            "best_cgpa": best_cgpa_id,
            "best_experience": best_exp_id,
            "best_score": best_score_id,
            "best_skills_count": best_skills_id
        }
    }

@router.get("/{id}", response_model=CandidateResponse)
def get_candidate(
    id: int,
    job_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cand = db.query(Candidate).filter(Candidate.id == id, Candidate.user_id == current_user.id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    score_obj = None
    if job_id:
        score_obj = db.query(Score).filter(Score.candidate_id == cand.id, Score.job_id == job_id).first()
    else:
        score_obj = db.query(Score).filter(Score.candidate_id == cand.id).order_by(Score.total_score.desc()).first()

    resp = CandidateResponse.model_validate(cand)
    if score_obj:
        resp.match_score = ScoreResponse.model_validate(score_obj)
    return resp

@router.put("/{id}", response_model=CandidateResponse)
@router.patch("/{id}", response_model=CandidateResponse)
def update_candidate(
    id: int,
    cand_update: CandidateUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Allows recruiters to inline-edit any field, marking record as manually corrected."""
    cand = db.query(Candidate).filter(Candidate.id == id, Candidate.user_id == current_user.id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    update_dict = cand_update.model_dump(exclude_unset=True)

    # Normalize skills if updated
    if "skills" in update_dict and update_dict["skills"]:
        update_dict["skills"] = normalize_skills_list(update_dict["skills"])

    # Normalize CGPA if updated
    if "cgpa" in update_dict and update_dict["cgpa"] is not None:
        norm, raw, orig = normalize_cgpa(update_dict["cgpa"], update_dict.get("original_scale", 10.0))
        update_dict["cgpa"] = norm
        update_dict["cgpa_raw"] = raw

    # Mark as manually corrected by recruiter
    update_dict["is_manually_corrected"] = True

    for k, v in update_dict.items():
        setattr(cand, k, v)

    db.commit()
    db.refresh(cand)
    return CandidateResponse.model_validate(cand)

@router.delete("/{id}")
def delete_candidate(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cand = db.query(Candidate).filter(Candidate.id == id, Candidate.user_id == current_user.id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
    db.delete(cand)
    db.commit()
    return {"message": "Candidate deleted successfully"}

@router.get("/{id}/resume")
def download_resume(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Serves the original uploaded PDF/DOCX file for in-browser preview."""
    cand = db.query(Candidate).filter(Candidate.id == id, Candidate.user_id == current_user.id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    res_file = db.query(ResumeFile).filter(ResumeFile.candidate_id == cand.id).first()
    if not res_file or not os.path.exists(res_file.file_path):
        raise HTTPException(status_code=404, detail="Resume document not available on disk")

    return FileResponse(
        path=res_file.file_path,
        filename=res_file.file_name,
        media_type=res_file.mime_type
    )

# --- Notes & Tags ---
@router.get("/{id}/notes", response_model=List[NoteResponse])
def get_candidate_notes(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(CandidateNote).filter(CandidateNote.candidate_id == id).order_by(CandidateNote.created_at.desc()).all()

@router.post("/{id}/notes", response_model=NoteResponse)
def add_candidate_note(
    id: int,
    note_in: NoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    note = CandidateNote(
        candidate_id=id,
        author_name=note_in.author_name or current_user.full_name,
        content=note_in.content
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note
