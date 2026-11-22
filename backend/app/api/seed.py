import random
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import (
    User, Job, Candidate, Score, StageHistory, CandidateNote,
    EmailTemplate, ResumeFile, DuplicateFlag
)
from app.utils.security import get_password_hash
from app.utils.aliases import normalize_skills_list
from app.services.matcher import calculate_candidate_match
from app.services.email_service import DEFAULT_TEMPLATES

router = APIRouter(prefix="/seed", tags=["seed"])
logger = logging.getLogger(__name__)

SAMPLE_NAMES = [
    "Aarav Sharma", "Priya Patel", "Vikram Malhotra", "Ananya Rao", "Rohan Iyer",
    "Sneha Reddy", "Aditya Verma", "Meera Nair", "Karan Joshi", "Neha Kapoor",
    "David Chen", "Sarah Miller", "Alexandre Dubois", "Elena Rostova", "Marcus Vance",
    "Liam Gallagher", "Sophia Zhang", "Omar Al-Mansoor", "Maya Lin", "James Wilson",
    "Divya Kulkarni", "Rahul Deshmukh", "Pooja Hegde", "Siddharth Sen", "Tanvi Agarwal",
    "Arjun Singhania", "Ishaan Roy", "Deepika Padukone", "Farhan Akhtar", "Ritika Mehta",
    "Lucas Morales", "Emma Watson", "Noah Bennett", "Chloe Dupont", "Gabriel Santos",
    "Zainab Khan", "Daniel Kim", "Amara Okafor", "Felix Weber", "Astrid Lindgren"
]

CITIES = ["Bangalore", "San Francisco", "Hyderabad", "Seattle", "Pune", "New York", "Remote", "Austin", "London"]

SKILL_SETS = [
    ["python", "fastapi", "react", "next.js", "typescript", "postgresql", "docker", "redis"],
    ["python", "pytorch", "machine learning", "nlp", "llm", "docker", "scikit-learn", "numpy"],
    ["typescript", "react", "next.js", "tailwind css", "zustand", "graphql", "html", "css"],
    ["go", "kubernetes", "docker", "aws", "terraform", "ci/cd", "linux", "postgresql"],
    ["python", "django", "postgresql", "redis", "celery", "aws", "docker"],
    ["java", "spring boot", "microservices", "apache kafka", "postgresql", "docker", "aws"],
    ["python", "fastapi", "typescript", "react", "aws", "docker", "mongodb"],
    ["machine learning", "python", "pandas", "scikit-learn", "sql", "tensorflow", "fastapi"]
]

