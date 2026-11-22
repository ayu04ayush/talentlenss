# TalentLens — AI-Powered Precision Recruitment Platform

> **"Editorial precision meets mission control."**  
> TalentLens is a production-quality, full-stack AI recruitment platform built for technical hiring teams inundated with hundreds of applicants. It automates multi-format resume parsing, performs hybrid semantic & criteria-based candidate matching, powers server-side multi-dimensional filtering, and streamlines candidates through an interactive Kanban hiring pipeline.

---

## 🏛 Architecture Diagram

```mermaid
flowchart TD
    subgraph Frontend ["Frontend (Next.js 16 + React 19 + TypeScript)"]
        UI["Landing Page / Dashboard / Kanban Pipeline / Candidates"]
        Store["Zustand Store + TanStack React Query"]
        Motion["Framer Motion + GSAP + dnd-kit"]
    end

    subgraph Backend ["Backend API (FastAPI + Python 3.13)"]
        API["FastAPI REST Endpoints (/auth, /jobs, /candidates, /uploads, /pipeline)"]
        Queue["Background Task Worker Queue"]
        Parser["Parser Service (LLM / Regex & Heuristic Fallback)"]
        Matcher["Hybrid Match Engine (TF-IDF Cosine, Skills Overlap, Exp/Edu)"]
        Dups["Collision Detection (SHA-256 Hash, Phone/Email, Fuzzy Name)"]
        Emails["Bulk Email Engine (Template Engine + DRY-RUN Audit Log)"]
        SkillGap["AI Skill-Gap & Curriculum Path Generator"]
    end

    subgraph Storage ["Data Layer"]
        DB[(SQLite 3 WAL / PostgreSQL via DATABASE_URL)]
        Files[("Local File Vault (/uploads)")]
    end

    UI --> Store
    Store --> API
    API --> Queue
    Queue --> Parser
    Queue --> Matcher
    Queue --> Dups
    API --> Emails
    API --> SkillGap
    Parser --> Storage
    Matcher --> Storage
```

---

## ✨ Feature Matrix & Implementation Details

### 1. Bulk Resume Upload & Queue (`/dashboard/upload`)
- **Capacity**: Drag-and-drop file zone & picker accepting up to 200 PDF and DOCX files at once.
- **Validation**: Strict MIME-type and size checking (max 15MB/file), rejecting invalid formats with clear reasons.
- **Non-blocking Background Queue**: Offloads text extraction, parsing, and scoring to an asynchronous worker queue.
- **Live Progress Telemetry**: Real-time per-file status badges (`queued`, `extracting`, `parsing`, `scoring`, `done`, `failed`), animated SVG progress ring, and one-click per-file retry.

### 2. Multi-Format Resume Parsing & Zero-Key Fallback (`/api/uploads`, `/api/candidates`)
- **Format Extraction**: Native PDF text extraction (`pypdf`) and DOCX document extraction (`python-docx`). Flags scanned / unreadable documents for manual review.
- **Standardized Schema**: Name, email, phone, location, LinkedIn/GitHub URLs, summary, education list, 10th/12th percentages, CGPA normalized to 10-point scale (preserving original scale), canonical skill aliases, experience list, total experience years, projects, certifications.
- **Primary LLM + Robust Fallback**: Supports Gemini API via `GEMINI_API_KEY`. **MANDATORY FALLBACK**: If no API key is provided or the network is offline, a comprehensive regex & heuristic section parser extracts all fields with zero downtime.
- **Recruiter Inline Editing**: Every parsed field is editable directly on the candidate drawer, saved to DB, and tagged with `"Manually Corrected"`.
- **Confidence Indicator**: Real-time parsing confidence score per candidate.

### 3. Hybrid AI Resume Matching (`/dashboard/jobs`, `/api/scores`)
- **Job Specification Builder**: Create and edit JDs with title, department, description, required skills, nice-to-have skills, experience bounds, CGPA cutoff, and location.
- **One-Click Raw JD Extraction**: Paste unstructured JD text to auto-populate parameters using the LLM or regex analyzer.
- **Hybrid Scoring Formula (0-100)**:
  1. *Semantic Text Similarity* (TF-IDF Cosine sublinear n-gram overlap)
  2. *Weighted Skill Overlap* (75% required / 25% nice-to-have)
  3. *Experience Fit* (Ratio against minimum and maximum experience bounds)
  4. *Academics & CGPA Fit*
  5. *Location & Remote Fit*
- **Configurable Weights**: Recruiter-controlled sliders per JD dynamically recompute scores for all candidates across multiple job openings.
- **Score Visualizations**: 5-axis Radar chart, matched skills tags, missing skills tags, and AI evaluation rationale.

### 4. Smart Multi-Criteria Filters (`/dashboard/candidates`)
- **Server-Side Combinable Filters**: Debounced server-side query filters for 10th %, 12th %, CGPA range, multi-select skills (with AND / OR toggle), work experience range, location, graduation year range, minimum match score, pipeline stage, and full-text search.
- **Active Filter Chips**: Removable animated chips with a one-click "Clear All" action.
- **Candidate Ranking Table**: Multi-column sorting (default match score), bulk selection, position numbers, CSV export.

