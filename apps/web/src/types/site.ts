export type InfrastructureType =
  | "PUBLIC_AI_COMPUTE_HUB"
  | "REGIONAL_AI_DATA_CENTER";

export type ScenarioType =
  | "BUILD_NOW"
  | "UPGRADE_FIBER_FIRST"
  | "VALIDATE_GRID_FIRST"
  | "AI_LITERACY_TRAINING"
  | "CLOUD_FIRST"
  | "DELAY_INVESTMENT";

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
  infrastructureType: InfrastructureType;
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

export interface SiteAnalysisResult {
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
  humanReviewRequired: boolean;
  warnings: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface CandidateZone {
  id: string;
  label: string;
  lat: number;
  lng: number;
  description: string;
}
