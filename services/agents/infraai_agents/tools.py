"""Shared tool handlers for InfraAI planning agents and MCP exposure."""

from __future__ import annotations

from typing import Any

from .guardrails import NON_GOAL_WARNING, apply_guardrails
from .intents import classify_intent, normalize_intent


SCENARIO_EFFECTS: dict[str, dict[str, int]] = {
    "BUILD_NOW": {},
    "UPGRADE_FIBER_FIRST": {"connectivity": 8, "digitalAccess": 10, "resilience": 4},
    "VALIDATE_GRID_FIRST": {"power": 10, "dataCompleteness": 8, "sourceReliability": 8},
    "AI_LITERACY_TRAINING": {"aiLiteracy": 14, "sectorDemand": 3, "equity": 3},
    "CLOUD_FIRST": {
        "coolingWater": 8,
        "physicalFeasibility": 5,
        "dataMaturity": 4,
        "computeEcosystem": -4,
    },
    "DELAY_INVESTMENT": {"dataFreshness": -12, "sectorDemand": -4, "resilience": -3},
    "GOVERNANCE_FIRST": {"governance": 12, "dataMaturity": 8, "sourceReliability": 5},
    "EDGE_PILOT_FIRST": {
        "resilience": 10,
        "connectivity": 4,
        "sectorDemand": 5,
        "physicalFeasibility": 2,
    },
    "OPEN_DATA_PLATFORM_FIRST": {"dataMaturity": 12, "governance": 6, "digitalAccess": 4},
}


LAYER_CATEGORY_RULES: tuple[tuple[str, str], ...] = (
    ("power", "power"),
    ("substation", "power"),
    ("transmission", "power"),
    ("grid", "power"),
    ("fiber", "connectivity"),
    ("telecom", "connectivity"),
    ("cell", "connectivity"),
    ("ookla", "connectivity"),
    ("peering", "connectivity"),
    ("data_center", "compute ecosystem"),
    ("tech", "compute ecosystem"),
    ("education", "sector demand"),
    ("healthcare", "sector demand"),
    ("government", "sector demand"),
    ("public_safety", "sector demand"),
    ("water", "cooling and water"),
    ("cooling", "cooling and water"),
    ("flood", "risk and resilience"),
    ("heat", "risk and resilience"),
    ("zoning", "land and permitting"),
    ("permitting", "land and permitting"),
    ("construction", "land and permitting"),
    ("protected", "land and permitting"),
    ("population", "equity and demand"),
    ("workforce", "AI literacy and workforce"),
    ("digital_access", "digital access"),
    ("ai_literacy", "AI literacy and workforce"),
    ("ai_readiness", "AI readiness"),
)


SYNTHETIC_LAYER_IDS = {
    "grid_capacity_verification",
    "fiber_capacity_verification",
    "cooling_feasibility_verification",
    "zoning_verification",
    "permitting_status",
    "construction_readiness",
    "ai_readiness_assessment",
    "fiber_corridors",
    "flood_risk",
    "heat_risk",
    "water_availability",
    "zoning",
    "protected_land",
    "population_density",
    "workforce_readiness",
    "digital_access_gap",
    "ai_literacy_gap",
    "wri_power_plants",
    "opencellid_cell_sites",
    "ookla_fixed_performance",
    "ookla_mobile_performance",
    "aqueduct_water_risk",
}


def classify_planning_intent(
    message: str,
    *,
    detected_intent: str | None = None,
    classifier: str = "keyword",
    confidence: str | None = None,
    reason: str | None = None,
) -> dict[str, Any]:
    """Classify an open-ended planning question."""
    intent = normalize_intent(detected_intent) if detected_intent else classify_intent(message)
    summary = f"Question classified as {intent.value} by {classifier}."
    if confidence:
        summary += f" Classifier confidence: {confidence}."
    if reason:
        summary += f" Reason: {reason}"
    return {
        "tool": "classify_planning_intent",
        "intent": intent.value,
        "classifier": classifier,
        "confidence": confidence,
        "reason": reason,
        "summary": summary,
    }


def summarize_layer_evidence(active_layers: list[str] | None) -> dict[str, Any]:
    """Summarize visible map layers as the selected evidence set."""
    layers = active_layers or []
    categories: dict[str, int] = {}
    synthetic_layers: list[str] = []
    open_layers: list[str] = []

    for layer_id in layers:
        category = _layer_category(layer_id)
        categories[category] = categories.get(category, 0) + 1
        if layer_id in SYNTHETIC_LAYER_IDS or "synthetic" in layer_id:
            synthetic_layers.append(layer_id)
        else:
            open_layers.append(layer_id)

    limitations = [
        "Visible overlays are treated as the selected evidence set.",
        "Open-data layers may be incomplete or outdated.",
    ]
    if synthetic_layers:
        limitations.append(
            "Synthetic/demo layers are included in scoring and must be validated before real decisions."
        )

    return {
        "tool": "summarize_layer_evidence",
        "activeLayerCount": len(layers),
        "categories": categories,
        "openDataLayers": open_layers,
        "syntheticLayers": synthetic_layers,
        "limitations": limitations,
        "summary": _layer_summary(layers, categories, synthetic_layers),
    }


def compare_scenarios(
    current_analysis: dict[str, Any] | None,
    requested_scenario: str | None = None,
) -> dict[str, Any]:
    """Compare scenario effects against the current report score context."""
    scores = _scores(current_analysis)
    current_score = _suitability(current_analysis).get("score")
    scenario_keys = [requested_scenario] if requested_scenario else list(SCENARIO_EFFECTS)
    comparisons = []

    for scenario in scenario_keys:
        if not scenario or scenario not in SCENARIO_EFFECTS:
            continue
        effects = SCENARIO_EFFECTS[scenario]
        improved_components = [
            f"{key} +{delta}" for key, delta in effects.items() if delta > 0
        ]
        reduced_components = [
            f"{key} {delta}" for key, delta in effects.items() if delta < 0
        ]
        estimated_score_shift = _estimate_score_shift(effects)
        comparisons.append(
            {
                "scenario": scenario,
                "estimatedScoreShift": estimated_score_shift,
                "currentScore": current_score,
                "improves": improved_components,
                "tradeoffs": reduced_components,
                "mostRelevantCurrentScores": _relevant_scores(scores, effects),
            }
        )

    return {
        "tool": "compare_scenarios",
        "comparisons": comparisons,
        "summary": _scenario_summary(comparisons),
    }


