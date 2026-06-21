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
    if not analysis and payload.hasSelectedLocation and payload.selectedLocation:
        analysis = build_site_analysis(
            AnalyzeSiteRequest(
                lat=payload.selectedLocation.lat,
                lng=payload.selectedLocation.lng,
                intent=payload.planningFocus,
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
        llm_client=OpenAIExplanationClient(
            api_key=settings.openai_api_key,
            model=settings.openai_model,
            enabled=settings.enable_llm_explanations,
        ),
    )


def _apply_optional_llm_report_review(
    result: SiteAnalysisResult,
    active_layers: list[str],
) -> None:
    client = OpenAIExplanationClient(
        api_key=settings.openai_api_key,
        model=settings.openai_model,
        enabled=settings.enable_llm_explanations,
    )
    fallback_review = build_agent_review(result.model_dump(), active_layers)
    llm_summary = client.generate_report_review(
        current_analysis=result.model_dump(),
        fallback_review=fallback_review,
    )
    if not llm_summary:
        return

    result.agentReview.summary = llm_summary
    result.agentReview.usedLlm = True
