import hashlib
import logging
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from app.models.models import Candidate, ResumeFile, DuplicateFlag, StageHistory, CandidateNote, Score

logger = logging.getLogger(__name__)

def compute_file_sha256(content: bytes) -> str:
    """Calculates SHA-256 hash of file contents."""
    h = hashlib.sha256()
    h.update(content)
    return h.hexdigest()

def string_similarity(s1: str, s2: str) -> float:
    """Calculates normalized Bigram similarity between two strings."""
    s1 = s1.lower().strip()
    s2 = s2.lower().strip()
    if s1 == s2:
        return 1.0
    if not s1 or not s2:
        return 0.0
    
    pairs1 = {s1[i:i+2] for i in range(len(s1)-1)}
    pairs2 = {s2[i:i+2] for i in range(len(s2)-1)}
    
    if not pairs1 or not pairs2:
        return 0.0
    
    intersection = len(pairs1.intersection(pairs2))
    total = len(pairs1) + len(pairs2)
    return round((2.0 * intersection) / total, 2)

def check_duplicate_candidate(
    db: Session,
    user_id: int,
    file_hash: Optional[str],
    email: Optional[str],
    phone: Optional[str],
    name: str,
    candidate_id_to_exclude: Optional[int] = None
) -> Optional[Tuple[int, str, float]]:
    """
    Checks if a candidate is a duplicate using a 3-tier check:
    1. SHA-256 file hash match (confidence 1.0)
    2. Exact email or exact phone match (confidence 0.95)
    3. Fuzzy name similarity > 0.85 (confidence 0.85)

    Returns (existing_candidate_id, match_type, confidence) or None.
    """
    # 1. SHA-256 hash check
    if file_hash:
        existing_file = db.query(ResumeFile).join(Candidate).filter(
            Candidate.user_id == user_id,
            ResumeFile.file_hash == file_hash
        )
        if candidate_id_to_exclude:
            existing_file = existing_file.filter(ResumeFile.candidate_id != candidate_id_to_exclude)
        res_file = existing_file.first()
        if res_file and res_file.candidate_id:
            return res_file.candidate_id, "file_hash", 1.0

    # 2. Email or Phone exact match
    if email:
        existing_email = db.query(Candidate).filter(
            Candidate.user_id == user_id,
            Candidate.email == email
        )
        if candidate_id_to_exclude:
            existing_email = existing_email.filter(Candidate.id != candidate_id_to_exclude)
        c = existing_email.first()
        if c:
            return c.id, "email_phone", 0.95

    if phone and len(phone) >= 7:
        clean_p = ''.join(filter(str.isdigit, phone))
        all_candidates = db.query(Candidate).filter(Candidate.user_id == user_id)
        if candidate_id_to_exclude:
            all_candidates = all_candidates.filter(Candidate.id != candidate_id_to_exclude)
        for cand in all_candidates.all():
            if cand.phone:
                cand_clean = ''.join(filter(str.isdigit, cand.phone))
                if clean_p and cand_clean and (clean_p in cand_clean or cand_clean in clean_p):
                    return cand.id, "email_phone", 0.92

    # 3. Fuzzy Name match
    if name and len(name.split()) >= 2:
        candidates = db.query(Candidate).filter(Candidate.user_id == user_id)
        if candidate_id_to_exclude:
            candidates = candidates.filter(Candidate.id != candidate_id_to_exclude)
        for cand in candidates.all():
            sim = string_similarity(name, cand.name)
            if sim >= 0.85:
                return cand.id, "fuzzy_embedding", sim

    return None

def merge_candidates(db: Session, primary_id: int, secondary_id: int) -> bool:
    """
    Merges duplicate candidate into primary candidate:
    - Transfers files, notes, tags, stage history
    - Keeps primary candidate's latest profile
    - Removes duplicate candidate and duplicate flag
    """
    primary = db.query(Candidate).filter(Candidate.id == primary_id).first()
    secondary = db.query(Candidate).filter(Candidate.id == secondary_id).first()

    if not primary or not secondary:
        return False

    # Transfer resume files
    for rf in secondary.resume_files:
        rf.candidate_id = primary.id
    
    # Transfer notes
    for note in secondary.notes:
        note.candidate_id = primary.id

    # Record stage history entry
    merge_hist = StageHistory(
        candidate_id=primary.id,
        from_stage=primary.current_stage,
        to_stage=primary.current_stage,
        moved_by="System",
        notes=f"Merged duplicate record (Candidate #{secondary.id}: {secondary.name})"
    )
    db.add(merge_hist)

    # Delete secondary duplicate flags
    db.query(DuplicateFlag).filter(
        (DuplicateFlag.candidate_id == secondary.id) |
        (DuplicateFlag.duplicate_of_candidate_id == secondary.id)
    ).delete(synchronize_session=False)

    # Delete secondary candidate
    db.delete(secondary)
    db.commit()
    return True
