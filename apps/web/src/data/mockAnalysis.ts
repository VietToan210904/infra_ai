import { normalizeInfrastructureIntent, planningFocusDetails } from "@/data/planningOptions";
import type {
  AnalyzeSitePayload,
  ComponentScores,
  InfrastructureIntent,
  PlanningContext,
  ScenarioType,
  SiteAnalysisResult,
} from "@/types/site";

const nonGoalWarning =
  "InfraAI SiteCompass does not approve construction, issue permits, allocate public funding, guarantee grid capacity, or replace engineering, environmental, cybersecurity, or community review.";

const baseComponentScores: ComponentScores = {
  power: 68,
  connectivity: 82,
  coolingWater: 58,
  physicalFeasibility: 72,
  computeEcosystem: 75,
  sectorDemand: 84,
  governance: 66,
  digitalAccess: 68,
  aiLiteracy: 56,
  dataMaturity: 62,
  equity: 60,
  resilience: 64,
  dataCompleteness: 54,
  dataFreshness: 58,
  sourceReliability: 57,
  geographicResolution: 66,
};

const clampScore = (score: number) => Math.round(Math.max(0, Math.min(100, score)));

const componentLabels: Record<string, string> = {
  power: "Power and grid context",
  connectivity: "Connectivity and interconnection",
  coolingWater: "Cooling and water context",
  physicalFeasibility: "Land, logistics, and physical feasibility",
  computeEcosystem: "Compute and innovation ecosystem",
  sectorDemand: "Civic sector demand",
  governance: "Governance readiness proxy",
  digitalAccess: "Digital access proxy",
  aiLiteracy: "AI literacy proxy",
  dataMaturity: "Data maturity proxy",
  equity: "Equity and access proxy",
  resilience: "Resilience and public safety proxy",
  dataCompleteness: "Data completeness",
  dataFreshness: "Data freshness",
  sourceReliability: "Source reliability",
  geographicResolution: "Geographic resolution",
  confidence: "Data confidence",
  sectorAverage: "Average civic sector readiness",
  governanceRisk: "Healthcare/government risk gap",
  confidenceGap: "Confidence improvement need",
};

const scenarioDeltas: Record<
  ScenarioType,
  Partial<Record<keyof ComponentScores, number>>
> = {
  BUILD_NOW: {},
  UPGRADE_FIBER_FIRST: { connectivity: 8, digitalAccess: 10, resilience: 4 },
  VALIDATE_GRID_FIRST: { power: 10, dataCompleteness: 8, sourceReliability: 8 },
  AI_LITERACY_TRAINING: { aiLiteracy: 14, sectorDemand: 3, equity: 3 },
  CLOUD_FIRST: {
    coolingWater: 8,
    physicalFeasibility: 5,
    dataMaturity: 4,
    computeEcosystem: -4,
  },
  DELAY_INVESTMENT: { dataFreshness: -12, sectorDemand: -4, resilience: -3 },
  GOVERNANCE_FIRST: { governance: 12, dataMaturity: 8, sourceReliability: 5 },
  EDGE_PILOT_FIRST: {
    resilience: 10,
    connectivity: 4,
    sectorDemand: 5,
    physicalFeasibility: 2,
  },
  OPEN_DATA_PLATFORM_FIRST: { dataMaturity: 12, governance: 6, digitalAccess: 4 },
};

const scenarioMetadata: Record<
  ScenarioType,
  { label: string; description: string; caveat: string }
> = {
  BUILD_NOW: {
    label: "Build now",
    description: "Baseline view using the selected evidence set without assumed intervention.",
    caveat: "This is a current-planning baseline, not a forecast.",
  },
  UPGRADE_FIBER_FIRST: {
    label: "Upgrade fiber first",
    description: "Assumes near-term fiber and digital access improvements before larger AI investment.",
    caveat: "Directional simulation only; it does not verify provider capacity or cost.",
  },
  VALIDATE_GRID_FIRST: {
    label: "Validate grid capacity first",
    description: "Assumes utility validation improves power evidence and source reliability.",
    caveat: "Directional simulation only; it does not guarantee available load.",
  },
  AI_LITERACY_TRAINING: {
    label: "Launch AI literacy training",
    description: "Assumes training improves human readiness, sector adoption, and equity.",
    caveat: "Directional simulation only; actual outcomes depend on program design.",
  },
  CLOUD_FIRST: {
    label: "Cloud-first instead of local infrastructure",
    description: "Assumes cloud-first delivery reduces local cooling and physical burden.",
    caveat: "Cloud-first still depends on connectivity, governance, and procurement readiness.",
  },
  DELAY_INVESTMENT: {
    label: "Delay investment",
    description: "Assumes delayed action reduces data freshness, demand momentum, and resilience.",
    caveat: "Directional simulation only; it is not a forecast.",
  },
  GOVERNANCE_FIRST: {
    label: "Governance first",
    description: "Assumes governance, data maturity, and source reliability improve before scale-up.",
    caveat: "Policy implementation must be validated.",
  },
  EDGE_PILOT_FIRST: {
    label: "Edge pilot first",
    description: "Assumes small edge pilots improve resilience and local service readiness.",
    caveat: "Hardware siting and operations still need review.",
  },
  OPEN_DATA_PLATFORM_FIRST: {
    label: "Open data platform first",
    description: "Assumes data platform work improves data maturity, governance, and access.",
    caveat: "Data-sharing agreements and stewardship still need validation.",
  },
};

function classifyReadinessLevel(score: number) {
  if (score >= 80) return "Strong readiness";
  if (score >= 65) return "Moderate readiness";
  if (score >= 50) return "Early readiness";
  return "Low readiness";
}

