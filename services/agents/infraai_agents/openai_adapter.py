"""Optional OpenAI explanation adapter for grounded planning responses."""

from __future__ import annotations

import json
import os
from typing import Any

from .intents import InfrastructureIntent, normalize_intent


class OpenAIExplanationClient:
    """Thin optional wrapper around the official OpenAI Python SDK."""

    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str | None = None,
        enabled: bool | None = None,
        timeout_seconds: float | None = None,
    ) -> None:
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model or os.getenv("OPENAI_MODEL")
        env_enabled = os.getenv("ENABLE_LLM_EXPLANATIONS", "false").lower()
        self.enabled = enabled if enabled is not None else env_enabled == "true"
        self.timeout_seconds = timeout_seconds or _env_float(
            "OPENAI_TIMEOUT_SECONDS", 12.0
        )

    @property
    def is_available(self) -> bool:
        return bool(self.enabled and self.api_key and self.model)

    def generate_grounded_response(
        self,
        *,
        message: str,
        current_analysis: dict[str, Any],
        detected_intent: str,
        fallback_response: str,
        tool_results: list[dict[str, Any]] | None = None,
        selected_location: dict[str, Any] | None = None,
    ) -> str | None:
        """Generate prose only; scores and recommendations remain deterministic."""
        if not self.is_available:
            return None

        try:
            from openai import OpenAI
        except ImportError:
            return None

        client = OpenAI(
            api_key=self.api_key,
            timeout=self.timeout_seconds,
            max_retries=0,
        )
        payload = {
            "user_question": message,
            "detected_intent": detected_intent,
            "analysis": current_analysis,
            "selected_location": selected_location,
            "tool_results": tool_results or [],
            "fallback_response": fallback_response,
        }

        instructions = (
            "You are the explanation layer for InfraAI SiteCompass. Use only "
            "the supplied analysis JSON. Do not invent, alter, or extrapolate "
            "scores. Do not approve construction, permits, funding, grid "
            "capacity, or feasibility. Ground the answer in the supplied tool "
            "results. Include the score, readiness level, confidence, evidence "
            "citations, score drivers, synthetic/demo layers used, data gaps, "
            "priority investments, and human review warning when relevant. "
            "Answer the user's specific question instead of repeating the full "
            "report. Format with concise Markdown headings and bullet lists. "
            "Do not use Markdown tables, raw JSON, or long unbroken paragraphs. "
            "When explaining scores, clearly separate the overall readiness "
            "score from component scores and matched-feature counts. Explain "
            "that a feature count is evidence volume, not proof of capacity or "
            "feasibility. "
            "Keep the answer concise."
        )

        try:
            response = client.responses.create(
                model=self.model,
                instructions=instructions,
                input=json.dumps(payload, ensure_ascii=True),
                max_output_tokens=500,
            )
        except Exception:
            return None

        text = getattr(response, "output_text", None)
        if not isinstance(text, str) or not text.strip():
            return None

        return text.strip()

    def classify_intent(
        self,
        *,
        message: str,
        fallback_intent: str | InfrastructureIntent | None = None,
    ) -> dict[str, str] | None:
        """Classify a message into one allowed infrastructure intent."""
        if not self.is_available:
            return None

        try:
            from openai import OpenAI
        except ImportError:
            return None

        fallback = normalize_intent(fallback_intent).value
        allowed_intents = [intent.value for intent in InfrastructureIntent]
        instructions = (
            "Classify the user's AI infrastructure planning message into exactly "
            "one allowed intent. Return only compact JSON with keys: intent, "
            "confidence, reason. The intent must be one of the allowed intents. "
            "Use GENERAL_AI_INFRASTRUCTURE when the message is only a greeting, "
            "general help question, or too ambiguous. Do not invent new labels."
        )
        payload = {
            "message": message,
            "allowed_intents": allowed_intents,
            "fallback_intent": fallback,
        }

        client = OpenAI(
            api_key=self.api_key,
            timeout=self.timeout_seconds,
            max_retries=0,
        )
        try:
            response = client.responses.create(
                model=self.model,
                instructions=instructions,
                input=json.dumps(payload, ensure_ascii=True),
                max_output_tokens=180,
            )
        except Exception:
            return None

        text = getattr(response, "output_text", None)
        if not isinstance(text, str) or not text.strip():
            return None

        parsed = _parse_json_object(text)
        raw_intent = str(parsed.get("intent", "")).strip().upper()
        if raw_intent not in allowed_intents:
            return None

        confidence = str(parsed.get("confidence", "medium")).strip().lower()
        if confidence not in {"low", "medium", "high"}:
            confidence = "medium"

        reason = str(parsed.get("reason", "")).strip()
        return {
            "intent": normalize_intent(raw_intent).value,
            "confidence": confidence,
            "reason": reason[:240],
            "method": "llm",
        }

    def generate_report_review(
        self,
        *,
        current_analysis: dict[str, Any],
        fallback_review: dict[str, Any],
    ) -> str | None:
        """Generate a concise narrative report review from computed outputs."""
        if not self.is_available:
            return None

        try:
            from openai import OpenAI
        except ImportError:
            return None

        client = OpenAI(
            api_key=self.api_key,
            timeout=self.timeout_seconds,
            max_retries=0,
        )
        payload = {
            "analysis": current_analysis,
            "fallback_review": fallback_review,
        }
        instructions = (
            "You are the report-review agent for InfraAI SiteCompass. Use only "
            "the supplied analysis and fallback review. Do not change or invent "
            "scores. Assess reliability, evidence gaps, uncertainty, assumptions, "
            "matched evidence, synthetic/demo layers used, score drivers, and next "
            "validation steps. State clearly that open-data and synthetic layers "
            "cannot prove feasibility. Keep the review to 3-5 sentences."
        )

        try:
            response = client.responses.create(
                model=self.model,
                instructions=instructions,
                input=json.dumps(payload, ensure_ascii=True),
                max_output_tokens=450,
            )
        except Exception:
            return None

        text = getattr(response, "output_text", None)
        if not isinstance(text, str) or not text.strip():
            return None

        return text.strip()


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except ValueError:
        return default


def _parse_json_object(text: str) -> dict[str, Any]:
    try:
        value = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return {}
        try:
            value = json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            return {}

    return value if isinstance(value, dict) else {}
