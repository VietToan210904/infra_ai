"""Site analysis and planning-agent routes."""

from __future__ import annotations

from fastapi import APIRouter

from app.core.config import settings
from app.domain.readiness.analysis import build_site_analysis
from app.schemas.site import AnalyzeSiteRequest, ChatMessage, ChatRequest, SiteAnalysisResult
from infraai_agents.openai_adapter import OpenAIExplanationClient
from infraai_agents.responses import generate_agent_response
from infraai_agents.tools import build_agent_review

router = APIRouter(prefix="/api")


@router.post("/analyze-site", response_model=SiteAnalysisResult)
def analyze_site(payload: AnalyzeSiteRequest) -> SiteAnalysisResult:
    result = build_site_analysis(payload)
    _apply_optional_llm_report_review(result, payload.activeLayers)
    return result


@router.post("/agent/chat", response_model=ChatMessage)
def chat_with_agent(payload: ChatRequest) -> dict[str, str]:
    analysis = payload.currentAnalysis
    llm_client = _openai_client()
    intent_result = {
        "intent": payload.planningFocus or "GENERAL_AI_INFRASTRUCTURE",
        "method": "ui",
        "confidence": "medium",
        "reason": "Using the current UI planning focus.",
    }
    if payload.hasSelectedLocation:
        intent_result = _classify_chat_intent(
            message=payload.message,
            fallback_intent=payload.planningFocus,
            llm_client=llm_client,
        )
    if not analysis and payload.hasSelectedLocation and payload.selectedLocation:
        analysis = build_site_analysis(
            AnalyzeSiteRequest(
                lat=payload.selectedLocation.lat,
                lng=payload.selectedLocation.lng,
                intent=intent_result["intent"],
                userQuestion=payload.message,
                activeLayers=payload.activeLayers,
                scenario=payload.scenario,
            )
        )

    current_analysis = analysis.model_dump() if analysis else None
    return generate_agent_response(
        message=payload.message,
        current_analysis=current_analysis,
        has_selected_location=payload.hasSelectedLocation,
        selected_location=payload.selectedLocation.model_dump()
        if payload.selectedLocation
        else None,
        active_layers=payload.activeLayers,
        scenario=payload.scenario.value,
        planning_focus=payload.planningFocus,
        detected_intent=intent_result["intent"],
        detected_intent_method=intent_result["method"],
        detected_intent_confidence=intent_result["confidence"],
        detected_intent_reason=intent_result["reason"],
        llm_client=llm_client,
    )


def _apply_optional_llm_report_review(
    result: SiteAnalysisResult,
    active_layers: list[str],
) -> None:
    client = _openai_client()
    fallback_review = build_agent_review(result.model_dump(), active_layers)
    llm_summary = client.generate_report_review(
        current_analysis=result.model_dump(),
        fallback_review=fallback_review,
    )
    if not llm_summary:
        return

    result.agentReview.summary = llm_summary
    result.agentReview.usedLlm = True


def _openai_client() -> OpenAIExplanationClient:
    return OpenAIExplanationClient(
        api_key=settings.openai_api_key,
        model=settings.openai_model,
        enabled=settings.enable_llm_explanations,
    )


def _classify_chat_intent(
    *,
    message: str,
    fallback_intent: str | None,
    llm_client: OpenAIExplanationClient,
) -> dict[str, str]:
    llm_result = llm_client.classify_intent(
        message=message,
        fallback_intent=fallback_intent,
    )
    if llm_result:
        return llm_result
    return {
        "intent": fallback_intent or "GENERAL_AI_INFRASTRUCTURE",
        "method": "ui",
        "confidence": "medium",
        "reason": "OpenAI intent classification was unavailable; using the current UI planning focus.",
    }