### 5. Hiring Pipeline Kanban (`/dashboard/pipeline`)
- **5 Stages**: `Applied` → `Shortlisted` → `Interview` → `Offer` / `Rejected`.
- **Drag-and-Drop Kanban**: Built with `@dnd-kit/core` with spring tilt and drop-shadow lift.
- **Offer Celebration**: Confetti burst triggers when a candidate reaches the "Offer" stage.
- **Audit History**: Every transition records who moved the candidate, previous stage, new stage, timestamp, and notes.
- **Conversion Funnel**: Cumulative yield metrics and conversion percentages across stages.

### 6. Recruiter Dashboard & Candidate Comparison (`/dashboard`)
- **Bento KPI Grid**: Total candidates, shortlisted, in-interview, offers extended, average match score, and stage velocity.
- **Interactive Charts**: Conversion funnel bar chart, skills demand vs. supply comparative chart, and 14-day upload timeline area chart.
- **Side-by-Side Comparison Modal**: Compare 2 to 4 candidates simultaneously with best values highlighted per row.

### 7. Bonus Features (All Built & Functional)
- **Duplicate Detection Matrix (`/dashboard/duplicates`)**: 3-tier duplicate engine:
  1. SHA-256 file hash match (100% confidence)
  2. Exact email or phone match (95% confidence)
  3. Fuzzy bigram string similarity
  - Displays "Possible Duplicate" badges and provides a side-by-side merge dialog that consolidates files, history, and notes.
- **Bulk Email Outreach (`/dashboard/emails`)**: Stage-triggered templates (`{{name}}`, `{{job_title}}`, `{{company}}`, `{{date}}`) with live preview, template editor, SMTP support, and local DRY-RUN mode recorded in an audit table.
- **AI Skill-Gap & Learning Path (`/skill-gap`)**: Computes role readiness quotient, missing required skills, weak skills, and provides structured learning curricula with resource types (Course, Documentation, Practice).
- **Command Palette (`Ctrl+K` / `⌘K`)**: Instant keyboard navigation, candidate search, and quick actions.

---

## 🚀 Quickstart & One-Command Run

### Prerequisites
- Python 3.11+
- Node.js 18+ (tested on Node.js 24)
- npm or pnpm

### Option 1: PowerShell Startup (Windows)
```powershell
.\run.ps1
```

### Option 2: Bash Startup (macOS / Linux)
```bash
chmod +x run.sh
./run.sh
```

### Option 3: Manual Startup
```bash
# 1. Backend Setup
python -m venv venv
.\venv\Scripts\pip install -r backend\requirements.txt  # Windows
# source venv/bin/activate && pip install -r backend/requirements.txt  # Unix

# Seed demo data (40 realistic candidates & 2 JDs)
PYTHONPATH=backend .\venv\Scripts\python -c "import asyncio; from app.database import SessionLocal; from app.api.seed import seed_sample_data; db=SessionLocal(); asyncio.run(seed_sample_data(db)); db.close()"

# Start Backend API
PYTHONPATH=backend .\venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 2. Frontend Setup (in a separate terminal)
cd frontend
npm install
npm run dev
```

Visit **`http://localhost:3000`** in your browser.

---

## 🔑 Demo Account Credentials

You can sign in using the **1-Click Demo Recruiter Login** button on the `/login` page:
- **Email:** `demo@talentlens.io`
- **Password:** `talentlens123`

---

## 🧪 Running Pytest Unit Tests

The backend includes a unit test suite covering resume parsing, skill canonicalization, CGPA normalization, hybrid matching scoring, and database filters:

```powershell
$env:PYTHONPATH="backend"
.\venv\Scripts\pytest backend\tests -v
```

All 13 unit tests pass with zero failures.

---

## 📁 Sample Resumes for Bulk Upload

Realistic sample resume files are pre-generated in the `samples/` folder for testing the drag-and-drop upload queue:
- `samples/resume_arjun_fullstack.pdf` (Senior Full-Stack, React, Next.js, FastAPI, PostgreSQL)
- `samples/resume_priya_ai_engineer.pdf` (AI/ML Engineer, PyTorch, Scikit-Learn, LLM)
- `samples/resume_marcus_devops.docx` (Platform & Cloud Engineer, Kubernetes, AWS)
- `samples/resume_sneha_frontend.pdf` (Frontend Architect, Design Systems)
- `samples/resume_arjun_duplicate_test.pdf` (Duplicate candidate test)

---

## 🐳 Optional PostgreSQL Setup

By default, TalentLens uses high-performance SQLite in WAL mode. To run on PostgreSQL:
```bash
docker-compose up -d
```
Update `DATABASE_URL` in `.env`:
```env
DATABASE_URL=postgresql+psycopg2://talentlens:talentlens_password@localhost:5432/talentlens
```