function weightedScore(
  scores: ComponentScores,
  weights: Partial<Record<keyof ComponentScores, number>>
) {
  return clampScore(
    Object.entries(weights).reduce(
      (total, [key, weight]) =>
        total + scores[key as keyof ComponentScores] * (weight ?? 0),
      0
    )
  );
}

function calculateInfrastructureReadiness(scores: ComponentScores) {
  return weightedScore(scores, {
    power: 0.25,
    connectivity: 0.2,
    computeEcosystem: 0.15,
    coolingWater: 0.15,
    physicalFeasibility: 0.1,
    dataMaturity: 0.1,
    governance: 0.05,
  });
}

function calculateConfidence(scores: ComponentScores) {
  const score = weightedScore(scores, {
    dataCompleteness: 0.4,
    dataFreshness: 0.25,
    sourceReliability: 0.2,
    geographicResolution: 0.15,
  });
  const level = score >= 75 ? "High" : score >= 50 ? "Medium" : "Low";
  return {
    score,
    level,
    explanation: `Confidence is ${level.toLowerCase()} because data completeness is ${scores.dataCompleteness}/100, freshness is ${scores.dataFreshness}/100, source reliability is ${scores.sourceReliability}/100, and geographic resolution is ${scores.geographicResolution}/100. Open-data and synthetic/demo layers may contribute to the planning score but do not verify feasibility.`,
  } as const;
}

function calculateSectorReadiness(scores: ComponentScores) {
  const infrastructure = calculateInfrastructureReadiness(scores);
  const sectorInputs = [
    {
      name: "Education",
      useCaseFeasibility:
        (scores.aiLiteracy + scores.digitalAccess + scores.dataMaturity) / 3,
      mainGap: "AI literacy, classroom safeguards, and school connectivity.",
      suggestedUseCases: [
        "Teacher planning support",
        "Student services chatbot",
        "Skills analytics",
      ],
    },
    {
      name: "Workforce",
      useCaseFeasibility:
        (scores.aiLiteracy + scores.sectorDemand + scores.digitalAccess) / 3,
      mainGap: "Worker training pathways and SME digital adoption.",
      suggestedUseCases: [
        "Job matching",
        "Training recommendations",
        "SME productivity support",
      ],
    },
    {
      name: "Healthcare",
      useCaseFeasibility:
        scores.governance * 0.45 +
        scores.dataMaturity * 0.35 +
        scores.connectivity * 0.2,
      mainGap: "Privacy, governance, and administrative-only guardrails.",
      suggestedUseCases: [
        "Appointment routing",
        "Inventory forecasting",
        "Admin summarization",
      ],
    },
    {
      name: "Government",
      useCaseFeasibility:
        scores.governance * 0.4 +
        scores.dataMaturity * 0.35 +
        scores.connectivity * 0.25,
      mainGap: "Cross-agency governance, auditability, and data sharing.",
      suggestedUseCases: [
        "Permit triage",
        "Policy document search",
        "Service knowledge assistant",
      ],
    },
    {
      name: "Nonprofits",
      useCaseFeasibility:
        (scores.digitalAccess + scores.equity + scores.aiLiteracy) / 3,
      mainGap: "Shared service access, digital capacity, and inclusion.",
      suggestedUseCases: [
        "Grant discovery",
        "Service referral assistant",
        "Volunteer coordination",
      ],
    },
  ];

  return sectorInputs.map((sector) => {
    const score = clampScore(
      infrastructure * 0.25 +
        scores.digitalAccess * 0.2 +
        scores.dataMaturity * 0.2 +
        scores.aiLiteracy * 0.15 +
        scores.governance * 0.1 +
        sector.useCaseFeasibility * 0.1
    );
    return {
      name: sector.name,
      level: classifyReadinessLevel(score),
      score,
      mainGap: sector.mainGap,
      suggestedUseCases: sector.suggestedUseCases,
    };
  });
}

function applyScenarioAdjustments(
  scenario: ScenarioType,
  scores: ComponentScores
): ComponentScores {
  const adjusted = { ...scores };
  Object.entries(scenarioDeltas[scenario]).forEach(([key, delta]) => {
    adjusted[key as keyof ComponentScores] = clampScore(
      adjusted[key as keyof ComponentScores] + (delta ?? 0)
    );
  });

  return adjusted;
}

