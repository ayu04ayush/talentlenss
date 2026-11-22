export interface User {
  id: number;
  email: string;
  full_name: string;
  company_name?: string;
  created_at: string;
}

export interface JobWeights {
  semantic: number;
  skills: number;
  experience: number;
  education: number;
  location: number;
}

export interface Job {
  id: number;
  user_id: number;
  title: string;
  department?: string;
  description: string;
  raw_text?: string;
  required_skills: string[];
  nice_skills: string[];
  min_experience: number;
  max_experience: number;
  min_cgpa: number;
  location?: string;
  education_req?: string;
  weights: JobWeights;
  is_active: boolean;
  created_at: string;
}

export interface EducationItem {
  degree?: string;
  institution?: string;
  branch?: string;
  graduation_year?: number;
  cgpa?: number;
  percentage?: number;
}

export interface ExperienceItem {
  company?: string;
  role?: string;
  start?: string;
  end?: string;
  duration_months?: number;
  description?: string;
}

export interface ProjectItem {
  title?: string;
  description?: string;
  technologies?: string[];
  link?: string;
}

export interface ScoreData {
  id?: number;
  candidate_id: number;
  job_id: number;
  total_score: number;
  semantic_score: number;
  skill_score: number;
  experience_score: number;
  education_score: number;
  location_score: number;
  matched_skills: string[];
  missing_skills: string[];
  ai_explanation?: string;
  updated_at?: string;
}

export interface ResumeFileItem {
  id: number;
  file_name: string;
  file_hash: string;
  file_size: number;
  mime_type: string;
  status: 'queued' | 'extracting' | 'parsing' | 'scoring' | 'done' | 'failed';
  error_message?: string;
  created_at: string;
}

export type PipelineStage = 'Applied' | 'Shortlisted' | 'Interview' | 'Offer' | 'Rejected';

export interface Candidate {
  id: number;
  user_id: number;
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  github_url?: string;
  summary?: string;
  education: EducationItem[];
  tenth_percentage?: number;
  twelfth_percentage?: number;
  cgpa?: number;
  cgpa_raw?: number;
  original_scale?: number;
  graduation_year?: number;
  skills: string[];
  experience: ExperienceItem[];
  total_experience_years: number;
  projects: ProjectItem[];
  certifications: any[];
  parsing_confidence: number;
  is_manually_corrected: boolean;
  current_stage: PipelineStage;
  star_rating: number;
  interview_date?: string;
  created_at: string;
  resume_files?: ResumeFileItem[];
  match_score?: ScoreData;
}

export interface StageHistoryItem {
  id: number;
  candidate_id: number;
  from_stage?: string;
  to_stage: string;
  moved_by: string;
  notes?: string;
  created_at: string;
}

export interface CandidateNote {
  id: number;
  candidate_id: number;
  author_name: string;
  content: string;
  created_at: string;
}

export interface DuplicateFlagItem {
  id: number;
  candidate_id: number;
  duplicate_of_candidate_id: number;
  match_type: 'file_hash' | 'email_phone' | 'fuzzy_embedding';
  confidence: number;
  status: 'pending' | 'merged' | 'dismissed';
  created_at: string;
  candidate: Candidate;
  original_candidate: Candidate;
}

export interface EmailTemplate {
  id: number;
  user_id: number;
  name: string;
  stage_trigger?: string;
  subject: string;
  body_template: string;
  created_at: string;
}

export interface EmailLog {
  id: number;
  candidate_id: number;
  recipient_email: string;
  template_name?: string;
  subject: string;
  body_rendered: string;
  status: 'sent' | 'failed' | 'dry_run';
  error_message?: string;
  sent_at: string;
}

export interface LearningResource {
  title: string;
  type: string;
  url?: string;
}

export interface SkillGapItem {
  skill: string;
  status: 'missing' | 'weak' | 'matched';
  importance: 'required' | 'nice_to_have';
  reason: string;
  learning_resources: LearningResource[];
}

export interface SkillGapAnalysis {
  candidate_id: number;
  job_id: number;
  readiness_percentage: number;
  missing_required_skills: string[];
  weak_skills: string[];
  matched_skills: string[];
  suggested_learning_path: SkillGapItem[];
}

export interface AnalyticsOverviewData {
  total_candidates: number;
  shortlisted: number;
  interviews: number;
  offers: number;
  rejected: number;
  avg_match_score: number;
  avg_time_in_stage_days: number;
  funnel: { stage: string; count: number }[];
  top_candidates: {
    id: number;
    name: string;
    stage: string;
    score: number;
    skills: string[];
    experience: number;
  }[];
}

export interface SkillDemandSupply {
  skill: string;
  demand_count: number;
  supply_count: number;
}
