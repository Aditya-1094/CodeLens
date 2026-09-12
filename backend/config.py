"""
Configuration & Environment Settings for CarbonLens SME.
Supports Supabase environment loading with graceful offline fallback.
"""

import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "CarbonLens SME"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: Optional[str] = os.getenv("SUPABASE_KEY", os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""))

    @property
    def has_supabase(self) -> bool:
        return bool(self.SUPABASE_URL and self.SUPABASE_KEY)

settings = Settings()
