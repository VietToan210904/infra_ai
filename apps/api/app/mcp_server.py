"""MCP tool server for InfraAI SiteCompass."""

from __future__ import annotations

from typing import Any

from mcp.server.fastmcp import FastMCP

from app.domain.readiness.analysis import build_site_analysis
from app.schemas.site import AnalyzeSiteRequest
from infraai_agents.tools import (
    answer_platform_help,
    apply_planning_guardrails_tool,
    classify_planning_intent,
    compare_scenarios,
    describe_map_location_context,
    explain_score_drivers,
    generate_readiness_roadmap_tool,
    query_site_evidence,
    rank_priority_investments_tool,
    recommend_next_actions,
    review_report_reliability,
    summarize_layer_evidence,
)


infraai_mcp = FastMCP(
    "InfraAI SiteCompass",
    instructions=(
        "Tools for AI infrastructure planning. Scores are deterministic and "
        "must not be treated as construction approval, permitting approval, "
        "funding allocation, or grid-capacity guarantees."
    ),
    stateless_http=True,
    json_response=True,
    streamable_http_path="/",
)


@infraai_mcp.tool()
def classify_planning_intent_tool(message: str) -> dict[str, Any]:
    """Classify a free-form AI infrastructure planning question."""
    return classify_planning_intent(message)


@infraai_mcp.tool()
def analyze_site_readiness_tool(
    lat: float,
    lng: float,
    intent: str = "GENERAL_AI_INFRASTRUCTURE",
    scenario: str = "BUILD_NOW",
    active_layers: list[str] | None = None,
    user_question: str | None = None,
) -> dict[str, Any]:
    """Run deterministic site readiness analysis for a selected location."""
    result = build_site_analysis(
        AnalyzeSiteRequest(
            lat=lat,
            lng=lng,
            intent=intent,
            userQuestion=user_question,
            activeLayers=active_layers or [],
            scenario=scenario,
        )
    )
    return result.model_dump()


@infraai_mcp.tool()
def summarize_layer_evidence_tool(active_layers: list[str] | None = None) -> dict[str, Any]:
    """Summarize visible infrastructure overlays as selected evidence."""
    return summarize_layer_evidence(active_layers)


@infraai_mcp.tool()
def query_site_evidence_tool(current_analysis: dict[str, Any]) -> dict[str, Any]:
    """Return matched real/open evidence, synthetic exclusions, and data gaps."""
    return query_site_evidence(current_analysis)


@infraai_mcp.tool()
def describe_map_location_context_tool(
    current_analysis: dict[str, Any],
) -> dict[str, Any]:
    """Summarize nearby components and facilities around the selected map point."""
    return describe_map_location_context(current_analysis)


@infraai_mcp.tool()
def explain_score_drivers_tool(current_analysis: dict[str, Any]) -> dict[str, Any]:
    """Explain component-level score drivers from the current report."""
    return explain_score_drivers(current_analysis)


@infraai_mcp.tool()
def review_report_reliability_tool(current_analysis: dict[str, Any]) -> dict[str, Any]:
    """Review score reliability, assumptions, evidence gaps, and validation needs."""
    return review_report_reliability(current_analysis)


@infraai_mcp.tool()
def recommend_next_actions_tool(current_analysis: dict[str, Any]) -> dict[str, Any]:
    """Recommend next actions from score drivers, evidence gaps, and priorities."""
    return recommend_next_actions(current_analysis)


@infraai_mcp.tool()
def compare_scenarios_tool(
    current_analysis: dict[str, Any],
    requested_scenario: str | None = None,
) -> dict[str, Any]:
    """Compare scenario effects against the current readiness report."""
    return compare_scenarios(current_analysis, requested_scenario)


@infraai_mcp.tool()
def rank_priority_investments_tool_mcp(
    current_analysis: dict[str, Any],
) -> dict[str, Any]:
    """Rank priority investments from the current readiness report."""
    return rank_priority_investments_tool(current_analysis)


@infraai_mcp.tool()
def generate_readiness_roadmap_tool_mcp(
    current_analysis: dict[str, Any],
) -> dict[str, Any]:
    """Return the near-, mid-, and long-term readiness roadmap."""
    return generate_readiness_roadmap_tool(current_analysis)


@infraai_mcp.tool()
def apply_planning_guardrails_tool_mcp(
    message: str,
    current_analysis: dict[str, Any],
) -> dict[str, Any]:
    """Apply planning guardrails to a user request and current report."""
    return apply_planning_guardrails_tool(message, current_analysis)


@infraai_mcp.tool()
def answer_platform_help_tool(message: str) -> dict[str, Any]:
    """Answer questions about how InfraAI SiteCompass works."""
    return answer_platform_help(message)
