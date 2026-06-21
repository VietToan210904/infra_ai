"""Planning-focus and scenario metadata for readiness reports."""

from __future__ import annotations

from dataclasses import dataclass

from app.domain.readiness.scoring import calculate_confidence, clamp_score
from app.schemas.site import (
    ComponentScores,
    InfrastructureIntent,
    PlanningContext,
    ScenarioImpact,
    ScenarioType,
    ScoreDriver,
    ScoreFormulaTerm,
    SectorReadiness,
)
from infraai_agents.intents import normalize_intent


@dataclass(frozen=True)
class FocusDefinition:
    label: str
    question: str
    relevant_components: list[str]
    evidence_needs: list[str]
    warnings: list[str]


@dataclass(frozen=True)
class ScenarioDefinition:
    label: str
    description: str
    deltas: dict[str, int]
    caveat: str


COMPONENT_LABELS = {
    "power": "Power and grid context",
    "connectivity": "Connectivity and interconnection",
    "coolingWater": "Cooling and water context",
    "physicalFeasibility": "Land, logistics, and physical feasibility",
    "computeEcosystem": "Compute and innovation ecosystem",
    "sectorDemand": "Civic sector demand",
    "governance": "Governance readiness proxy",
    "digitalAccess": "Digital access proxy",
    "aiLiteracy": "AI literacy proxy",
    "dataMaturity": "Data maturity proxy",
    "equity": "Equity and access proxy",
    "resilience": "Resilience and public safety proxy",
    "dataCompleteness": "Data completeness",
    "dataFreshness": "Data freshness",
    "sourceReliability": "Source reliability",
    "geographicResolution": "Geographic resolution",
    "sectorAverage": "Average civic sector readiness",
    "confidence": "Data confidence",
    "governanceRisk": "Healthcare/government risk gap",
    "confidenceGap": "Confidence improvement need",
}

FIELD_BY_DRIVER_LABEL = {
    value: key
    for key, value in COMPONENT_LABELS.items()
    if key
    not in {
        "sectorAverage",
        "confidence",
        "governanceRisk",
        "confidenceGap",
    }
}


