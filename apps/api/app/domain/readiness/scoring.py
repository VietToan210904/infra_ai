"""Deterministic readiness scoring for InfraAI SiteCompass."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass

from app.schemas.site import ComponentScores, SectorReadiness
from infraai_agents.intents import InfrastructureIntent, normalize_intent


@dataclass(frozen=True)
class ConfidenceResult:
    score: int
    level: str
    explanation: str


def clamp_score(score: float) -> int:
    return round(max(0, min(100, score)))


def classify_readiness_level(score: int) -> str:
    if score >= 80:
        return "Strong readiness"
    if score >= 65:
        return "Moderate readiness"
    if score >= 50:
        return "Early readiness"
    return "Low readiness"


def calculate_infrastructure_readiness(scores: ComponentScores) -> int:
    return _weighted_score(
        scores,
        {
            "power": 0.25,
            "connectivity": 0.20,
            "computeEcosystem": 0.15,
            "coolingWater": 0.15,
            "physicalFeasibility": 0.10,
            "dataMaturity": 0.10,
            "governance": 0.05,
        },
    )


def calculate_confidence(scores: ComponentScores) -> ConfidenceResult:
    score = _weighted_score(
        scores,
        {
            "dataCompleteness": 0.40,
            "dataFreshness": 0.25,
            "sourceReliability": 0.20,
            "geographicResolution": 0.15,
        },
    )
    level = "High" if score >= 75 else "Medium" if score >= 50 else "Low"
    explanation = (
        f"Confidence is {level.lower()} because data completeness is "
        f"{scores.dataCompleteness}/100, freshness is {scores.dataFreshness}/100, "
        f"source reliability is {scores.sourceReliability}/100, and geographic "
        f"resolution is {scores.geographicResolution}/100. Open-data and "
        "synthetic layers provide planning context but do not verify feasibility."
    )
    return ConfidenceResult(score=score, level=level, explanation=explanation)


def calculate_sector_readiness(scores: ComponentScores) -> list[SectorReadiness]:
    infrastructure = calculate_infrastructure_readiness(scores)
    sector_inputs = [
        (
            "Education",
            (scores.aiLiteracy + scores.digitalAccess + scores.dataMaturity) / 3,
            "AI literacy, classroom safeguards, and school connectivity.",
            ["Teacher planning support", "Student services chatbot", "Skills analytics"],
        ),
        (
            "Workforce",
            (scores.aiLiteracy + scores.sectorDemand + scores.digitalAccess) / 3,
            "Worker training pathways and SME digital adoption.",
            ["Job matching", "Training recommendations", "SME productivity support"],
        ),
        (
            "Healthcare",
            (scores.governance * 0.45 + scores.dataMaturity * 0.35 + scores.connectivity * 0.20),
            "Privacy, governance, and administrative-only healthcare guardrails.",
            ["Appointment routing", "Inventory forecasting", "Admin summarization"],
        ),
        (
            "Government",
            (scores.governance * 0.40 + scores.dataMaturity * 0.35 + scores.connectivity * 0.25),
            "Cross-agency governance, auditability, and data sharing.",
            ["Permit triage", "Policy document search", "Service knowledge assistant"],
        ),
        (
            "Nonprofits",
            (scores.digitalAccess + scores.equity + scores.aiLiteracy) / 3,
            "Shared service access, digital capacity, and inclusion.",
            ["Grant discovery", "Service referral assistant", "Volunteer coordination"],
        ),
    ]

    sectors: list[SectorReadiness] = []
    for name, use_case_feasibility, main_gap, use_cases in sector_inputs:
        score = clamp_score(
            infrastructure * 0.25
            + scores.digitalAccess * 0.20
            + scores.dataMaturity * 0.20
            + scores.aiLiteracy * 0.15
            + scores.governance * 0.10
            + use_case_feasibility * 0.10
        )
        sectors.append(
            SectorReadiness(
                name=name,
                level=classify_readiness_level(score),
                score=score,
                mainGap=main_gap,
                suggestedUseCases=use_cases,
            )
        )
    return sectors


def detect_bottlenecks(scores: ComponentScores) -> list[str]:
    checks = [
        ("Power/grid capacity needs utility validation.", scores.power),
        ("Connectivity or fiber redundancy is not strong enough.", scores.connectivity),
        ("Cooling and water feasibility require engineering review.", scores.coolingWater),
        ("Physical feasibility needs zoning, land, and construction review.", scores.physicalFeasibility),
        ("Digital access gaps may limit equitable AI service delivery.", scores.digitalAccess),
        ("AI literacy is not yet strong enough for broad deployment.", scores.aiLiteracy),
        ("Data maturity is a constraint for high-impact AI systems.", scores.dataMaturity),
        ("Governance and cybersecurity controls need strengthening.", scores.governance),
    ]
    bottlenecks = [label for label, score in checks if score < 65]
    if bottlenecks:
        return bottlenecks
    return ["No single component is below the moderate-readiness threshold."]


def rank_priority_investments(
    intent: str | InfrastructureIntent,
    scores: ComponentScores,
    sector_scores: list[SectorReadiness],
) -> list[str]:
    resolved_intent = normalize_intent(intent)
    priorities: list[tuple[str, int]] = [
        ("Grid capacity validation", 100 - scores.power),
        ("Fiber redundancy and digital access upgrades", max(100 - scores.connectivity, 100 - scores.digitalAccess)),
        ("Cooling and water feasibility study", 100 - scores.coolingWater),
        ("AI literacy training for public agencies and schools", 100 - scores.aiLiteracy),
        ("City data governance and cybersecurity framework", max(100 - scores.governance, 100 - scores.dataMaturity)),
        ("Equity-focused access program for underserved communities", 100 - scores.equity),
    ]

    intent_boosts = {
        InfrastructureIntent.DATA_CENTER_FEASIBILITY: "Grid capacity validation",
        InfrastructureIntent.EDGE_AI_NODES: "Fiber redundancy and digital access upgrades",
        InfrastructureIntent.FIBER_CONNECTIVITY_UPGRADE: "Fiber redundancy and digital access upgrades",
        InfrastructureIntent.AI_LITERACY_PROGRAM: "AI literacy training for public agencies and schools",
        InfrastructureIntent.GOVERNANCE_CYBERSECURITY: "City data governance and cybersecurity framework",
        InfrastructureIntent.CITY_DATA_PLATFORM: "City data governance and cybersecurity framework",
        InfrastructureIntent.POWER_GRID_READINESS: "Grid capacity validation",
    }
    boosted = intent_boosts.get(resolved_intent)
    ranked = [(name, gap + (25 if name == boosted else 0)) for name, gap in priorities]

    lowest_sector = min(sector_scores, key=lambda sector: sector.score)
    ranked.append((f"{lowest_sector.name} readiness support", 100 - lowest_sector.score))
    ranked.sort(key=lambda item: item[1], reverse=True)
    return [name for name, _ in ranked[:5]]


def calculate_intent_specific_score(
    intent: str | InfrastructureIntent,
    scores: ComponentScores,
    sector_scores: list[SectorReadiness] | None = None,
) -> int:
    resolved_intent = normalize_intent(intent)
    confidence = calculate_confidence(scores).score
    sector_average = _sector_average(sector_scores or calculate_sector_readiness(scores))

    if resolved_intent == InfrastructureIntent.DATA_CENTER_FEASIBILITY:
        return _weighted_score(
            scores,
            {
                "power": 0.30,
                "connectivity": 0.20,
                "coolingWater": 0.20,
                "physicalFeasibility": 0.15,
                "computeEcosystem": 0.10,
                "governance": 0.05,
            },
        )

    if resolved_intent == InfrastructureIntent.EDGE_AI_NODES:
        return _weighted_score(
            scores,
            {
                "connectivity": 0.25,
                "power": 0.20,
                "sectorDemand": 0.20,
                "physicalFeasibility": 0.15,
                "computeEcosystem": 0.10,
                "resilience": 0.10,
            },
        )

    if resolved_intent == InfrastructureIntent.PUBLIC_COMPUTE_HUB:
        return _weighted_score(
            scores,
            {
                "connectivity": 0.25,
                "power": 0.20,
                "sectorDemand": 0.20,
                "computeEcosystem": 0.15,
                "governance": 0.10,
                "physicalFeasibility": 0.10,
            },
        )

    if resolved_intent == InfrastructureIntent.CLOUD_FIRST_STRATEGY:
        return clamp_score(
            scores.connectivity * 0.30
            + scores.governance * 0.20
            + scores.dataMaturity * 0.20
            + sector_average * 0.15
            + scores.digitalAccess * 0.15
        )

    if resolved_intent == InfrastructureIntent.FIBER_CONNECTIVITY_UPGRADE:
        return clamp_score(
            (100 - scores.digitalAccess) * 0.35
            + scores.sectorDemand * 0.25
            + (100 - scores.connectivity) * 0.20
            + (100 - scores.equity) * 0.10
            + (100 - scores.resilience) * 0.10
        )

    if resolved_intent == InfrastructureIntent.AI_LITERACY_PROGRAM:
        return clamp_score(
            (100 - scores.aiLiteracy) * 0.35
            + scores.sectorDemand * 0.25
            + (100 - scores.digitalAccess) * 0.20
            + (100 - scores.equity) * 0.10
            + scores.physicalFeasibility * 0.10
        )

    if resolved_intent == InfrastructureIntent.GOVERNANCE_CYBERSECURITY:
        return clamp_score(
            (100 - scores.governance) * 0.30
            + (100 - scores.dataMaturity) * 0.25
            + (100 - min(scores.governance, scores.dataMaturity)) * 0.20
            + scores.sectorDemand * 0.15
            + (100 - confidence) * 0.10
        )

    if resolved_intent == InfrastructureIntent.POWER_GRID_READINESS:
        return clamp_score(
            scores.power * 0.35
            + scores.physicalFeasibility * 0.20
            + scores.computeEcosystem * 0.15
            + scores.resilience * 0.15
            + confidence * 0.10
            + scores.governance * 0.05
        )

    if resolved_intent == InfrastructureIntent.CITY_DATA_PLATFORM:
        return _weighted_score(
            scores,
            {
                "dataMaturity": 0.30,
                "governance": 0.20,
                "digitalAccess": 0.20,
                "sectorDemand": 0.15,
                "aiLiteracy": 0.15,
            },
        )

    if resolved_intent == InfrastructureIntent.SECTOR_SPECIFIC_READINESS:
        return sector_average

    return calculate_infrastructure_readiness(scores)


def _weighted_score(scores: ComponentScores, weights: Mapping[str, float]) -> int:
    return clamp_score(
        sum(getattr(scores, field_name) * weight for field_name, weight in weights.items())
    )


def _sector_average(sectors: list[SectorReadiness]) -> int:
    if not sectors:
        return 0
    return clamp_score(sum(sector.score for sector in sectors) / len(sectors))
