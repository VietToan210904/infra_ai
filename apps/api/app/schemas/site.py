"""Pydantic contracts shared by site analysis and agent chat endpoints."""

from __future__ import annotations

from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, Field


class InfrastructureIntent(StrEnum):
    GENERAL_AI_INFRASTRUCTURE = "GENERAL_AI_INFRASTRUCTURE"
    DATA_CENTER_FEASIBILITY = "DATA_CENTER_FEASIBILITY"
    PUBLIC_COMPUTE_HUB = "PUBLIC_COMPUTE_HUB"
    EDGE_AI_NODES = "EDGE_AI_NODES"
    CLOUD_FIRST_STRATEGY = "CLOUD_FIRST_STRATEGY"
    FIBER_CONNECTIVITY_UPGRADE = "FIBER_CONNECTIVITY_UPGRADE"
    POWER_GRID_READINESS = "POWER_GRID_READINESS"
    CITY_DATA_PLATFORM = "CITY_DATA_PLATFORM"
    AI_LITERACY_PROGRAM = "AI_LITERACY_PROGRAM"
    GOVERNANCE_CYBERSECURITY = "GOVERNANCE_CYBERSECURITY"
    SECTOR_SPECIFIC_READINESS = "SECTOR_SPECIFIC_READINESS"


class ScenarioType(StrEnum):
    BUILD_NOW = "BUILD_NOW"
    UPGRADE_FIBER_FIRST = "UPGRADE_FIBER_FIRST"
    VALIDATE_GRID_FIRST = "VALIDATE_GRID_FIRST"
    AI_LITERACY_TRAINING = "AI_LITERACY_TRAINING"
    CLOUD_FIRST = "CLOUD_FIRST"
    DELAY_INVESTMENT = "DELAY_INVESTMENT"
    GOVERNANCE_FIRST = "GOVERNANCE_FIRST"
    EDGE_PILOT_FIRST = "EDGE_PILOT_FIRST"
    OPEN_DATA_PLATFORM_FIRST = "OPEN_DATA_PLATFORM_FIRST"


ConfidenceLevel = Literal["Low", "Medium", "High"]


class SelectedSite(BaseModel):
    lat: float
    lng: float
    label: str = "Selected AI planning site"


class AnalyzeSiteRequest(BaseModel):
    lat: float
    lng: float
    intent: str | None = None
    infrastructureIntent: str | None = None
    infrastructureType: str | None = None
    userQuestion: str | None = None
    activeLayers: list[str] = Field(default_factory=list)
    scenario: ScenarioType = ScenarioType.BUILD_NOW


class Suitability(BaseModel):
    score: int
    level: str
    confidence: ConfidenceLevel
    recommendation: str


class ComponentScores(BaseModel):
    power: int
    connectivity: int
    coolingWater: int
    physicalFeasibility: int
    computeEcosystem: int
    sectorDemand: int
    governance: int
    digitalAccess: int
    aiLiteracy: int
    dataMaturity: int
    equity: int
    resilience: int
    dataCompleteness: int
    dataFreshness: int
    sourceReliability: int
    geographicResolution: int


class SectorReadiness(BaseModel):
    name: str
    level: str
    score: int
    mainGap: str
    suggestedUseCases: list[str]


class RoadmapItem(BaseModel):
    horizon: str
    actions: list[str]


class ScoreFormulaTerm(BaseModel):
    component: str
    label: str
    weightPercent: int
    score: int
    contribution: float
    direction: Literal["readiness", "gap", "priority", "context"] = "readiness"
    explanation: str = ""


class ScenarioImpact(BaseModel):
    component: str
    label: str
    beforeScore: int
    afterScore: int
    delta: int
    explanation: str


class PlanningContext(BaseModel):
    focusLabel: str
    focusQuestion: str
    scenarioLabel: str
    scenarioDescription: str
    scoreFormula: list[ScoreFormulaTerm]
    relevantComponents: list[str]
    scenarioImpacts: list[ScenarioImpact]
    focusSpecificEvidenceNeeds: list[str]
    focusSpecificWarnings: list[str]


class EvidenceSummary(BaseModel):
    activeLayerCount: int
    scoredLayerCount: int
    realOpenLayerCount: int
    syntheticLayerCount: int
    matchedFeatureCount: int
    nearestEvidenceKm: float | None = None
    summary: str
    confidenceImpact: str


class ScoreDriver(BaseModel):
    component: str
    score: int
    evidenceCount: int
    nearestEvidenceKm: float | None = None
    supportingLayers: list[str]
    openDataSupportingLayers: list[str] = Field(default_factory=list)
    syntheticSupportingLayers: list[str] = Field(default_factory=list)
    excludedSyntheticLayers: list[str]
    explanation: str
    includedInFocusScore: bool = False
    formulaWeight: int | None = None
    scenarioAdjustment: int = 0
    focusSpecificExplanation: str = ""


class MatchedEvidence(BaseModel):
    layerId: str
    layerLabel: str
    name: str
    assetType: str
    category: str
    source: str
    sourceType: str
    sourceConfidence: str
    dataCompleteness: str
    geometryType: str
    distanceKm: float | None = None
    relation: str
    dataLimitation: str


class ExcludedSyntheticLayer(BaseModel):
    layerId: str
    layerLabel: str
    reason: str


class AgentReview(BaseModel):
    summary: str
    scoreReliability: str
    evidenceStrengths: list[str]
    evidenceGaps: list[str]
    uncertaintyNotes: list[str]
    challengedAssumptions: list[str]
    nextValidationSteps: list[str]
    evidenceCitations: list[str] = Field(default_factory=list)
    scoreDriverSummary: str = ""
    excludedEvidenceNotes: list[str] = Field(default_factory=list)
    usedLlm: bool = False


class ScoreExplanation(BaseModel):
    headline: str
    strongestDrivers: list[str]
    weakestDrivers: list[str]
    dataQualityBadge: str
    dataQualitySummary: str


class AgentTrace(BaseModel):
    intentSource: str
    classifier: str
    classifierConfidence: str
    classifierReason: str
    toolsUsed: list[str]
    activeLayerCount: int
    scoredLayerCount: int
    openDataLayerCount: int
    syntheticDemoLayerCount: int
    guardrailsTriggered: int


class GapSummary(BaseModel):
    digitalAccess: str
    aiLiteracy: str
    infrastructure: str
    dataQuality: str


class SiteAnalysisResult(BaseModel):
    intent: InfrastructureIntent
    querySummary: str
    selectedSite: SelectedSite
    suitability: Suitability
    componentScores: ComponentScores
    sectors: list[SectorReadiness]
    bottlenecks: list[str]
    strengths: list[str]
    priorityInvestments: list[str]
    roadmap: list[RoadmapItem]
    planningContext: PlanningContext
    evidenceSummary: EvidenceSummary
    scoreDrivers: list[ScoreDriver]
    matchedEvidence: list[MatchedEvidence]
    excludedSyntheticLayers: list[ExcludedSyntheticLayer]
    dataGaps: list[str]
    scoreExplanation: ScoreExplanation
    agentTrace: AgentTrace
    agentReview: AgentReview
    confidenceExplanation: str
    gapSummary: GapSummary
    recommendedInfrastructurePath: str
    humanReviewRequired: bool
    warnings: list[str]


class ChatMessage(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    currentAnalysis: SiteAnalysisResult | None = None
    currentReview: dict[str, Any] | None = None
    hasSelectedLocation: bool = False
    selectedLocation: SelectedSite | None = None
    activeLayers: list[str] = Field(default_factory=list)
    scenario: ScenarioType = ScenarioType.BUILD_NOW
    planningFocus: str | None = None
