import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "POLARTWIN"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./polartwin.db")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")
    
    JWT_SECRET: str = os.getenv("JWT_SECRET", "polartwin-polar-station-sih26060-secret-key")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "*"
    ]
    
    SIMULATION_TICK_SECONDS: int = int(os.getenv("SIMULATION_TICK_SECONDS", "4"))
    WEATHER_API_KEY: str = os.getenv("WEATHER_API_KEY", "")
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")

    class Config:
        case_sensitive = True
        extra = "allow"

settings = Settings()
