"""
WindSight Application Configuration
==================================
Manages configuration settings via environment variables with sensible defaults.
"""

import os
from pathlib import Path
from pydantic import BaseModel, Field

# Base directories
BACKEND_DIR = Path(__file__).resolve().parent.parent
BASE_DIR = BACKEND_DIR.parent

class Settings(BaseModel):
    app_name: str = "WindSight — Wind Generation Forecast Intelligence"
    app_version: str = "1.0.0"
    debug: bool = Field(default_factory=lambda: os.getenv("DEBUG", "false").lower() == "true")
    
    # Elexon BMRS API
    elexon_base_url: str = Field(
        default_factory=lambda: os.getenv("ELEXON_API_BASE_URL", "https://data.elexon.co.uk/bmrs/api/v1")
    )
    request_timeout_seconds: float = Field(
        default_factory=lambda: float(os.getenv("REQUEST_TIMEOUT_SECONDS", "45.0"))
    )
    max_retries: int = Field(default_factory=lambda: int(os.getenv("MAX_RETRIES", "3")))
    retry_backoff_factor: float = Field(default_factory=lambda: float(os.getenv("RETRY_BACKOFF_FACTOR", "1.5")))
    
    # Database
    database_path: str = Field(
        default_factory=lambda: os.getenv("DATABASE_PATH", str(BACKEND_DIR / "wind_data.db"))
    )
    seed_data_dir: str = Field(
        default_factory=lambda: os.getenv("SEED_DATA_DIR", str(BACKEND_DIR / "app" / "db" / "seed_data"))
    )
    auto_seed_on_startup: bool = Field(
        default_factory=lambda: os.getenv("AUTO_SEED_ON_STARTUP", "true").lower() == "true"
    )
    
    # Market & Analytics Assumptions
    default_cutoff_preset: str = Field(default="11:00")
    primary_eval_year: int = 2026
    primary_eval_month: int = 1

settings = Settings()