FOCUS_REGISTRY: dict[InfrastructureIntent, FocusDefinition] = {
    InfrastructureIntent.GENERAL_AI_INFRASTRUCTURE: FocusDefinition(
        label="General AI infrastructure readiness",
        question="Can this area support a balanced AI infrastructure plan?",
        relevant_components=[
            "power",
            "connectivity",
            "computeEcosystem",
            "coolingWater",
            "physicalFeasibility",
            "dataMaturity",
            "governance",
        ],
        evidence_needs=[
            "Power assets, transmission lines, substations, and generation context.",
            "Telecom, interconnection, data center, and civic-sector evidence.",
            "Cooling/water, physical feasibility, governance, and data maturity signals.",
        ],
        warnings=[
            "This is a broad planning score, not a construction feasibility score.",
            "Synthetic/demo layers can affect this planning score and must be validated before real decisions.",
        ],
    ),
    InfrastructureIntent.DATA_CENTER_FEASIBILITY: FocusDefinition(
        label="Data center feasibility",
        question="Can this area support a data center feasibility review?",
        relevant_components=[
            "power",
            "connectivity",
            "coolingWater",
            "physicalFeasibility",
            "computeEcosystem",
            "governance",
        ],
        evidence_needs=[
            "Utility-confirmed grid capacity, substations, transmission proximity, and interconnection feasibility.",
            "Fiber diversity, carrier access, data center/interconnection ecosystem evidence.",
            "Cooling, water, flood/heat, land, zoning, permitting, and environmental review evidence.",
        ],
        warnings=[
            "Do not treat this as approval to build a data center.",
            "AI literacy and sector demand may be useful context, but they are not primary data-center score drivers.",
        ],
    ),
    InfrastructureIntent.PUBLIC_COMPUTE_HUB: FocusDefinition(
        label="Public AI compute hub",
        question="Can this area support a shared public AI compute hub?",
        relevant_components=[
            "connectivity",
            "power",
            "sectorDemand",
            "computeEcosystem",
            "governance",
            "physicalFeasibility",
        ],
        evidence_needs=[
            "Reliable power and connectivity for shared compute operations.",
            "Nearby public agencies, schools, healthcare, workforce, and nonprofit demand.",
            "Governance, procurement, cybersecurity, and shared-access operating model evidence.",
        ],
        warnings=[
            "A public compute hub requires operational governance, access rules, and public-sector onboarding.",
        ],
    ),
    InfrastructureIntent.EDGE_AI_NODES: FocusDefinition(
        label="Edge AI nodes",
        question="Where could small edge AI nodes support local services?",
        relevant_components=[
            "connectivity",
            "power",
            "sectorDemand",
            "physicalFeasibility",
            "computeEcosystem",
            "resilience",
        ],
        evidence_needs=[
            "Telecom assets, public-safety/civic demand, and local power evidence near the selected point.",
            "Physical deployment feasibility for small equipment sites.",
            "Resilience and service-continuity signals for local AI use cases.",
        ],
        warnings=[
            "Edge nodes should start as small pilots; this score does not validate device siting or network SLAs.",
        ],
    ),
    InfrastructureIntent.CLOUD_FIRST_STRATEGY: FocusDefinition(
        label="Cloud-first strategy",
        question="Is cloud-first a better near-term AI infrastructure path here?",
        relevant_components=[
            "connectivity",
            "governance",
            "dataMaturity",
            "sectorAverage",
            "digitalAccess",
        ],
        evidence_needs=[
            "Connectivity and digital access evidence for reliable cloud service delivery.",
            "Governance, procurement, privacy, cybersecurity, and data-sharing readiness.",
            "Sector readiness evidence showing which services can move first.",
        ],
        warnings=[
            "Cloud-first reduces local facility burden but still depends on connectivity, data maturity, and governance.",
        ],
    ),
    InfrastructureIntent.FIBER_CONNECTIVITY_UPGRADE: FocusDefinition(
        label="Fiber/connectivity upgrade",
        question="Should this area be prioritized for fiber and connectivity upgrades?",
        relevant_components=[
            "digitalAccess",
            "sectorDemand",
            "connectivity",
            "equity",
            "resilience",
        ],
        evidence_needs=[
            "Telecom assets, broadband performance, digital access, equity, and sector demand evidence.",
            "Locations where weak connectivity constrains schools, healthcare, government, workforce, or nonprofits.",
        ],
        warnings=[
            "For this focus, a higher score means higher upgrade priority, not stronger infrastructure readiness.",
        ],
    ),
    InfrastructureIntent.POWER_GRID_READINESS: FocusDefinition(
        label="Power/grid readiness",
        question="Is the power and grid context ready for AI infrastructure?",
        relevant_components=[
            "power",
            "physicalFeasibility",
            "computeEcosystem",
            "resilience",
            "confidence",
            "governance",
        ],
        evidence_needs=[
            "Substations, transmission lines, generation context, and utility-validated capacity.",
            "Physical feasibility, resilience, and governance evidence for grid-related investment.",
        ],
        warnings=[
            "Open-data grid assets do not prove available load, interconnection rights, or capacity.",
        ],
    ),
    InfrastructureIntent.CITY_DATA_PLATFORM: FocusDefinition(
        label="City data platform",
        question="Is this area ready for city data platform investment?",
        relevant_components=[
            "dataMaturity",
            "governance",
            "digitalAccess",
            "sectorDemand",
            "aiLiteracy",
        ],
        evidence_needs=[
            "Data maturity, governance, digital access, AI literacy, and sector-demand evidence.",
            "Agency participation and data-sharing readiness for cross-sector AI services.",
        ],
        warnings=[
            "A city data platform is an operating model and governance investment, not only a technology purchase.",
        ],
    ),
    InfrastructureIntent.AI_LITERACY_PROGRAM: FocusDefinition(
        label="AI literacy program",
        question="Should AI literacy and workforce training be prioritized here?",
        relevant_components=[
            "aiLiteracy",
            "sectorDemand",
            "digitalAccess",
            "equity",
            "physicalFeasibility",
        ],
        evidence_needs=[
            "Education, workforce, digital access, equity, and implementation capacity evidence.",
            "Sector demand evidence showing where training unlocks useful low-risk AI adoption.",
        ],
        warnings=[
            "For this focus, a higher score means higher training investment priority.",
        ],
    ),
    InfrastructureIntent.GOVERNANCE_CYBERSECURITY: FocusDefinition(
        label="Governance/cybersecurity readiness",
        question="Should governance and cybersecurity come before AI scale-up?",
        relevant_components=[
            "governance",
            "dataMaturity",
            "governanceRisk",
            "sectorDemand",
            "confidenceGap",
        ],
        evidence_needs=[
            "Governance, data maturity, privacy, cybersecurity, procurement, and audit-readiness evidence.",
            "Healthcare and government risk context for high-impact AI systems.",
        ],
        warnings=[
            "For this focus, a higher score means higher governance/cybersecurity priority.",
        ],
    ),
    InfrastructureIntent.SECTOR_SPECIFIC_READINESS: FocusDefinition(
        label="Sector-specific readiness",
        question="Which civic sectors are ready for AI, and which need support first?",
        relevant_components=[
            "sectorAverage",
            "digitalAccess",
            "dataMaturity",
            "aiLiteracy",
            "governance",
            "sectorDemand",
        ],
        evidence_needs=[
            "Education, workforce, healthcare, government, and nonprofit evidence.",
            "Digital access, data maturity, AI literacy, governance, and use-case feasibility evidence.",
        ],
        warnings=[
            "Healthcare AI should remain low-risk and administrative unless governance is validated.",
        ],
    ),
}


