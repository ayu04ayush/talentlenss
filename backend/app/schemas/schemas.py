from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Auth ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str
    company_name: Optional[str] = "TalentLens Org"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    company_name: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# --- Jobs ---
class JobWeights(BaseModel):
    semantic: float = 25.0
    skills: float = 35.0
    experience: float = 20.0
    education: float = 10.0
    location: float = 10.0

class JobBase(BaseModel):
    title: str
    department: Optional[str] = "Engineering"
    description: str
    raw_text: Optional[str] = None
    required_skills: List[str] = []
    nice_skills: List[str] = []
    min_experience: float = 0.0
    max_experience: float = 20.0
    min_cgpa: float = 0.0
    location: Optional[str] = None
    education_req: Optional[str] = None
    weights: Optional[Dict[str, float]] = None
    is_active: bool = True

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    description: Optional[str] = None
    required_skills: Optional[List[str]] = None
    nice_skills: Optional[List[str]] = None
    min_experience: Optional[float] = None
    max_experience: Optional[float] = None
    min_cgpa: Optional[float] = None
    location: Optional[str] = None
    education_req: Optional[str] = None
    weights: Optional[Dict[str, float]] = None
    is_active: Optional[bool] = None

class JobResponse(JobBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class JobParseTextRequest(BaseModel):
    raw_text: str

# --- Candidate Sub-structures ---
class EducationItem(BaseModel):
    degree: Optional[str] = None
    institution: Optional[str] = None
    branch: Optional[str] = None
    graduation_year: Optional[int] = None
    cgpa: Optional[float] = None
    percentage: Optional[float] = None

class ExperienceItem(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    start: Optional[str] = None
    end: Optional[str] = None
    duration_months: Optional[int] = 0
    description: Optional[str] = None

class ProjectItem(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    technologies: List[str] = []
    link: Optional[str] = None

class CertificationItem(BaseModel):
    name: Optional[str] = None
    issuer: Optional[str] = None
    year: Optional[int] = None

# --- Candidate ---
class CandidateBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    summary: Optional[str] = None
    education: List[Dict[str, Any]] = []
    tenth_percentage: Optional[float] = None
    twelfth_percentage: Optional[float] = None
    cgpa: Optional[float] = None
    cgpa_raw: Optional[float] = None
    original_scale: Optional[float] = 10.0
    graduation_year: Optional[int] = None
    skills: List[str] = []
    experience: List[Dict[str, Any]] = []
    total_experience_years: float = 0.0
    projects: List[Dict[str, Any]] = []
    certifications: List[Dict[str, Any]] = []
    parsing_confidence: float = 0.85
    is_manually_corrected: bool = False
    current_stage: str = "Applied"
    star_rating: int = 0
    interview_date: Optional[datetime] = None

class CandidateCreate(CandidateBase):
    pass

class CandidateUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    summary: Optional[str] = None
    education: Optional[List[Dict[str, Any]]] = None
    tenth_percentage: Optional[float] = None
    twelfth_percentage: Optional[float] = None
    cgpa: Optional[float] = None
    cgpa_raw: Optional[float] = None
    original_scale: Optional[float] = None
    graduation_year: Optional[int] = None
    skills: Optional[List[str]] = None
    experience: Optional[List[Dict[str, Any]]] = None
    total_experience_years: Optional[float] = None
    projects: Optional[List[Dict[str, Any]]] = None
    certifications: Optional[List[Dict[str, Any]]] = None
    parsing_confidence: Optional[float] = None
    is_manually_corrected: Optional[bool] = None
    current_stage: Optional[str] = None
    star_rating: Optional[int] = None
    interview_date: Optional[datetime] = None

class ScoreResponse(BaseModel):
    id: Optional[int] = None
    job_id: int
    candidate_id: int
    total_score: float
    semantic_score: float
    skill_score: float
    experience_score: float
    education_score: float
    location_score: float
    matched_skills: List[str] = []
    missing_skills: List[str] = []
    ai_explanation: Optional[str] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ResumeFileResponse(BaseModel):
    id: int
    file_name: str
    file_hash: str
    file_size: int
    mime_type: str
    status: str
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class CandidateResponse(CandidateBase):
    id: int
    user_id: int
    created_at: datetime
    resume_files: List[ResumeFileResponse] = []
    match_score: Optional[ScoreResponse] = None

    class Config:
        from_attributes = True

class CandidateListResponse(BaseModel):
    items: List[CandidateResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

# --- Pipeline ---
class StageMoveRequest(BaseModel):
    candidate_id: int
    to_stage: str
    notes: Optional[str] = None

class BulkStageMoveRequest(BaseModel):
    candidate_ids: List[int]
    to_stage: str
    notes: Optional[str] = None

class StageHistoryResponse(BaseModel):
    id: int
    candidate_id: int
    from_stage: Optional[str]
    to_stage: str
    moved_by: str
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# --- Notes & Tags ---
class NoteCreate(BaseModel):
    content: str
    author_name: Optional[str] = "Recruiter"

class NoteResponse(BaseModel):
    id: int
    candidate_id: int
    author_name: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class TagCreate(BaseModel):
    tag: str

# --- Duplicate Detection ---
class DuplicateResponse(BaseModel):
    id: int
    candidate_id: int
    duplicate_of_candidate_id: int
    match_type: str
    confidence: float
    status: str
    created_at: datetime
    candidate: CandidateResponse
    original_candidate: CandidateResponse

    class Config:
        from_attributes = True

class DuplicateMergeRequest(BaseModel):
    duplicate_flag_id: int
    primary_candidate_id: int # the one to keep

class DuplicateDismissRequest(BaseModel):
    duplicate_flag_id: int

# --- Bulk Emails ---
class EmailTemplateCreate(BaseModel):
    name: str
    stage_trigger: Optional[str] = None
    subject: str
    body_template: str

class EmailTemplateResponse(BaseModel):
    id: int
    user_id: int
    name: str
    stage_trigger: Optional[str]
    subject: str
    body_template: str
    created_at: datetime

    class Config:
        from_attributes = True

class EmailPreviewRequest(BaseModel):
    template_id: Optional[int] = None
    subject_template: Optional[str] = None
    body_template: Optional[str] = None
    candidate_id: int
    job_id: Optional[int] = None

class EmailSendRequest(BaseModel):
    candidate_ids: List[int]
    template_id: Optional[int] = None
    subject: Optional[str] = None
    body_template: Optional[str] = None
    job_id: Optional[int] = None
    dry_run: bool = True

class EmailLogResponse(BaseModel):
    id: int
    candidate_id: int
    recipient_email: str
    template_name: Optional[str]
    subject: str
    body_rendered: str
    status: str
    error_message: Optional[str]
    sent_at: datetime

    class Config:
        from_attributes = True

# --- Skill Gap ---
class LearningResource(BaseModel):
    title: str
    type: str # Course, Documentation, Practice, Book
    url: Optional[str] = None

class SkillGapItem(BaseModel):
    skill: str
    status: str # missing, weak, matched
    importance: str # required, nice_to_have
    reason: str
    learning_resources: List[LearningResource] = []

class SkillGapResponse(BaseModel):
    candidate_id: int
    job_id: int
    readiness_percentage: float
    missing_required_skills: List[str]
    weak_skills: List[str]
    matched_skills: List[str]
    suggested_learning_path: List[SkillGapItem]

# --- Analytics ---
class AnalyticsOverview(BaseModel):
    total_candidates: int
    shortlisted: int
    interviews: int
    offers: int
    rejected: int
    avg_match_score: float
    avg_time_in_stage_days: float
    funnel: List[Dict[str, Any]]
    top_candidates: List[Dict[str, Any]]

class SkillDemandSupply(BaseModel):
    skill: str
    demand_count: int
    supply_count: int

# --- Comparison ---
class CandidateComparisonRequest(BaseModel):
    candidate_ids: List[int]
    job_id: Optional[int] = None
