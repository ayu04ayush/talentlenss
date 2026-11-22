import os
import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import engine, Base
from app.api import auth, jobs, candidates, uploads, pipeline, duplicates, emails, analytics, skill_gap, seed

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("talentlens")

# Create tables
Base.metadata.create_all(bind=engine)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="TalentLens AI-Powered Precision Recruitment Platform API"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception on {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again."}
    )

# Include Routers
app.include_router(auth.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(candidates.router, prefix="/api")
app.include_router(uploads.router, prefix="/api")
app.include_router(pipeline.router, prefix="/api")
app.include_router(duplicates.router, prefix="/api")
app.include_router(emails.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(skill_gap.router, prefix="/api")
app.include_router(seed.router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "TalentLens AI Engine",
        "version": "1.0.0",
        "llm_configured": bool(settings.GEMINI_API_KEY),
        "smtp_dry_run": settings.SMTP_DRY_RUN
    }

@app.on_event("startup")
async def startup_event():
    logger.info("TalentLens Backend API starting up successfully.")
