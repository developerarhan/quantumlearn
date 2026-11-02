"""Environment-backed application settings."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    frontend_origin: str = Field(default="http://localhost:5173")
    simulation_timeout_seconds: float = Field(default=30.0, gt=0, le=120)
    max_concurrent_simulations: int = Field(default=2, ge=1, le=16)
    log_level: str = Field(default="INFO")

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origin.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
