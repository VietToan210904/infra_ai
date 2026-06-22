export type InfrastructureIntent =
  | "GENERAL_AI_INFRASTRUCTURE"
  | "DATA_CENTER_FEASIBILITY"
  | "PUBLIC_COMPUTE_HUB"
  | "EDGE_AI_NODES"
  | "CLOUD_FIRST_STRATEGY"
  | "FIBER_CONNECTIVITY_UPGRADE"
  | "POWER_GRID_READINESS"
  | "CITY_DATA_PLATFORM"
  | "AI_LITERACY_PROGRAM"
  | "GOVERNANCE_CYBERSECURITY"
  | "SECTOR_SPECIFIC_READINESS";

export type LegacyInfrastructureType =
  | "PUBLIC_AI_COMPUTE_HUB"
  | "REGIONAL_AI_DATA_CENTER";

export type InfrastructureType =
  | InfrastructureIntent
  | LegacyInfrastructureType;

export type ScenarioType =
  | "BUILD_NOW"
  | "UPGRADE_FIBER_FIRST"
  | "VALIDATE_GRID_FIRST"
  | "AI_LITERACY_TRAINING"
  | "CLOUD_FIRST"
  | "DELAY_INVESTMENT"
  | "GOVERNANCE_FIRST"
  | "EDGE_PILOT_FIRST"
  | "OPEN_DATA_PLATFORM_FIRST";

export type LayerKey =
  | "education"
  | "healthcare"
  | "government"
  | "overall_readiness";

export type ConfidenceLevel = "Low" | "Medium" | "High";

export type ReviewStatus =
  | "DRAFT_ANALYSIS"
  | "NEEDS_MORE_DATA"
  | "READY_FOR_EXPERT_REVIEW"
  | "REVIEWED_FOR_PLANNING_ONLY"
  | "ESCALATED_TO_AUTHORITY";

export type EvidenceDecision =
  | "UNVERIFIED"
  | "NEEDS_SOURCE"
  | "REVIEWED"
  | "REJECTED"
  | "REQUIRES_EXPERT_VALIDATION";

export interface SelectedLocation {
  lat: number;
  lng: number;
  label?: string;
}

export interface AnalyzeSitePayload {
  lat: number;
  lng: number;
  intent?: InfrastructureIntent;
  infrastructureIntent?: InfrastructureIntent;
  infrastructureType?: InfrastructureType;
  userQuestion?: string;
  activeLayers: string[];
  scenario: ScenarioType;
}

export interface Suitability {
  score: number;
  level: string;
  confidence: ConfidenceLevel;
  recommendation: string;
}

export interface ComponentScores {
  power: number;
  connectivity: number;
  coolingWater: number;
  physicalFeasibility: number;
  computeEcosystem: number;
  sectorDemand: number;
  governance: number;
  digitalAccess: number;
  aiLiteracy: number;
  dataMaturity: number;
  equity: number;
  resilience: number;
  dataCompleteness: number;
  dataFreshness: number;
  sourceReliability: number;
  geographicResolution: number;
}

export interface SectorReadiness {
  name: string;
  level: string;
  score: number;
  mainGap: string;
  suggestedUseCases: string[];
}

export interface RoadmapItem {
  horizon: string;
  actions: string[];
}

export interface ScoreFormulaTerm {
  component: string;
  label: string;
  weightPercent: number;
  score: number;
  contribution: number;
  direction: "readiness" | "gap" | "priority" | "context";
  explanation: string;
}

export interface ScenarioImpact {
  component: string;
  label: string;
  beforeScore: number;
  afterScore: number;
  delta: number;
  explanation: string;
}

export interface PlanningContext {
  focusLabel: string;
  focusQuestion: string;
  scenarioLabel: string;
  scenarioDescription: string;
  scoreFormula: ScoreFormulaTerm[];
  relevantComponents: string[];
  scenarioImpacts: ScenarioImpact[];
  focusSpecificEvidenceNeeds: string[];
  focusSpecificWarnings: string[];
}

export interface EvidenceSummary {
  activeLayerCount: number;
  scoredLayerCount: number;
  realOpenLayerCount: number;
  syntheticLayerCount: number;
  matchedFeatureCount: number;
  nearestEvidenceKm: number | null;
  summary: string;
  confidenceImpact: string;
}