def rank_priority_investments_tool(
    current_analysis: dict[str, Any] | None,
) -> dict[str, Any]:
    """Return ranked priority investments from the current analysis."""
    investments = _list_value(current_analysis, "priorityInvestments")
    bottlenecks = _list_value(current_analysis, "bottlenecks")
    return {
        "tool": "rank_priority_investments",
        "priorityInvestments": investments,
        "bottlenecks": bottlenecks,
        "summary": (
            "Priority investments are ranked from the current bottlenecks and "
            f"planning intent: {_join(investments)}"
        ),
    }


def generate_readiness_roadmap_tool(
    current_analysis: dict[str, Any] | None,
) -> dict[str, Any]:
    """Return the strategic roadmap from the current analysis."""
    roadmap = _list_value(current_analysis, "roadmap")
    return {
        "tool": "generate_readiness_roadmap",
        "roadmap": roadmap,
        "summary": _roadmap_summary(roadmap),
    }


def apply_planning_guardrails_tool(
    message: str,
    current_analysis: dict[str, Any] | None,
) -> dict[str, Any]:
    """Apply planning guardrails to a chat message and current analysis."""
    scores = _scores(current_analysis)
    intent = _intent(current_analysis)
    confidence_score = _confidence_proxy(scores)
    warnings = apply_guardrails(intent, scores, confidence_score, message)
    return {
        "tool": "apply_planning_guardrails",
        "warnings": warnings,
        "summary": _join(warnings),
    }


def answer_platform_help(message: str) -> dict[str, Any]:
    """Answer product/platform questions with stable system context."""
    normalized = message.lower()
    if _is_greeting(normalized):
        answer = (
            "Hi. I can help explain how InfraAI SiteCompass works, review "
            "evidence after analysis, compare scenarios, and suggest validation "
            "steps. To analyze a real location, click the map or choose a "
            "candidate zone, then run readiness analysis."
        )
    elif "confidence" in normalized:
        answer = (
            "Confidence measures data completeness, freshness, source reliability, "
            "and geographic resolution. It is not a feasibility guarantee."
        )
    elif "score" in normalized:
        answer = (
            "Scores are deterministic weighted calculations from component scores. "
            "Agents can review reliability and explain uncertainty, but they do not "
            "invent or override the score. Visible open-data and synthetic/demo "
            "layers are included in analysis with source limitations disclosed."
        )
    elif "map" in normalized or "layer" in normalized:
        answer = (
            "Visible map overlays are the evidence set for analysis. All visible "
            "open-data and synthetic/demo layers are included in scoring, while "
            "source type, confidence, and limitations remain flagged."
        )
    elif "mcp" in normalized or "tool" in normalized:
        answer = (
            "The backend exposes planning tools through the agent chat flow and the "
            "MCP endpoint for external clients."
        )
    else:
        answer = (
            "InfraAI SiteCompass combines a satellite map, visible infrastructure "
            "layers, deterministic readiness scoring, scenario simulation, agent "
            "review, and human-review guardrails. Select a location to generate "
            "a site-specific report; general platform questions can be answered "
            "without selecting a site."
        )
    return {"tool": "answer_platform_help", "answer": answer, "summary": answer}


def can_answer_without_site(message: str) -> bool:
    """Return whether a question can be answered without selected-site context."""
    normalized = message.lower().strip()
    return _is_greeting(normalized) or _is_platform_question(normalized)


def query_site_evidence(current_analysis: dict[str, Any] | None) -> dict[str, Any]:
    """Return evidence used by the current report."""
    if not current_analysis:
        return {
            "tool": "query_site_evidence",
            "summary": "No site analysis is available yet.",
            "matchedEvidence": [],
            "dataGaps": [],
            "excludedSyntheticLayers": [],
            "syntheticEvidenceUsed": [],
        }
    evidence_summary = current_analysis.get("evidenceSummary", {})
    matched_evidence = _list_value(current_analysis, "matchedEvidence")
    data_gaps = _list_value(current_analysis, "dataGaps")
    excluded = _list_value(current_analysis, "excludedSyntheticLayers")
    synthetic_evidence = _synthetic_evidence_notes(matched_evidence)
    citations = _evidence_citations(matched_evidence)
    return {
        "tool": "query_site_evidence",
        "evidenceSummary": evidence_summary,
        "matchedEvidence": matched_evidence[:6],
        "dataGaps": data_gaps,
        "excludedSyntheticLayers": excluded,
        "syntheticEvidenceUsed": synthetic_evidence,
        "citations": citations,
        "summary": _evidence_answer_summary(evidence_summary, citations, data_gaps),
    }


def describe_map_location_context(
    current_analysis: dict[str, Any] | None,
) -> dict[str, Any]:
    """Summarize the selected map point and surrounding infrastructure evidence."""
    if not current_analysis:
        return {
            "tool": "describe_map_location_context",
            "summary": "No selected map-location analysis is available yet.",
            "selectedSite": None,
            "nearbyComponents": [],
            "currentFacilities": [],
            "dataGaps": [],
            "excludedSyntheticLayers": [],
            "syntheticEvidenceUsed": [],
        }

    selected_site = current_analysis.get("selectedSite")
    selected_site = selected_site if isinstance(selected_site, dict) else {}
    matched_evidence = _list_value(current_analysis, "matchedEvidence")
    score_drivers = _list_value(current_analysis, "scoreDrivers")
    data_gaps = _list_value(current_analysis, "dataGaps")
    excluded = _list_value(current_analysis, "excludedSyntheticLayers")
    synthetic_evidence = _synthetic_evidence_notes(matched_evidence)
    nearby_components = _nearby_component_lines(matched_evidence)
    current_facilities = _current_facility_lines(matched_evidence)
    infrastructure_signals = _infrastructure_signal_lines(score_drivers)

    return {
        "tool": "describe_map_location_context",
        "selectedSite": selected_site,
        "nearbyComponents": nearby_components,
        "currentFacilities": current_facilities,
        "infrastructureSignals": infrastructure_signals,
        "dataGaps": data_gaps,
        "excludedSyntheticLayers": excluded,
        "syntheticEvidenceUsed": synthetic_evidence,
        "summary": _map_context_summary(
            selected_site,
            nearby_components,
            current_facilities,
            infrastructure_signals,
            data_gaps,
            excluded,
            synthetic_evidence,
        ),
    }


