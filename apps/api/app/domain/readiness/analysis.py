"""Build deterministic AI infrastructure readiness reports."""

from __future__ import annotations

from app.schemas.site import (
    AgentReview,
    AnalyzeSiteRequest,
    ComponentScores,
    GapSummary,
    InfrastructureIntent,
    SiteAnalysisResult,
    Suitability,
)
from infraai_agents.guardrails import apply_guardrails
from infraai_agents.intents import normalize_intent
from infraai_agents.tools import build_agent_review

from .evidence import build_evidence_grounded_scores
from .planning_context import (
    annotate_score_drivers,
    apply_scenario_adjustments,
    build_planning_context,
)
from .scoring import (
    calculate_confidence,
    calculate_intent_specific_score,
    calculate_sector_readiness,
    classify_readiness_level,
    clamp_score,
    detect_bottlenecks,
    rank_priority_investments,
)


def build_site_analysis(payload: AnalyzeSiteRequest) -> SiteAnalysisResult:
    intent = _resolve_request_intent(payload)
    (
        evidence_scores,
        evidence_summary,
        score_drivers,
        matched_evidence,
        excluded_synthetic_layers,
        data_gaps,
    ) = build_evidence_grounded_scores(payload.lat, payload.lng, payload.activeLayers)
    scores = apply_scenario_adjustments(
        payload.scenario,
        evidence_scores,
    )
    sectors = calculate_sector_readiness(scores)
    planning_context = build_planning_context(
        intent,
        payload.scenario,
        evidence_scores,
        scores,
        sectors,
    )
    score_drivers = _sync_score_driver_scores(score_drivers, scores)
    score_drivers = annotate_score_drivers(
        score_drivers,
        planning_context,
        evidence_scores,
        scores,
    )
    confidence = calculate_confidence(scores)
    score = calculate_intent_specific_score(intent, scores, sectors)
    warnings = apply_guardrails(intent.value, scores.model_dump(), confidence.score, payload.userQuestion or "")
    recommendation = _build_recommendation(intent, score, scores)

    result = SiteAnalysisResult(
        intent=InfrastructureIntent(intent.value),
        querySummary=_build_query_summary(intent, payload.userQuestion),
        selectedSite={
            "lat": payload.lat,
            "lng": payload.lng,
            "label": _site_label(payload.lat, payload.lng),
        },
        suitability=Suitability(
            score=score,
            level=classify_readiness_level(score),
            confidence=confidence.level,  # type: ignore[arg-type]
            recommendation=recommendation,
        ),
        componentScores=scores,
        sectors=sectors,
        bottlenecks=detect_bottlenecks(scores),
        strengths=_detect_strengths(scores),
        priorityInvestments=rank_priority_investments(intent.value, scores, sectors),
        roadmap=_build_roadmap(intent, scores),
        planningContext=planning_context,
        agentReview=AgentReview(
            **build_agent_review(
                {
                    "intent": intent.value,
                    "suitability": {
                        "score": score,
                        "level": classify_readiness_level(score),
                        "confidence": confidence.level,
                        "recommendation": recommendation,
                    },
                    "componentScores": scores.model_dump(),
                    "sectors": [sector.model_dump() for sector in sectors],
                    "bottlenecks": detect_bottlenecks(scores),
                    "strengths": _detect_strengths(scores),
                    "priorityInvestments": rank_priority_investments(
                        intent.value, scores, sectors
                    ),
                    "roadmap": _build_roadmap(intent, scores),
                    "planningContext": planning_context.model_dump(),
                    "evidenceSummary": evidence_summary.model_dump(),
                    "scoreDrivers": [
                        score_driver.model_dump() for score_driver in score_drivers
                    ],
                    "matchedEvidence": [
                        evidence.model_dump() for evidence in matched_evidence
                    ],
                    "excludedSyntheticLayers": [
                        layer.model_dump() for layer in excluded_synthetic_layers
                    ],
                    "dataGaps": data_gaps,
                    "warnings": warnings,
                },
                payload.activeLayers,
            )
        ),
        evidenceSummary=evidence_summary,
        scoreDrivers=score_drivers,
        matchedEvidence=matched_evidence,
        excludedSyntheticLayers=excluded_synthetic_layers,
        dataGaps=data_gaps,
        confidenceExplanation=confidence.explanation,
        gapSummary=_build_gap_summary(scores),
        recommendedInfrastructurePath=_build_infrastructure_path(intent, scores, score),
        humanReviewRequired=True,
        warnings=warnings,
    )
    return result