SCENARIO_REGISTRY: dict[ScenarioType, ScenarioDefinition] = {
    ScenarioType.BUILD_NOW: ScenarioDefinition(
        label="Build now",
        description="Baseline view using the selected evidence set without assumed intervention.",
        deltas={},
        caveat="This is a current-planning baseline, not a forecast.",
    ),
    ScenarioType.UPGRADE_FIBER_FIRST: ScenarioDefinition(
        label="Upgrade fiber first",
        description="Assumes near-term fiber and digital access improvements before larger AI investment.",
        deltas={"connectivity": 8, "digitalAccess": 10, "resilience": 4},
        caveat="Directional simulation only; it does not verify provider capacity or cost.",
    ),
    ScenarioType.VALIDATE_GRID_FIRST: ScenarioDefinition(
        label="Validate grid capacity first",
        description="Assumes utility validation improves power evidence and source reliability.",
        deltas={"power": 10, "dataCompleteness": 8, "sourceReliability": 8},
        caveat="Directional simulation only; it does not guarantee available load.",
    ),
    ScenarioType.AI_LITERACY_TRAINING: ScenarioDefinition(
        label="Launch AI literacy training",
        description="Assumes training improves human readiness, sector adoption, and equity.",
        deltas={"aiLiteracy": 14, "sectorDemand": 3, "equity": 3},
        caveat="Directional simulation only; actual outcomes depend on program design and participation.",
    ),
    ScenarioType.CLOUD_FIRST: ScenarioDefinition(
        label="Cloud-first instead of local infrastructure",
        description="Assumes cloud-first delivery reduces local cooling and physical burden while increasing data maturity needs.",
        deltas={
            "coolingWater": 8,
            "physicalFeasibility": 5,
            "dataMaturity": 4,
            "computeEcosystem": -4,
        },
        caveat="Cloud-first still depends on connectivity, governance, digital access, and procurement readiness.",
    ),
    ScenarioType.DELAY_INVESTMENT: ScenarioDefinition(
        label="Delay investment",
        description="Assumes delayed action reduces data freshness, demand momentum, and resilience.",
        deltas={"dataFreshness": -12, "sectorDemand": -4, "resilience": -3},
        caveat="Directional simulation only; it is not a macroeconomic forecast.",
    ),
    ScenarioType.GOVERNANCE_FIRST: ScenarioDefinition(
        label="Governance first",
        description="Assumes governance, data maturity, and source reliability improve before technical scale-up.",
        deltas={"governance": 12, "dataMaturity": 8, "sourceReliability": 5},
        caveat="Directional simulation only; policy implementation must be validated.",
    ),
    ScenarioType.EDGE_PILOT_FIRST: ScenarioDefinition(
        label="Edge pilot first",
        description="Assumes small edge pilots improve resilience, connectivity learning, and local service readiness.",
        deltas={
            "resilience": 10,
            "connectivity": 4,
            "sectorDemand": 5,
            "physicalFeasibility": 2,
        },
        caveat="Directional simulation only; hardware siting and operations still need review.",
    ),
    ScenarioType.OPEN_DATA_PLATFORM_FIRST: ScenarioDefinition(
        label="Open data platform first",
        description="Assumes data platform work improves data maturity, governance, and digital access.",
        deltas={"dataMaturity": 12, "governance": 6, "digitalAccess": 4},
        caveat="Directional simulation only; data-sharing agreements and stewardship still need validation.",
    ),
}


