import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
import docx

os.makedirs("samples", exist_ok=True)

styles = getSampleStyleSheet()
title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], fontSize=16, leading=20, textColor=colors.HexColor('#1E293B'))
section_style = ParagraphStyle('SectionStyle', parent=styles['Heading2'], fontSize=12, leading=15, textColor=colors.HexColor('#0F172A'), spaceBefore=8, spaceAfter=4)
body_style = ParagraphStyle('BodyStyle', parent=styles['Normal'], fontSize=9, leading=12, textColor=colors.HexColor('#334155'))
bold_style = ParagraphStyle('BoldStyle', parent=styles['Normal'], fontSize=9, leading=12, fontName="Helvetica-Bold", textColor=colors.HexColor('#0F172A'))

def create_pdf_resume(filename, data):
    doc = SimpleDocTemplate(filename, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    story = []

    # Header
    story.append(Paragraph(data["name"], title_style))
    contact = f"{data['email']} | {data['phone']} | {data['location']} | {data['linkedin']} | {data['github']}"
    story.append(Paragraph(contact, body_style))
    story.append(Spacer(1, 8))

    # Summary
    story.append(Paragraph("PROFESSIONAL SUMMARY", section_style))
    story.append(Paragraph(data["summary"], body_style))
    story.append(Spacer(1, 6))

    # Skills
    story.append(Paragraph("TECHNICAL SKILLS", section_style))
    skills_text = f"<b>Core Technologies:</b> {', '.join(data['skills'])}"
    story.append(Paragraph(skills_text, body_style))
    story.append(Spacer(1, 6))

    # Experience
    story.append(Paragraph("WORK EXPERIENCE", section_style))
    for exp in data["experience"]:
        header = f"<b>{exp['role']}</b> — {exp['company']} ({exp['dates']})"
        story.append(Paragraph(header, bold_style))
        story.append(Paragraph(exp["description"], body_style))
        story.append(Spacer(1, 4))

    # Education
    story.append(Paragraph("EDUCATION", section_style))
    for edu in data["education"]:
        edu_str = f"<b>{edu['degree']}</b> | {edu['institution']} ({edu['year']})<br/>"
        if "cgpa" in edu:
            edu_str += f"CGPA: {edu['cgpa']}/10.0  |  "
        if "tenth" in edu:
            edu_str += f"Class 10th: {edu['tenth']}%  |  Class 12th: {edu['twelfth']}%"
        story.append(Paragraph(edu_str, body_style))
        story.append(Spacer(1, 4))

    # Projects
    if "projects" in data:
        story.append(Paragraph("KEY PROJECTS", section_style))
        for p in data["projects"]:
            story.append(Paragraph(f"<b>{p['title']}:</b> {p['desc']}", body_style))
            story.append(Spacer(1, 3))

    doc.build(story)
    print(f"Created {filename}")

def create_docx_resume(filename, data):
    doc = docx.Document()
    doc.add_heading(data["name"], level=0)
    p = doc.add_paragraph()
    p.add_run(f"{data['email']} | {data['phone']} | {data['location']} | {data['linkedin']} | {data['github']}")

    doc.add_heading("Professional Summary", level=1)
    doc.add_paragraph(data["summary"])

    doc.add_heading("Technical Skills", level=1)
    doc.add_paragraph(f"Languages & Frameworks: {', '.join(data['skills'])}")

    doc.add_heading("Work Experience", level=1)
    for exp in data["experience"]:
        p_exp = doc.add_paragraph()
        run = p_exp.add_run(f"{exp['role']} at {exp['company']} ({exp['dates']})\n")
        run.bold = True
        p_exp.add_run(exp["description"])

    doc.add_heading("Education", level=1)
    for edu in data["education"]:
        p_edu = doc.add_paragraph()
        p_edu.add_run(f"{edu['degree']} - {edu['institution']} ({edu['year']})\n").bold = True
        p_edu.add_run(f"CGPA: {edu.get('cgpa', '8.5')}/10 | 10th: {edu.get('tenth', '90')}% | 12th: {edu.get('twelfth', '88')}%")

    doc.save(filename)
    print(f"Created {filename}")

# Data 1: Arjun (Full Stack)
data_arjun = {
    "name": "Arjun Singhania",
    "email": "arjun.singhania@example.com",
    "phone": "+91 9876543210",
    "location": "Bangalore, India",
    "linkedin": "linkedin.com/in/arjun-singhania",
    "github": "github.com/arjunsingh",
    "summary": "High-velocity Full-Stack Engineer with 4.5 years of experience architecting distributed web applications. Expert in React, Next.js, TypeScript, Python, FastAPI, and PostgreSQL.",
    "skills": ["Python", "FastAPI", "React", "Next.js", "TypeScript", "PostgreSQL", "Docker", "Redis", "Tailwind CSS", "Git"],
    "experience": [
        {
            "role": "Senior Full-Stack Engineer",
            "company": "Cognitive Cloud Labs",
            "dates": "Jan 2022 - Present",
            "description": "Architected low-latency microservices with FastAPI and Next.js. Reduced API response times by 42% through Redis caching and PostgreSQL query optimization."
        },
        {
            "role": "Software Engineer",
            "company": "Nexus Systems",
            "dates": "Aug 2019 - Dec 2021",
            "description": "Developed dynamic UI components with React and TypeScript. Implemented automated CI/CD pipelines with GitHub Actions and Docker."
        }
    ],
    "education": [
        {
            "degree": "B.Tech in Computer Science and Engineering",
            "institution": "National Institute of Technology Karnataka",
            "year": 2019,
            "cgpa": 8.85,
            "tenth": 94.5,
            "twelfth": 92.0
        }
    ],
    "projects": [
        {
            "title": "Real-time Telemetry Dashboard",
            "desc": "Built event-driven stream dashboard processing 50k events/sec using WebSockets and Next.js."
        }
    ]
}

# Data 2: Priya (AI / ML)
data_priya = {
    "name": "Priya Patel",
    "email": "priya.patel.ai@example.com",
    "phone": "+91 9123456789",
    "location": "San Francisco, USA",
    "linkedin": "linkedin.com/in/priya-patel-ai",
    "github": "github.com/priyapatel",
    "summary": "Machine Learning Engineer with 3.5 years of specialization in Deep Learning, PyTorch, NLP, and LLM fine-tuning. Experienced with high-throughput inference systems and vector databases.",
    "skills": ["Python", "PyTorch", "Machine Learning", "NLP", "LLM", "Docker", "Scikit-Learn", "FastAPI", "NumPy", "Pandas"],
    "experience": [
        {
            "role": "Machine Learning Engineer",
            "company": "NeuralEdge Technologies",
            "dates": "Feb 2022 - Present",
            "description": "Fine-tuned open-source LLMs using LoRA/QLoRA on specialized domain corpuses. Optimized inference latencies using TensorRT and FastAPI."
        }
    ],
    "education": [
        {
            "degree": "M.S. in Computer Science (Artificial Intelligence)",
            "institution": "Georgia Institute of Technology",
            "year": 2022,
            "cgpa": 9.4,
            "tenth": 96.0,
            "twelfth": 95.0
        }
    ],
    "projects": [
        {
            "title": "Retrieval Augmented Assistant",
            "desc": "Engineered hybrid semantic search pipeline using vector embeddings and cross-encoders."
        }
    ]
}

# Data 3: Marcus (DevOps / Cloud)
data_marcus = {
    "name": "Marcus Vance",
    "email": "marcus.vance.devops@example.com",
    "phone": "+1 415 555 0192",
    "location": "Seattle, USA",
    "linkedin": "linkedin.com/in/marcus-vance",
    "github": "github.com/marcusvance",
    "summary": "Cloud Platform and DevOps Specialist with 6 years experience orchestrating multi-region Kubernetes clusters on AWS and Google Cloud Platform.",
    "skills": ["Kubernetes", "Docker", "AWS", "Terraform", "Go", "CI/CD", "Linux", "Prometheus", "Python"],
    "experience": [
        {
            "role": "Senior Cloud Platform Engineer",
            "company": "Stratus Systems",
            "dates": "Mar 2021 - Present",
            "description": "Maintained 12 EKS clusters running 800+ microservice pods with 99.99% uptime. Automated infrastructure provisioning using Terraform and ArgoCD."
        }
    ],
    "education": [
        {
            "degree": "B.S. in Computer Engineering",
            "institution": "University of Washington",
            "year": 2018,
            "cgpa": 8.2,
            "tenth": 88.0,
            "twelfth": 89.0
        }
    ]
}

# Data 4: Sneha (Frontend Specialist)
data_sneha = {
    "name": "Sneha Reddy",
    "email": "sneha.reddy.ui@example.com",
    "phone": "+91 9789012345",
    "location": "Hyderabad, India",
    "linkedin": "linkedin.com/in/sneha-reddy-ui",
    "github": "github.com/snehareddy",
    "summary": "Frontend Architect and Design Systems Lead with 5 years experience crafting pixel-perfect web applications using React, Next.js, Tailwind CSS, and Framer Motion.",
    "skills": ["React", "Next.js", "TypeScript", "Tailwind CSS", "Zustand", "HTML", "CSS", "Jest", "GraphQL"],
    "experience": [
        {
            "role": "Lead Frontend Engineer",
            "company": "Verve Design Systems",
            "dates": "Jul 2021 - Present",
            "description": "Built accessible headless component library used by 40+ engineering teams. Migrated core customer web application to Next.js App Router."
        }
    ],
    "education": [
        {
            "degree": "B.Tech in Information Technology",
            "institution": "IIT Hyderabad",
            "year": 2019,
            "cgpa": 9.1,
            "tenth": 93.0,
            "twelfth": 91.0
        }
    ]
}

create_pdf_resume("samples/resume_arjun_fullstack.pdf", data_arjun)
create_pdf_resume("samples/resume_priya_ai_engineer.pdf", data_priya)
create_docx_resume("samples/resume_marcus_devops.docx", data_marcus)
create_pdf_resume("samples/resume_sneha_frontend.pdf", data_sneha)
# Duplicate test file (same Arjun text with slight variation to test file hash and email detection)
create_pdf_resume("samples/resume_arjun_duplicate_test.pdf", data_arjun)

print("Generated sample resumes in samples/ directory successfully.")
