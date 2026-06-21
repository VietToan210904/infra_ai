"""Intent routing for open-ended AI infrastructure planning questions."""

from __future__ import annotations

from enum import StrEnum


class InfrastructureIntent(StrEnum):
    GENERAL_AI_INFRASTRUCTURE = "GENERAL_AI_INFRASTRUCTURE"
    DATA_CENTER_FEASIBILITY = "DATA_CENTER_FEASIBILITY"
    PUBLIC_COMPUTE_HUB = "PUBLIC_COMPUTE_HUB"
    EDGE_AI_NODES = "EDGE_AI_NODES"
    CLOUD_FIRST_STRATEGY = "CLOUD_FIRST_STRATEGY"
    FIBER_CONNECTIVITY_UPGRADE = "FIBER_CONNECTIVITY_UPGRADE"
    POWER_GRID_READINESS = "POWER_GRID_READINESS"
    CITY_DATA_PLATFORM = "CITY_DATA_PLATFORM"
    AI_LITERACY_PROGRAM = "AI_LITERACY_PROGRAM"
    GOVERNANCE_CYBERSECURITY = "GOVERNANCE_CYBERSECURITY"
    SECTOR_SPECIFIC_READINESS = "SECTOR_SPECIFIC_READINESS"


LEGACY_INTENT_MAP = {
    "PUBLIC_AI_COMPUTE_HUB": InfrastructureIntent.PUBLIC_COMPUTE_HUB,
    "REGIONAL_AI_DATA_CENTER": InfrastructureIntent.DATA_CENTER_FEASIBILITY,
}


def normalize_intent(value: str | InfrastructureIntent | None) -> InfrastructureIntent:
    """Normalize current and legacy frontend values into the canonical intent."""
    if isinstance(value, InfrastructureIntent):
        return value

    if not value:
        return InfrastructureIntent.GENERAL_AI_INFRASTRUCTURE

    normalized = value.strip().upper()
    if normalized in LEGACY_INTENT_MAP:
        return LEGACY_INTENT_MAP[normalized]

    try:
        return InfrastructureIntent(normalized)
    except ValueError:
        return InfrastructureIntent.GENERAL_AI_INFRASTRUCTURE


def classify_intent(message: str) -> InfrastructureIntent:
    """Classify a free-form planning question into an infrastructure intent."""
    normalized = message.lower()

    if any(term in normalized for term in ("data center", "datacenter", "server farm")):
        return InfrastructureIntent.DATA_CENTER_FEASIBILITY

    if any(
        term in normalized
        for term in ("compute hub", "public compute", "shared compute")
    ):
        return InfrastructureIntent.PUBLIC_COMPUTE_HUB

    if any(
        term in normalized
        for term in ("edge", "sensor", "traffic", "flood", "local node")
    ):
        return InfrastructureIntent.EDGE_AI_NODES

    if any(
        term in normalized
        for term in ("cloud", "cloud-first", "saas", "remote compute")
    ):
        return InfrastructureIntent.CLOUD_FIRST_STRATEGY

    if any(
        term in normalized
        for term in ("fiber", "fibre", "broadband", "latency", "internet", "connectivity")
    ):
        return InfrastructureIntent.FIBER_CONNECTIVITY_UPGRADE

    if any(
        term in normalized
        for term in ("power", "electricity", "grid", "substation")
    ):
        return InfrastructureIntent.POWER_GRID_READINESS

    if any(
        term in normalized
        for term in ("data platform", "open data", "data lake", "data sharing")
    ):
        return InfrastructureIntent.CITY_DATA_PLATFORM

    if any(
        term in normalized
        for term in (
            "literacy",
            "training",
            "skills",
            "teacher training",
            "workforce training",
        )
    ):
        return InfrastructureIntent.AI_LITERACY_PROGRAM

    if any(
        term in normalized
        for term in ("governance", "cybersecurity", "privacy", "audit", "policy", "procurement")
    ):
        return InfrastructureIntent.GOVERNANCE_CYBERSECURITY

    if any(
        term in normalized
        for term in ("healthcare", "education", "workforce", "nonprofit", "government")
    ):
        return InfrastructureIntent.SECTOR_SPECIFIC_READINESS

    return InfrastructureIntent.GENERAL_AI_INFRASTRUCTURE

