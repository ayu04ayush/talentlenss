import os
import asyncio
import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.models import ResumeFile, Candidate, Job, Score, DuplicateFlag, StageHistory
from app.services.parser import extract_text, parse_resume_content
from app.services.matcher import calculate_candidate_match
from app.services.duplicates import compute_file_sha256, check_duplicate_candidate

logger = logging.getLogger(__name__)

# Active background processing tasks tracker
_processing_batches: Dict[str, Dict[str, Any]] = {}

async def process_single_resume(file_id: int, job_id: Optional[int] = None, user_id: Optional[int] = None) -> bool:
    """
    Processes a single resume file through all stages:
    queued -> extracting -> parsing -> scoring -> done (or failed)
    """
    db: Session = SessionLocal()
    try:
        res_file = db.query(ResumeFile).filter(ResumeFile.id == file_id).first()
        if not res_file:
            return False

        # Stage 1: extracting
        res_file.status = "extracting"
        db.commit()

        text, is_empty_or_scanned = extract_text(res_file.file_path, res_file.mime_type)
        res_file.extracted_text = text
        if is_empty_or_scanned and not text:
            res_file.status = "failed"
            res_file.error_message = "File appears to be empty or an unreadable scanned image (needs manual review)."
            db.commit()
            return False

        # Stage 2: parsing
        res_file.status = "parsing"
        db.commit()

        parsed_data = await parse_resume_content(text)
        if not parsed_data or not parsed_data.get("name"):
            parsed_data["name"] = os.path.splitext(res_file.file_name)[0].replace("_", " ").title()

        # Determine effective user_id
        effective_user_id = user_id
        if not effective_user_id:
            if job_id:
                j = db.query(Job).filter(Job.id == job_id).first()
                if j:
                    effective_user_id = j.user_id
            if not effective_user_id and res_file.candidate_id:
                c = db.query(Candidate).filter(Candidate.id == res_file.candidate_id).first()
                if c:
                    effective_user_id = c.user_id
        if not effective_user_id:
            effective_user_id = 1

        # Check for duplicates before creating new candidate
        existing_dup = check_duplicate_candidate(
            db=db,
            user_id=effective_user_id,
            file_hash=res_file.file_hash,
            email=parsed_data.get("email"),
            phone=parsed_data.get("phone"),
            name=parsed_data.get("name", ""),
            candidate_id_to_exclude=res_file.candidate_id
        )

        candidate = None
        if res_file.candidate_id:
            candidate = db.query(Candidate).filter(Candidate.id == res_file.candidate_id).first()

        if not candidate:
            candidate = Candidate(
                user_id=effective_user_id,
                name=parsed_data.get("name", "Candidate"),
                email=parsed_data.get("email"),
                phone=parsed_data.get("phone"),
                location=parsed_data.get("location"),
                linkedin_url=parsed_data.get("linkedin_url"),
                github_url=parsed_data.get("github_url"),
                summary=parsed_data.get("summary"),
                education=parsed_data.get("education", []),
                tenth_percentage=parsed_data.get("tenth_percentage"),
                twelfth_percentage=parsed_data.get("twelfth_percentage"),
                cgpa=parsed_data.get("cgpa"),
                cgpa_raw=parsed_data.get("cgpa_raw"),
                original_scale=parsed_data.get("original_scale", 10.0),
                graduation_year=parsed_data.get("graduation_year"),
                skills=parsed_data.get("skills", []),
                experience=parsed_data.get("experience", []),
                total_experience_years=parsed_data.get("total_experience_years", 0.0),
                projects=parsed_data.get("projects", []),
                certifications=parsed_data.get("certifications", []),
                parsing_confidence=parsed_data.get("parsing_confidence", 0.85),
                current_stage="Applied"
            )
            db.add(candidate)
            db.commit()
            db.refresh(candidate)

            # Record initial stage history
            hist = StageHistory(
                candidate_id=candidate.id,
                from_stage=None,
                to_stage="Applied",
                moved_by="System",
                notes=f"Auto-imported from {res_file.file_name}"
            )
            db.add(hist)
            db.commit()

            res_file.candidate_id = candidate.id
            db.commit()

        # If duplicate detected, create DuplicateFlag
        if existing_dup:
            orig_id, match_type, conf = existing_dup
            if orig_id != candidate.id:
                # Check if flag already exists
                existing_flag = db.query(DuplicateFlag).filter(
                    DuplicateFlag.candidate_id == candidate.id,
                    DuplicateFlag.duplicate_of_candidate_id == orig_id
                ).first()
                if not existing_flag:
                    flag = DuplicateFlag(
                        candidate_id=candidate.id,
                        duplicate_of_candidate_id=orig_id,
                        match_type=match_type,
                        confidence=conf,
                        status="pending"
                    )
                    db.add(flag)
                    db.commit()

        # Stage 3: scoring
        res_file.status = "scoring"
        db.commit()

        # Score against target job (or all active jobs if none specified)
        jobs_to_score = []
        if job_id:
            j = db.query(Job).filter(Job.id == job_id).first()
            if j:
                jobs_to_score.append(j)
        else:
            jobs_to_score = db.query(Job).filter(Job.user_id == user_id, Job.is_active == True).all()

        for j in jobs_to_score:
            score_data = await calculate_candidate_match(candidate, j)
            # Upsert score
            existing_score = db.query(Score).filter(
                Score.candidate_id == candidate.id,
                Score.job_id == j.id
            ).first()

            if existing_score:
                for k, v in score_data.items():
                    setattr(existing_score, k, v)
            else:
                new_score = Score(**score_data)
                db.add(new_score)
            db.commit()

        # Stage 4: done
        res_file.status = "done"
        res_file.error_message = None
        db.commit()
        return True

    except Exception as e:
        logger.error(f"Error processing resume {file_id}: {e}", exc_info=True)
        try:
            res_file = db.query(ResumeFile).filter(ResumeFile.id == file_id).first()
            if res_file:
                res_file.status = "failed"
                res_file.error_message = str(e)
                db.commit()
        except Exception:
            pass
        return False
    finally:
        db.close()

async def background_batch_worker(file_ids: List[int], job_id: Optional[int] = None, user_id: Optional[int] = None):
    """Worker task processing list of files asynchronously."""
    for fid in file_ids:
        await process_single_resume(fid, job_id, user_id)
        await asyncio.sleep(0.05) # Yield control
