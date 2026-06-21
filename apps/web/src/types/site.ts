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
  excludedSyntheticLayers: string[];
  explanation: string;
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
  evidenceSummary: EvidenceSummary;
  scoreDrivers: ScoreDriver[];
  matchedEvidence: MatchedEvidence[];
  excludedSyntheticLayers: ExcludedSyntheticLayer[];
  dataGaps: string[];
  agentReview: AgentReview;
  confidenceExplanation: string;
  gapSummary: GapSummary;
  recommendedInfrastructurePath: string;
  humanReviewRequired: boolean;
  warnings: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface AgentChatContext {
  selectedLocation: SelectedLocation | null;
  analysis: SiteAnalysisResult | null;
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