def explain_score_drivers(current_analysis: dict[str, Any] | None) -> dict[str, Any]:
    """Explain component-level score drivers from the current report."""
    drivers = _list_value(current_analysis, "scoreDrivers")
    if not drivers:
        return {
            "tool": "explain_score_drivers",
            "summary": "No score drivers are available yet.",
            "scoreDrivers": [],
        }
    suitability = _suitability(current_analysis)
    sorted_drivers = sorted(
        [driver for driver in drivers if isinstance(driver, dict)],
        key=lambda item: item.get("score", 0),
    )
    weakest = sorted_drivers[:3]
    strongest = sorted_drivers[-3:][::-1]
    data_quality = _scores(current_analysis)
    return {
        "tool": "explain_score_drivers",
        "overallScore": suitability.get("score"),
        "readinessLevel": suitability.get("level"),
        "confidence": suitability.get("confidence"),
        "scoreDrivers": drivers,
        "weakestDrivers": weakest,
        "strongestDrivers": strongest,
        "dataQualityScores": {
            "dataCompleteness": data_quality.get("dataCompleteness"),
            "dataFreshness": data_quality.get("dataFreshness"),
            "sourceReliability": data_quality.get("sourceReliability"),
            "geographicResolution": data_quality.get("geographicResolution"),
        },
        "summary": _plain_score_summary(suitability, strongest, weakest, data_quality),
    }


def review_report_reliability(current_analysis: dict[str, Any] | None) -> dict[str, Any]:
    """Review report reliability from existing analysis fields."""
    if not current_analysis:
        return {
            "tool": "review_report_reliability",
            "summary": "No report is available to review.",
        }
    review = build_agent_review(current_analysis)
    return {
        "tool": "review_report_reliability",
        "review": review,
        "summary": review["summary"],
    }


