import pytest
from app.utils.aliases import normalize_skill, normalize_skills_list, normalize_cgpa
from app.services.parser import parse_with_regex, extract_text_from_pdf, extract_text_from_docx

def test_skill_normalization():
    assert normalize_skill("js") == "javascript"
    assert normalize_skill("ReactJS") == "react"
    assert normalize_skill("k8s") == "kubernetes"
    assert normalize_skill("Python3") == "python"
    assert normalize_skill("golang") == "go"

def test_skills_list_deduplication():
    input_skills = ["js", "JavaScript", "reactjs", "React", "Docker", "docker"]
    normalized = normalize_skills_list(input_skills)
    assert normalized == ["javascript", "react", "docker"]

def test_cgpa_normalization():
    # 10 scale
    norm, raw, scale = normalize_cgpa(8.5, 10.0)
    assert norm == 8.5
    assert scale == 10.0

    # 4 scale
    norm, raw, scale = normalize_cgpa(3.8, 4.0)
    assert norm == 9.5
    assert scale == 4.0

    # Percentage to CGPA
    norm, raw, scale = normalize_cgpa(85.5, 100.0)
    assert round(norm, 1) == 9.0

def test_resume_pdf_extraction_and_parsing():
    text, is_scanned = extract_text_from_pdf("samples/resume_arjun_fullstack.pdf")
    assert not is_scanned
    assert "Arjun Singhania" in text

    parsed = parse_with_regex(text)
    assert parsed["name"] == "Arjun Singhania"
    assert parsed["email"] == "arjun.singhania@example.com"
    assert parsed["phone"] is not None
    assert "react" in parsed["skills"]
    assert "fastapi" in parsed["skills"]
    assert parsed["total_experience_years"] >= 3.0
    assert parsed["parsing_confidence"] >= 0.80

def test_resume_docx_extraction_and_parsing():
    text, is_empty = extract_text_from_docx("samples/resume_marcus_devops.docx")
    assert not is_empty
    assert "Marcus Vance" in text

    parsed = parse_with_regex(text)
    assert parsed["name"] == "Marcus Vance"
    assert parsed["email"] == "marcus.vance.devops@example.com"
    assert "kubernetes" in parsed["skills"]
    assert "docker" in parsed["skills"]
