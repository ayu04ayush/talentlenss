import re
import logging
from typing import Dict, Any, List, Optional, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import httpx

from app.config import settings
from app.utils.aliases import normalize_skills_list

logger = logging.getLogger(__name__)

def compute_semantic_similarity(candidate_text: str, job_text: str) -> float:
    """
    Computes semantic similarity score (0.0 to 100.0) combining TF-IDF cosine similarity
    and token-level keyword overlap for robust matching across short and long documents.
    """
    if not candidate_text.strip() or not job_text.strip():
        return 50.0
    try:
        vectorizer = TfidfVectorizer(
            stop_words='english',
            ngram_range=(1, 2),
            sublinear_tf=True
        )
        tfidf_matrix = vectorizer.fit_transform([candidate_text, job_text])
        sim = float(cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0])

        # Fast, non-backtracking word tokenization
        w1 = set(re.findall(r'[a-zA-Z0-9_+#]{2,}', candidate_text.lower()))
        w2 = set(re.findall(r'[a-zA-Z0-9_+#]{2,}', job_text.lower()))
        overlap = len(w1.intersection(w2))
        jaccard = overlap / max(len(w1.union(w2)), 1)
        containment = overlap / max(min(len(w1), len(w2)), 1)

        metric = max(sim * 1.8, jaccard * 2.0, containment * 0.9)
        scaled_sim = min(max((metric * 100.0), 15.0), 98.0)
        return round(float(scaled_sim), 1)
    except Exception as e:
        logger.error(f"Error computing semantic similarity: {e}")
        return 60.0

def compute_skill_overlap(
    candidate_skills: List[str],
    required_skills: List[str],
    nice_skills: List[str]
) -> Tuple[float, List[str], List[str]]:
    """
    Calculates weighted skill overlap score (0-100), matched skills, and missing skills.
    Required skills carry 75% weight, nice-to-have carry 25%.
    """
    c_skills_set = set(candidate_skills)
    req_set = set(required_skills)
    nice_set = set(nice_skills)

    matched_required = req_set.intersection(c_skills_set)
    missing_required = req_set.difference(c_skills_set)
    matched_nice = nice_set.intersection(c_skills_set)

    matched_all = sorted(list(matched_required.union(matched_nice)))
    missing_all = sorted(list(missing_required))

    req_score = (len(matched_required) / len(req_set) * 100.0) if req_set else 100.0
    nice_score = (len(matched_nice) / len(nice_set) * 100.0) if nice_set else 100.0

    if req_set and nice_set:
        final_skill_score = (req_score * 0.75) + (nice_score * 0.25)
    elif req_set:
        final_skill_score = req_score
    elif nice_set:
        final_skill_score = nice_score
    else:
        final_skill_score = 75.0

    return round(float(final_skill_score), 1), matched_all, missing_all

def compute_experience_fit(cand_exp_years: float, min_exp: float, max_exp: float) -> float:
    """Calculates experience fit score (0-100)."""
    if min_exp <= 0 and max_exp <= 0:
        return 100.0

    if min_exp <= cand_exp_years <= max_exp:
        return 100.0
    elif cand_exp_years < min_exp:
        if min_exp == 0:
            return 100.0
        ratio = cand_exp_years / min_exp
        return round(max(ratio * 85.0, 15.0), 1)
    else: # cand_exp_years > max_exp
        excess = cand_exp_years - max_exp
        # slight overqualification slope
        penalty = min(excess * 3.0, 20.0)
        return round(max(100.0 - penalty, 80.0), 1)

def compute_education_fit(cand_cgpa: Optional[float], min_cgpa: float, cand_edu: List[Dict[str, Any]], edu_req: Optional[str]) -> float:
    """Calculates education and academic fit score (0-100)."""
    score = 80.0
    if cand_cgpa is not None and cand_cgpa > 0:
        if min_cgpa > 0:
            if cand_cgpa >= min_cgpa:
                score = 100.0
            else:
                score = max((cand_cgpa / min_cgpa) * 85.0, 30.0)
        else:
            if cand_cgpa >= 8.5:
                score = 98.0
            elif cand_cgpa >= 7.0:
                score = 85.0
            else:
                score = 70.0
    
    # Check degree requirement if specified
    if edu_req and cand_edu:
        edu_str = " ".join([str(e.get("degree", "")) + " " + str(e.get("branch", "")) for e in cand_edu]).lower()
        if any(term in edu_str for term in ["tech", "engineering", "b.e", "b.s", "computer", "science"]):
            score = min(score + 5.0, 100.0)

    return round(float(score), 1)

def compute_location_fit(cand_loc: Optional[str], job_loc: Optional[str]) -> float:
    """Calculates location fit score (0-100)."""
    if not job_loc or job_loc.lower() in ["remote", "anywhere", "flexible", "hybrid"]:
        return 100.0
    if not cand_loc:
        return 70.0
    
    c_loc = cand_loc.lower()
    j_loc = job_loc.lower()

    if j_loc in c_loc or c_loc in j_loc:
        return 100.0
    if "remote" in c_loc:
        return 90.0
    
    return 50.0

