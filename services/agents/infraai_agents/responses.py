"""Tool-based and optional LLM agent response generation."""

from __future__ import annotations

from typing import Any
from uuid import uuid4

from .guardrails import NON_GOAL_WARNING, is_approval_request
from .intents import InfrastructureIntent, classify_intent, normalize_intent
from .openai_adapter import OpenAIExplanationClient
from .tools import (
    answer_platform_help,
    can_answer_without_site,
    compose_tool_grounded_response,
    run_chat_tools,
)


def create_assistant_message(content: str) -> dict[str, str]:
    return {"id": str(uuid4()), "role": "assistant", "content": content}


def generate_agent_response(
    *,
    message: str,
    current_analysis: dict[str, Any] | None,
    has_selected_location: bool,
    selected_location: dict[str, Any] | None = None,
    active_layers: list[str] | None = None,
    scenario: str | None = None,
    planning_focus: str | None = None,
    detected_intent: str | None = None,
    detected_intent_method: str = "provided",
    detected_intent_confidence: str | None = "high",
    detected_intent_reason: str | None = None,
    llm_client: OpenAIExplanationClient | None = None,
) -> dict[str, str]:
    """Generate a grounded chat response from tool outputs and analysis state."""
    if not has_selected_location:
        if can_answer_without_site(message):
            return create_assistant_message(answer_platform_help(message)["answer"])
        return create_assistant_message(
            "For site-specific planning, click a location or choose a candidate "
            "zone first. I can still answer general questions about the platform, "
            "confidence, scoring, layers, and MCP tools."
        )

    if not current_analysis:
        return create_assistant_message(
            "Run readiness analysis first. After the report is available, I can "
            "answer planning questions using the computed scores."
        )

    intent_result = _classify_message_intent(
        message=message,
        llm_client=llm_client,
        detected_intent=detected_intent,
        detected_intent_method=detected_intent_method,
        detected_intent_confidence=detected_intent_confidence,
        detected_intent_reason=detected_intent_reason,
    )
    detected = normalize_intent(intent_result["intent"])
    tool_results = run_chat_tools(
        message=message,
        current_analysis=current_analysis,
        active_layers=active_layers,
        scenario=scenario,
        planning_focus=planning_focus,
        detected_intent=detected.value,
        intent_classifier=intent_result["method"],
        intent_confidence=intent_result.get("confidence"),
        intent_reason=intent_result.get("reason"),
    )
    fallback = compose_tool_grounded_response(
        message=message,
        current_analysis=current_analysis,
        tool_results=tool_results,
    )

    if is_approval_request(message):
        suitability = current_analysis.get("suitability", {})
        return create_assistant_message(
            f"No. {NON_GOAL_WARNING} The current score is "
            f"{suitability.get('score', 'unknown')}/100 with "
            f"{suitability.get('confidence', 'unknown')} confidence. "
            "Tools used: apply_planning_guardrails."
        )

    if llm_client:
        llm_text = llm_client.generate_grounded_response(
            message=message,
            current_analysis=current_analysis,
            detected_intent=detected.value,
            fallback_response=fallback,
            tool_results=tool_results,
            selected_location=selected_location,
        )
        if llm_text:
            return create_assistant_message(llm_text)

    return create_assistant_message(fallback)


def _classify_message_intent(
    *,
    message: str,
    llm_client: OpenAIExplanationClient | None,
    detected_intent: str | None = None,
    detected_intent_method: str = "provided",
    detected_intent_confidence: str | None = "high",
    detected_intent_reason: str | None = None,
) -> dict[str, str]:
    """Prefer validated LLM intent classification, with deterministic fallback."""
    if detected_intent:
        intent = normalize_intent(detected_intent)
        return {
            "intent": intent.value,
            "method": detected_intent_method,
            "confidence": detected_intent_confidence or "medium",
            "reason": detected_intent_reason or "Intent was supplied by the API caller.",
        }

    fallback = classify_intent(message)
    if llm_client:
        llm_result = llm_client.classify_intent(
            message=message,
            fallback_intent=fallback,
        )
        if llm_result:
            return llm_result

    return {
        "intent": fallback.value,
        "method": "keyword",
        "confidence": "medium",
        "reason": _keyword_reason(fallback),
    }


def _keyword_reason(intent: InfrastructureIntent) -> str:
    if intent == InfrastructureIntent.GENERAL_AI_INFRASTRUCTURE:
        return "No more specific keyword intent was detected."
    return "Matched deterministic infrastructure-planning keywords."
