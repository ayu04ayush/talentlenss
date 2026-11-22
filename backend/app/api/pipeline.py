import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Candidate, StageHistory, User
from app.schemas.schemas import StageMoveRequest, BulkStageMoveRequest, StageHistoryResponse
from app.api.auth import get_current_user

router = APIRouter(prefix="/pipeline", tags=["pipeline"])
logger = logging.getLogger(__name__)

VALID_STAGES = ["Applied", "Shortlisted", "Interview", "Offer", "Rejected"]

@router.post("/move")
def move_candidate_stage(
    req: StageMoveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if req.to_stage not in VALID_STAGES:
        raise HTTPException(status_code=400, detail=f"Invalid stage. Must be one of {VALID_STAGES}")

    cand = db.query(Candidate).filter(Candidate.id == req.candidate_id, Candidate.user_id == current_user.id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    old_stage = cand.current_stage
    cand.current_stage = req.to_stage

    history_entry = StageHistory(
        candidate_id=cand.id,
        from_stage=old_stage,
        to_stage=req.to_stage,
        moved_by=current_user.full_name,
        notes=req.notes or f"Moved from {old_stage} to {req.to_stage}"
    )
    db.add(history_entry)
    db.commit()

    return {
        "candidate_id": cand.id,
        "from_stage": old_stage,
        "to_stage": req.to_stage,
        "message": "Stage updated successfully"
    }

@router.post("/bulk-move")
def bulk_move_stage(
    req: BulkStageMoveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if req.to_stage not in VALID_STAGES:
        raise HTTPException(status_code=400, detail=f"Invalid stage. Must be one of {VALID_STAGES}")

    candidates = db.query(Candidate).filter(
        Candidate.id.in_(req.candidate_ids),
        Candidate.user_id == current_user.id
    ).all()

    moved_count = 0
    for cand in candidates:
        old_stage = cand.current_stage
        cand.current_stage = req.to_stage

        hist = StageHistory(
            candidate_id=cand.id,
            from_stage=old_stage,
            to_stage=req.to_stage,
            moved_by=current_user.full_name,
            notes=req.notes or f"Bulk transition to {req.to_stage}"
        )
        db.add(hist)
        moved_count += 1

    db.commit()
    return {"message": f"Successfully moved {moved_count} candidates to {req.to_stage}"}

@router.get("/history/{candidate_id}", response_model=List[StageHistoryResponse])
def get_candidate_stage_history(
    candidate_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cand = db.query(Candidate).filter(Candidate.id == candidate_id, Candidate.user_id == current_user.id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    return db.query(StageHistory).filter(StageHistory.candidate_id == candidate_id).order_by(StageHistory.created_at.desc()).all()

@router.get("/funnel")
def get_pipeline_funnel(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Calculates column counts and stage-to-stage conversion funnel percentages."""
    all_candidates = db.query(Candidate).filter(Candidate.user_id == current_user.id).all()
    total = len(all_candidates)

    counts = {s: 0 for s in VALID_STAGES}
    for c in all_candidates:
        if c.current_stage in counts:
            counts[c.current_stage] += 1

    # Conversion percentages based on progression
    applied_count = total
    shortlisted_or_beyond = counts["Shortlisted"] + counts["Interview"] + counts["Offer"]
    interview_or_beyond = counts["Interview"] + counts["Offer"]
    offer_count = counts["Offer"]

    funnel_stats = [
        {
            "stage": "Applied",
            "count": counts["Applied"],
            "cumulative_count": applied_count,
            "conversion_pct": 100.0
        },
        {
            "stage": "Shortlisted",
            "count": counts["Shortlisted"],
            "cumulative_count": shortlisted_or_beyond,
            "conversion_pct": round((shortlisted_or_beyond / applied_count * 100.0), 1) if applied_count else 0.0
        },
        {
            "stage": "Interview",
            "count": counts["Interview"],
            "cumulative_count": interview_or_beyond,
            "conversion_pct": round((interview_or_beyond / shortlisted_or_beyond * 100.0), 1) if shortlisted_or_beyond else 0.0
        },
        {
            "stage": "Offer",
            "count": counts["Offer"],
            "cumulative_count": offer_count,
            "conversion_pct": round((offer_count / interview_or_beyond * 100.0), 1) if interview_or_beyond else 0.0
        },
        {
            "stage": "Rejected",
            "count": counts["Rejected"],
            "cumulative_count": counts["Rejected"],
            "conversion_pct": round((counts["Rejected"] / applied_count * 100.0), 1) if applied_count else 0.0
        }
    ]

    return {
        "total_candidates": total,
        "counts": counts,
        "funnel": funnel_stats
    }