function calculateIntentSpecificScore(
  intent: InfrastructureIntent,
  scores: ComponentScores,
  sectorAverage: number
) {
  const confidence = calculateConfidence(scores).score;

  if (intent === "DATA_CENTER_FEASIBILITY") {
    return weightedScore(scores, {
      power: 0.3,
      connectivity: 0.2,
      coolingWater: 0.2,
      physicalFeasibility: 0.15,
      computeEcosystem: 0.1,
      governance: 0.05,
    });
  }
  if (intent === "EDGE_AI_NODES") {
    return weightedScore(scores, {
      connectivity: 0.25,
      power: 0.2,
      sectorDemand: 0.2,
      physicalFeasibility: 0.15,
      computeEcosystem: 0.1,
      resilience: 0.1,
    });
  }
  if (intent === "PUBLIC_COMPUTE_HUB") {
    return weightedScore(scores, {
      connectivity: 0.25,
      power: 0.2,
      sectorDemand: 0.2,
      computeEcosystem: 0.15,
      governance: 0.1,
      physicalFeasibility: 0.1,
    });
  }
  if (intent === "CLOUD_FIRST_STRATEGY") {
    return clampScore(
      scores.connectivity * 0.3 +
        scores.governance * 0.2 +
        scores.dataMaturity * 0.2 +
        sectorAverage * 0.15 +
        scores.digitalAccess * 0.15
    );
  }
  if (intent === "FIBER_CONNECTIVITY_UPGRADE") {
    return clampScore(
      (100 - scores.digitalAccess) * 0.35 +
        scores.sectorDemand * 0.25 +
        (100 - scores.connectivity) * 0.2 +
        (100 - scores.equity) * 0.1 +
        (100 - scores.resilience) * 0.1
    );
  }
  if (intent === "AI_LITERACY_PROGRAM") {
    return clampScore(
      (100 - scores.aiLiteracy) * 0.35 +
        scores.sectorDemand * 0.25 +
        (100 - scores.digitalAccess) * 0.2 +
        (100 - scores.equity) * 0.1 +
        scores.physicalFeasibility * 0.1
    );
  }
  if (intent === "GOVERNANCE_CYBERSECURITY") {
    return clampScore(
      (100 - scores.governance) * 0.3 +
        (100 - scores.dataMaturity) * 0.25 +
        (100 - Math.min(scores.governance, scores.dataMaturity)) * 0.2 +
        scores.sectorDemand * 0.15 +
        (100 - confidence) * 0.1
    );
  }
  if (intent === "POWER_GRID_READINESS") {
    return clampScore(
      scores.power * 0.35 +
        scores.physicalFeasibility * 0.2 +
        scores.computeEcosystem * 0.15 +
        scores.resilience * 0.15 +
        confidence * 0.1 +
        scores.governance * 0.05
    );
  }
  if (intent === "CITY_DATA_PLATFORM") {
    return weightedScore(scores, {
      dataMaturity: 0.3,
      governance: 0.2,
      digitalAccess: 0.2,
      sectorDemand: 0.15,
      aiLiteracy: 0.15,
    });
  }
  if (intent === "SECTOR_SPECIFIC_READINESS") {
    return sectorAverage;
  }
  return calculateInfrastructureReadiness(scores);
}

function detectBottlenecks(scores: ComponentScores) {
  const checks: Array<[string, number]> = [
    ["Power/grid capacity needs utility validation.", scores.power],
    ["Connectivity or fiber redundancy is not strong enough.", scores.connectivity],
    ["Cooling and water feasibility require engineering review.", scores.coolingWater],
    ["Digital access gaps may limit equitable AI service delivery.", scores.digitalAccess],
    ["AI literacy is not yet strong enough for broad deployment.", scores.aiLiteracy],
    ["Data maturity is a constraint for high-impact AI systems.", scores.dataMaturity],
    ["Governance and cybersecurity controls need strengthening.", scores.governance],
  ];
  const bottlenecks = checks
    .filter(([, score]) => score < 65)
    .map(([label]) => label);
  return bottlenecks.length
    ? bottlenecks
    : ["No single component is below the moderate-readiness threshold."];
}

function recommendationForIntent(
  intent: InfrastructureIntent,
  score: number,
  scores: ComponentScores
): string {
  if (intent === "DATA_CENTER_FEASIBILITY") {
    if (scores.power >= 70 && scores.coolingWater >= 65 && score >= 65) {
      return "Proceed only to formal data center feasibility review. Grid, cooling, water, land, and permitting evidence must be validated before any construction decision.";
    }
    return "Do not treat this as ready for immediate data center construction. Use it as a pre-feasibility candidate until grid capacity and cooling/water constraints are validated.";
  }

  const defaultRecommendation =
    "Use this as an open-ended AI infrastructure planning candidate, not an approval decision. Sequence investments around the weakest readiness gaps.";
  const recommendations: Record<InfrastructureIntent, string> = {
    GENERAL_AI_INFRASTRUCTURE:
      defaultRecommendation,
    DATA_CENTER_FEASIBILITY:
      "Use formal feasibility review only after grid, cooling, water, land, and permitting evidence is validated.",
    PUBLIC_COMPUTE_HUB:
      "Suitable for a phased public AI compute hub if grid validation, shared governance, and agency onboarding are handled first.",
    EDGE_AI_NODES:
      "Prioritize small edge AI pilots where connectivity, power, and public-service demand overlap, then expand after reliability checks.",
    CLOUD_FIRST_STRATEGY:
      "Use a cloud-first path for near-term services, while improving governance, data maturity, and connectivity for resilient delivery.",
    FIBER_CONNECTIVITY_UPGRADE:
      "Treat fiber and digital access upgrades as a priority where access gaps constrain sector readiness and equity.",
    POWER_GRID_READINESS:
      "Run utility-led grid validation before committing to local compute or data center scale infrastructure.",
    CITY_DATA_PLATFORM:
      "Invest first in city data platform foundations: data sharing, cataloging, access controls, auditability, and stewardship.",
    AI_LITERACY_PROGRAM:
      "Launch AI literacy and workforce training before broad deployment of high-impact AI systems.",
    GOVERNANCE_CYBERSECURITY:
      "Put governance, cybersecurity, procurement, privacy, and audit controls first before scaling sensitive AI use cases.",
    SECTOR_SPECIFIC_READINESS:
      "Use sector-specific pilots, beginning with low-risk administrative workflows and expanding only after governance and data controls improve.",
  };
  return recommendations[intent] ?? defaultRecommendation;
}

