import logging
from typing import Dict, Any, List, Optional
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

LEARNING_RESOURCE_MAP = {
    "python": [
        {"title": "Advanced Python & Asynchronous Programming", "type": "Course", "url": "https://docs.python.org/3/"},
        {"title": "FastAPI & Microservices Architecture", "type": "Documentation", "url": "https://fastapi.tiangolo.com/"}
    ],
    "javascript": [
        {"title": "Modern JavaScript Deep Dive", "type": "Course", "url": "https://javascript.info/"},
        {"title": "MDN Web Docs Core JS APIs", "type": "Documentation", "url": "https://developer.mozilla.org/"}
    ],
    "typescript": [
        {"title": "TypeScript Handbook & Generics", "type": "Documentation", "url": "https://www.typescriptlang.org/docs/"},
        {"title": "Enterprise TypeScript Architecture", "type": "Course", "url": "https://www.typescriptlang.org/"}
    ],
    "react": [
        {"title": "React 19 & Next.js Server Components", "type": "Course", "url": "https://react.dev/"},
        {"title": "State Management with Zustand & TanStack Query", "type": "Documentation", "url": "https://zustand.docs.pmnd.rs/"}
    ],
    "next.js": [
        {"title": "Next.js App Router Masterclass", "type": "Course", "url": "https://nextjs.org/docs"},
        {"title": "Vercel Production Optimization Guide", "type": "Documentation", "url": "https://nextjs.org/learn"}
    ],
    "docker": [
        {"title": "Docker Containers & Multi-stage Builds", "type": "Course", "url": "https://docs.docker.com/"},
        {"title": "Container Security Best Practices", "type": "Documentation", "url": "https://docs.docker.com/develop/"}
    ],
    "kubernetes": [
        {"title": "Certified Kubernetes Administrator (CKA) Curriculum", "type": "Course", "url": "https://kubernetes.io/docs/home/"},
        {"title": "K8s Deployment & Pod Lifecycle Practice", "type": "Practice", "url": "https://kubernetes.io/docs/tutorials/"}
    ],
    "aws": [
        {"title": "AWS Solutions Architect Foundations", "type": "Course", "url": "https://aws.amazon.com/training/"},
        {"title": "AWS Lambda, S3, & ECS Serverless Patterns", "type": "Documentation", "url": "https://docs.aws.amazon.com/"}
    ],
    "postgresql": [
        {"title": "PostgreSQL Query Optimization & Indexing", "type": "Practice", "url": "https://www.postgresql.org/docs/"},
        {"title": "Relational Data Modeling & Isolation Levels", "type": "Course", "url": "https://use-the-index-luke.com/"}
    ],
    "machine learning": [
        {"title": "Applied Machine Learning with Scikit-Learn", "type": "Course", "url": "https://scikit-learn.org/stable/"},
        {"title": "Feature Engineering & Cross Validation", "type": "Practice", "url": "https://developers.google.com/machine-learning/crash-course"}
    ],
    "fastapi": [
        {"title": "High-Performance REST APIs with FastAPI", "type": "Documentation", "url": "https://fastapi.tiangolo.com/tutorial/"},
        {"title": "Pydantic v2 & Async DB Sessions", "type": "Course", "url": "https://docs.pydantic.dev/"}
    ]
}

