"""Runtime configuration for the InfraAI API."""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    api_env: str = "development"
    api_host: str = "127.0.0.1"
    api_port: int = 8000
    api_log_level: str = "info"
    api_cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    openai_api_key: str | None = None
    openai_model: str | None = None
    enable_llm_explanations: bool = False

    model_config = SettingsConfigDict(
        env_file=(".env", "apps/api/.env", "services/agents/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.api_cors_origins.split(",")
            if origin.strip()
        ]

    @property
    def cors_origin_regex(self) -> str | None:
        if self.api_env != "development":
            return None
        return r"http://(localhost|127\.0\.0\.1):\d+"

    @property
    def openai_api_key_configured(self) -> bool:
        return bool(self.openai_api_key and self.openai_api_key.strip())

    @property
    def openai_model_configured(self) -> bool:
        return bool(self.openai_model and self.openai_model.strip())

    @property
    def llm_ready(self) -> bool:
        return (
            self.enable_llm_explanations
            and self.openai_api_key_configured
            and self.openai_model_configured
        )


settings = Settings()
