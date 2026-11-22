import pytest
from app.services.matcher import (
    compute_semantic_similarity, compute_skill_overlap,
    compute_experience_fit, compute_education_fit, compute_location_fit
)

def test_skill_overlap_calculation():
    cand_skills = ["python", "fastapi", "react", "docker"]
    required_skills = ["python", "fastapi", "postgresql"]
    nice_skills = ["docker", "kubernetes"]

    score, matched, missing = compute_skill_overlap(cand_skills, required_skills, nice_skills)
    assert "python" in matched
    assert "fastapi" in matched
    assert "docker" in matched
    assert "postgresql" in missing
    assert score > 60.0

def test_experience_fit():
    # Exactly within range
    assert compute_experience_fit(4.0, 3.0, 6.0) == 100.0

    # Below range
    below_score = compute_experience_fit(1.5, 3.0, 6.0)
    assert below_score < 80.0

    # Above range (minor penalty)
    above_score = compute_experience_fit(9.0, 3.0, 6.0)
    assert 80.0 <= above_score <= 95.0

def test_education_fit():
    # High CGPA
    assert compute_education_fit(9.2, 8.0, [], None) == 100.0
    # Lower CGPA
    assert compute_education_fit(6.5, 8.0, [], None) < 80.0

def test_semantic_similarity():
    cand_profile = "Experienced Python developer with FastAPI, React, and PostgreSQL background."
    job_profile = "Senior Python Engineer building FastAPI services with PostgreSQL."
    score = compute_semantic_similarity(cand_profile, job_profile)
    assert score >= 50.0

def test_location_fit():
    assert compute_location_fit("Bangalore, India", "Bangalore") == 100.0
    assert compute_location_fit("Remote", "San Francisco") == 90.0
    assert compute_location_fit("London", "New York") == 50.0