def apply_scenario_adjustments(
    scenario: str | ScenarioType,
    scores: ComponentScores,
) -> ComponentScores:
    scenario_type = _resolve_scenario(scenario)
    values = scores.model_dump()
    for field_name, delta in SCENARIO_REGISTRY[scenario_type].deltas.items():
        values[field_name] = clamp_score(values[field_name] + delta)
    return ComponentScores(**values)


def build_planning_context(
    intent: str | InfrastructureIntent,
    scenario: str | ScenarioType,
    before_scores: ComponentScores,
    after_scores: ComponentScores,
    sectors: list[SectorReadiness],
) -> PlanningContext:
    intent_type = _resolve_intent(intent)
    scenario_type = _resolve_scenario(scenario)
    focus = FOCUS_REGISTRY[intent_type]
    scenario_definition = SCENARIO_REGISTRY[scenario_type]
    focus_warnings = list(focus.warnings)
    focus_warnings.append(scenario_definition.caveat)

    return PlanningContext(
        focusLabel=focus.label,
        focusQuestion=focus.question,
        scenarioLabel=scenario_definition.label,
        scenarioDescription=scenario_definition.description,
        scoreFormula=build_score_formula(intent_type, after_scores, sectors),
        relevantComponents=focus.relevant_components,
        scenarioImpacts=build_scenario_impacts(
            scenario_type, before_scores, after_scores
        ),
        focusSpecificEvidenceNeeds=focus.evidence_needs,
        focusSpecificWarnings=focus_warnings,
    )