function rankPriorityInvestments(
  intent: InfrastructureIntent,
  scores: ComponentScores
) {
  const priorities: Array<[string, number]> = [
    ["Grid capacity validation", 100 - scores.power],
    [
      "Fiber redundancy and digital access upgrades",
      Math.max(100 - scores.connectivity, 100 - scores.digitalAccess),
    ],
    ["Cooling and water feasibility study", 100 - scores.coolingWater],
    [
      "AI literacy training for public agencies and schools",
      100 - scores.aiLiteracy,
    ],
    [
      "City data governance and cybersecurity framework",
      Math.max(100 - scores.governance, 100 - scores.dataMaturity),
    ],
    ["Equity-focused access program for underserved communities", 100 - scores.equity],
  ];
  const boostByIntent: Partial<Record<InfrastructureIntent, string>> = {
    DATA_CENTER_FEASIBILITY: "Grid capacity validation",
    EDGE_AI_NODES: "Fiber redundancy and digital access upgrades",
    FIBER_CONNECTIVITY_UPGRADE: "Fiber redundancy and digital access upgrades",
    AI_LITERACY_PROGRAM: "AI literacy training for public agencies and schools",
    GOVERNANCE_CYBERSECURITY:
      "City data governance and cybersecurity framework",
    CITY_DATA_PLATFORM: "City data governance and cybersecurity framework",
    POWER_GRID_READINESS: "Grid capacity validation",
  };
  const boosted = boostByIntent[intent];
  return priorities
    .map(([name, gap]) => [name, gap + (name === boosted ? 25 : 0)] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);
}

function buildWarnings(
  intent: InfrastructureIntent,
  scores: ComponentScores,
  confidenceScore: number
) {
  const warnings: string[] = [];
  if (confidenceScore < 40) {
    warnings.push(
      "Insufficient data. The system should not be used for planning decisions until more reliable data is available."
    );
  }
  if (intent === "DATA_CENTER_FEASIBILITY" && scores.power < 60) {
    warnings.push(
      "Do not recommend immediate data center construction. Grid capacity validation is required."
    );
  }
  if (intent === "DATA_CENTER_FEASIBILITY" && scores.coolingWater < 50) {
    warnings.push(
      "Do not recommend immediate data center construction. Cooling and water feasibility review is required."
    );
  }
  if (scores.aiLiteracy < 50) {
    warnings.push(
      "AI literacy training should happen before city-wide AI deployment."
    );
  }
  if (scores.dataMaturity < 50) {
    warnings.push(
      "Data governance and data maturity improvements are required before high-impact AI deployment."
    );
  }
  warnings.push(nonGoalWarning);
  warnings.push(
    "Open-data and synthetic/demo layers may be included in the planning score, but they cannot prove AI infrastructure feasibility."
  );
  return warnings;
}

function gapText(label: string, score: number) {
  if (score >= 75) return `${label} gap is limited in this demo profile at ${score}/100.`;
  if (score >= 60) return `${label} gap is moderate and should be targeted before scale-up (${score}/100).`;
  return `${label} gap is material and should be addressed before broad deployment (${score}/100).`;
}

function recommendedPath(
  intent: InfrastructureIntent,
  scores: ComponentScores,
  score: number
) {
  if (
    intent === "DATA_CENTER_FEASIBILITY" &&
    (scores.power < 60 || scores.coolingWater < 50)
  ) {
    return "Cloud-first and public compute hub pilots before any data center review.";
  }
  if (intent === "FIBER_CONNECTIVITY_UPGRADE") {
    return "Fiber upgrade priority path with district-level digital access targeting.";
  }
  if (intent === "AI_LITERACY_PROGRAM") {
    return "AI literacy and workforce readiness path before broad AI deployment.";
  }
  if (score >= 75) {
    return "Phased local AI infrastructure path with formal validation gates.";
  }
  return "Pre-feasibility path focused on data, governance, grid, and access upgrades.";
}

function buildAgentReview(scores: ComponentScores, activeLayers: string[]) {
  const syntheticLayerCount = activeLayers.filter(
    (layer) =>
      layer.includes("verification") ||
      layer.includes("risk") ||
      layer.includes("readiness") ||
      layer.includes("gap") ||
      layer.includes("zoning")
  ).length;
  const reliability =
    scores.dataCompleteness >= 75 && scores.sourceReliability >= 75
      ? "High"
      : scores.dataCompleteness >= 50 && scores.sourceReliability >= 50
        ? "Medium"
        : "Low";

  return {
    summary: `Agent review: the score has ${reliability.toLowerCase()} reliability for early planning. Use it to compare investment priorities, not to prove site feasibility.`,
    scoreReliability: reliability,
    evidenceStrengths: [
      `${activeLayers.length} visible overlay(s) were included as the selected evidence set.`,
      "The report combines infrastructure, sector readiness, scenario, and guardrail signals.",
      "The score is deterministic and can be audited against component weights.",
    ],
    evidenceGaps: [
      "Open-data layers may be incomplete or outdated.",
      syntheticLayerCount
        ? `${syntheticLayerCount} visible synthetic/demo layer(s) were included in the fallback planning score.`
        : "No synthetic/demo layer was selected in the fallback profile.",
      "Utility, land, environmental, cybersecurity, and community validation are still required.",
    ],
    uncertaintyNotes: [
      "The report supports early planning and prioritization only.",
      "Synthetic/demo and open-data layers can guide planning, but they cannot prove AI infrastructure feasibility.",
    ],
    challengedAssumptions: [
      "Visible layers are assumed to be the selected evidence set.",
      "Layer presence contributes to the planning score, but is not proof of capacity.",
      "Scenario improvements are directional estimates.",
    ],
    nextValidationSteps: [
      "Validate grid capacity, fiber, water, land, and permitting with responsible agencies.",
      "Validate or replace synthetic/demo assumptions with authoritative datasets.",
      "Run sector workshops before scaling AI deployments.",
    ],
    evidenceCitations: [
      "Offline fallback: no live backend evidence engine was available.",
    ],
    scoreDriverSummary:
      "Offline fallback uses deterministic mock score drivers until the backend evidence engine is available.",
    excludedEvidenceNotes: [
      "Synthetic/demo fallback layers are included in the planning score and must be validated before real decisions.",
    ],
    usedLlm: false,
  };
}