def _sync_score_driver_scores(score_drivers: list, scores: ComponentScores) -> list:
    field_by_label = {
        "Power and grid context": "power",
        "Connectivity and interconnection": "connectivity",
        "Cooling and water context": "coolingWater",
        "Land, logistics, and physical feasibility": "physicalFeasibility",
        "Compute and innovation ecosystem": "computeEcosystem",
        "Civic sector demand": "sectorDemand",
        "Governance readiness proxy": "governance",
        "Digital access proxy": "digitalAccess",
        "AI literacy proxy": "aiLiteracy",
        "Data maturity proxy": "dataMaturity",
        "Equity and access proxy": "equity",
        "Resilience and public safety proxy": "resilience",
    }
    for driver in score_drivers:
        field = field_by_label.get(driver.component)
        if field:
            driver.score = int(getattr(scores, field))
    return score_drivers


def _resolve_request_intent(payload: AnalyzeSiteRequest) -> InfrastructureIntent:
    return InfrastructureIntent(
        normalize_intent(
            payload.intent or payload.infrastructureIntent or payload.infrastructureType
        ).value
    )


def _build_feature_profile(lat: float, lng: float, active_layers: list[str]) -> ComponentScores:
    scores = {
        "power": 66,
        "connectivity": 78,
        "coolingWater": 58,
        "physicalFeasibility": 70,
        "computeEcosystem": 72,
        "sectorDemand": 82,
        "governance": 64,
        "digitalAccess": 68,
        "aiLiteracy": 56,
        "dataMaturity": 61,
        "equity": 60,
        "resilience": 63,
        "dataCompleteness": 54,
        "dataFreshness": 58,
        "sourceReliability": 57,
        "geographicResolution": 66,
    }

    if lng > 106.76 and lat > 10.80:
        _adjust(scores, computeEcosystem=8, power=4, physicalFeasibility=5, sectorDemand=3)
    elif 106.69 <= lng <= 106.74 and 10.75 <= lat <= 10.80:
        _adjust(scores, connectivity=5, governance=5, dataMaturity=4, sectorDemand=5)
    elif lng < 106.71 and lat > 10.75:
        _adjust(scores, governance=8, sectorDemand=6, physicalFeasibility=-4, coolingWater=-3)
    elif lat < 10.75:
        _adjust(scores, physicalFeasibility=6, connectivity=4, power=3, resilience=3)

    layer_set = set(active_layers)
    if {"substations", "transmission_lines", "grid_capacity_verification"} & layer_set:
        _adjust(scores, power=4, dataCompleteness=3, sourceReliability=2)
    if {"fiber_corridors", "telecom_assets", "ookla_fixed_performance"} & layer_set:
        _adjust(scores, connectivity=5, digitalAccess=3, geographicResolution=2)
    if {"ai_readiness_assessment", "workforce_readiness"} & layer_set:
        _adjust(scores, aiLiteracy=4, dataMaturity=3, governance=2)
    if {"flood_risk", "heat_risk", "water_availability", "aqueduct_water_risk"} & layer_set:
        _adjust(scores, coolingWater=2, resilience=2, dataCompleteness=3)
    if any(layer.startswith("synthetic") for layer in layer_set):
        _adjust(scores, dataCompleteness=2, sourceReliability=-3)

    return ComponentScores(**{key: clamp_score(value) for key, value in scores.items()})


