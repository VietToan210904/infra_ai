import type { InfrastructureIntent } from "@/types/site";

export const planningFocusDetails: Record<
  InfrastructureIntent,
  {
    label: string;
    description: string;
    example: string;
  }
> = {
  GENERAL_AI_INFRASTRUCTURE: {
    label: "General AI infrastructure readiness",
    description: "Balanced view across power, connectivity, compute, data, and governance.",
    example: "Can this area support AI infrastructure?",
  },
  DATA_CENTER_FEASIBILITY: {
    label: "Data center feasibility",
    description: "Emphasizes grid, fiber, cooling/water, land, and governance validation.",
    example: "Can we build a data center here?",
  },
  PUBLIC_COMPUTE_HUB: {
    label: "Public AI compute hub",
    description: "Tests shared compute for agencies, schools, healthcare, and nonprofits.",
    example: "Is this a good public compute hub zone?",
  },
  EDGE_AI_NODES: {
    label: "Edge AI nodes",
    description: "Looks for local connectivity, power, service demand, and resilience.",
    example: "Where should we place edge AI nodes?",
  },
  CLOUD_FIRST_STRATEGY: {
    label: "Cloud-first strategy",
    description: "Prioritizes connectivity, governance, data maturity, and digital access.",
    example: "Should we use cloud-first instead of local compute?",
  },
  FIBER_CONNECTIVITY_UPGRADE: {
    label: "Fiber/connectivity upgrade",
    description: "Ranks where connectivity and access upgrades are most needed.",
    example: "Which area needs fiber upgrade first?",
  },
  POWER_GRID_READINESS: {
    label: "Power/grid readiness",
    description: "Focuses on power assets, physical feasibility, resilience, and validation.",
    example: "Is the grid ready for AI infrastructure?",
  },
  CITY_DATA_PLATFORM: {
    label: "City data platform",
    description: "Checks data maturity, governance, access, and sector demand.",
    example: "Can this area support city data platform investment?",
  },
  AI_LITERACY_PROGRAM: {
    label: "AI literacy program",
    description: "Prioritizes training where literacy, access, and equity gaps constrain AI use.",
    example: "What happens if we launch AI literacy training?",
  },
  GOVERNANCE_CYBERSECURITY: {
    label: "Governance/cybersecurity readiness",
    description: "Focuses on policy, privacy, cybersecurity, procurement, and audit controls.",
    example: "Do we need governance first?",
  },
  SECTOR_SPECIFIC_READINESS: {
    label: "Sector-specific readiness",
    description: "Compares readiness for education, workforce, healthcare, government, and nonprofits.",
    example: "Is this area ready for healthcare AI?",
  },
};

export const planningFocusLabels = Object.fromEntries(
  Object.entries(planningFocusDetails).map(([key, value]) => [key, value.label])
) as Record<InfrastructureIntent, string>;

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
