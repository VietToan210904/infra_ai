"""Health endpoint."""

from __future__ import annotations

from fastapi import APIRouter

from app.core.config import settings

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str | bool]:
    return {
        "status": "ok",
        "environment": settings.api_env,
        "llmProvider": "openai",
        "llmExplanationsEnabled": settings.enable_llm_explanations,
        "openaiApiKeyConfigured": settings.openai_api_key_configured,
        "openaiModelConfigured": settings.openai_model_configured,
        "llmReady": settings.llm_ready,
    }
