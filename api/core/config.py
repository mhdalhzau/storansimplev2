from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://replit:password@localhost:5432/main"
    
    # API
    api_title: str = "Setoran Harian API"
    api_version: str = "1.0.0"
    api_description: str = "API untuk aplikasi setoran harian"
    
    # CORS
    allowed_origins: list[str] = ["http://localhost:5000", "http://localhost:3000"]
    
    class Config:
        env_file = ".env"


settings = Settings()