def build_score_formula(
    intent: str | InfrastructureIntent,
    scores: ComponentScores,
    sectors: list[SectorReadiness],
) -> list[ScoreFormulaTerm]:
    intent_type = _resolve_intent(intent)
    confidence = calculate_confidence(scores).score
    sector_average = _sector_average(sectors)

    if intent_type == InfrastructureIntent.DATA_CENTER_FEASIBILITY:
        return _terms(
            scores,
            [
                ("power", 30, "readiness", "Utility and grid context is the largest driver for data center feasibility."),
                ("connectivity", 20, "readiness", "Fiber and interconnection context supports workload access and redundancy."),
                ("coolingWater", 20, "readiness", "Cooling and water feasibility is required before data center decisions."),
                ("physicalFeasibility", 15, "readiness", "Land, logistics, zoning, and construction context affect feasibility."),
                ("computeEcosystem", 10, "readiness", "Existing compute ecosystem supports operations and suppliers."),
                ("governance", 5, "readiness", "Governance is a smaller but necessary control gate."),
            ],
        )

    if intent_type == InfrastructureIntent.EDGE_AI_NODES:
        return _terms(
            scores,
            [
                ("connectivity", 25, "readiness", "Edge nodes depend on local connectivity and low-latency service routes."),
                ("power", 20, "readiness", "Small nodes still need reliable local power context."),
                ("sectorDemand", 20, "readiness", "Nearby public-service demand indicates where edge pilots are useful."),
                ("physicalFeasibility", 15, "readiness", "Physical deployment context affects whether small nodes can be placed."),
                ("computeEcosystem", 10, "readiness", "Local compute ecosystem helps operations and maintenance."),
                ("resilience", 10, "readiness", "Resilience matters for edge use cases such as traffic, safety, and flood response."),
            ],
        )

    if intent_type == InfrastructureIntent.PUBLIC_COMPUTE_HUB:
        return _terms(
            scores,
            [
                ("connectivity", 25, "readiness", "Shared compute needs reliable access for agencies and partners."),
                ("power", 20, "readiness", "Power context constrains local compute scale."),
                ("sectorDemand", 20, "readiness", "Public-sector demand is central to a shared compute hub."),
                ("computeEcosystem", 15, "readiness", "Tech and research proximity supports staffing and operations."),
                ("governance", 10, "readiness", "Governance controls shared access, procurement, and cybersecurity."),
                ("physicalFeasibility", 10, "readiness", "Physical feasibility affects where a hub can operate."),
            ],
        )

    if intent_type == InfrastructureIntent.CLOUD_FIRST_STRATEGY:
        return _terms(
            scores,
            [
                ("connectivity", 30, "readiness", "Cloud-first delivery depends most on connectivity quality and redundancy."),
                ("governance", 20, "readiness", "Cloud use requires procurement, privacy, cybersecurity, and audit controls."),
                ("dataMaturity", 20, "readiness", "Data maturity determines whether cloud AI services can be used safely."),
                ("sectorAverage", 15, "readiness", "Sector readiness shows whether users can adopt cloud services."),
                ("digitalAccess", 15, "readiness", "Digital access determines who can benefit from cloud-first services."),
            ],
            extra_scores={"sectorAverage": sector_average},
        )

    if intent_type == InfrastructureIntent.FIBER_CONNECTIVITY_UPGRADE:
        return _terms(
            scores,
            [
                ("digitalAccess", 35, "gap", "Digital access gaps are the main reason to prioritize fiber investment."),
                ("sectorDemand", 25, "readiness", "High sector demand increases the value of connectivity upgrades."),
                ("connectivity", 20, "gap", "Weak current connectivity increases upgrade priority."),
                ("equity", 10, "gap", "Equity gaps raise the priority of access investment."),
                ("resilience", 10, "gap", "Resilience gaps increase the value of redundant connectivity."),
            ],
        )

    if intent_type == InfrastructureIntent.AI_LITERACY_PROGRAM:
        return _terms(
            scores,
            [
                ("aiLiteracy", 35, "gap", "AI literacy gaps are the main reason to prioritize training."),
                ("sectorDemand", 25, "readiness", "High sector demand increases the value of training investment."),
                ("digitalAccess", 20, "gap", "Digital access gaps constrain who can benefit from training."),
                ("equity", 10, "gap", "Equity gaps raise the need for inclusive training programs."),
                ("physicalFeasibility", 10, "readiness", "Implementation feasibility affects near-term rollout."),
            ],
        )

    if intent_type == InfrastructureIntent.GOVERNANCE_CYBERSECURITY:
        governance_risk_base = min(scores.governance, scores.dataMaturity)
        return _terms(
            scores,
            [
                ("governance", 30, "gap", "Governance gaps are the largest reason to prioritize policy and cybersecurity."),
                ("dataMaturity", 25, "gap", "Data maturity gaps increase governance and risk-management needs."),
                ("governanceRisk", 20, "gap", "Healthcare and government risk rises when governance and data maturity are both weak."),
                ("sectorDemand", 15, "readiness", "High sector demand increases the urgency of governance controls."),
                ("confidenceGap", 10, "gap", "Weak evidence confidence raises the need for validation and controls."),
            ],
            extra_scores={
                "governanceRisk": governance_risk_base,
                "confidenceGap": confidence,
            },
        )

    if intent_type == InfrastructureIntent.POWER_GRID_READINESS:
        return _terms(
            scores,
            [
                ("power", 35, "readiness", "Power context is the primary driver for grid readiness."),
                ("physicalFeasibility", 20, "readiness", "Land and logistics affect grid-related delivery options."),
                ("computeEcosystem", 15, "readiness", "Existing compute ecosystem indicates potential demand and operations support."),
                ("resilience", 15, "readiness", "Resilience context matters for reliable AI infrastructure operations."),
                ("confidence", 10, "readiness", "Confidence reflects whether the evidence is complete and reliable enough."),
                ("governance", 5, "readiness", "Governance is needed for validation and investment sequencing."),
            ],
            extra_scores={"confidence": confidence},
        )

    if intent_type == InfrastructureIntent.CITY_DATA_PLATFORM:
        return _terms(
            scores,
            [
                ("dataMaturity", 30, "readiness", "Data maturity is the core driver for a city data platform."),
                ("governance", 20, "readiness", "Governance controls data sharing, privacy, auditability, and ownership."),
                ("digitalAccess", 20, "readiness", "Digital access affects who can use platform-enabled services."),
                ("sectorDemand", 15, "readiness", "Sector demand shows where the platform can create public value."),
                ("aiLiteracy", 15, "readiness", "AI literacy affects adoption and safe use."),
            ],
        )

    if intent_type == InfrastructureIntent.SECTOR_SPECIFIC_READINESS:
        return _terms(
            scores,
            [
                ("sectorAverage", 100, "readiness", "The selected score is the average readiness across the five civic sectors."),
            ],
            extra_scores={"sectorAverage": sector_average},
        )

    return _terms(
        scores,
        [
            ("power", 25, "readiness", "Power is the largest general infrastructure driver."),
            ("connectivity", 20, "readiness", "Connectivity is required for cloud, local compute, and civic AI services."),
            ("computeEcosystem", 15, "readiness", "Compute ecosystem helps operations, partners, and talent."),
            ("coolingWater", 15, "readiness", "Cooling and water context matters for local compute options."),
            ("physicalFeasibility", 10, "readiness", "Physical feasibility constrains deployment paths."),
            ("dataMaturity", 10, "readiness", "Data maturity affects whether AI services can be used responsibly."),
            ("governance", 5, "readiness", "Governance provides controls for safe AI adoption."),
        ],
    )


