import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "TalentLens API"
    SECRET_KEY: str = "talentlens_super_secret_jwt_key_2026_recruitment_ai_engine"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    DATABASE_URL: str = "sqlite:///./talentlens.db"
    
    # LLM Settings (Optional - fallback parser works with ZERO keys)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    LLM_PROVIDER: str = "gemini"  # gemini, openai, anthropic
    
    # SMTP Settings (Optional - dry-run mode works with ZERO credentials)
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "talentlens@company.com")
    SMTP_DRY_RUN: bool = True  # Default to True so it never fails if unconfigured
    
    # File storage
    UPLOAD_DIR: str = "./uploads"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