type FormulaDefinition = {
  component: string;
  weightPercent: number;
  direction: "readiness" | "gap" | "priority" | "context";
  explanation: string;
};

type MockScoreDriver = Omit<
  SiteAnalysisResult["scoreDrivers"][number],
  | "includedInFocusScore"
  | "formulaWeight"
  | "scenarioAdjustment"
  | "focusSpecificExplanation"
>;

const formulaDefinitions: Record<InfrastructureIntent, FormulaDefinition[]> = {
  GENERAL_AI_INFRASTRUCTURE: [
    { component: "power", weightPercent: 25, direction: "readiness", explanation: "Power is the largest general infrastructure driver." },
    { component: "connectivity", weightPercent: 20, direction: "readiness", explanation: "Connectivity supports cloud, local compute, and civic AI services." },
    { component: "computeEcosystem", weightPercent: 15, direction: "readiness", explanation: "Compute ecosystem supports partners, talent, and operations." },
    { component: "coolingWater", weightPercent: 15, direction: "readiness", explanation: "Cooling and water context matters for local compute options." },
    { component: "physicalFeasibility", weightPercent: 10, direction: "readiness", explanation: "Physical feasibility constrains deployment paths." },
    { component: "dataMaturity", weightPercent: 10, direction: "readiness", explanation: "Data maturity affects responsible AI service delivery." },
    { component: "governance", weightPercent: 5, direction: "readiness", explanation: "Governance provides controls for safe AI adoption." },
  ],
  DATA_CENTER_FEASIBILITY: [
    { component: "power", weightPercent: 30, direction: "readiness", explanation: "Grid context is the largest data center feasibility driver." },
    { component: "connectivity", weightPercent: 20, direction: "readiness", explanation: "Fiber and interconnection context support workload access." },
    { component: "coolingWater", weightPercent: 20, direction: "readiness", explanation: "Cooling and water feasibility must be validated." },
    { component: "physicalFeasibility", weightPercent: 15, direction: "readiness", explanation: "Land, zoning, logistics, and construction context matter." },
    { component: "computeEcosystem", weightPercent: 10, direction: "readiness", explanation: "Existing ecosystem helps operations and suppliers." },
    { component: "governance", weightPercent: 5, direction: "readiness", explanation: "Governance is a necessary control gate." },
  ],
  PUBLIC_COMPUTE_HUB: [
    { component: "connectivity", weightPercent: 25, direction: "readiness", explanation: "Shared compute needs reliable access." },
    { component: "power", weightPercent: 20, direction: "readiness", explanation: "Power constrains compute scale." },
    { component: "sectorDemand", weightPercent: 20, direction: "readiness", explanation: "Public-sector demand is central to a shared hub." },
    { component: "computeEcosystem", weightPercent: 15, direction: "readiness", explanation: "Ecosystem proximity supports operations." },
    { component: "governance", weightPercent: 10, direction: "readiness", explanation: "Governance controls shared access and cybersecurity." },
    { component: "physicalFeasibility", weightPercent: 10, direction: "readiness", explanation: "Physical feasibility affects where a hub can operate." },
  ],
  EDGE_AI_NODES: [
    { component: "connectivity", weightPercent: 25, direction: "readiness", explanation: "Edge nodes depend on connectivity and low-latency routes." },
    { component: "power", weightPercent: 20, direction: "readiness", explanation: "Small nodes still need local power." },
    { component: "sectorDemand", weightPercent: 20, direction: "readiness", explanation: "Public-service demand indicates useful pilot locations." },
    { component: "physicalFeasibility", weightPercent: 15, direction: "readiness", explanation: "Deployment feasibility affects node placement." },
    { component: "computeEcosystem", weightPercent: 10, direction: "readiness", explanation: "Ecosystem helps operations and maintenance." },
    { component: "resilience", weightPercent: 10, direction: "readiness", explanation: "Resilience matters for local services." },
  ],
  CLOUD_FIRST_STRATEGY: [
    { component: "connectivity", weightPercent: 30, direction: "readiness", explanation: "Cloud-first depends most on connectivity." },
    { component: "governance", weightPercent: 20, direction: "readiness", explanation: "Cloud use requires privacy, procurement, and cybersecurity controls." },
    { component: "dataMaturity", weightPercent: 20, direction: "readiness", explanation: "Data maturity enables safe AI service use." },
    { component: "sectorAverage", weightPercent: 15, direction: "readiness", explanation: "Sector readiness shows likely cloud adoption capacity." },
    { component: "digitalAccess", weightPercent: 15, direction: "readiness", explanation: "Digital access determines who can benefit." },
  ],
  FIBER_CONNECTIVITY_UPGRADE: [
    { component: "digitalAccess", weightPercent: 35, direction: "gap", explanation: "Digital access gaps drive upgrade priority." },
    { component: "sectorDemand", weightPercent: 25, direction: "readiness", explanation: "High demand increases upgrade value." },
    { component: "connectivity", weightPercent: 20, direction: "gap", explanation: "Weak current connectivity raises priority." },
    { component: "equity", weightPercent: 10, direction: "gap", explanation: "Equity gaps raise access-investment priority." },
    { component: "resilience", weightPercent: 10, direction: "gap", explanation: "Resilience gaps increase the value of redundancy." },
  ],
  POWER_GRID_READINESS: [
    { component: "power", weightPercent: 35, direction: "readiness", explanation: "Power context is the primary grid readiness driver." },
    { component: "physicalFeasibility", weightPercent: 20, direction: "readiness", explanation: "Land and logistics affect grid-related delivery options." },
    { component: "computeEcosystem", weightPercent: 15, direction: "readiness", explanation: "Existing compute ecosystem indicates demand and support." },
    { component: "resilience", weightPercent: 15, direction: "readiness", explanation: "Resilience matters for reliable operations." },
    { component: "confidence", weightPercent: 10, direction: "readiness", explanation: "Confidence reflects data quality." },
    { component: "governance", weightPercent: 5, direction: "readiness", explanation: "Governance supports validation and sequencing." },
  ],
  CITY_DATA_PLATFORM: [
    { component: "dataMaturity", weightPercent: 30, direction: "readiness", explanation: "Data maturity is the core platform driver." },
    { component: "governance", weightPercent: 20, direction: "readiness", explanation: "Governance controls sharing, privacy, and ownership." },
    { component: "digitalAccess", weightPercent: 20, direction: "readiness", explanation: "Digital access affects who can use services." },
    { component: "sectorDemand", weightPercent: 15, direction: "readiness", explanation: "Sector demand shows public value." },
    { component: "aiLiteracy", weightPercent: 15, direction: "readiness", explanation: "AI literacy affects adoption and safe use." },
  ],
  AI_LITERACY_PROGRAM: [
    { component: "aiLiteracy", weightPercent: 35, direction: "gap", explanation: "AI literacy gaps drive training priority." },
    { component: "sectorDemand", weightPercent: 25, direction: "readiness", explanation: "High sector demand increases training value." },
    { component: "digitalAccess", weightPercent: 20, direction: "gap", explanation: "Digital access gaps constrain training benefit." },
    { component: "equity", weightPercent: 10, direction: "gap", explanation: "Equity gaps raise the need for inclusive programs." },
    { component: "physicalFeasibility", weightPercent: 10, direction: "readiness", explanation: "Implementation feasibility affects rollout." },
  ],
  GOVERNANCE_CYBERSECURITY: [
    { component: "governance", weightPercent: 30, direction: "gap", explanation: "Governance gaps drive policy and cybersecurity priority." },
    { component: "dataMaturity", weightPercent: 25, direction: "gap", explanation: "Data maturity gaps increase risk-management needs." },
    { component: "governanceRisk", weightPercent: 20, direction: "gap", explanation: "Healthcare/government risk rises when controls are weak." },
    { component: "sectorDemand", weightPercent: 15, direction: "readiness", explanation: "High demand increases governance urgency." },
    { component: "confidenceGap", weightPercent: 10, direction: "gap", explanation: "Weak evidence confidence raises validation need." },
  ],
  SECTOR_SPECIFIC_READINESS: [
    { component: "sectorAverage", weightPercent: 100, direction: "readiness", explanation: "Score is the average readiness across the five civic sectors." },
  ],
};