@router.post("/sample-data")
async def seed_sample_data(db: Session = Depends(get_db)):
    """Seeds demo recruiter account, 2 realistic JDs, 40 realistic candidates, scores, and stage histories."""
    # 1. Ensure Demo Recruiter Account exists
    demo_user = db.query(User).filter(User.email == "demo@talentlens.io").first()
    if not demo_user:
        demo_user = User(
            email="demo@talentlens.io",
            hashed_password=get_password_hash("talentlens123"),
            full_name="Alex Mercer",
            company_name="Apex AI Labs"
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)

    # 2. Seed Email Templates if not present
    existing_templates = db.query(EmailTemplate).filter(EmailTemplate.user_id == demo_user.id).all()
    if not existing_templates:
        for t in DEFAULT_TEMPLATES:
            db.add(EmailTemplate(
                user_id=demo_user.id,
                name=t["name"],
                stage_trigger=t["stage_trigger"],
                subject=t["subject"],
                body_template=t["body_template"]
            ))
        db.commit()

    # 3. Seed 2 Realistic JDs
    job1 = db.query(Job).filter(Job.user_id == demo_user.id, Job.title.like("%Full-Stack%")).first()
    if not job1:
        job1 = Job(
            user_id=demo_user.id,
            title="Senior Full-Stack Engineer (Next.js & Python)",
            department="Product Engineering",
            description="We are seeking an exceptional Senior Full-Stack Engineer to architect mission-critical features across our Next.js frontend and high-throughput FastAPI backend. You will lead technical design, optimize real-time streaming interfaces, and mentor engineers.",
            raw_text="Role: Senior Full-Stack Engineer. Required: React, Next.js, TypeScript, Python, FastAPI, PostgreSQL, Docker. 3+ years experience. B.Tech / BS in CS preferred.",
            required_skills=["python", "fastapi", "react", "next.js", "typescript", "postgresql"],
            nice_skills=["docker", "redis", "aws", "tailwind css", "graphql"],
            min_experience=3.0,
            max_experience=8.0,
            min_cgpa=7.5,
            location="Remote / Hybrid",
            education_req="Bachelor's in Computer Science or equivalent",
            weights={"semantic": 25.0, "skills": 35.0, "experience": 20.0, "education": 10.0, "location": 10.0},
            is_active=True
        )
        db.add(job1)

    job2 = db.query(Job).filter(Job.user_id == demo_user.id, Job.title.like("%AI / ML%")).first()
    if not job2:
        job2 = Job(
            user_id=demo_user.id,
            title="AI / ML Systems Engineer (LLM & Distributed Infra)",
            department="AI Research",
            description="Join our Core AI team to build high-performance inference pipelines, fine-tune domain models, and deploy resilient retrieval-augmented systems. Experience with PyTorch, Scikit-Learn, and cloud orchestration required.",
            raw_text="Role: AI/ML Systems Engineer. Required: Python, PyTorch, Machine Learning, Docker, NLP, Scikit-Learn. Nice to have: Kubernetes, AWS, LLM. 2+ years exp.",
            required_skills=["python", "pytorch", "machine learning", "docker", "nlp", "scikit-learn"],
            nice_skills=["kubernetes", "aws", "llm", "langchain", "fastapi"],
            min_experience=2.0,
            max_experience=7.0,
            min_cgpa=8.0,
            location="San Francisco / Remote",
            education_req="Master's or Bachelor's in CS / Data Science",
            weights={"semantic": 30.0, "skills": 35.0, "experience": 20.0, "education": 10.0, "location": 5.0},
            is_active=True
        )
        db.add(job2)

    db.commit()
    if job1:
        db.refresh(job1)
    if job2:
        db.refresh(job2)

    # 4. Check if candidates already exist
    existing_cands_count = db.query(Candidate).filter(Candidate.user_id == demo_user.id).count()
    if existing_cands_count >= 35:
        return {"message": "Sample data already seeded", "candidates_count": existing_cands_count}

    # 5. Generate 40 Realistic Candidates
    stages_pool = (
        ["Applied"] * 16 +
        ["Shortlisted"] * 10 +
        ["Interview"] * 8 +
        ["Offer"] * 3 +
        ["Rejected"] * 3
    )
    random.shuffle(stages_pool)

    created_candidates = []
    for i, name in enumerate(SAMPLE_NAMES):
        skill_choice = random.choice(SKILL_SETS)
        # Add random 1-2 extra skills
        extra_s = random.sample(["git", "redis", "linux", "ci/cd", "rest api", "testing"], 2)
        cand_skills = normalize_skills_list(skill_choice + extra_s)

        exp_years = round(random.uniform(1.2, 8.5), 1)
        cgpa_val = round(random.uniform(6.8, 9.8), 2)
        tenth_val = round(random.uniform(72.0, 96.0), 1)
        twelfth_val = round(random.uniform(70.0, 95.0), 1)
        grad_year = 2026 - int(exp_years)

        stage = stages_pool[i % len(stages_pool)]
        city = random.choice(CITIES)

        cand = Candidate(
            user_id=demo_user.id,
            name=name,
            email=f"{name.lower().replace(' ', '.')}@example.com",
            phone=f"+91 98{random.randint(10000000, 99999999)}",
            location=city,
            linkedin_url=f"https://linkedin.com/in/{name.lower().replace(' ', '-')}",
            github_url=f"https://github.com/{name.lower().replace(' ', '')}",
            summary=f"Passionate software engineer with {exp_years} years of hands-on experience building scalable applications using {', '.join(cand_skills[:3])}. Proven track record in agile environments.",
            education=[
                {
                    "degree": "B.Tech in Computer Science",
                    "institution": "National Institute of Technology",
                    "branch": "Computer Science & Engineering",
                    "graduation_year": grad_year,
                    "cgpa": cgpa_val,
                    "percentage": twelfth_val
                }
            ],
            tenth_percentage=tenth_val,
            twelfth_percentage=twelfth_val,
            cgpa=cgpa_val,
            cgpa_raw=cgpa_val,
            original_scale=10.0,
            graduation_year=grad_year,
            skills=cand_skills,
            experience=[
                {
                    "company": "Tech Corp Innovations",
                    "role": "Senior Software Engineer" if exp_years >= 4 else "Software Engineer",
                    "start": str(grad_year),
                    "end": "Present",
                    "duration_months": int(exp_years * 12),
                    "description": f"Designed and delivered core features with high availability using {cand_skills[0]} and {cand_skills[1]}."
                }
            ],
            total_experience_years=exp_years,
            projects=[
                {
                    "title": "Distributed Cloud Platform",
                    "description": "High performance microservices engine with real-time stream ingestion.",
                    "technologies": cand_skills[:4],
                    "link": f"https://github.com/{name.lower().replace(' ', '')}/platform"
                }
            ],
            certifications=[{"name": "Certified Cloud Developer", "issuer": "AWS / Linux Foundation", "year": grad_year + 1}],
            parsing_confidence=round(random.uniform(0.85, 0.98), 2),
            is_manually_corrected=False,
            current_stage=stage,
            star_rating=random.randint(3, 5) if stage in ["Shortlisted", "Interview", "Offer"] else random.randint(0, 3),
            interview_date=datetime.utcnow() + timedelta(days=random.randint(1, 5)) if stage == "Interview" else None,
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 20))
        )
        db.add(cand)
        created_candidates.append(cand)

    db.commit()

    # 6. Score all candidates against both seeded jobs
    for cand in created_candidates:
        db.refresh(cand)
        # Stage history
        db.add(StageHistory(
            candidate_id=cand.id,
            from_stage=None,
            to_stage="Applied",
            moved_by="System",
            notes="Application received and parsed.",
            created_at=cand.created_at
        ))
        if cand.current_stage != "Applied":
            db.add(StageHistory(
                candidate_id=cand.id,
                from_stage="Applied",
                to_stage=cand.current_stage,
                moved_by="Alex Mercer",
                notes=f"Screened and transitioned to {cand.current_stage}."
            ))

        # Add initial note
        if cand.current_stage in ["Interview", "Offer"]:
            db.add(CandidateNote(
                candidate_id=cand.id,
                author_name="Alex Mercer",
                content=f"Strong technical communication and system design fundamentals. Solid fit for {job1.title}."
            ))

        # Scores for Job 1
        sc1 = await calculate_candidate_match(cand, job1)
        db.add(Score(**sc1))

        # Scores for Job 2
        sc2 = await calculate_candidate_match(cand, job2)
        db.add(Score(**sc2))

    # 7. Add 1 intentional Duplicate Candidate for immediate testing of duplicate detection
    dup_target = created_candidates[0]
    dup_cand = Candidate(
        user_id=demo_user.id,
        name=dup_target.name,
        email=dup_target.email, # exact email match
        phone=dup_target.phone,
        location=dup_target.location,
        summary=dup_target.summary,
        education=dup_target.education,
        tenth_percentage=dup_target.tenth_percentage,
        twelfth_percentage=dup_target.twelfth_percentage,
        cgpa=dup_target.cgpa,
        skills=dup_target.skills,
        experience=dup_target.experience,
        total_experience_years=dup_target.total_experience_years,
        current_stage="Applied",
        parsing_confidence=0.92
    )
    db.add(dup_cand)
    db.commit()
    db.refresh(dup_cand)

    dup_flag = DuplicateFlag(
        candidate_id=dup_cand.id,
        duplicate_of_candidate_id=dup_target.id,
        match_type="email_phone",
        confidence=0.95,
        status="pending"
    )
    db.add(dup_flag)
    db.commit()

    return {
        "message": "Successfully seeded realistic demo environment",
        "demo_user": "demo@talentlens.io",
        "password": "talentlens123",
        "jobs_seeded": 2,
        "candidates_seeded": len(created_candidates) + 1,
        "duplicate_flagged": 1
    }