def generate_deterministic_skill_gap(
    candidate_skills: List[str],
    required_skills: List[str],
    nice_skills: List[str]
) -> Dict[str, Any]:
    """Deterministic, high-quality skill-gap analysis without an API key."""
    c_set = set(candidate_skills)
    req_set = set(required_skills)
    nice_set = set(nice_skills)

    matched_required = req_set.intersection(c_set)
    missing_required = sorted(list(req_set.difference(c_set)))
    matched_nice = nice_set.intersection(c_set)
    missing_nice = sorted(list(nice_set.difference(c_set)))

    # Identify weak/partial matches: skills present in nice-to-have or related
    weak_skills = []
    if "javascript" in c_set and "typescript" in missing_required:
        weak_skills.append("typescript")
    if "python" in c_set and "fastapi" in missing_required:
        weak_skills.append("fastapi")
    if "docker" in c_set and "kubernetes" in missing_required:
        weak_skills.append("kubernetes")

    # Readiness percentage calculation
    total_needed = max(len(req_set) * 1.5 + len(nice_set) * 0.5, 1.0)
    earned = (len(matched_required) * 1.5) + (len(matched_nice) * 0.5) + (len(weak_skills) * 0.4)
    readiness_percentage = round(min(max((earned / total_needed) * 100.0, 15.0), 100.0), 1)

    # Build suggested learning path
    learning_path = []
    # 1. Missing required skills first (High Priority)
    for s in missing_required:
        is_weak = s in weak_skills
        learning_path.append({
            "skill": s,
            "status": "weak" if is_weak else "missing",
            "importance": "required",
            "reason": f"Essential for day-to-day role execution. Candidate has strong foundational knowledge{' but needs production experience' if is_weak else '.'}",
            "learning_resources": LEARNING_RESOURCE_MAP.get(s, [
                {"title": f"Complete {s.capitalize()} Guide & Best Practices", "type": "Documentation", "url": None},
                {"title": f"Hands-on {s.capitalize()} Project Exercises", "type": "Practice", "url": None}
            ])
        })

    # 2. Missing nice-to-have skills next (Medium Priority)
    for s in missing_nice[:3]:
        learning_path.append({
            "skill": s,
            "status": "missing",
            "importance": "nice_to_have",
            "reason": "Value-add skill that enhances team velocity and cross-functional contribution.",
            "learning_resources": LEARNING_RESOURCE_MAP.get(s, [
                {"title": f"Overview of {s.capitalize()} in Modern Stacks", "type": "Documentation", "url": None}
            ])
        })

    return {
        "readiness_percentage": readiness_percentage,
        "missing_required_skills": missing_required,
        "weak_skills": weak_skills,
        "matched_skills": sorted(list(matched_required.union(matched_nice))),
        "suggested_learning_path": learning_path
    }

async def analyze_skill_gap(
    candidate_id: int,
    job_id: int,
    candidate_skills: List[str],
    required_skills: List[str],
    nice_skills: List[str],
    job_title: str
) -> Dict[str, Any]:
    """Generates skill gap analysis using LLM if available, otherwise deterministic."""
    fallback_res = generate_deterministic_skill_gap(candidate_skills, required_skills, nice_skills)
    fallback_res["candidate_id"] = candidate_id
    fallback_res["job_id"] = job_id
    
    if not settings.GEMINI_API_KEY:
        return fallback_res

    # Optional LLM enhancement for richer custom reasons
    prompt = f"""You are a technical career coach.
Analyze the candidate's skills against this target role:
Role: {job_title}
Candidate Skills: {', '.join(candidate_skills)}
Required Skills: {', '.join(required_skills)}
Nice-To-Have Skills: {', '.join(nice_skills)}

Return strict JSON:
{{
  "readiness_percentage": float (0-100),
  "missing_required_skills": [string],
  "weak_skills": [string],
  "matched_skills": [string],
  "suggested_learning_path": [
    {{
      "skill": string,
      "status": "missing" or "weak",
      "importance": "required" or "nice_to_have",
      "reason": string,
      "learning_resources": [
        {{"title": string, "type": "Course" or "Documentation" or "Practice", "url": string or null}}
      ]
    }}
  ]
}}"""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"}
            })
            if resp.status_code == 200:
                import json
                text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(text)
                parsed["candidate_id"] = candidate_id
                parsed["job_id"] = job_id
                return parsed
    except Exception as e:
        logger.warning(f"Skill gap LLM error: {e}. Using deterministic engine.")

    return fallback_res
