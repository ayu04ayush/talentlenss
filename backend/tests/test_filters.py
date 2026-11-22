import pytest
from app.database import Base, SessionLocal, engine
from app.models.models import User, Candidate, Job, Score
from app.utils.security import get_password_hash

@pytest.fixture(scope="module")
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    # Create test user
    user = db.query(User).filter(User.email == "test@talentlens.io").first()
    if not user:
        user = User(
            email="test@talentlens.io",
            hashed_password=get_password_hash("testpass123"),
            full_name="Tester Recruiter"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Create test candidates
    c1 = Candidate(
        user_id=user.id,
        name="Candidate Alpha",
        email="alpha@example.com",
        location="Bangalore",
        skills=["python", "fastapi", "react"],
        total_experience_years=4.5,
        cgpa=8.8,
        tenth_percentage=92.0,
        twelfth_percentage=90.0,
        current_stage="Applied"
    )
    c2 = Candidate(
        user_id=user.id,
        name="Candidate Beta",
        email="beta@example.com",
        location="Seattle",
        skills=["docker", "kubernetes", "go"],
        total_experience_years=2.0,
        cgpa=7.2,
        tenth_percentage=75.0,
        twelfth_percentage=78.0,
        current_stage="Interview"
    )
    db.add(c1)
    db.add(c2)
    db.commit()

    yield db
    db.close()

def test_filtering_by_cgpa(setup_db):
    db = setup_db
    user = db.query(User).filter(User.email == "test@talentlens.io").first()
    cands = db.query(Candidate).filter(Candidate.user_id == user.id, Candidate.cgpa >= 8.0).all()
    assert len(cands) >= 1
    assert any(c.name == "Candidate Alpha" for c in cands)

def test_filtering_by_experience(setup_db):
    db = setup_db
    user = db.query(User).filter(User.email == "test@talentlens.io").first()
    cands = db.query(Candidate).filter(Candidate.user_id == user.id, Candidate.total_experience_years >= 3.0).all()
    assert any(c.name == "Candidate Alpha" for c in cands)
    assert not any(c.name == "Candidate Beta" for c in cands)

def test_filtering_by_stage(setup_db):
    db = setup_db
    user = db.query(User).filter(User.email == "test@talentlens.io").first()
    interviews = db.query(Candidate).filter(Candidate.user_id == user.id, Candidate.current_stage == "Interview").all()
    assert any(c.name == "Candidate Beta" for c in interviews)