const focusEvidenceNeeds: Record<InfrastructureIntent, string[]> = {
  GENERAL_AI_INFRASTRUCTURE: ["Power, connectivity, compute ecosystem, cooling/water, data maturity, and governance evidence."],
  DATA_CENTER_FEASIBILITY: ["Utility-confirmed grid capacity, fiber redundancy, cooling/water, land, zoning, and permitting evidence."],
  PUBLIC_COMPUTE_HUB: ["Power, connectivity, public-sector demand, governance, and operating-model evidence."],
  EDGE_AI_NODES: ["Local telecom, power, public-service demand, physical deployment, and resilience evidence."],
  CLOUD_FIRST_STRATEGY: ["Connectivity, digital access, governance, procurement, data maturity, and sector-readiness evidence."],
  FIBER_CONNECTIVITY_UPGRADE: ["Telecom assets, performance, access gaps, equity, resilience, and sector-demand evidence."],
  POWER_GRID_READINESS: ["Substations, transmission, generation context, utility capacity, and resilience evidence."],
  CITY_DATA_PLATFORM: ["Data maturity, governance, digital access, AI literacy, and agency participation evidence."],
  AI_LITERACY_PROGRAM: ["Education, workforce, digital access, equity, and training delivery evidence."],
  GOVERNANCE_CYBERSECURITY: ["Governance, privacy, cybersecurity, procurement, audit, and high-impact sector risk evidence."],
  SECTOR_SPECIFIC_READINESS: ["Education, workforce, healthcare, government, nonprofit, and access/readiness evidence."],
};

const focusWarnings: Record<InfrastructureIntent, string[]> = {
  GENERAL_AI_INFRASTRUCTURE: ["This is a broad planning score, not a construction feasibility score."],
  DATA_CENTER_FEASIBILITY: ["AI literacy and sector demand are context only for this data center score."],
  PUBLIC_COMPUTE_HUB: ["A public compute hub requires access governance and agency onboarding."],
  EDGE_AI_NODES: ["Edge nodes should start as small pilots until siting and network SLAs are validated."],
  CLOUD_FIRST_STRATEGY: ["Cloud-first reduces local facility burden but still depends on governance and connectivity."],
  FIBER_CONNECTIVITY_UPGRADE: ["Higher score means higher upgrade priority, not stronger readiness."],
  POWER_GRID_READINESS: ["Open-data grid assets do not prove available load or interconnection rights."],
  CITY_DATA_PLATFORM: ["A data platform is an operating and governance investment, not only software."],
  AI_LITERACY_PROGRAM: ["Higher score means higher training priority."],
  GOVERNANCE_CYBERSECURITY: ["Higher score means higher governance and cybersecurity priority."],
  SECTOR_SPECIFIC_READINESS: ["Healthcare AI should remain low-risk/admin-only until governance is validated."],
};