def generate_template_explanation(
    cand_name: str,
    job_title: str,
    total_score: float,
    matched_skills: List[str],
    missing_skills: List[str],
    exp_years: float,
    min_exp: float
) -> str:
    """Deterministic, high-quality recruiter explanation without an API key."""
    fit_level = "strong" if total_score >= 80 else ("moderate" if total_score >= 60 else "developing")
    
    parts = []
    parts.append(f"{cand_name} presents a {fit_level} profile for the {job_title} role with an overall score of {int(total_score)}/100.")

    if matched_skills:
        top_skills = ", ".join(matched_skills[:4])
        parts.append(f"Demonstrates solid proficiency in key requirements including {top_skills}.")
    
    if exp_years >= min_exp:
        parts.append(f"Brings {exp_years} years of professional experience, meeting the minimum {min_exp} year requirement.")
    else:
        parts.append(f"Has {exp_years} years of experience against the preferred {min_exp} years.")

    if missing_skills:
        parts.append(f"Key skill gaps to probe during screening: {', '.join(missing_skills[:3])}.")

    return " ".join(parts)

async def generate_ai_explanation(
    cand_name: str,
    job_title: str,
    total_score: float,
    matched_skills: List[str],
    missing_skills: List[str],
    exp_years: float,
    min_exp: float,
    summary: Optional[str]
) -> str:
    """Generates AI explanation using Gemini if configured, else template fallback."""
    if not settings.GEMINI_API_KEY:
        return generate_template_explanation(
            cand_name, job_title, total_score, matched_skills, missing_skills, exp_years, min_exp
        )

    prompt = f"""You are a senior technical recruiter. Write a concise, 2 to 3 sentence evaluation summary for this candidate fit.
Candidate: {cand_name}
Target Role: {job_title}
Match Score: {int(total_score)}/100
Total Experience: {exp_years} years (Required: {min_exp} years)
Matched Skills: {', '.join(matched_skills[:5])}
Missing Skills: {', '.join(missing_skills[:5])}
Candidate Summary: {summary or 'N/A'}

Be direct, objective, and highlight both strengths and gap areas."""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 200}
    }
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                if text:
                    return text
    except Exception as e:
        logger.warning(f"AI explanation call failed: {e}. Using fallback.")

    return generate_template_explanation(
        cand_name, job_title, total_score, matched_skills, missing_skills, exp_years, min_exp
    )

async def calculate_candidate_match(
    candidate: Any, # Candidate model instance
    job: Any,       # Job model instance
) -> Dict[str, Any]:
    """
    Computes complete hybrid match score for a candidate against a job description.
    """
    weights = job.weights or {
        "semantic": 25.0,
        "skills": 35.0,
        "experience": 20.0,
        "education": 10.0,
        "location": 10.0
    }

    # 1. Candidate full text for semantic similarity
    skills_text = " ".join(candidate.skills or [])
    edu_text = " ".join([f"{e.get('degree', '')} {e.get('branch', '')}" for e in (candidate.education or [])])
    exp_text = " ".join([f"{x.get('role', '')} {x.get('company', '')} {x.get('description', '')}" for x in (candidate.experience or [])])
    candidate_profile_text = f"{candidate.summary or ''} {skills_text} {exp_text} {edu_text}"

    # 2. Semantic score
    job_profile_text = f"{job.title} {job.description} {' '.join(job.required_skills or [])} {' '.join(job.nice_skills or [])}"
    semantic_score = compute_semantic_similarity(candidate_profile_text, job_profile_text)

    # 3. Skills score
    skill_score, matched_skills, missing_skills = compute_skill_overlap(
        candidate.skills or [],
        job.required_skills or [],
        job.nice_skills or []
    )

    # 4. Experience score
    experience_score = compute_experience_fit(
        candidate.total_experience_years or 0.0,
        job.min_experience or 0.0,
        job.max_experience or 20.0
    )

    # 5. Education score
    education_score = compute_education_fit(
        candidate.cgpa,
        job.min_cgpa or 0.0,
        candidate.education or [],
        job.education_req
    )

    # 6. Location score
    location_score = compute_location_fit(
        candidate.location,
        job.location
    )

    # Total weighted score
    w_sem = weights.get("semantic", 25.0)
    w_ski = weights.get("skills", 35.0)
    w_exp = weights.get("experience", 20.0)
    w_edu = weights.get("education", 10.0)
    w_loc = weights.get("location", 10.0)
    total_weight = w_sem + w_ski + w_exp + w_edu + w_loc or 100.0

    weighted_total = (
        (semantic_score * w_sem) +
        (skill_score * w_ski) +
        (experience_score * w_exp) +
        (education_score * w_edu) +
        (location_score * w_loc)
    ) / total_weight

    total_score = round(min(max(weighted_total, 0.0), 100.0), 1)

    # Explanation
    explanation = await generate_ai_explanation(
        cand_name=candidate.name,
        job_title=job.title,
        total_score=total_score,
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        exp_years=candidate.total_experience_years or 0.0,
        min_exp=job.min_experience or 0.0,
        summary=candidate.summary
    )

    return {
        "candidate_id": candidate.id,
        "job_id": job.id,
        "total_score": total_score,
        "semantic_score": semantic_score,
        "skill_score": skill_score,
        "experience_score": experience_score,
        "education_score": education_score,
        "location_score": location_score,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "ai_explanation": explanation
    }
