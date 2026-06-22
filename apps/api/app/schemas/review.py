"""Human-in-the-loop review contracts for planning reports."""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, Field

from app.schemas.site import EvidenceSummary, SelectedSite, SiteAnalysisResult


class ReviewStatus(StrEnum):
    DRAFT_ANALYSIS = "DRAFT_ANALYSIS"
    NEEDS_MORE_DATA = "NEEDS_MORE_DATA"
    READY_FOR_EXPERT_REVIEW = "READY_FOR_EXPERT_REVIEW"
    REVIEWED_FOR_PLANNING_ONLY = "REVIEWED_FOR_PLANNING_ONLY"
    ESCALATED_TO_AUTHORITY = "ESCALATED_TO_AUTHORITY"


class EvidenceDecision(StrEnum):
    UNVERIFIED = "UNVERIFIED"
    NEEDS_SOURCE = "NEEDS_SOURCE"
    REVIEWED = "REVIEWED"
    REJECTED = "REJECTED"
    REQUIRES_EXPERT_VALIDATION = "REQUIRES_EXPERT_VALIDATION"


class ReviewChecklistItem(BaseModel):
    id: str
    category: str
    label: str
    description: str
    checked: bool = False
    notes: str = ""


class EvidenceReviewItem(BaseModel):
    id: str
    evidenceId: str
    layerId: str
    layerLabel: str
    name: str
    sourceType: str
    sourceConfidence: str
    dataCompleteness: str
    dataLimitation: str
    decision: EvidenceDecision = EvidenceDecision.UNVERIFIED
    notes: str = ""


class ReviewerNote(BaseModel):
    id: str
    author: str = "Reviewer"
    note: str
    createdAt: str


class HumanReviewRecord(BaseModel):
    reviewId: str
    createdAt: str
    updatedAt: str
    status: ReviewStatus = ReviewStatus.DRAFT_ANALYSIS
    selectedSite: SelectedSite
    planningFocus: str
    scenario: str
    suitabilityScore: int
    confidence: str
    evidenceSummary: EvidenceSummary
    matchedEvidenceIds: list[str] = Field(default_factory=list)
    syntheticDemoEvidenceCount: int
    reviewerNotes: list[ReviewerNote] = Field(default_factory=list)
    checklistItems: list[ReviewChecklistItem] = Field(default_factory=list)
    evidenceItems: list[EvidenceReviewItem] = Field(default_factory=list)
    requiredValidationSteps: list[str] = Field(default_factory=list)
    sourceDisclosure: str
    warnings: list[str] = Field(default_factory=list)
    nonGoalWarning: str


class CreateHumanReviewRequest(BaseModel):
    currentAnalysis: SiteAnalysisResult
    reviewerName: str = "Reviewer"


class UpdateHumanReviewRequest(BaseModel):
    status: ReviewStatus | None = None
    checklistItems: list[ReviewChecklistItem] | None = None
    evidenceItems: list[EvidenceReviewItem] | None = None
    reviewerNotes: list[ReviewerNote] | None = None


class ReviewPacket(BaseModel):
    reviewId: str
    createdAt: str
    updatedAt: str
    generatedAt: str
    status: ReviewStatus
    selectedSite: SelectedSite
    planningFocus: str
    scenario: str
    suitabilityScore: int
    confidence: str
    sourceDisclosure: str
    evidenceSummary: EvidenceSummary
    matchedEvidenceIds: list[str]
    syntheticDemoEvidenceCount: int
    checklistItems: list[ReviewChecklistItem]
    evidenceItems: list[EvidenceReviewItem]
    reviewerNotes: list[ReviewerNote]
    requiredValidationSteps: list[str]
    warnings: list[str]
    nonGoalWarning: str