function buildMockPlanningContext(
  intent: InfrastructureIntent,
  scenario: ScenarioType,
  beforeScores: ComponentScores,
  afterScores: ComponentScores,
  sectorAverage: number,
  confidenceScore: number
): PlanningContext {
  const formula = formulaDefinitions[intent].map((term) => {
    const rawScore = rawTermScore(term.component, afterScores, sectorAverage, confidenceScore);
    const termScore = term.direction === "gap" ? 100 - rawScore : rawScore;
    return {
      component: term.component,
      label: componentLabels[term.component],
      weightPercent: term.weightPercent,
      score: clampScore(termScore),
      contribution: Number((termScore * (term.weightPercent / 100)).toFixed(1)),
      direction: term.direction,
      explanation: term.explanation,
    };
  });

  const scenarioInfo = scenarioMetadata[scenario];
  return {
    focusLabel: planningFocusDetails[intent].label,
    focusQuestion: planningFocusDetails[intent].example,
    scenarioLabel: scenarioInfo.label,
    scenarioDescription: scenarioInfo.description,
    scoreFormula: formula,
    relevantComponents: formulaDefinitions[intent].map((term) => term.component),
    scenarioImpacts: Object.entries(scenarioDeltas[scenario] ?? {}).map(([component, delta]) => ({
      component,
      label: componentLabels[component],
      beforeScore: beforeScores[component as keyof ComponentScores],
      afterScore: afterScores[component as keyof ComponentScores],
      delta: delta ?? 0,
      explanation:
        (delta ?? 0) >= 0
          ? `The scenario assumes an improvement to ${componentLabels[component].toLowerCase()}.`
          : `The scenario assumes a reduction to ${componentLabels[component].toLowerCase()}.`,
    })),
    focusSpecificEvidenceNeeds: focusEvidenceNeeds[intent],
    focusSpecificWarnings: [...focusWarnings[intent], scenarioInfo.caveat],
  };
}

function rawTermScore(
  component: string,
  scores: ComponentScores,
  sectorAverage: number,
  confidenceScore: number
) {
  if (component === "sectorAverage") return sectorAverage;
  if (component === "confidence") return confidenceScore;
  if (component === "governanceRisk") {
    return Math.min(scores.governance, scores.dataMaturity);
  }
  if (component === "confidenceGap") return confidenceScore;
  return scores[component as keyof ComponentScores];
}

function annotateMockScoreDrivers(
  drivers: MockScoreDriver[],
  planningContext: PlanningContext,
  beforeScores: ComponentScores,
  afterScores: ComponentScores
) {
  const weights = Object.fromEntries(
    planningContext.scoreFormula.map((term) => [term.component, term.weightPercent])
  );
  const fieldByLabel = Object.fromEntries(
    Object.entries(componentLabels).map(([field, label]) => [label, field])
  );
  return drivers.map((driver) => {
    const field = fieldByLabel[driver.component] as keyof ComponentScores | undefined;
    const weight = field ? weights[field] : undefined;
    const scenarioAdjustment = field ? afterScores[field] - beforeScores[field] : 0;
    return {
      ...driver,
      includedInFocusScore: typeof weight === "number",
      formulaWeight: typeof weight === "number" ? weight : null,
      scenarioAdjustment,
      focusSpecificExplanation:
        typeof weight === "number"
          ? `Used in the ${planningContext.focusLabel} score at ${weight}% weight.`
          : driver.evidenceCount === 0
            ? "Evidence gap or context-only component for the selected planning focus."
            : `Context only for ${planningContext.focusLabel}; it does not change the selected score.`,
    };
  });
}

