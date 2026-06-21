"""Tool-based and optional LLM agent response generation."""

from __future__ import annotations

from typing import Any
from uuid import uuid4

from .guardrails import NON_GOAL_WARNING, is_approval_request
from .intents import classify_intent
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

    detected_intent = classify_intent(message)
    tool_results = run_chat_tools(
        message=message,
        current_analysis=current_analysis,
        active_layers=active_layers,
        scenario=scenario,
        planning_focus=planning_focus,
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
            detected_intent=detected_intent.value,
            fallback_response=fallback,
            tool_results=tool_results,
            selected_location=selected_location,
        )
        if llm_text:
            return create_assistant_message(llm_text)

    return create_assistant_message(fallback)