def _build_recommendation(
    intent: InfrastructureIntent,
    score: int,
    scores: ComponentScores,
) -> str:
    if intent == InfrastructureIntent.DATA_CENTER_FEASIBILITY:
        if scores.power >= 70 and scores.coolingWater >= 65 and score >= 65:
            return (
                "Proceed only to formal data center feasibility review. Grid, "
                "cooling, water, land, and permitting evidence must be validated "
                "before any construction decision."
            )
        return (
            "Do not treat this as ready for immediate data center construction. "
            "Use it as a pre-feasibility candidate until grid capacity and "
            "cooling/water constraints are validated."
        )

    intent_recommendations = {
        InfrastructureIntent.PUBLIC_COMPUTE_HUB: (
            "Suitable for a phased public AI compute hub if grid validation, "
            "shared governance, and agency onboarding are handled first."
        ),
        InfrastructureIntent.EDGE_AI_NODES: (
            "Prioritize small edge AI pilots where connectivity, power, and "
            "public-service demand overlap, then expand after reliability checks."
        ),
        InfrastructureIntent.CLOUD_FIRST_STRATEGY: (
            "Use a cloud-first path for near-term services, while improving "
            "governance, data maturity, and connectivity for resilient delivery."
        ),
        InfrastructureIntent.FIBER_CONNECTIVITY_UPGRADE: (
            "Treat fiber and digital access upgrades as a priority where access "
            "gaps constrain sector readiness and equity."
        ),
        InfrastructureIntent.POWER_GRID_READINESS: (
            "Run utility-led grid validation before committing to local compute "
            "or data center scale infrastructure."
        ),
        InfrastructureIntent.CITY_DATA_PLATFORM: (
            "Invest first in city data platform foundations: data sharing, "
            "cataloging, access controls, auditability, and stewardship."
        ),
        InfrastructureIntent.AI_LITERACY_PROGRAM: (
            "Launch AI literacy and workforce training before broad deployment "
            "of high-impact AI systems."
        ),
        InfrastructureIntent.GOVERNANCE_CYBERSECURITY: (
            "Put governance, cybersecurity, procurement, privacy, and audit "
            "controls first before scaling sensitive AI use cases."
        ),
        InfrastructureIntent.SECTOR_SPECIFIC_READINESS: (
            "Use sector-specific pilots, beginning with low-risk administrative "
            "workflows and expanding only after governance and data controls improve."
        ),
    }
    return intent_recommendations.get(
        intent,
        "Use this as an open-ended AI infrastructure planning candidate, not an "
        "approval decision. Sequence investments around the weakest readiness gaps.",
    )


def _build_query_summary(intent: InfrastructureIntent, question: str | None) -> str:
    if question:
        return f"Planning question classified as {intent.value}: {question}"
    return f"Planning focus classified as {intent.value}."


def _build_gap_summary(scores: ComponentScores) -> GapSummary:
    return GapSummary(
        digitalAccess=_gap_text("Digital access", scores.digitalAccess),
        aiLiteracy=_gap_text("AI literacy", scores.aiLiteracy),
        infrastructure=(
            f"Infrastructure gap is driven by power {scores.power}/100, "
            f"connectivity {scores.connectivity}/100, and cooling/water "
            f"{scores.coolingWater}/100."
        ),
        dataQuality=(
            f"Data quality is partial: completeness {scores.dataCompleteness}/100, "
            f"freshness {scores.dataFreshness}/100, reliability "
            f"{scores.sourceReliability}/100, and resolution "
            f"{scores.geographicResolution}/100."
        ),
    )


