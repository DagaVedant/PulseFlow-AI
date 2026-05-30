"""Centralized application settings loaded from environment variables via pydantic-settings."""
from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    APP_NAME: str = "PulseFlow AI"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"

    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/pulseflow"
    REDIS_URL: str = "redis://localhost:6379"

    SECRET_KEY: str = "dev-secret-key-change-in-production"

    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]

    SIMULATION_SPEED: int = 8

    BROADCAST_INTERVAL: float = 5.0

    ER_BEDS: int = 40
    ER_DOCTORS: int = 4
    ER_NURSES: int = 12
    LAB_TECHNICIANS: int = 8
    LAB_ANALYZERS: int = 4
    IMAGING_CT_SCANNERS: int = 2
    IMAGING_MRI_MACHINES: int = 2
    IMAGING_XRAY_ROOMS: int = 3
    ICU_BEDS: int = 20
    ICU_DOCTORS: int = 4
    ICU_NURSES: int = 20
    WARD_BEDS: int = 80
    WARD_DOCTORS: int = 4
    WARD_NURSES: int = 16
    DISCHARGE_STAFF: int = 4

    BASE_ARRIVAL_RATE: float = 9.5

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
