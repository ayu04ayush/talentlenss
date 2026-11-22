import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Text, Boolean, DateTime, ForeignKey, Index, JSON
)
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    company_name = Column(String(255), nullable=True, default="TalentLens Org")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    jobs = relationship("Job", back_populates="user", cascade="all, delete-orphan")
    candidates = relationship("Candidate", back_populates="user", cascade="all, delete-orphan")
    email_templates = relationship("EmailTemplate", back_populates="user", cascade="all, delete-orphan")
    filter_presets = relationship("FilterPreset", back_populates="user", cascade="all, delete-orphan")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), index=True, nullable=False)
    department = Column(String(255), nullable=True, default="Engineering")
    description = Column(Text, nullable=False)
    raw_text = Column(Text, nullable=True)
    required_skills = Column(JSON, default=list)  # list of canonical skill strings
    nice_skills = Column(JSON, default=list)      # list of canonical skill strings
    min_experience = Column(Float, default=0.0)
    max_experience = Column(Float, default=20.0)
    min_cgpa = Column(Float, default=0.0)
    location = Column(String(255), nullable=True)
    education_req = Column(String(255), nullable=True)
    # Weights for scoring: semantic, skills, experience, education, location (sum to 100)
    weights = Column(JSON, default=lambda: {
        "semantic": 25,
        "skills": 35,
        "experience": 20,
        "education": 10,
        "location": 10
    })
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="jobs")
    scores = relationship("Score", back_populates="job", cascade="all, delete-orphan")


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), index=True, nullable=False)
    email = Column(String(255), index=True, nullable=True)
    phone = Column(String(100), index=True, nullable=True)
    location = Column(String(255), index=True, nullable=True)
    linkedin_url = Column(String(500), nullable=True)
    github_url = Column(String(500), nullable=True)
    summary = Column(Text, nullable=True)

    # Structured Education & Scores
    education = Column(JSON, default=list) # [{degree, institution, branch, graduation_year, CGPA, percentage}]
    tenth_percentage = Column(Float, nullable=True, index=True)
    twelfth_percentage = Column(Float, nullable=True, index=True)
    cgpa = Column(Float, nullable=True, index=True) # Normalized to 10-point scale
    cgpa_raw = Column(Float, nullable=True)
    original_scale = Column(Float, nullable=True, default=10.0)
    graduation_year = Column(Integer, nullable=True, index=True)

    # Structured Skills & Experience
    skills = Column(JSON, default=list) # canonical lowercase strings
    experience = Column(JSON, default=list) # [{company, role, start, end, duration_months, description}]
    total_experience_years = Column(Float, default=0.0, index=True)
    projects = Column(JSON, default=list)
    certifications = Column(JSON, default=list)

    # Parsing metadata & Recruiter Flags
    parsing_confidence = Column(Float, default=0.85) # 0.0 - 1.0
    is_manually_corrected = Column(Boolean, default=False)
    current_stage = Column(String(50), default="Applied", index=True) # Applied, Shortlisted, Interview, Offer, Rejected
    star_rating = Column(Integer, default=0) # 0 to 5
    interview_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    user = relationship("User", back_populates="candidates")
    resume_files = relationship("ResumeFile", back_populates="candidate", cascade="all, delete-orphan")
    scores = relationship("Score", back_populates="candidate", cascade="all, delete-orphan")
    stage_histories = relationship("StageHistory", back_populates="candidate", cascade="all, delete-orphan")
    notes = relationship("CandidateNote", back_populates="candidate", cascade="all, delete-orphan")
    tags = relationship("CandidateTag", back_populates="candidate", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_candidate_filter_multi", "user_id", "current_stage", "total_experience_years", "cgpa"),
    )


class ResumeFile(Base):
    __tablename__ = "resume_files"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="SET NULL"), nullable=True, index=True)
    batch_id = Column(String(100), index=True, nullable=True)
    file_name = Column(String(255), nullable=False)
    file_hash = Column(String(64), index=True, nullable=False) # SHA-256
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    # queued, extracting, parsing, scoring, done, failed
    status = Column(String(50), default="queued", index=True)
    error_message = Column(Text, nullable=True)
    extracted_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    candidate = relationship("Candidate", back_populates="resume_files")


class Score(Base):
    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    total_score = Column(Float, default=0.0, index=True) # 0 to 100
    semantic_score = Column(Float, default=0.0)
    skill_score = Column(Float, default=0.0)
    experience_score = Column(Float, default=0.0)
    education_score = Column(Float, default=0.0)
    location_score = Column(Float, default=0.0)
    matched_skills = Column(JSON, default=list)
    missing_skills = Column(JSON, default=list)
    ai_explanation = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

    candidate = relationship("Candidate", back_populates="scores")
    job = relationship("Job", back_populates="scores")

    __table_args__ = (
        Index("idx_candidate_job_score", "candidate_id", "job_id", unique=True),
    )


class StageHistory(Base):
    __tablename__ = "stage_history"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True)
    from_stage = Column(String(50), nullable=True)
    to_stage = Column(String(50), nullable=False)
    moved_by = Column(String(255), default="Recruiter")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    candidate = relationship("Candidate", back_populates="stage_histories")


class CandidateNote(Base):
    __tablename__ = "candidate_notes"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True)
    author_name = Column(String(255), default="Recruiter")
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    candidate = relationship("Candidate", back_populates="notes")


class CandidateTag(Base):
    __tablename__ = "candidate_tags"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True)
    tag = Column(String(100), nullable=False, index=True)

    candidate = relationship("Candidate", back_populates="tags")


class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    stage_trigger = Column(String(50), nullable=True) # Shortlisted, Interview, Offer, Rejected
    subject = Column(String(500), nullable=False)
    body_template = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="email_templates")


class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_email = Column(String(255), nullable=False)
    template_name = Column(String(255), nullable=True)
    subject = Column(String(500), nullable=False)
    body_rendered = Column(Text, nullable=False)
    status = Column(String(50), default="sent") # sent, failed, dry_run
    error_message = Column(Text, nullable=True)
    sent_at = Column(DateTime, default=datetime.datetime.utcnow)


class FilterPreset(Base):
    __tablename__ = "filter_presets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    filters_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="filter_presets")


class DuplicateFlag(Base):
    __tablename__ = "duplicate_flags"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True)
    duplicate_of_candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True)
    match_type = Column(String(50), nullable=False) # file_hash, email_phone, fuzzy_embedding
    confidence = Column(Float, default=1.0) # 0.0 to 1.0
    status = Column(String(50), default="pending") # pending, merged, dismissed
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