def _build_infrastructure_path(
    intent: InfrastructureIntent,
    scores: ComponentScores,
    score: int,
) -> str:
    if intent == InfrastructureIntent.DATA_CENTER_FEASIBILITY and (
        scores.power < 60 or scores.coolingWater < 50
    ):
        return "Cloud-first and public compute hub pilots before any data center review."
    if intent == InfrastructureIntent.FIBER_CONNECTIVITY_UPGRADE:
        return "Fiber upgrade priority path with district-level digital access targeting."
    if intent == InfrastructureIntent.AI_LITERACY_PROGRAM:
        return "AI literacy and workforce readiness path before broad AI deployment."
    if score >= 75:
        return "Phased local AI infrastructure path with formal validation gates."
    return "Pre-feasibility path focused on data, governance, grid, and access upgrades."


def _build_roadmap(intent: InfrastructureIntent, scores: ComponentScores) -> list[dict[str, list[str] | str]]:
    near_term = [
        "Validate grid, fiber, water, and land assumptions with responsible agencies.",
        "Publish a data-quality register that separates open data, synthetic/demo assumptions, and verified evidence.",
        "Define governance, cybersecurity, privacy, and procurement rules for AI pilots.",
    ]
    mid_term = [
        "Upgrade the weakest readiness components identified in the scorecard.",
        "Launch low-risk AI pilots for government, education, workforce, healthcare administration, and nonprofits.",
        "Measure digital access and AI literacy gaps before expanding services.",
    ]
    long_term = [
        "Scale resilient AI infrastructure only after verified grid, cooling, governance, and community review.",
        "Refresh readiness scores with authoritative utility, land, environmental, and sector datasets.",
        "Update the city AI roadmap annually with public accountability metrics.",
    ]

    if intent == InfrastructureIntent.EDGE_AI_NODES:
        near_term.insert(0, "Select small edge AI pilot corridors with strong connectivity and public-service demand.")
    if intent == InfrastructureIntent.CITY_DATA_PLATFORM or scores.dataMaturity < 60:
        near_term.insert(0, "Create a city data platform backlog and ownership model.")
    if intent == InfrastructureIntent.AI_LITERACY_PROGRAM or scores.aiLiteracy < 60:
        near_term.insert(0, "Start AI literacy training for public agencies, schools, and community partners.")

    return [
        {"horizon": "0-6 months", "actions": near_term},
        {"horizon": "6-18 months", "actions": mid_term},
        {"horizon": "18-36 months", "actions": long_term},
    ]


def _detect_strengths(scores: ComponentScores) -> list[str]:
    checks = [
        ("Strong city connectivity context.", scores.connectivity),
        ("Good public-sector and civic AI demand.", scores.sectorDemand),
        ("Useful compute and innovation ecosystem proximity.", scores.computeEcosystem),
        ("Moderate physical feasibility for phased pilots.", scores.physicalFeasibility),
        ("Governance foundation can support low-risk pilots.", scores.governance),
    ]
    strengths = [label for label, score in checks if score >= 70]
    strengths.append("Open-data and synthetic/demo layers support the planning score but still require validation.")
    return strengths


def _site_label(lat: float, lng: float) -> str:
    if lng > 106.76 and lat > 10.80:
        return "Thu Duc AI Infrastructure Candidate Zone"
    if 106.69 <= lng <= 106.74 and 10.75 <= lat <= 10.80:
        return "Central HCMC AI Planning Candidate Zone"
    if lat < 10.75:
        return "District 7 / Tan Thuan AI Planning Candidate Zone"
    return "Candidate AI Infrastructure Site"


def _gap_text(label: str, score: int) -> str:
    if score >= 75:
        return f"{label} gap is limited in this demo profile at {score}/100."
    if score >= 60:
        return f"{label} gap is moderate and should be targeted before scale-up ({score}/100)."
    return f"{label} gap is material and should be addressed before broad deployment ({score}/100)."


def _adjust(values: dict[str, int], **deltas: int) -> None:
    for key, delta in deltas.items():
        values[key] = clamp_score(values.get(key, 0) + delta)