def annotate_score_drivers(
    score_drivers: list[ScoreDriver],
    planning_context: PlanningContext,
    before_scores: ComponentScores,
    after_scores: ComponentScores,
) -> list[ScoreDriver]:
    weights = formula_weights_by_component(planning_context.scoreFormula)
    for driver in score_drivers:
        field_name = FIELD_BY_DRIVER_LABEL.get(driver.component)
        if not field_name:
            continue
        weight = weights.get(field_name)
        scenario_delta = int(getattr(after_scores, field_name) - getattr(before_scores, field_name))
        driver.includedInFocusScore = weight is not None
        driver.formulaWeight = weight
        driver.scenarioAdjustment = scenario_delta
        driver.focusSpecificExplanation = _driver_focus_explanation(
            driver=driver,
            field_name=field_name,
            focus_label=planning_context.focusLabel,
            focus_question=planning_context.focusQuestion,
            weight=weight,
            scenario_delta=scenario_delta,
        )
    return score_drivers


def formula_weights_by_component(
    formula_terms: list[ScoreFormulaTerm],
) -> dict[str, int]:
    weights: dict[str, int] = {}
    for term in formula_terms:
        if term.component in FIELD_BY_DRIVER_LABEL.values():
            weights[term.component] = max(weights.get(term.component, 0), term.weightPercent)
    return weights


