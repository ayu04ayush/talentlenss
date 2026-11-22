import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import DuplicateFlag, Candidate, User
from app.schemas.schemas import DuplicateMergeRequest, DuplicateDismissRequest, CandidateResponse
from app.api.auth import get_current_user
from app.services.duplicates import merge_candidates

router = APIRouter(prefix="/duplicates", tags=["duplicates"])
logger = logging.getLogger(__name__)

@router.get("")
def list_duplicates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    flags = db.query(DuplicateFlag).join(
        Candidate, DuplicateFlag.candidate_id == Candidate.id
    ).filter(
        Candidate.user_id == current_user.id,
        DuplicateFlag.status == "pending"
    ).all()

    result = []
    for f in flags:
        cand = db.query(Candidate).filter(Candidate.id == f.candidate_id).first()
        orig = db.query(Candidate).filter(Candidate.id == f.duplicate_of_candidate_id).first()
        if cand and orig:
            result.append({
                "id": f.id,
                "candidate_id": f.candidate_id,
                "duplicate_of_candidate_id": f.duplicate_of_candidate_id,
                "match_type": f.match_type,
                "confidence": f.confidence,
                "status": f.status,
                "created_at": f.created_at,
                "candidate": CandidateResponse.model_validate(cand),
                "original_candidate": CandidateResponse.model_validate(orig)
            })

    return result

@router.post("/merge")
def merge_duplicate_record(
    req: DuplicateMergeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    flag = db.query(DuplicateFlag).filter(DuplicateFlag.id == req.duplicate_flag_id).first()
    if not flag:
        raise HTTPException(status_code=404, detail="Duplicate record not found")

    sec_id = flag.candidate_id if req.primary_candidate_id == flag.duplicate_of_candidate_id else flag.duplicate_of_candidate_id
    success = merge_candidates(db, primary_id=req.primary_candidate_id, secondary_id=sec_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to merge candidate records")

    return {"message": "Candidate records successfully merged", "primary_id": req.primary_candidate_id}

@router.post("/dismiss")
def dismiss_duplicate_flag(
    req: DuplicateDismissRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    flag = db.query(DuplicateFlag).filter(DuplicateFlag.id == req.duplicate_flag_id).first()
    if not flag:
        raise HTTPException(status_code=404, detail="Duplicate record not found")

    flag.status = "dismissed"
    db.commit()
    return {"message": "Duplicate flag dismissed"}