export interface ScoreDriver {
  component: string;
  score: number;
  evidenceCount: number;
  nearestEvidenceKm: number | null;
  supportingLayers: string[];
  openDataSupportingLayers: string[];
  syntheticSupportingLayers: string[];
  excludedSyntheticLayers: string[];
  explanation: string;
  includedInFocusScore: boolean;
  formulaWeight: number | null;
  scenarioAdjustment: number;
  focusSpecificExplanation: string;
}

export interface MatchedEvidence {
  layerId: string;
  layerLabel: string;
  name: string;
  assetType: string;
  category: string;
  source: string;
  sourceType: string;
  sourceConfidence: string;
  dataCompleteness: string;
  geometryType: string;
  distanceKm: number | null;
  relation: string;
  dataLimitation: string;
}

export interface ExcludedSyntheticLayer {
  layerId: string;
  layerLabel: string;
  reason: string;
}

export interface AgentReview {
  summary: string;
  scoreReliability: string;
  evidenceStrengths: string[];
  evidenceGaps: string[];
  uncertaintyNotes: string[];
  challengedAssumptions: string[];
  nextValidationSteps: string[];
  evidenceCitations: string[];
  scoreDriverSummary: string;
  excludedEvidenceNotes: string[];
  usedLlm: boolean;
}

export interface ScoreExplanation {
  headline: string;
  strongestDrivers: string[];
  weakestDrivers: string[];
  dataQualityBadge: string;
  dataQualitySummary: string;
}

export interface AgentTrace {
  intentSource: string;
  classifier: string;
  classifierConfidence: string;
  classifierReason: string;
  toolsUsed: string[];
  activeLayerCount: number;
  scoredLayerCount: number;
  openDataLayerCount: number;
  syntheticDemoLayerCount: number;
  guardrailsTriggered: number;
}

export interface GapSummary {
  digitalAccess: string;
  aiLiteracy: string;
  infrastructure: string;
  dataQuality: string;
}

export interface SiteAnalysisResult {
  intent: InfrastructureIntent;
  querySummary: string;
  selectedSite: {
    lat: number;
    lng: number;
    label: string;
  };
  suitability: Suitability;
  componentScores: ComponentScores;
  sectors: SectorReadiness[];
  bottlenecks: string[];
  strengths: string[];
  priorityInvestments: string[];
  roadmap: RoadmapItem[];
  planningContext: PlanningContext;
  evidenceSummary: EvidenceSummary;
  scoreDrivers: ScoreDriver[];
  matchedEvidence: MatchedEvidence[];
  excludedSyntheticLayers: ExcludedSyntheticLayer[];
  dataGaps: string[];
  scoreExplanation: ScoreExplanation;
  agentTrace: AgentTrace;
  agentReview: AgentReview;
  confidenceExplanation: string;
  gapSummary: GapSummary;
  recommendedInfrastructurePath: string;
  humanReviewRequired: boolean;
  warnings: string[];
}

export interface ReviewChecklistItem {
  id: string;
  category: string;
  label: string;
  description: string;
  checked: boolean;
  notes: string;
}

export interface EvidenceReviewItem {
  id: string;
  evidenceId: string;
  layerId: string;
  layerLabel: string;
  name: string;
  sourceType: string;
  sourceConfidence: string;
  dataCompleteness: string;
  dataLimitation: string;
  decision: EvidenceDecision;
  notes: string;
}

export interface ReviewerNote {
  id: string;
  author: string;
  note: string;
  createdAt: string;
}

export interface HumanReviewRecord {
  reviewId: string;
  createdAt: string;
  updatedAt: string;
  status: ReviewStatus;
  selectedSite: SiteAnalysisResult["selectedSite"];
  planningFocus: string;
  scenario: string;
  suitabilityScore: number;
  confidence: string;
  evidenceSummary: EvidenceSummary;
  matchedEvidenceIds: string[];
  syntheticDemoEvidenceCount: number;
  reviewerNotes: ReviewerNote[];
  checklistItems: ReviewChecklistItem[];
  evidenceItems: EvidenceReviewItem[];
  requiredValidationSteps: string[];
  sourceDisclosure: string;
  warnings: string[];
  nonGoalWarning: string;
}

export interface ReviewPacket extends HumanReviewRecord {
  generatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface AgentChatContext {
  selectedLocation: SelectedLocation | null;
  analysis: SiteAnalysisResult | null;
  review: HumanReviewRecord | null;
  activeLayers: string[];
  scenario: ScenarioType;
  planningFocus: InfrastructureIntent;
}

export interface CandidateZone {
  id: string;
  label: string;
  lat: number;
  lng: number;
  description: string;
}