def build_scenario_impacts(
    scenario: str | ScenarioType,
    before_scores: ComponentScores,
    after_scores: ComponentScores,
) -> list[ScenarioImpact]:
    scenario_type = _resolve_scenario(scenario)
    impacts: list[ScenarioImpact] = []
    for field_name in SCENARIO_REGISTRY[scenario_type].deltas:
        before = int(getattr(before_scores, field_name))
        after = int(getattr(after_scores, field_name))
        delta = after - before
        impacts.append(
            ScenarioImpact(
                component=field_name,
                label=COMPONENT_LABELS[field_name],
                beforeScore=before,
                afterScore=after,
                delta=delta,
                explanation=_scenario_impact_explanation(field_name, delta),
            )
        )
    return impacts


def _terms(
    scores: ComponentScores,
    definitions: list[tuple[str, int, str, str]],
    *,
    extra_scores: dict[str, int] | None = None,
) -> list[ScoreFormulaTerm]:
    extra_scores = extra_scores or {}
    terms: list[ScoreFormulaTerm] = []
    for component, weight_percent, direction, explanation in definitions:
        raw_score = extra_scores.get(component)
        if raw_score is None:
            raw_score = int(getattr(scores, component))
        score_value = 100 - raw_score if direction == "gap" else raw_score
        terms.append(
            ScoreFormulaTerm(
                component=component,
                label=COMPONENT_LABELS[component],
                weightPercent=weight_percent,
                score=clamp_score(score_value),
                contribution=round(score_value * (weight_percent / 100), 1),
                direction=direction,  # type: ignore[arg-type]
                explanation=explanation,
            )
        )
    return terms


def _driver_focus_explanation(
    *,
    driver: ScoreDriver,
    field_name: str,
    focus_label: str,
    focus_question: str,
    weight: int | None,
    scenario_delta: int,
) -> str:
    scenario_text = ""
    if scenario_delta > 0:
        scenario_text = f" The selected scenario raises this component by {scenario_delta} point(s)."
    elif scenario_delta < 0:
        scenario_text = f" The selected scenario lowers this component by {abs(scenario_delta)} point(s)."

    if weight is not None:
        return (
            f"Used in the {focus_label} score at {weight}% weight because the report "
            f"is answering: {focus_question}{scenario_text}"
        )
    if driver.evidenceCount == 0:
        return (
            f"Evidence gap for this focus. It is not in the selected formula and no "
            f"active real/open nearby evidence was found for {field_name}.{scenario_text}"
        )
    return (
        f"Context only for {focus_label}. It helps interpret the site, but it does "
        f"not change this selected score.{scenario_text}"
    )


def _scenario_impact_explanation(field_name: str, delta: int) -> str:
    if delta > 0:
        return f"The scenario assumes an improvement to {COMPONENT_LABELS[field_name].lower()}."
    if delta < 0:
        return f"The scenario assumes a reduction to {COMPONENT_LABELS[field_name].lower()}."
    return f"The scenario does not change {COMPONENT_LABELS[field_name].lower()}."


def _sector_average(sectors: list[SectorReadiness]) -> int:
    if not sectors:
        return 0
    return clamp_score(sum(sector.score for sector in sectors) / len(sectors))


def _resolve_intent(intent: str | InfrastructureIntent) -> InfrastructureIntent:
    return InfrastructureIntent(normalize_intent(intent).value)


def _resolve_scenario(scenario: str | ScenarioType) -> ScenarioType:
    try:
        return ScenarioType(str(scenario))
    except ValueError:
        return ScenarioType.BUILD_NOW