function buildMockEvidence(activeLayers: string[], scores: ComponentScores) {
  const syntheticLayers = activeLayers.filter(
    (layer) =>
      layer.includes("synthetic") ||
      layer.includes("verification") ||
      layer.includes("risk") ||
      layer.includes("gap") ||
      layer.includes("zoning") ||
      layer.includes("fiber_corridors")
  );
  const realLayers = activeLayers.filter((layer) => !syntheticLayers.includes(layer));
  const relevantPowerLayers = activeLayers.filter(
    (layer) =>
      layer.includes("power") ||
      layer.includes("substation") ||
      layer.includes("transmission") ||
      layer.includes("grid")
  );
  const relevantConnectivityLayers = activeLayers.filter(
    (layer) =>
      layer.includes("telecom") ||
      layer.includes("peering") ||
      layer.includes("fiber") ||
      layer.includes("ookla") ||
      layer.includes("cell")
  );
  return {
    evidenceSummary: {
      activeLayerCount: activeLayers.length,
      scoredLayerCount: activeLayers.length,
      realOpenLayerCount: realLayers.length,
      syntheticLayerCount: syntheticLayers.length,
      matchedFeatureCount: activeLayers.length,
      nearestEvidenceKm: null,
      summary:
        `Offline fallback evidence is not proximity-calculated. ${activeLayers.length} visible layer(s) are included in the planning score: ${realLayers.length} open-data layer(s) and ${syntheticLayers.length} synthetic/demo layer(s). Run the FastAPI backend for local GeoJSON evidence matching.`,
      confidenceImpact:
        "Low reliability in frontend fallback mode; backend evidence analysis is required before decisions.",
    },
    scoreDrivers: [
      {
        component: "Power and grid context",
        score: scores.power,
        evidenceCount: 0,
        nearestEvidenceKm: null,
        supportingLayers: relevantPowerLayers,
        openDataSupportingLayers: relevantPowerLayers.filter(
          (layer) => !syntheticLayers.includes(layer)
        ),
        syntheticSupportingLayers: relevantPowerLayers.filter((layer) =>
          syntheticLayers.includes(layer)
        ),
        excludedSyntheticLayers: [],
        explanation:
          "Frontend fallback includes visible power/grid layers in the planning score but does not calculate nearest assets. Use backend evidence mode for proximity-based score drivers.",
      },
      {
        component: "Connectivity and interconnection",
        score: scores.connectivity,
        evidenceCount: 0,
        nearestEvidenceKm: null,
        supportingLayers: relevantConnectivityLayers,
        openDataSupportingLayers: relevantConnectivityLayers.filter(
          (layer) => !syntheticLayers.includes(layer)
        ),
        syntheticSupportingLayers: relevantConnectivityLayers.filter((layer) =>
          syntheticLayers.includes(layer)
        ),
        excludedSyntheticLayers: [],
        explanation:
          "Frontend fallback includes visible connectivity layers in the planning score but does not calculate fibre or interconnection proximity.",
      },
    ],
    matchedEvidence: [],
    excludedSyntheticLayers: [],
    dataGaps: [
      "Backend evidence engine is unavailable in frontend fallback mode.",
      syntheticLayers.length
        ? `${syntheticLayers.length} synthetic/demo layer(s) are included in the fallback score and need validation.`
        : "No synthetic/demo layer was selected in fallback mode.",
      "Authoritative utility, telecom, zoning, permitting, and survey datasets are still required.",
    ],
  };
}

export function buildMockAnalysis(
  payload: AnalyzeSitePayload
): SiteAnalysisResult {
  const intent = normalizeInfrastructureIntent(
    payload.intent ?? payload.infrastructureIntent ?? payload.infrastructureType
  );
  const beforeScores = baseComponentScores;
  const scores = applyScenarioAdjustments(payload.scenario, beforeScores);
  const sectors = calculateSectorReadiness(scores);
  const sectorAverage = clampScore(
    sectors.reduce((total, sector) => total + sector.score, 0) / sectors.length
  );
  const confidence = calculateConfidence(scores);
  const score = calculateIntentSpecificScore(intent, scores, sectorAverage);
  const evidence = buildMockEvidence(payload.activeLayers, scores);
  const planningContext = buildMockPlanningContext(
    intent,
    payload.scenario,
    beforeScores,
    scores,
    sectorAverage,
    confidence.score
  );
  const scoreDrivers = annotateMockScoreDrivers(
    evidence.scoreDrivers,
    planningContext,
    beforeScores,
    scores
  );

  return {
    intent,
    querySummary: payload.userQuestion
      ? `Planning question classified as ${intent}: ${payload.userQuestion}`
      : `Planning focus classified as ${intent}.`,
    selectedSite: {
      lat: payload.lat,
      lng: payload.lng,
      label: "Candidate AI Infrastructure Site",
    },
    suitability: {
      score,
      level: classifyReadinessLevel(score),
      confidence: confidence.level,
      recommendation: recommendationForIntent(intent, score, scores),
    },
    componentScores: scores,
    sectors,
    bottlenecks: detectBottlenecks(scores),
    strengths: [
      "Strong urban connectivity and proximity to public-sector users.",
      "Good fit for shared AI planning across government, education, workforce, healthcare, and nonprofits.",
      "Open-data and synthetic/demo layers support the planning score but still require validation.",
    ],
    priorityInvestments: rankPriorityInvestments(intent, scores),
    roadmap: [
      {
        horizon: "0-6 months",
        actions: [
          "Validate grid, fiber, water, and land assumptions with responsible agencies.",
          "Publish a data-quality register that separates open data, synthetic/demo assumptions, and verified evidence.",
          "Define governance, cybersecurity, privacy, and procurement rules for AI pilots.",
        ],
      },
      {
        horizon: "6-18 months",
        actions: [
          "Upgrade the weakest readiness components identified in the scorecard.",
          "Launch low-risk AI pilots across civic sectors.",
          "Measure digital access and AI literacy gaps before expanding services.",
        ],
      },
      {
        horizon: "18-36 months",
        actions: [
          "Scale resilient AI infrastructure only after verified grid, cooling, governance, and community review.",
          "Refresh readiness scores with authoritative utility, land, environmental, and sector datasets.",
          "Update the city AI roadmap annually with public accountability metrics.",
        ],
      },
    ],
    planningContext,
    ...evidence,
    scoreDrivers,
    agentReview: buildAgentReview(scores, payload.activeLayers),
    confidenceExplanation: confidence.explanation,
    gapSummary: {
      digitalAccess: gapText("Digital access", scores.digitalAccess),
      aiLiteracy: gapText("AI literacy", scores.aiLiteracy),
      infrastructure: `Infrastructure gap is driven by power ${scores.power}/100, connectivity ${scores.connectivity}/100, and cooling/water ${scores.coolingWater}/100.`,
      dataQuality: `Data quality is partial: completeness ${scores.dataCompleteness}/100, freshness ${scores.dataFreshness}/100, reliability ${scores.sourceReliability}/100, and resolution ${scores.geographicResolution}/100.`,
    },
    recommendedInfrastructurePath: recommendedPath(intent, scores, score),
    humanReviewRequired: true,
    warnings: buildWarnings(intent, scores, confidence.score),
  };
}
