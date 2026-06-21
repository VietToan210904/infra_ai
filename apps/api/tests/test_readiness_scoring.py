from __future__ import annotations

from app.domain.readiness.scoring import (
    calculate_confidence,
    calculate_intent_specific_score,
    clamp_score,
)
from app.schemas.site import ComponentScores
from infraai_agents.guardrails import apply_guardrails
from infraai_agents.intents import normalize_intent


def sample_scores(**overrides: int) -> ComponentScores:
    values = {
        "power": 68,
        "connectivity": 82,
        "coolingWater": 58,
        "physicalFeasibility": 72,
        "computeEcosystem": 75,
        "sectorDemand": 84,
        "governance": 66,
        "digitalAccess": 68,
        "aiLiteracy": 56,
        "dataMaturity": 62,
        "equity": 60,
        "resilience": 64,
        "dataCompleteness": 54,
        "dataFreshness": 58,
        "sourceReliability": 57,
        "geographicResolution": 66,
    }
    values.update(overrides)
    return ComponentScores(**values)


def test_clamp_score_bounds_values() -> None:
    assert clamp_score(-10) == 0
    assert clamp_score(111) == 100
    assert clamp_score(64.6) == 65


def test_legacy_intent_mapping() -> None:
    assert normalize_intent("PUBLIC_AI_COMPUTE_HUB") == "PUBLIC_COMPUTE_HUB"
    assert normalize_intent("REGIONAL_AI_DATA_CENTER") == "DATA_CENTER_FEASIBILITY"


def test_data_center_formula_uses_weighted_scores() -> None:
    scores = sample_scores(
        power=70,
        connectivity=80,
        coolingWater=60,
        physicalFeasibility=70,
        computeEcosystem=75,
        governance=65,
    )
    result = calculate_intent_specific_score("DATA_CENTER_FEASIBILITY", scores)
    assert result == 70


def test_confidence_scoring_uses_data_quality_fields() -> None:
    result = calculate_confidence(
        sample_scores(
            dataCompleteness=40,
            dataFreshness=60,
            sourceReliability=80,
            geographicResolution=100,
        )
    )
    assert result.score == 62
    assert result.level == "Medium"


def test_guardrails_trigger_data_center_constraints() -> None:
    warnings = apply_guardrails(
        "DATA_CENTER_FEASIBILITY",
        sample_scores(power=55, coolingWater=45).model_dump(),
        confidence_score=55,
    )
    assert any("Grid capacity validation is required" in warning for warning in warnings)
    assert any("Cooling and water feasibility review" in warning for warning in warnings)
