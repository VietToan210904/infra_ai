import type { InfrastructureIntent } from "@/types/site";

export const planningFocusLabels: Record<InfrastructureIntent, string> = {
  GENERAL_AI_INFRASTRUCTURE: "General AI infrastructure readiness",
  DATA_CENTER_FEASIBILITY: "Data center feasibility",
  PUBLIC_COMPUTE_HUB: "Public AI compute hub",
  EDGE_AI_NODES: "Edge AI nodes",
  CLOUD_FIRST_STRATEGY: "Cloud-first strategy",
  FIBER_CONNECTIVITY_UPGRADE: "Fiber/connectivity upgrade",
  POWER_GRID_READINESS: "Power/grid readiness",
  CITY_DATA_PLATFORM: "City data platform",
  AI_LITERACY_PROGRAM: "AI literacy program",
  GOVERNANCE_CYBERSECURITY: "Governance/cybersecurity readiness",
  SECTOR_SPECIFIC_READINESS: "Sector-specific readiness",
};

export const planningFocusOptions = Object.entries(planningFocusLabels) as Array<
  [InfrastructureIntent, string]
>;

export function normalizeInfrastructureIntent(
  value: string | undefined
): InfrastructureIntent {
  if (value === "PUBLIC_AI_COMPUTE_HUB") {
    return "PUBLIC_COMPUTE_HUB";
  }
  if (value === "REGIONAL_AI_DATA_CENTER") {
    return "DATA_CENTER_FEASIBILITY";
  }
  if (value && value in planningFocusLabels) {
    return value as InfrastructureIntent;
  }
  return "GENERAL_AI_INFRASTRUCTURE";
}

