"""Safety guardrails for AI infrastructure planning responses."""

from __future__ import annotations

from collections.abc import Mapping

from .intents import InfrastructureIntent, normalize_intent

NON_GOAL_WARNING = (
    "InfraAI SiteCompass does not approve construction, issue permits, "
    "allocate public funding, guarantee grid capacity, or replace engineering, "
    "environmental, cybersecurity, or community review."
)


def apply_guardrails(
    intent: str | InfrastructureIntent,
    scores: Mapping[str, float],
    confidence_score: float,
    query: str = "",
) -> list[str]:
    """Return planning guardrails triggered by current scores and user context."""
    resolved_intent = normalize_intent(intent)
    normalized_query = query.lower()
    warnings: list[str] = []

    if confidence_score < 40:
        warnings.append(
            "Insufficient data. The system should not be used for planning "
            "decisions until more reliable data is available."
        )

    if (
        resolved_intent == InfrastructureIntent.DATA_CENTER_FEASIBILITY
        and scores.get("power", 0) < 60
    ):
        warnings.append(
            "Do not recommend immediate data center construction. Grid capacity "
            "validation is required."
        )

    if (
        resolved_intent == InfrastructureIntent.DATA_CENTER_FEASIBILITY
        and scores.get("coolingWater", 0) < 50
    ):
        warnings.append(
            "Do not recommend immediate data center construction. Cooling and "
            "water feasibility review is required."
        )

    if (
        resolved_intent == InfrastructureIntent.SECTOR_SPECIFIC_READINESS
        and "healthcare" in normalized_query
        and scores.get("governance", 0) < 60
    ):
        warnings.append(
            "Only low-risk administrative healthcare AI should be considered. "
            "Clinical AI is not recommended."
        )

    if scores.get("aiLiteracy", 0) < 50:
        warnings.append(
            "AI literacy training should happen before city-wide AI deployment."
        )

    if scores.get("dataMaturity", 0) < 50:
        warnings.append(
            "Data governance and data maturity improvements are required before "
            "high-impact AI deployment."
        )

    warnings.append(NON_GOAL_WARNING)
    return warnings


def is_approval_request(message: str) -> bool:
    """Detect requests that ask the assistant to approve or guarantee decisions."""
    normalized = message.lower()
    return any(
        term in normalized
        for term in (
            "approve",
            "approval",
            "permit",
            "permission",
            "funding",
            "guarantee",
            "guaranteed",
            "can we start construction",
        )
    )

