from __future__ import annotations

import asyncio

from fastapi.testclient import TestClient

from app.main import app
from app.mcp_server import infraai_mcp
from infraai_agents.openai_adapter import OpenAIExplanationClient
from infraai_agents.responses import generate_agent_response

client = TestClient(app)


class FakeIntentClassifier:
    def classify_intent(self, **_: object) -> dict[str, str]:
        return {
            "intent": "DATA_CENTER_FEASIBILITY",
            "confidence": "high",
            "reason": "The LLM classified the user question as a data-center feasibility question.",
            "method": "llm",
        }

    def generate_grounded_response(self, **_: object) -> None:
        return None


def test_health_endpoint() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["llmProvider"] == "openai"
    assert "openaiApiKeyConfigured" in data
    assert "openaiModelConfigured" in data
    assert "llmReady" in data


def test_analyze_site_returns_frontend_contract() -> None:
    response = client.post(
        "/api/analyze-site",
        json={
            "lat": 10.7769,
            "lng": 106.7009,
            "infrastructureType": "REGIONAL_AI_DATA_CENTER",
            "activeLayers": ["power_plants", "fiber_corridors"],
            "scenario": "BUILD_NOW",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "DATA_CENTER_FEASIBILITY"
    assert data["humanReviewRequired"] is True
    assert "componentScores" in data
    assert "gapSummary" in data
    assert "agentReview" in data
    assert "evidenceSummary" in data
    assert "scoreDrivers" in data
    assert "matchedEvidence" in data
    assert "excludedSyntheticLayers" in data
    assert "dataGaps" in data
    assert "planningContext" in data
    assert data["planningContext"]["focusLabel"] == "Data center feasibility"
    formula_weights = {
        term["component"]: term["weightPercent"]
        for term in data["planningContext"]["scoreFormula"]
    }
    assert formula_weights["power"] == 30
    assert formula_weights["coolingWater"] == 20
    assert "aiLiteracy" not in formula_weights
    assert data["agentReview"]["scoreReliability"] in {"Low", "Medium", "High"}
    assert data["agentReview"]["usedLlm"] is False
    assert len(data["sectors"]) == 5
    assert any(driver["includedInFocusScore"] for driver in data["scoreDrivers"])


def test_evidence_engine_scores_synthetic_layers_with_disclosure() -> None:
    response = client.post(
        "/api/analyze-site",
        json={
            "lat": 10.7769,
            "lng": 106.7009,
            "intent": "GENERAL_AI_INFRASTRUCTURE",
            "activeLayers": ["fiber_corridors", "digital_access_gap"],
            "scenario": "BUILD_NOW",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["evidenceSummary"]["scoredLayerCount"] == 2
    assert data["evidenceSummary"]["syntheticLayerCount"] == 2
    assert data["evidenceSummary"]["realOpenLayerCount"] == 0
    assert len(data["excludedSyntheticLayers"]) == 0
    assert any(item["sourceType"] == "synthetic" for item in data["matchedEvidence"])
    assert "included" in " ".join(data["dataGaps"]).lower()


def test_real_open_layers_contribute_matched_evidence() -> None:
    response = client.post(
        "/api/analyze-site",
        json={
            "lat": 10.7769,
            "lng": 106.7009,
            "intent": "GENERAL_AI_INFRASTRUCTURE",
            "activeLayers": ["substations", "transmission_lines", "telecom_assets"],
            "scenario": "BUILD_NOW",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["evidenceSummary"]["scoredLayerCount"] == 3
    assert data["evidenceSummary"]["matchedFeatureCount"] >= 1
    assert any(item["sourceType"] == "open_data" for item in data["matchedEvidence"])


def test_scenario_impacts_are_returned_with_before_after_values() -> None:
    response = client.post(
        "/api/analyze-site",
        json={
            "lat": 10.7769,
            "lng": 106.7009,
            "intent": "FIBER_CONNECTIVITY_UPGRADE",
            "activeLayers": [],
            "scenario": "UPGRADE_FIBER_FIRST",
        },
    )
    assert response.status_code == 200
    data = response.json()
    impacts = {
        item["component"]: item for item in data["planningContext"]["scenarioImpacts"]
    }
    assert impacts["connectivity"]["delta"] == 8
    assert impacts["digitalAccess"]["delta"] == 10
    formula_components = {
        term["component"] for term in data["planningContext"]["scoreFormula"]
    }
    assert {"digitalAccess", "connectivity", "sectorDemand"} <= formula_components
    drivers = {driver["component"]: driver for driver in data["scoreDrivers"]}
    assert drivers["Connectivity and interconnection"]["includedInFocusScore"] is True


def test_chat_endpoint_refuses_approval_claims() -> None:
    analysis = client.post(
        "/api/analyze-site",
        json={
            "lat": 10.7769,
            "lng": 106.7009,
            "intent": "GENERAL_AI_INFRASTRUCTURE",
            "activeLayers": [],
            "scenario": "BUILD_NOW",
        },
    ).json()
    response = client.post(
        "/api/agent/chat",
        json={
            "message": "Can you approve this permit and guarantee grid capacity?",
            "currentAnalysis": analysis,
            "hasSelectedLocation": True,
            "selectedLocation": {
                "lat": 10.7769,
                "lng": 106.7009,
                "label": "Test site",
            },
            "activeLayers": ["power_plants"],
            "scenario": "BUILD_NOW",
            "planningFocus": "GENERAL_AI_INFRASTRUCTURE",
        },
    )
    assert response.status_code == 200
    content = response.json()["content"]
    assert "No." in content
    assert "does not approve construction" in content
    assert "guarantee grid capacity" in content


def test_openai_disabled_agent_fallback() -> None:
    analysis = client.post(
        "/api/analyze-site",
        json={
            "lat": 10.7769,
            "lng": 106.7009,
            "intent": "EDGE_AI_NODES",
            "activeLayers": [],
            "scenario": "EDGE_PILOT_FIRST",
        },
    ).json()
    message = generate_agent_response(
        message="Where should we place edge AI nodes?",
        current_analysis=analysis,
        has_selected_location=True,
        active_layers=["telecom_assets", "fiber_corridors"],
        scenario="EDGE_PILOT_FIRST",
        planning_focus="EDGE_AI_NODES",
        llm_client=OpenAIExplanationClient(enabled=False),
    )
    assert "Detected planning intent: EDGE_AI_NODES" in message["content"]
    assert "Current readiness score" in message["content"]
    assert "Tools used:" in message["content"]


def test_agent_uses_llm_intent_classifier_when_available() -> None:
    analysis = client.post(
        "/api/analyze-site",
        json={
            "lat": 10.7769,
            "lng": 106.7009,
            "intent": "GENERAL_AI_INFRASTRUCTURE",
            "activeLayers": [],
            "scenario": "BUILD_NOW",
        },
    ).json()
    message = generate_agent_response(
        message="Please evaluate the proposal.",
        current_analysis=analysis,
        has_selected_location=True,
        active_layers=[],
        scenario="BUILD_NOW",
        planning_focus="GENERAL_AI_INFRASTRUCTURE",
        llm_client=FakeIntentClassifier(),  # type: ignore[arg-type]
    )
    assert "Detected planning intent: DATA_CENTER_FEASIBILITY" in message["content"]


def test_chat_endpoint_auto_analyzes_selected_site() -> None:
    response = client.post(
        "/api/agent/chat",
        json={
            "message": "What should we invest in first?",
            "hasSelectedLocation": True,
            "selectedLocation": {
                "lat": 10.7769,
                "lng": 106.7009,
                "label": "Test site",
            },
            "activeLayers": ["power_plants", "fiber_corridors"],
            "scenario": "BUILD_NOW",
            "planningFocus": "GENERAL_AI_INFRASTRUCTURE",
        },
    )
    assert response.status_code == 200
    content = response.json()["content"]
    assert "Priority investments" in content
    assert "Tools used:" in content


def test_chat_uses_selected_map_location_for_nearby_context() -> None:
    response = client.post(
        "/api/agent/chat",
        json={
            "message": "hows the location",
            "hasSelectedLocation": True,
            "selectedLocation": {
                "lat": 10.7769,
                "lng": 106.7009,
                "label": "Clicked map point",
            },
            "activeLayers": [
                "substations",
                "transmission_lines",
                "telecom_assets",
                "education_facilities",
                "healthcare_facilities",
                "fiber_corridors",
            ],
            "scenario": "BUILD_NOW",
            "planningFocus": "GENERAL_AI_INFRASTRUCTURE",
        },
    )
    assert response.status_code == 200
    content = response.json()["content"]
    assert "Location snapshot" in content
    assert "Nearby evidence" in content
    assert "Infrastructure signals" in content
    assert "Synthetic" in content


def test_chat_explains_score_in_plain_language() -> None:
    analysis = client.post(
        "/api/analyze-site",
        json={
            "lat": 10.7769,
            "lng": 106.7009,
            "intent": "GENERAL_AI_INFRASTRUCTURE",
            "activeLayers": [
                "substations",
                "transmission_lines",
                "telecom_assets",
                "education_facilities",
            ],
            "scenario": "BUILD_NOW",
        },
    ).json()
    response = client.post(
        "/api/agent/chat",
        json={
            "message": "I do not understand the score. Explain it simply.",
            "currentAnalysis": analysis,
            "hasSelectedLocation": True,
            "selectedLocation": {
                "lat": 10.7769,
                "lng": 106.7009,
                "label": "Clicked map point",
            },
            "activeLayers": [
                "substations",
                "transmission_lines",
                "telecom_assets",
                "education_facilities",
            ],
            "scenario": "BUILD_NOW",
            "planningFocus": "GENERAL_AI_INFRASTRUCTURE",
        },
    )
    assert response.status_code == 200
    content = response.json()["content"]
    assert "How to read the score" in content
    assert "feature count" in content.lower()
    assert "not proof" in content.lower()


def test_chat_answers_platform_question_without_site() -> None:
    response = client.post(
        "/api/agent/chat",
        json={
            "message": "What is confidence?",
            "hasSelectedLocation": False,
        },
    )
    assert response.status_code == 200
    content = response.json()["content"]
    assert "Confidence" in content or "confidence" in content
    assert "select" not in content.lower()


def test_chat_answers_greeting_without_site() -> None:
    response = client.post(
        "/api/agent/chat",
        json={
            "message": "hello how are u",
            "hasSelectedLocation": False,
        },
    )
    assert response.status_code == 200
    content = response.json()["content"]
    assert "Hi." in content
    assert "InfraAI SiteCompass" in content


def test_chat_explains_platform_without_site() -> None:
    response = client.post(
        "/api/agent/chat",
        json={
            "message": "hows this site working",
            "hasSelectedLocation": False,
        },
    )
    assert response.status_code == 200
    content = response.json()["content"]
    assert "satellite map" in content.lower() or "visible infrastructure" in content.lower()
    assert "click a location" not in content.lower()


def test_mcp_mount_and_tools_are_registered() -> None:
    assert any(getattr(route, "path", None) == "/mcp" for route in app.routes)
    tools = asyncio.run(infraai_mcp.list_tools())
    tool_names = {tool.name for tool in tools}
    assert "classify_planning_intent_tool" in tool_names
    assert "analyze_site_readiness_tool" in tool_names
    assert "query_site_evidence_tool" in tool_names
    assert "describe_map_location_context_tool" in tool_names
    assert "recommend_next_actions_tool" in tool_names
    assert "apply_planning_guardrails_tool_mcp" in tool_names
