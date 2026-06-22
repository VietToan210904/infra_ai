"""Local JSON persistence for human-in-the-loop planning reviews."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from app.schemas.review import (
    CreateHumanReviewRequest,
    EvidenceDecision,
    EvidenceReviewItem,
    HumanReviewRecord,
    ReviewChecklistItem,
    ReviewPacket,
    ReviewerNote,
    ReviewStatus,
    UpdateHumanReviewRequest,
)
from app.schemas.site import MatchedEvidence, ScoreDriver, SiteAnalysisResult
from infraai_agents.guardrails import NON_GOAL_WARNING


REPO_ROOT = Path(__file__).resolve().parents[5]
REVIEW_STORE_ROOT = REPO_ROOT / ".tmp-review-store"


def create_review(payload: CreateHumanReviewRequest) -> HumanReviewRecord:
    analysis = payload.currentAnalysis
    now = _now_iso()
    review = HumanReviewRecord(
        reviewId=str(uuid4()),
        createdAt=now,
        updatedAt=now,
        status=ReviewStatus.DRAFT_ANALYSIS,
        selectedSite=analysis.selectedSite,
        planningFocus=analysis.planningContext.focusLabel,
        scenario=analysis.planningContext.scenarioLabel,
        suitabilityScore=analysis.suitability.score,
        confidence=analysis.suitability.confidence,
        evidenceSummary=analysis.evidenceSummary,
        matchedEvidenceIds=[_evidence_id(item) for item in analysis.matchedEvidence],
        syntheticDemoEvidenceCount=sum(
            1 for item in analysis.matchedEvidence if item.sourceType == "synthetic"
        ),
        reviewerNotes=[
            ReviewerNote(
                id=str(uuid4()),
                author=payload.reviewerName,
                note=(
                    "Initial review record created from the AI readiness report. "
                    "This is a planning-review workflow, not an approval."
                ),
                createdAt=now,
            )
        ],
        checklistItems=_default_checklist_items(analysis),
        evidenceItems=_evidence_review_items(analysis.matchedEvidence),
        requiredValidationSteps=analysis.agentReview.nextValidationSteps,
        sourceDisclosure=analysis.scoreExplanation.dataQualitySummary,
        warnings=analysis.warnings,
        nonGoalWarning=NON_GOAL_WARNING,
    )
    save_review(review)
    return review


def get_review(review_id: str) -> HumanReviewRecord:
    return HumanReviewRecord.model_validate_json(_review_path(review_id).read_text())


def update_review(
    review_id: str,
    payload: UpdateHumanReviewRequest,
) -> HumanReviewRecord:
    review = get_review(review_id)
    update = payload.model_dump(exclude_unset=True)
    if "status" in update:
        review.status = payload.status or review.status
    if payload.checklistItems is not None:
        review.checklistItems = payload.checklistItems
    if payload.evidenceItems is not None:
        review.evidenceItems = payload.evidenceItems
    if payload.reviewerNotes is not None:
        review.reviewerNotes = payload.reviewerNotes
    review.updatedAt = _now_iso()
    save_review(review)
    return review


def build_review_packet(review_id: str) -> ReviewPacket:
    review = get_review(review_id)
    return ReviewPacket(
        reviewId=review.reviewId,
        createdAt=review.createdAt,
        updatedAt=review.updatedAt,
        generatedAt=_now_iso(),
        status=review.status,
        selectedSite=review.selectedSite,
        planningFocus=review.planningFocus,
        scenario=review.scenario,
        suitabilityScore=review.suitabilityScore,
        confidence=review.confidence,
        sourceDisclosure=review.sourceDisclosure,
        evidenceSummary=review.evidenceSummary,
        matchedEvidenceIds=review.matchedEvidenceIds,
        syntheticDemoEvidenceCount=review.syntheticDemoEvidenceCount,
        checklistItems=review.checklistItems,
        evidenceItems=review.evidenceItems,
        reviewerNotes=review.reviewerNotes,
        requiredValidationSteps=review.requiredValidationSteps,
        warnings=review.warnings,
        nonGoalWarning=review.nonGoalWarning,
    )


def save_review(review: HumanReviewRecord) -> None:
    REVIEW_STORE_ROOT.mkdir(parents=True, exist_ok=True)
    path = _review_path(review.reviewId)
    tmp_path = path.with_suffix(".tmp")
    tmp_path.write_text(
        json.dumps(review.model_dump(mode="json"), indent=2),
        encoding="utf-8",
    )
    tmp_path.replace(path)


def review_exists(review_id: str) -> bool:
    return _review_path(review_id).exists()


def _review_path(review_id: str) -> Path:
    safe_id = "".join(char for char in review_id if char.isalnum() or char == "-")
    return REVIEW_STORE_ROOT / f"{safe_id}.json"


def _now_iso() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def _default_checklist_items(
    analysis: SiteAnalysisResult,
) -> list[ReviewChecklistItem]:
    weak_drivers = _weak_driver_text(analysis.scoreDrivers)
    data_gaps = " ".join(analysis.dataGaps[:3])
    return [
        _checklist_item(
            "grid_power_validation",
            "Grid / power validation",
            "Confirm power and grid capacity with responsible utility or grid authority.",
            weak_drivers.get("power", data_gaps),
        ),
        _checklist_item(
            "fiber_provider_validation",
            "Fiber / provider validation",
            "Confirm fiber availability, redundancy, latency, and provider service levels.",
            weak_drivers.get("connectivity", data_gaps),
        ),
        _checklist_item(
            "cooling_water_validation",
            "Cooling / water validation",
            "Confirm cooling, water, heat, flood, discharge, and environmental constraints.",
            weak_drivers.get("cooling", data_gaps),
        ),
        _checklist_item(
            "land_zoning_permitting_validation",
            "Land / zoning / permitting validation",
            "Confirm land status, zoning compatibility, permits, construction access, and legal constraints.",
            weak_drivers.get("physical", data_gaps),
        ),
        _checklist_item(
            "governance_cybersecurity_validation",
            "Governance / cybersecurity validation",
            "Confirm privacy, cybersecurity, procurement, audit, and operating governance controls.",
            weak_drivers.get("governance", data_gaps),
        ),
        _checklist_item(
            "community_equity_validation",
            "Community / equity validation",
            "Confirm public benefit, equity, access, and community consultation needs.",
            weak_drivers.get("equity", data_gaps),
        ),
        _checklist_item(
            "synthetic_demo_data_validation",
            "Synthetic/demo data validation",
            "Validate or replace synthetic/demo assumptions with authoritative sources.",
            analysis.scoreExplanation.dataQualitySummary,
        ),
    ]


def _checklist_item(
    item_id: str,
    label: str,
    description: str,
    evidence_context: str,
) -> ReviewChecklistItem:
    return ReviewChecklistItem(
        id=item_id,
        category=label,
        label=label,
        description=f"{description} Context: {evidence_context or 'No specific evidence context was available.'}",
    )


def _weak_driver_text(score_drivers: list[ScoreDriver]) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for driver in sorted(score_drivers, key=lambda item: item.score)[:6]:
        normalized = driver.component.lower()
        summary = (
            f"{driver.component} is {driver.score}/100 with "
            f"{driver.evidenceCount} matched feature(s)."
        )
        if "power" in normalized or "grid" in normalized:
            mapping["power"] = summary
        if "connectivity" in normalized or "interconnection" in normalized:
            mapping["connectivity"] = summary
        if "cooling" in normalized or "water" in normalized:
            mapping["cooling"] = summary
        if "physical" in normalized or "land" in normalized:
            mapping["physical"] = summary
        if "governance" in normalized:
            mapping["governance"] = summary
        if "equity" in normalized or "access" in normalized:
            mapping["equity"] = summary
    return mapping


def _evidence_review_items(
    matched_evidence: list[MatchedEvidence],
) -> list[EvidenceReviewItem]:
    return [
        EvidenceReviewItem(
            id=str(uuid4()),
            evidenceId=_evidence_id(item),
            layerId=item.layerId,
            layerLabel=item.layerLabel,
            name=item.name,
            sourceType=item.sourceType,
            sourceConfidence=item.sourceConfidence,
            dataCompleteness=item.dataCompleteness,
            dataLimitation=item.dataLimitation,
            decision=EvidenceDecision.REQUIRES_EXPERT_VALIDATION
            if item.sourceType == "synthetic"
            else EvidenceDecision.UNVERIFIED,
        )
        for item in matched_evidence
    ]


def _evidence_id(item: MatchedEvidence) -> str:
    return f"{item.layerId}:{item.name}"