def generate_human_review_guidance(
    current_analysis: dict[str, Any] | None,
    current_review: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Generate human-review guidance without changing review decisions."""
    if not current_analysis:
        return {
            "tool": "generate_human_review_guidance",
            "summary": "No report is available for human review guidance.",
            "validationPriorities": [],
            "questionsForExperts": [],
            "assumptionsToChallenge": [],
        }

    review = build_agent_review(current_analysis)
    data_gaps = _list_value(current_analysis, "dataGaps")
    score_drivers = _list_value(current_analysis, "scoreDrivers")
    weakest = sorted(
        [driver for driver in score_drivers if isinstance(driver, dict)],
        key=lambda item: item.get("score", 100),
    )[:4]
    validation_priorities = _human_validation_priorities(
        weakest,
        data_gaps,
        current_review,
    )
    questions = _expert_questions(weakest, current_analysis)
    assumptions = review.get("challengedAssumptions", [])
    status_text = _review_status_text(current_review)
    return {
        "tool": "generate_human_review_guidance",
        "validationPriorities": validation_priorities,
        "questionsForExperts": questions,
        "assumptionsToChallenge": assumptions,
        "reviewStatus": status_text,
        "summary": (
            f"{status_text} Human reviewers should start with "
            f"{_join(validation_priorities[:3])} The agent can recommend "
            "validation work, but only a human reviewer can mark evidence as reviewed."
        ),
    }


def recommend_next_actions(current_analysis: dict[str, Any] | None) -> dict[str, Any]:
    """Generate recommendation-focused actions from current evidence and scores."""
    investments = _list_value(current_analysis, "priorityInvestments")
    drivers = _list_value(current_analysis, "scoreDrivers")
    data_gaps = _list_value(current_analysis, "dataGaps")
    weakest = sorted(
        [driver for driver in drivers if isinstance(driver, dict)],
        key=lambda item: item.get("score", 100),
    )[:3]
    actions = []
    for investment in investments[:4]:
        reason = "addresses one of the weakest score drivers or validation gaps"
        matching_driver = _matching_driver_for_investment(str(investment), weakest)
        if matching_driver:
            reason = (
                f"targets {matching_driver.get('component')} "
                f"({matching_driver.get('score')}/100)"
            )
        actions.append({"action": investment, "reason": reason})
    return {
        "tool": "recommend_next_actions",
        "actions": actions,
        "dataGaps": data_gaps,
        "summary": _recommendation_summary(actions, data_gaps),
    }


def build_agent_review(
    current_analysis: dict[str, Any],
    active_layers: list[str] | None = None,
    *,
    used_llm: bool = False,
    llm_summary: str | None = None,
) -> dict[str, Any]:
    """Build a report reliability review from computed analysis outputs."""
    scores = _scores(current_analysis)
    suitability = _suitability(current_analysis)
    evidence = current_analysis.get("evidenceSummary") or summarize_layer_evidence(active_layers)
    matched_evidence = _list_value(current_analysis, "matchedEvidence")
    score_drivers = _list_value(current_analysis, "scoreDrivers")
    excluded_synthetic = _list_value(current_analysis, "excludedSyntheticLayers")
    synthetic_evidence = _synthetic_evidence_notes(matched_evidence)
    data_gaps = _list_value(current_analysis, "dataGaps")
    warnings = _list_value(current_analysis, "warnings")
    bottlenecks = _list_value(current_analysis, "bottlenecks")
    strengths = _list_value(current_analysis, "strengths")
    reliability = _score_reliability(suitability, scores, evidence)

    evidence_gaps = data_gaps or _evidence_gaps(scores, evidence)
    evidence_citations = _evidence_citations(matched_evidence)
    score_driver_summary = _score_driver_summary(score_drivers)
    excluded_notes = [
        f"{item.get('layerLabel', item.get('layerId', 'Synthetic layer'))}: {item.get('reason', 'Synthetic/demo data used in scoring.')}"
        for item in excluded_synthetic
        if isinstance(item, dict)
    ] or synthetic_evidence
    uncertainty = [
        (
            "The score is useful for prioritization, but it should not be read as "
            "construction or deployment feasibility."
        ),
        (
            "Synthetic/demo and open-data layers are included in the planning "
            "score and need validation with authoritative utility, land, "
            "environmental, and sector data."
        ),
    ]
    challenged_assumptions = [
        "Visible layers are assumed to be the evidence set selected by the user.",
        "Layer presence is treated as planning context, not proof of capacity or approval.",
        "Scenario effects are directional estimates, not engineered forecasts.",
    ]
    next_steps = [
        "Validate grid capacity, fiber availability, water/cooling, land status, and permitting with responsible agencies.",
        "Validate synthetic/demo assumptions with authoritative datasets before funding or construction decisions.",
        "Run sector workshops for education, workforce, healthcare, government, and nonprofits before scaling deployments.",
    ]

    summary = llm_summary or (
        f"Agent review: the {suitability.get('score', 'unknown')}/100 score has "
        f"{reliability.lower()} reliability for early planning. Use it to compare "
        "investment priorities, not to prove site feasibility. "
        f"{score_driver_summary}"
    )

    return {
        "summary": summary,
        "scoreReliability": reliability,
        "evidenceStrengths": strengths[:4] or [str(evidence.get("summary", ""))],
        "evidenceGaps": evidence_gaps,
        "uncertaintyNotes": uncertainty,
        "challengedAssumptions": challenged_assumptions,
        "nextValidationSteps": next_steps,
        "evidenceCitations": evidence_citations,
        "scoreDriverSummary": score_driver_summary,
        "excludedEvidenceNotes": excluded_notes,
        "usedLlm": used_llm,
        "toolResults": [
            evidence,
            {"tool": "report_bottlenecks", "items": bottlenecks},
            {"tool": "report_guardrails", "items": warnings},
        ],
    }


def run_chat_tools(
    *,
    message: str,
    current_analysis: dict[str, Any] | None,
    current_review: dict[str, Any] | None = None,
    active_layers: list[str] | None = None,
    scenario: str | None = None,
    planning_focus: str | None = None,
    detected_intent: str | None = None,
    intent_classifier: str = "keyword",
    intent_confidence: str | None = None,
    intent_reason: str | None = None,
) -> list[dict[str, Any]]:
    """Select and execute backend tools for a chat turn."""
    normalized = message.lower()
    results = [
        classify_planning_intent(
            message,
            detected_intent=detected_intent,
            classifier=intent_classifier,
            confidence=intent_confidence,
            reason=intent_reason,
        )
    ]

    if planning_focus:
        results.append(
            {
                "tool": "current_planning_focus",
                "planningFocus": normalize_intent(planning_focus).value,
                "summary": f"Current UI planning focus is {normalize_intent(planning_focus).value}.",
            }
        )

    if _is_platform_question(normalized):
        results.append(answer_platform_help(message))

    results.append(summarize_layer_evidence(active_layers))

    if current_analysis:
        if _asks_about_map_context(normalized):
            results.append(describe_map_location_context(current_analysis))
            results.append(query_site_evidence(current_analysis))
            results.append(explain_score_drivers(current_analysis))
        if _asks_about_evidence(normalized):
            results.append(query_site_evidence(current_analysis))
        if _asks_about_score(normalized):
            results.append(explain_score_drivers(current_analysis))
        if _asks_about_reliability(normalized):
            results.append(review_report_reliability(current_analysis))
        if _asks_about_human_review(normalized):
            results.append(generate_human_review_guidance(current_analysis, current_review))
        if _asks_about_scenario(normalized):
            results.append(compare_scenarios(current_analysis, _scenario_from_message(normalized) or scenario))
        if _asks_about_investment(normalized):
            results.append(recommend_next_actions(current_analysis))
            results.append(rank_priority_investments_tool(current_analysis))
        if "roadmap" in normalized or "plan" in normalized:
            results.append(generate_readiness_roadmap_tool(current_analysis))
        results.append(apply_planning_guardrails_tool(message, current_analysis))

    return results


def compose_tool_grounded_response(
    *,
    message: str,
    current_analysis: dict[str, Any],
    tool_results: list[dict[str, Any]],
) -> str:
    """Compose a deterministic response from tool results."""
    suitability = _suitability(current_analysis)
    sectors = _list_value(current_analysis, "sectors")
    top_sectors = _top_sectors(sectors)
    investments = _list_value(current_analysis, "priorityInvestments")
    bottlenecks = _list_value(current_analysis, "bottlenecks")
    warnings = _tool_result(tool_results, "apply_planning_guardrails").get("warnings", [])
    intent_result = _tool_result(tool_results, "classify_planning_intent")

    if any(term in message.lower() for term in ("approve", "permit", "funding", "guarantee")):
        return (
            f"No. {NON_GOAL_WARNING} The current score is "
            f"{suitability.get('score', 'unknown')}/100 with "
            f"{suitability.get('confidence', 'unknown')} confidence. "
            "Tools used: apply_planning_guardrails."
        )

    scenario_result = _tool_result(tool_results, "compare_scenarios")
    platform_result = _tool_result(tool_results, "answer_platform_help")
    evidence_result = _tool_result(tool_results, "summarize_layer_evidence")
    query_evidence_result = _tool_result(tool_results, "query_site_evidence")
    score_driver_result = _tool_result(tool_results, "explain_score_drivers")
    recommendation_result = _tool_result(tool_results, "recommend_next_actions")
    reliability_result = _tool_result(tool_results, "review_report_reliability")
    human_review_result = _tool_result(tool_results, "generate_human_review_guidance")
    map_context_result = _tool_result(tool_results, "describe_map_location_context")

    normalized = message.lower()
    if _is_greeting(normalized):
        return (
            "Hi. I can explain how InfraAI works, review the current evidence, "
            "compare scenarios, recommend next actions, or explain the score. "
            "Ask something like 'what evidence supports this score?' or "
            "'what should we invest in first?'"
        )

    if platform_result and not any(
        [query_evidence_result, score_driver_result, recommendation_result, scenario_result]
    ):
        return (
            f"{platform_result.get('answer', '')} "
            "For a specific site, select a location and run readiness analysis."
        )

    if map_context_result:
        return (
            f"{_map_context_chat_answer(map_context_result)} "
            "Use this as a map-based planning readout only; verify utility "
            "capacity, facility status, land rights, and permitting before decisions."
        )

    if query_evidence_result:
        return (
            f"Evidence review: {query_evidence_result.get('summary', '')} "
            f"Key gaps: {_join(query_evidence_result.get('dataGaps', []))} "
            "This evidence supports planning discussion only; authoritative validation is still required."
        )

    if score_driver_result:
        return str(score_driver_result.get("summary", "No score explanation is available."))

    if reliability_result:
        return (
            f"Reliability review: {reliability_result.get('summary', '')} "
            "Use the report to prioritize validation work, not to approve feasibility."
        )

    if human_review_result:
        return _human_review_chat_answer(human_review_result)

    if recommendation_result:
        actions = recommendation_result.get("actions", [])
        action_text = "; ".join(
            f"{item.get('action')}: {item.get('reason')}"
            for item in actions
            if isinstance(item, dict)
        )
        return (
            f"Priority investments and recommended next actions: {action_text}. "
            f"Evidence and data gaps to clear: {_join(recommendation_result.get('dataGaps', []))} "
            "Tools used: recommend_next_actions, rank_priority_investments, apply_planning_guardrails."
        )

    if scenario_result:
        return (
            f"Scenario comparison: {scenario_result.get('summary', '')} "
            "Treat this as directional; it does not replace engineering or procurement validation."
        )

    classifier_text = _intent_classifier_text(intent_result)
    response_parts = [
        f"Detected planning intent: {intent_result.get('intent', _intent(current_analysis))}. {classifier_text}",
        (
            f"Current readiness score is {suitability.get('score', 'unknown')}/100 "
            f"({suitability.get('level', 'unclassified')}) with "
            f"{suitability.get('confidence', 'unknown')} confidence."
        ),
        f"Recommendation: {suitability.get('recommendation', 'No recommendation available')}",
        f"Main bottlenecks: {_join(bottlenecks)}",
        f"Sector impact: {top_sectors}",
        f"Priority investments: {_join(investments)}",
        f"Evidence used: {evidence_result.get('summary', 'No evidence summary available.')}",
    ]

    if platform_result:
        response_parts.insert(0, str(platform_result.get("answer", "")))
    if scenario_result:
        response_parts.append(str(scenario_result.get("summary", "")))

    response_parts.append(f"Human review warning: {_join(warnings) or NON_GOAL_WARNING}")
    response_parts.append(
        "Tools used: "
        + ", ".join(result.get("tool", "unknown_tool") for result in tool_results)
        + "."
    )
    return " ".join(part for part in response_parts if part)


def _intent_classifier_text(intent_result: dict[str, Any]) -> str:
    classifier = intent_result.get("classifier")
    confidence = intent_result.get("confidence")
    reason = intent_result.get("reason")
    parts = []
    if classifier:
        parts.append(f"Classifier: {classifier}")
    if confidence:
        parts.append(f"confidence {confidence}")
    if reason:
        parts.append(str(reason))
    return ". ".join(parts) + "." if parts else ""


def _layer_category(layer_id: str) -> str:
    normalized = layer_id.lower()
    for token, category in LAYER_CATEGORY_RULES:
        if token in normalized:
            return category
    return "other infrastructure"


def _layer_summary(
    layers: list[str],
    categories: dict[str, int],
    synthetic_layers: list[str],
) -> str:
    if not layers:
        return "No visible infrastructure overlays were supplied as evidence."
    category_text = ", ".join(f"{name}: {count}" for name, count in sorted(categories.items()))
    synthetic_note = (
        f" {len(synthetic_layers)} synthetic/demo layer(s) are included in scoring and need validation."
        if synthetic_layers
        else ""
    )
    return f"{len(layers)} visible overlay(s) across {category_text}.{synthetic_note}"


def _scores(current_analysis: dict[str, Any] | None) -> dict[str, int]:
    scores = (current_analysis or {}).get("componentScores", {})
    if not isinstance(scores, dict):
        return {}
    return {str(key): int(value) for key, value in scores.items() if isinstance(value, int | float)}


def _suitability(current_analysis: dict[str, Any] | None) -> dict[str, Any]:
    suitability = (current_analysis or {}).get("suitability", {})
    return suitability if isinstance(suitability, dict) else {}


def _intent(current_analysis: dict[str, Any] | None) -> str:
    value = (current_analysis or {}).get("intent")
    return str(value) if value else "GENERAL_AI_INFRASTRUCTURE"


def _confidence_proxy(scores: dict[str, int]) -> float:
    return (
        scores.get("dataCompleteness", 0) * 0.40
        + scores.get("dataFreshness", 0) * 0.25
        + scores.get("sourceReliability", 0) * 0.20
        + scores.get("geographicResolution", 0) * 0.15
    )


def _relevant_scores(scores: dict[str, int], effects: dict[str, int]) -> dict[str, int]:
    return {key: scores[key] for key in effects if key in scores}


def _estimate_score_shift(effects: dict[str, int]) -> int:
    if not effects:
        return 0
    return round(sum(effects.values()) / max(1, len(effects)) * 0.35)


def _scenario_summary(comparisons: list[dict[str, Any]]) -> str:
    if not comparisons:
        return "No scenario comparison was available."
    summaries = []
    for comparison in comparisons[:3]:
        summaries.append(
            f"{comparison['scenario']} has an estimated directional score shift of "
            f"{comparison['estimatedScoreShift']} point(s); improves "
            f"{_join(comparison['improves'])}."
        )
    return " ".join(summaries)


def _list_value(current_analysis: dict[str, Any] | None, key: str) -> list[Any]:
    value = (current_analysis or {}).get(key)
    return value if isinstance(value, list) else []


def _join(items: list[Any]) -> str:
    if not items:
        return "None listed."
    return "; ".join(str(item) for item in items)


def _roadmap_summary(roadmap: list[Any]) -> str:
    if not roadmap:
        return "No roadmap is available."
    first = roadmap[0]
    if isinstance(first, dict):
        actions = first.get("actions")
        if isinstance(actions, list) and actions:
            return f"First roadmap action: {actions[0]}"
    return "Roadmap is available across near-, mid-, and long-term horizons."


def _score_reliability(
    suitability: dict[str, Any],
    scores: dict[str, int],
    evidence: dict[str, Any],
) -> str:
    confidence = str(suitability.get("confidence", "")).lower()
    synthetic_count = int(
        evidence.get("syntheticLayerCount", len(evidence.get("syntheticLayers", [])))
    )
    scored_layer_count = int(evidence.get("scoredLayerCount", 0))
    completeness = scores.get("dataCompleteness", 0)
    reliability = scores.get("sourceReliability", 0)

    if confidence == "high" and synthetic_count == 0 and completeness >= 75 and reliability >= 75:
        return "High"
    if confidence == "medium" and completeness >= 50 and reliability >= 50 and scored_layer_count > 0:
        return "Medium"
    return "Low"


def _evidence_gaps(scores: dict[str, int], evidence: dict[str, Any]) -> list[str]:
    gaps = []
    if evidence.get("activeLayerCount", 0) == 0:
        gaps.append("No visible infrastructure layers were provided as evidence.")
    synthetic_count = int(evidence.get("syntheticLayerCount", 0) or 0)
    if evidence.get("syntheticLayers") or synthetic_count:
        gaps.append("Some scored evidence layers are synthetic/demo assumptions that require validation.")
    if scores.get("dataCompleteness", 100) < 65:
        gaps.append("Data completeness is below the moderate-readiness threshold.")
    if scores.get("sourceReliability", 100) < 65:
        gaps.append("Source reliability needs authoritative validation.")
    if scores.get("geographicResolution", 100) < 65:
        gaps.append("Geographic resolution is not strong enough for site-level decisions.")
    return gaps or ["No major evidence gap was detected for early planning."]


def _is_platform_question(normalized_message: str) -> bool:
    return any(
        term in normalized_message
        for term in (
            "how does",
            "how do you work",
            "how the system",
            "how this site work",
            "how this site working",
            "hows this site working",
            "how the site works",
            "how the platform works",
            "how is this site working",
            "site work",
            "platform work",
            "what is confidence",
            "what does confidence",
            "what is score",
            "what does score",
            "what is this platform",
            "what is mcp",
            "tool",
            "map work",
            "layer",
            "synthetic",
            "human review",
            "reviewer",
            "what can you do",
            "help",
        )
    )


def _is_greeting(normalized_message: str) -> bool:
    text = normalized_message.strip()
    return (
        text in {"hi", "hello", "hey", "help"}
        or text.startswith(("hi ", "hello ", "hey "))
        or "how are you" in text
        or "how are u" in text
    )


def _asks_about_evidence(normalized_message: str) -> bool:
    return any(
        term in normalized_message
        for term in (
            "evidence",
            "real data",
            "source",
            "why reliable",
            "support this score",
            "nearby",
            "nearest",
            "surrounding",
            "around this",
            "around here",
            "facility",
            "facilities",
            "component",
            "components",
            "infrastructure around",
            "current facilities",
            "proof",
            "prove",
        )
    )


def _asks_about_map_context(normalized_message: str) -> bool:
    return any(
        term in normalized_message
        for term in (
            "this location",
            "the location",
            "location",
            "selected location",
            "clicked location",
            "how is the location",
            "hows the location",
            "how's the location",
            "around this location",
            "around here",
            "the area",
            "this area",
            "area around",
            "surroundings",
            "surrounding area",
            "surrounding areas",
            "nearby",
            "nearest",
            "near this site",
            "near this location",
            "what is around",
            "what's around",
            "facilities",
            "current facilities",
            "ai components",
            "infrastructure around",
            "map context",
        )
    )


def _asks_about_score(normalized_message: str) -> bool:
    return any(
        term in normalized_message
        for term in (
            "score",
            "driver",
            "why is it",
            "why the score",
            "how calculated",
            "calculate",
        )
    )


def _asks_about_reliability(normalized_message: str) -> bool:
    return any(
        term in normalized_message
        for term in ("reliable", "reliability", "trust", "confidence", "uncertain")
    )


def _asks_about_human_review(normalized_message: str) -> bool:
    return any(
        term in normalized_message
        for term in (
            "human review",
            "reviewer",
            "validate first",
            "validation first",
            "what should i validate",
            "what should a human",
            "utility provider",
            "expert review",
            "review checklist",
            "reviewer checklist",
            "assumptions should",
            "challenge assumptions",
            "weakest evidence",
        )
    )


def _asks_about_scenario(normalized_message: str) -> bool:
    return any(
        term in normalized_message
        for term in ("what if", "scenario", "upgrade", "validate", "cloud", "training")
    )


def _asks_about_investment(normalized_message: str) -> bool:
    return any(
        term in normalized_message
        for term in ("invest", "priority", "first", "upgrade", "fund")
    )


def _scenario_from_message(normalized_message: str) -> str | None:
    if "fiber" in normalized_message or "fibre" in normalized_message:
        return "UPGRADE_FIBER_FIRST"
    if "grid" in normalized_message or "power" in normalized_message:
        return "VALIDATE_GRID_FIRST"
    if "literacy" in normalized_message or "training" in normalized_message:
        return "AI_LITERACY_TRAINING"
    if "cloud" in normalized_message:
        return "CLOUD_FIRST"
    if "governance" in normalized_message or "cyber" in normalized_message:
        return "GOVERNANCE_FIRST"
    if "edge" in normalized_message:
        return "EDGE_PILOT_FIRST"
    if "open data" in normalized_message or "data platform" in normalized_message:
        return "OPEN_DATA_PLATFORM_FIRST"
    return None


def _top_sectors(sectors: list[Any]) -> str:
    valid = [sector for sector in sectors if isinstance(sector, dict)]
    if not valid:
        return "No sector scores available."
    top = sorted(valid, key=lambda sector: sector.get("score", 0), reverse=True)[:2]
    return "; ".join(
        f"{sector.get('name', 'Sector')}: {sector.get('score', 'unknown')}/100"
        for sector in top
    )


def _tool_result(tool_results: list[dict[str, Any]], tool_name: str) -> dict[str, Any]:
    for result in tool_results:
        if result.get("tool") == tool_name:
            return result
    return {}


def _evidence_citations(matched_evidence: list[Any]) -> list[str]:
    citations = []
    for item in matched_evidence[:5]:
        if not isinstance(item, dict):
            continue
        distance = item.get("distanceKm")
        distance_text = (
            f"{float(distance):.2f} km" if isinstance(distance, int | float) else "distance unknown"
        )
        citations.append(
            f"{item.get('layerLabel', 'Evidence')}: {item.get('name', 'Unnamed feature')} "
            f"({item.get('source', 'Unknown source')}, {distance_text})"
        )
    return citations


def _synthetic_evidence_notes(matched_evidence: list[Any]) -> list[str]:
    notes = []
    for item in matched_evidence:
        if not isinstance(item, dict) or item.get("sourceType") != "synthetic":
            continue
        notes.append(
            f"{item.get('layerLabel', 'Synthetic/demo layer')}: "
            f"{item.get('name', 'synthetic/demo feature')} was included in scoring and requires validation."
        )
    return notes[:6]


def _evidence_answer_summary(
    evidence_summary: Any,
    citations: list[str],
    data_gaps: list[Any],
) -> str:
    if isinstance(evidence_summary, dict) and evidence_summary.get("summary"):
        summary = str(evidence_summary["summary"])
    else:
        summary = "No evidence summary is available."
    if citations:
        summary += " Nearest cited evidence: " + "; ".join(citations[:3]) + "."
    if data_gaps:
        summary += " Major gaps remain."
    return summary


def _score_driver_summary(score_drivers: list[Any]) -> str:
    valid = [item for item in score_drivers if isinstance(item, dict)]
    if not valid:
        return "No score-driver evidence is available."
    weakest = sorted(valid, key=lambda item: item.get("score", 100))[:3]
    return "Weakest drivers are " + "; ".join(
        f"{item.get('component')}: {item.get('score')}/100" for item in weakest
    ) + "."


def _plain_score_summary(
    suitability: dict[str, Any],
    strongest: list[dict[str, Any]],
    weakest: list[dict[str, Any]],
    data_quality: dict[str, int],
) -> str:
    return (
        "## How to read the score\n\n"
        f"The overall readiness score is **{suitability.get('score', 'unknown')}/100** "
        f"({suitability.get('level', 'unclassified')}). This is a planning-priority "
        "score, not a construction approval or feasibility guarantee.\n\n"
        "## What the number means\n\n"
        "- **80-100**: stronger early planning candidate, still needs formal validation.\n"
        "- **60-79**: moderate candidate; useful for pilots or targeted upgrades.\n"
        "- **40-59**: weak or early-stage candidate; fix major gaps first.\n"
        "- **0-39**: not ready for this planning focus based on available evidence.\n\n"
        "## Why feature counts can be confusing\n\n"
        "A matched-feature count is evidence volume, not proof of capacity, "
        "quality, ownership, available load, fiber service level, water rights, "
        "land rights, or permit readiness. The score weighs proximity, coverage, "
        "data quality, and component importance.\n\n"
        "## Strongest drivers\n\n"
        f"{_driver_bullets(strongest)}\n\n"
        "## Weakest drivers\n\n"
        f"{_driver_bullets(weakest)}\n\n"
        "## Data confidence\n\n"
        f"- Data completeness: **{data_quality.get('dataCompleteness', 'unknown')}/100**\n"
        f"- Freshness: **{data_quality.get('dataFreshness', 'unknown')}/100**\n"
        f"- Source reliability: **{data_quality.get('sourceReliability', 'unknown')}/100**\n"
        f"- Geographic resolution: **{data_quality.get('geographicResolution', 'unknown')}/100**"
    )


def _driver_bullets(drivers: list[dict[str, Any]]) -> str:
    if not drivers:
        return "- No score drivers are available."
    lines = []
    for driver in drivers[:3]:
        evidence_count = int(driver.get("evidenceCount", 0))
        nearest = driver.get("nearestEvidenceKm")
        nearest_text = (
            f", nearest evidence {float(nearest):.2f} km away"
            if isinstance(nearest, int | float)
            else ""
        )
        lines.append(
            f"- **{driver.get('component', 'Component')}**: "
            f"{driver.get('score', 'unknown')}/100 from {evidence_count} "
            f"nearby matched feature(s){nearest_text}."
        )
    return "\n".join(lines)


def _matching_driver_for_investment(
    investment: str,
    drivers: list[dict[str, Any]],
) -> dict[str, Any] | None:
    normalized = investment.lower()
    for driver in drivers:
        component = str(driver.get("component", "")).lower()
        if "grid" in normalized and "power" in component:
            return driver
        if "fiber" in normalized and "connectivity" in component:
            return driver
        if "cooling" in normalized and "cooling" in component:
            return driver
        if "literacy" in normalized and "literacy" in component:
            return driver
        if "governance" in normalized and "governance" in component:
            return driver
        if "equity" in normalized and "equity" in component:
            return driver
    return drivers[0] if drivers else None


def _recommendation_summary(actions: list[dict[str, Any]], data_gaps: list[Any]) -> str:
    if not actions:
        return "No priority actions are available yet."
    first = actions[0]
    summary = f"Start with {first.get('action')} because it {first.get('reason')}."
    if data_gaps:
        summary += " Clear the listed data gaps before treating this as a decision-ready plan."
    return summary


def _human_validation_priorities(
    weakest_drivers: list[dict[str, Any]],
    data_gaps: list[Any],
    current_review: dict[str, Any] | None,
) -> list[str]:
    priorities = []
    for driver in weakest_drivers[:3]:
        priorities.append(
            f"Validate {driver.get('component', 'weak component')} "
            f"because it is scored {driver.get('score', 'unknown')}/100."
        )
    if data_gaps:
        priorities.append(f"Clear data gap: {data_gaps[0]}")
    if current_review:
        checklist = current_review.get("checklistItems", [])
        if isinstance(checklist, list):
            open_items = [
                item.get("label", "review item")
                for item in checklist
                if isinstance(item, dict) and not item.get("checked")
            ]
            if open_items:
                priorities.append(f"Continue open review item: {open_items[0]}.")
    return priorities or ["Create a human review record and validate source evidence first."]


def _expert_questions(
    weakest_drivers: list[dict[str, Any]],
    current_analysis: dict[str, Any],
) -> list[str]:
    questions = [
        "Which source documents or agencies can verify this evidence?",
        "What capacity, service-level, legal, or permitting constraints are missing?",
        "Which synthetic/demo assumptions should be replaced before decisions?",
    ]
    weakest_text = " ".join(str(driver.get("component", "")) for driver in weakest_drivers).lower()
    if "power" in weakest_text or "grid" in weakest_text:
        questions.insert(0, "Ask the utility provider for available load, interconnection limits, redundancy, and upgrade timeline.")
    if "connectivity" in weakest_text:
        questions.insert(0, "Ask telecom providers for fiber route, latency, redundancy, service-level, and build-cost evidence.")
    if "cooling" in weakest_text or "water" in weakest_text:
        questions.insert(0, "Ask engineering and environmental reviewers for water, heat, flood, discharge, and cooling constraints.")
    if current_analysis.get("warnings"):
        questions.append("Which report warnings must be cleared before the next planning stage?")
    return questions[:5]


def _review_status_text(current_review: dict[str, Any] | None) -> str:
    if not current_review:
        return "No saved human review record is attached yet."
    status = current_review.get("status", "DRAFT_ANALYSIS")
    return f"Current human review status is {status}."


def _human_review_chat_answer(review_guidance: dict[str, Any]) -> str:
    priorities = [
        str(item)
        for item in review_guidance.get("validationPriorities", [])
        if isinstance(item, str)
    ]
    questions = [
        str(item)
        for item in review_guidance.get("questionsForExperts", [])
        if isinstance(item, str)
    ]
    assumptions = [
        str(item)
        for item in review_guidance.get("assumptionsToChallenge", [])
        if isinstance(item, str)
    ]
    return (
        "## Human review guidance\n\n"
        f"{review_guidance.get('reviewStatus', '')} The agent can recommend validation work, "
        "but only a human reviewer can mark evidence as reviewed.\n\n"
        "## Validate first\n\n"
        f"{_simple_bullets(priorities[:4])}\n\n"
        "## Questions for experts\n\n"
        f"{_simple_bullets(questions[:4])}\n\n"
        "## Assumptions to challenge\n\n"
        f"{_simple_bullets(assumptions[:4])}\n\n"
        f"{NON_GOAL_WARNING}"
    )


def _map_context_summary(
    selected_site: dict[str, Any],
    nearby_components: list[str],
    current_facilities: list[str],
    infrastructure_signals: list[str],
    data_gaps: list[Any],
    excluded: list[Any],
    synthetic_evidence: list[str],
) -> str:
    site_text = _selected_site_text(selected_site)
    component_text = _join(nearby_components[:6])
    facility_text = _join(current_facilities[:5])
    signal_text = _join(infrastructure_signals[:5])
    gap_text = _join(data_gaps[:4])
    synthetic_text = _synthetic_used_summary(excluded, synthetic_evidence)
    return (
        f"Map context for {site_text}: nearby real/open evidence includes "
        f"{component_text}. Current mapped facilities/assets include "
        f"{facility_text}. Infrastructure signals: {signal_text}. "
        f"Evidence gaps: {gap_text}. {synthetic_text}"
    )


def _selected_site_text(selected_site: dict[str, Any]) -> str:
    label = selected_site.get("label") or "selected site"
    lat = selected_site.get("lat")
    lng = selected_site.get("lng")
    if isinstance(lat, int | float) and isinstance(lng, int | float):
        return f"{label} ({lat:.5f}, {lng:.5f})"
    return str(label)


def _nearby_component_lines(matched_evidence: list[Any]) -> list[str]:
    lines = []
    for item in matched_evidence[:8]:
        if not isinstance(item, dict):
            continue
        distance = item.get("distanceKm")
        distance_text = _distance_text(distance)
        lines.append(
            f"{item.get('layerLabel', 'Evidence')} - "
            f"{item.get('name', 'unnamed asset')} ({distance_text})"
        )
    return lines


def _current_facility_lines(matched_evidence: list[Any]) -> list[str]:
    facilities = []
    for item in matched_evidence:
        if not isinstance(item, dict):
            continue
        asset_type = str(item.get("assetType") or "mapped asset")
        layer_label = str(item.get("layerLabel") or "Evidence")
        name = str(item.get("name") or "unnamed asset")
        distance = _distance_text(item.get("distanceKm"))
        facilities.append(f"{name} [{asset_type}, {layer_label}, {distance}]")
    return facilities[:8]


def _infrastructure_signal_lines(score_drivers: list[Any]) -> list[str]:
    valid = [
        item
        for item in score_drivers
        if isinstance(item, dict) and int(item.get("evidenceCount", 0)) > 0
    ]
    if not valid:
        return ["No active real/open infrastructure evidence is near enough to support scoring."]
    strongest = sorted(valid, key=lambda item: item.get("score", 0), reverse=True)
    return [
        (
            f"{item.get('component', 'Component')}: {item.get('score', 'unknown')}/100 "
            f"from {item.get('evidenceCount', 0)} matched feature(s)"
        )
        for item in strongest[:6]
    ]


def _synthetic_used_summary(excluded: list[Any], synthetic_evidence: list[str]) -> str:
    if synthetic_evidence:
        return (
            "Synthetic/demo evidence included in scoring: "
            + "; ".join(synthetic_evidence[:4])
            + "."
        )
    if not excluded:
        return "No synthetic/demo evidence was matched in the selected evidence set."
    labels = [
        str(item.get("layerLabel", item.get("layerId", "Synthetic layer")))
        for item in excluded
        if isinstance(item, dict)
    ]
    return (
        "Synthetic/demo context listed for review: "
        + ", ".join(labels[:5])
        + ("." if len(labels) <= 5 else f", plus {len(labels) - 5} more.")
    )


def _map_context_chat_answer(map_context: dict[str, Any]) -> str:
    selected_site = map_context.get("selectedSite")
    selected_site = selected_site if isinstance(selected_site, dict) else {}
    nearby = [
        str(item)
        for item in map_context.get("nearbyComponents", [])
        if isinstance(item, str)
    ]
    signals = [
        str(item)
        for item in map_context.get("infrastructureSignals", [])
        if isinstance(item, str)
    ]
    gaps = [str(item) for item in map_context.get("dataGaps", []) if isinstance(item, str)]
    synthetic_evidence = [
        str(item)
        for item in map_context.get("syntheticEvidenceUsed", [])
        if isinstance(item, str)
    ]
    excluded = [
        item.get("layerLabel", item.get("layerId", "Synthetic layer"))
        for item in map_context.get("excludedSyntheticLayers", [])
        if isinstance(item, dict)
    ]
    synthetic_note = (
        "Synthetic/demo evidence included in scoring: "
        + "; ".join(synthetic_evidence[:4])
        + "."
        if synthetic_evidence
        else "Synthetic/demo layer notes: " + ", ".join(excluded[:4]) + "."
        if excluded
        else "No synthetic/demo evidence was matched in the current scoring evidence."
    )
    return (
        f"## Location snapshot\n\n"
        f"{_selected_site_text(selected_site)} is being reviewed from the visible map "
        "layers and nearby evidence.\n\n"
        "## Nearby evidence\n\n"
        f"{_simple_bullets(nearby[:5])}\n\n"
        "## Infrastructure signals\n\n"
        f"{_simple_bullets(signals[:4])}\n\n"
        "## Main gaps\n\n"
        f"{_simple_bullets(gaps[:4])}\n\n"
        f"{synthetic_note}"
    )


def _simple_bullets(items: list[str]) -> str:
    if not items:
        return "- None available from the selected visible layers."
    return "\n".join(f"- {item}" for item in items)


def _distance_text(distance: Any) -> str:
    if isinstance(distance, int | float):
        return f"{float(distance):.2f} km"
    return "distance unknown"
