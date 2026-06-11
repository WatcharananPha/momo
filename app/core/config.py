import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Momo Loyalty API (Python)"
    API_V1_STR: str = "/api/v1"
    PORT: int = int(os.getenv("PORT", 9090))
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")
    JWT_EXPIRES_IN: str = os.getenv("JWT_EXPIRES_IN", "86400") # Changed to str to handle values like '7d' from .env
    
    # Line Messaging API
    LINE_CHANNEL_ID: str = os.getenv("LINE_CHANNEL_ID", "")
    LINE_CHANNEL_SECRET: str = os.getenv("LINE_CHANNEL_SECRET", "")
    LINE_MESSAGING_API_TOKEN: str = os.getenv("LINE_MESSAGING_API_TOKEN", "")
    
    # Line Login / LIFF
    LINE_LOGIN_CHANNEL_ID: str = os.getenv("LINE_LOGIN_CHANNEL_ID", "")
    LIFF_ID: str = os.getenv("LIFF_ID", "")
    
    LINE_NOTIFY_MOCK_MODE: bool = os.getenv("LINE_NOTIFY_MOCK_MODE", "true").lower() == "true"
    
    # Payment
    PAYMENT_MOCK_MODE: bool = os.getenv("PAYMENT_MOCK_MODE", "true").lower() == "true"
    OMISE_PUBLIC_KEY: str = os.getenv("OMISE_PUBLIC_KEY", "")
    OMISE_SECRET_KEY: str = os.getenv("OMISE_SECRET_KEY", "")
    GOOGLE_MAPS_API_KEY: str = os.getenv("GOOGLE_MAPS_API_KEY", "")

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'
        extra = "ignore"

settings = Settings()
