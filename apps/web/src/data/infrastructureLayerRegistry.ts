import type { FeatureCollection, Geometry } from "geojson";

import { DEFAULT_CITY } from "@/data/cityConfig";

export type InfrastructureLayerCategory =
  | "power"
  | "network"
  | "public_service"
  | "innovation_capacity"
  | "land_environment"
  | "transport_logistics"
  | "verification"
  | "risk_land"
  | "ai_analysis";

export type InfrastructureLayerStatus =
  | "available"
  | "needs_data"
  | "planned"
  | "error"
  | "loading";

export type InfrastructureLayerDataType =
  | "point"
  | "line"
  | "polygon"
  | "mixed";

export type InfrastructureLayerSourceType =
  | "open_data"
  | "authoritative"
  | "authoritative_planned"
  | "synthetic"
  | "user_uploaded";

export type InfrastructureLayerId =
  | "power_plants"
  | "wri_power_plants"
  | "substations"
  | "transmission_lines"
  | "telecom_assets"
  | "opencellid_cell_sites"
  | "ookla_fixed_performance"
  | "ookla_mobile_performance"
  | "peeringdb_facilities"
  | "peeringdb_exchanges"
  | "existing_data_centers"
  | "tech_research_facilities"
  | "education_facilities"
  | "healthcare_facilities"
  | "government_facilities"
  | "public_safety_facilities"
  | "industrial_zones"
  | "transport_corridors"
  | "water_context"
  | "aqueduct_water_risk"
  | "grid_capacity_verification"
  | "fiber_capacity_verification"
  | "cooling_feasibility_verification"
  | "zoning_verification"
  | "permitting_status"
  | "construction_readiness"
  | "ai_readiness_assessment"
  | "fiber_corridors"
  | "flood_risk"
  | "heat_risk"
  | "water_availability"
  | "zoning"
  | "protected_land"
  | "population_density"
  | "workforce_readiness"
  | "digital_access_gap"
  | "ai_literacy_gap";

export interface InfrastructureLayerConfig {
  id: InfrastructureLayerId;
  label: string;
  category: InfrastructureLayerCategory;
  dataType: InfrastructureLayerDataType;
  status: InfrastructureLayerStatus;
  source: string;
  sourceType: InfrastructureLayerSourceType;
  sourceConfidence: "low" | "medium" | "high";
  dataCompleteness: "unknown" | "partial" | "good";
  description: string;
  limitation: string;
  geoJsonPath: string;
  visibleByDefault: boolean;
  color: string;
}

export interface InfrastructureLayerRuntimeState {
  status: InfrastructureLayerStatus;
  featureCount?: number;
  message?: string;
}

export interface InfrastructureFeatureProperties {
  osm_id?: string;
  osm_type?: "node" | "way" | "relation" | string;
  name?: string;
  asset_type?: string;
  category?: string;
  source?: string;
  source_type?: InfrastructureLayerSourceType | string;
  source_confidence?: "low" | "medium" | "high" | string;
  data_completeness?: "unknown" | "partial" | "good" | string;
  data_limitation?: string;
  raw_tags?: Record<string, string>;
  [key: string]: unknown;
}

export type InfrastructureFeatureCollection = FeatureCollection<
  Geometry,
  InfrastructureFeatureProperties
>;

const openStreetMapLimitation =
  "OpenStreetMap data may be incomplete or outdated and must be validated before planning or investment decisions.";

const openDataDefaults = {
  source: "OpenStreetMap",
  sourceType: "open_data" as const,
  sourceConfidence: "medium" as const,
  dataCompleteness: "unknown" as const,
  limitation: openStreetMapLimitation,
};

const authoritativeDataNeededDefaults = {
  source: "Requires official/provider data",
  sourceType: "authoritative" as const,
  sourceConfidence: "low" as const,
  dataCompleteness: "unknown" as const,
  status: "needs_data" as const,
  visibleByDefault: false,
};

const externalOpenDataNeededDefaults = {
  sourceType: "open_data" as const,
  sourceConfidence: "medium" as const,
  dataCompleteness: "unknown" as const,
  status: "needs_data" as const,
  visibleByDefault: false,
};

export const infrastructureLayers: InfrastructureLayerConfig[] = [
  {
    id: "power_plants",
    label: "Power plants",
    category: "power",
    dataType: "mixed",
    status: "available",
    description:
      "Mapped electricity generation sites from OpenStreetMap. Useful as an early visual proxy for nearby energy infrastructure.",
    geoJsonPath: `${DEFAULT_CITY.osmPublicPath}/power_plants.geojson`,
    visibleByDefault: true,
    color: "#f97316",
    ...openDataDefaults,
    limitation:
      "Open-data proxy only. Does not verify generation capacity, grid access, interconnection rights, or construction readiness.",
  },
  {
    id: "wri_power_plants",
    label: "Power plants with capacity data",
    category: "power",
    dataType: "point",
    source: "WRI Global Power Plant Database",
    description:
      "Global power-plant records with capacity and fuel context, clipped to the city bbox when the WRI source file is provided.",
    geoJsonPath: `${DEFAULT_CITY.externalPublicPath}/wri_power_plants.geojson`,
    color: "#fdba74",
    ...externalOpenDataNeededDefaults,
    dataCompleteness: "partial",
    limitation:
      "Open-data generation-facility context only. Does not verify grid capacity, substation capacity, interconnection rights, or utility approval.",
  },
  {
    id: "substations",
    label: "Substations",
    category: "power",
    dataType: "mixed",
    status: "available",
    description:
      "Mapped substations from OpenStreetMap. Useful for visual inspection of possible grid-adjacent areas.",
    geoJsonPath: `${DEFAULT_CITY.osmPublicPath}/substations.geojson`,
    visibleByDefault: true,
    color: "#facc15",
    ...openDataDefaults,
    limitation:
      "Open-data proxy only. Does not verify grid capacity, available load, connection feasibility, or utility approval.",
  },
  {
    id: "transmission_lines",
    label: "Transmission lines",
    category: "power",
    dataType: "line",
    status: "available",
    description:
      "Mapped power transmission lines from OpenStreetMap. Useful for early grid-context inspection.",
    geoJsonPath: `${DEFAULT_CITY.osmPublicPath}/transmission_lines.geojson`,
    visibleByDefault: true,
    color: "#fb7185",
    ...openDataDefaults,
    limitation:
      "Open-data proxy only. Does not verify line voltage, spare capacity, right-of-way access, or interconnection feasibility.",
  },
  {
    id: "telecom_assets",
    label: "Telecom assets",
    category: "network",
    dataType: "mixed",
    status: "available",
    description:
      "Mapped telecom masts, communication towers, and telecom-tagged assets from OpenStreetMap.",
    geoJsonPath: `${DEFAULT_CITY.osmPublicPath}/telecom_assets.geojson`,
    visibleByDefault: true,
    color: "#38bdf8",
    ...openDataDefaults,
    limitation:
      "Open-data proxy only. Does not verify fibre availability, bandwidth, latency, redundancy, or service contracts.",
  },
  {
    id: "opencellid_cell_sites",
    label: "Cellular network observations",
    category: "network",
    dataType: "point",
    source: "OpenCelliD",
    description:
      "Community cellular observations from OpenCelliD exports, useful as a network-coverage proxy after a CSV export is provided.",
    geoJsonPath: `${DEFAULT_CITY.externalPublicPath}/opencellid_cell_sites.geojson`,
    color: "#06b6d4",
    ...externalOpenDataNeededDefaults,
    sourceConfidence: "low",
    limitation:
      "Cellular observation proxy only. Does not verify fibre routes, bandwidth, latency, redundancy, coverage guarantees, or service contracts.",
  },
  {
    id: "ookla_fixed_performance",
    label: "Fixed network performance",
    category: "network",
    dataType: "polygon",
    source: "Speedtest by Ookla Open Data",
    description:
      "Aggregate fixed-network speed and latency tiles from Ookla Open Data, clipped to the city bbox after the public ZIP is downloaded.",
    geoJsonPath: `${DEFAULT_CITY.externalPublicPath}/ookla_fixed_performance.geojson`,
    color: "#2563eb",
    ...externalOpenDataNeededDefaults,
    dataCompleteness: "partial",
    limitation:
      "Aggregate observed performance only. Does not verify fibre routes, provider capacity, SLAs, redundancy, or site-level latency.",
  },
  {
    id: "ookla_mobile_performance",
    label: "Mobile network performance",
    category: "network",
    dataType: "polygon",
    source: "Speedtest by Ookla Open Data",
    description:
      "Aggregate mobile-network speed and latency tiles from Ookla Open Data, clipped to the city bbox after the public ZIP is downloaded.",
    geoJsonPath: `${DEFAULT_CITY.externalPublicPath}/ookla_mobile_performance.geojson`,
    color: "#7dd3fc",
    ...externalOpenDataNeededDefaults,
    dataCompleteness: "partial",
    limitation:
      "Aggregate observed performance only. Does not verify fibre routes, provider capacity, SLAs, redundancy, or site-level latency.",
  },
  {
    id: "peeringdb_facilities",
    label: "Interconnection facilities",
    category: "network",
    dataType: "point",
    status: "available",
    source: "PeeringDB",
    sourceType: "open_data",
    sourceConfidence: "medium",
    dataCompleteness: "unknown",
    description:
      "Public PeeringDB facility records clipped to the city bbox. Useful for internet interconnection and data-center ecosystem context.",
    geoJsonPath: `${DEFAULT_CITY.externalPublicPath}/peeringdb_facilities.geojson`,
    visibleByDefault: false,
    color: "#14b8a6",
    limitation:
      "User-maintained interconnection context only. Does not verify fibre capacity, bandwidth, latency, redundancy, contracts, or service availability.",
  },
  {
    id: "peeringdb_exchanges",
    label: "Internet exchanges",
    category: "network",
    dataType: "point",
    status: "available",
    source: "PeeringDB",
    sourceType: "open_data",
    sourceConfidence: "medium",
    dataCompleteness: "unknown",
    description:
      "Public PeeringDB internet exchange records clipped to the city bbox where coordinates are available.",
    geoJsonPath: `${DEFAULT_CITY.externalPublicPath}/peeringdb_exchanges.geojson`,
    visibleByDefault: false,
    color: "#5eead4",
    limitation:
      "User-maintained interconnection context only. Does not verify route diversity, physical fibre access, bandwidth, or latency.",
  },
  {
    id: "existing_data_centers",
    label: "Existing data centers",
    category: "network",
    dataType: "mixed",
    status: "available",
    description:
      "Mapped data-center-like assets from OpenStreetMap where tagged. Useful as a weak open-data signal for existing compute infrastructure.",
    geoJsonPath: `${DEFAULT_CITY.osmPublicPath}/existing_data_centers.geojson`,
    visibleByDefault: true,
    color: "#93c5fd",
    ...openDataDefaults,
    limitation:
      "Open-data proxy only. OSM data-center tags may be sparse, incomplete, or outdated and do not verify capacity, operator, security, or availability.",
  },
  {
    id: "tech_research_facilities",
    label: "Tech and research facilities",
    category: "innovation_capacity",
    dataType: "mixed",
    status: "available",
    description:
      "Mapped research institutes, research offices, and IT-related facilities from OpenStreetMap.",
    geoJsonPath: `${DEFAULT_CITY.osmPublicPath}/tech_research_facilities.geojson`,
    visibleByDefault: true,
    color: "#c084fc",
    ...openDataDefaults,
    limitation:
      "Innovation-capacity proxy only. Does not prove AI workforce depth, research quality, compute access, or institutional readiness.",
  },
  {
    id: "education_facilities",
    label: "Education facilities",
    category: "public_service",
    dataType: "mixed",
    status: "available",
    description:
      "Mapped schools, universities, and colleges from OpenStreetMap. Useful for public-service demand context.",
    geoJsonPath: `${DEFAULT_CITY.osmPublicPath}/education_facilities.geojson`,
    visibleByDefault: true,
    color: "#a78bfa",
    ...openDataDefaults,
    limitation:
      "Demand-context layer only. Does not calculate AI readiness, digital access, adoption capacity, or education program maturity.",
  },
  {
    id: "healthcare_facilities",
    label: "Healthcare facilities",
    category: "public_service",
    dataType: "mixed",
    status: "available",
    description:
      "Mapped hospitals and clinics from OpenStreetMap. Useful for public-service demand context.",
    geoJsonPath: `${DEFAULT_CITY.osmPublicPath}/healthcare_facilities.geojson`,
    visibleByDefault: true,
    color: "#34d399",
    ...openDataDefaults,
    limitation:
      "Demand-context layer only. Does not validate clinical data governance, health-system readiness, or safe healthcare AI use.",
  },
  {
    id: "government_facilities",
    label: "Government facilities",
    category: "public_service",
    dataType: "mixed",
    status: "available",
    description:
      "Mapped government offices and town halls from OpenStreetMap. Useful for civic-service demand context.",
    geoJsonPath: `${DEFAULT_CITY.osmPublicPath}/government_facilities.geojson`,
    visibleByDefault: true,
    color: "#2dd4bf",
    ...openDataDefaults,
    limitation:
      "Demand-context layer only. Does not prove public-sector AI demand, procurement readiness, cybersecurity readiness, or institutional capacity.",
  },
  {
    id: "public_safety_facilities",
    label: "Public safety facilities",
    category: "public_service",
    dataType: "mixed",
    status: "available",
    description:
      "Mapped police and fire stations from OpenStreetMap. Useful for civic operations and resilience context.",
    geoJsonPath: `${DEFAULT_CITY.osmPublicPath}/public_safety_facilities.geojson`,
    visibleByDefault: true,
    color: "#f87171",
    ...openDataDefaults,
    limitation:
      "Public-service context only. Does not validate emergency-service AI readiness, cybersecurity, dispatch systems, or operational capacity.",
  },
  {
    id: "industrial_zones",
    label: "Industrial zones",
    category: "land_environment",
    dataType: "mixed",
    status: "available",
    description:
      "Mapped industrial land and industrial-tagged areas from OpenStreetMap. Useful for early physical-site context.",
    geoJsonPath: `${DEFAULT_CITY.osmPublicPath}/industrial_zones.geojson`,
    visibleByDefault: false,
    color: "#a3a3a3",
    ...openDataDefaults,
    limitation:
      "Land-context proxy only. Does not verify zoning, ownership, land availability, permitting, environmental constraints, or construction readiness.",
  },
  {
    id: "transport_corridors",
    label: "Transport corridors",
    category: "transport_logistics",
    dataType: "line",
    status: "available",
    description:
      "Mapped major roads and rail corridors from OpenStreetMap. Useful for logistics, access, and resilience context.",
    geoJsonPath: `${DEFAULT_CITY.osmPublicPath}/transport_corridors.geojson`,
    visibleByDefault: false,
    color: "#f59e0b",
    ...openDataDefaults,
    limitation:
      "Access-context proxy only. Does not verify right-of-way, construction access, traffic capacity, freight suitability, or logistics agreements.",
  },
  {
    id: "water_context",
    label: "Water context",
    category: "land_environment",
    dataType: "mixed",
    status: "available",
    description:
      "Mapped waterways, reservoirs, and surface-water features from OpenStreetMap. Useful for environmental and cooling-context inspection.",
    geoJsonPath: `${DEFAULT_CITY.osmPublicPath}/water_context.geojson`,
    visibleByDefault: false,
    color: "#22d3ee",
    ...openDataDefaults,
    limitation:
      "Water-context proxy only. Does not verify cooling feasibility, water rights, intake/discharge permits, flood risk, or environmental approval.",
  },
  {
    id: "aqueduct_water_risk",
    label: "Water-risk context",
    category: "land_environment",
    dataType: "polygon",
    source: "WRI Aqueduct",
    description:
      "Future WRI Aqueduct water-risk layer clipped to the city bbox after the source dataset is provided.",
    geoJsonPath: `${DEFAULT_CITY.externalPublicPath}/aqueduct_water_risk.geojson`,
    color: "#0284c7",
    ...externalOpenDataNeededDefaults,
    dataCompleteness: "partial",
    limitation:
      "Water-risk screening context only. Does not grant water rights, cooling rights, discharge approval, or environmental clearance.",
  },
  {
    id: "grid_capacity_verification",
    label: "Verified grid capacity",
    category: "verification",
    dataType: "mixed",
    description:
      "Official or utility-confirmed capacity at substations, feeders, or candidate interconnection points.",
    geoJsonPath: `${DEFAULT_CITY.verificationPublicPath}/grid_capacity_verification.geojson`,
    color: "#fbbf24",
    ...authoritativeDataNeededDefaults,
    limitation:
      "Needs utility or grid-operator data. OSM substations and lines cannot verify available load, voltage, interconnection rights, or approval.",
  },
  {
    id: "fiber_capacity_verification",
    label: "Verified fibre capacity",
    category: "verification",
    dataType: "mixed",
    description:
      "Provider-confirmed fibre routes, points of presence, redundancy, bandwidth, and latency evidence.",
    geoJsonPath: `${DEFAULT_CITY.verificationPublicPath}/fiber_capacity_verification.geojson`,
    color: "#60a5fa",
    ...authoritativeDataNeededDefaults,
    limitation:
      "Needs telecom provider, IXP, or official broadband data. Telecom towers do not verify fibre, bandwidth, latency, or redundancy.",
  },
  {
    id: "cooling_feasibility_verification",
    label: "Cooling feasibility",
    category: "verification",
    dataType: "mixed",
    description:
      "Engineering or authority-backed water, heat, cooling, flood, and environmental feasibility evidence.",
    geoJsonPath: `${DEFAULT_CITY.verificationPublicPath}/cooling_feasibility_verification.geojson`,
    color: "#22d3ee",
    ...authoritativeDataNeededDefaults,
    limitation:
      "Needs hydrology, climate, environmental, and engineering data. Surface water proximity does not verify cooling rights or feasibility.",
  },
  {
    id: "zoning_verification",
    label: "Verified zoning",
    category: "verification",
    dataType: "polygon",
    description:
      "Official zoning, land-use, restricted-area, and protected-land polygons relevant to AI infrastructure siting.",
    geoJsonPath: `${DEFAULT_CITY.verificationPublicPath}/zoning_verification.geojson`,
    color: "#d6d3d1",
    ...authoritativeDataNeededDefaults,
    limitation:
      "Needs official planning or cadastral data. OSM industrial land tags do not verify legal zoning, ownership, or land availability.",
  },
  {
    id: "permitting_status",
    label: "Permitting status",
    category: "verification",
    dataType: "mixed",
    description:
      "Official permit status, environmental review status, consultation status, and required approval evidence.",
    geoJsonPath: `${DEFAULT_CITY.verificationPublicPath}/permitting_status.geojson`,
    color: "#fb7185",
    ...authoritativeDataNeededDefaults,
    limitation:
      "Needs permit portal, agency, or uploaded document evidence. The map cannot infer permit approval from nearby infrastructure.",
  },
  {
    id: "construction_readiness",
    label: "Construction readiness",
    category: "verification",
    dataType: "mixed",
    description:
      "Human-reviewed site packages covering land control, geotechnical review, utilities, access, environmental review, and procurement readiness.",
    geoJsonPath: `${DEFAULT_CITY.verificationPublicPath}/construction_readiness.geojson`,
    color: "#34d399",
    ...authoritativeDataNeededDefaults,
    limitation:
      "Needs engineering, legal, environmental, procurement, and public-review evidence. This app must not infer construction readiness automatically.",
  },
  {
    id: "ai_readiness_assessment",
    label: "AI readiness assessment",
    category: "verification",
    dataType: "polygon",
    description:
      "Human-reviewed or official readiness assessments for workforce, digital access, data governance, cybersecurity, and public-sector adoption capacity.",
    geoJsonPath: `${DEFAULT_CITY.verificationPublicPath}/ai_readiness_assessment.geojson`,
    color: "#c084fc",
    ...authoritativeDataNeededDefaults,
    limitation:
      "Needs survey, governance, workforce, cybersecurity, and institutional evidence. No AI readiness score is calculated from OSM data.",
  },
  {
    id: "fiber_corridors",
    label: "Fibre corridors",
    category: "network",
    dataType: "line",
    status: "planned",
    source: "Future data integration",
    sourceType: "authoritative_planned",
    sourceConfidence: "low",
    dataCompleteness: "unknown",
    description: "Planned future layer for authoritative or licensed fibre data.",
    limitation: "Not available in this build.",
    geoJsonPath: "",
    visibleByDefault: false,
    color: "#60a5fa",
  },
  {
    id: "flood_risk",
    label: "Flood risk",
    category: "risk_land",
    dataType: "polygon",
    status: "planned",
    source: "Future data integration",
    sourceType: "authoritative_planned",
    sourceConfidence: "low",
    dataCompleteness: "unknown",
    description: "Planned future environmental-risk layer.",
    limitation: "Not available in this build.",
    geoJsonPath: "",
    visibleByDefault: false,
    color: "#0ea5e9",
  },
  {
    id: "heat_risk",
    label: "Heat risk",
    category: "risk_land",
    dataType: "polygon",
    status: "planned",
    source: "Future data integration",
    sourceType: "authoritative_planned",
    sourceConfidence: "low",
    dataCompleteness: "unknown",
    description: "Planned future heat-exposure layer.",
    limitation: "Not available in this build.",
    geoJsonPath: "",
    visibleByDefault: false,
    color: "#f97316",
  },
  {
    id: "water_availability",
    label: "Water availability",
    category: "risk_land",
    dataType: "polygon",
    status: "planned",
    source: "Future data integration",
    sourceType: "authoritative_planned",
    sourceConfidence: "low",
    dataCompleteness: "unknown",
    description: "Planned future water and cooling feasibility layer.",
    limitation: "Not available in this build.",
    geoJsonPath: "",
    visibleByDefault: false,
    color: "#22d3ee",
  },
  {
    id: "zoning",
    label: "Land zoning",
    category: "risk_land",
    dataType: "polygon",
    status: "planned",
    source: "Future data integration",
    sourceType: "authoritative_planned",
    sourceConfidence: "low",
    dataCompleteness: "unknown",
    description: "Planned future zoning and land-use layer.",
    limitation: "Not available in this build.",
    geoJsonPath: "",
    visibleByDefault: false,
    color: "#d6d3d1",
  },
  {
    id: "protected_land",
    label: "Protected land",
    category: "risk_land",
    dataType: "polygon",
    status: "planned",
    source: "Future data integration",
    sourceType: "authoritative_planned",
    sourceConfidence: "low",
    dataCompleteness: "unknown",
    description: "Planned future protected-land layer.",
    limitation: "Not available in this build.",
    geoJsonPath: "",
    visibleByDefault: false,
    color: "#84cc16",
  },
  {
    id: "population_density",
    label: "Population density",
    category: "ai_analysis",
    dataType: "polygon",
    status: "planned",
    source: "Future data integration",
    sourceType: "authoritative_planned",
    sourceConfidence: "low",
    dataCompleteness: "unknown",
    description: "Planned future demographic context layer.",
    limitation: "Not available in this build.",
    geoJsonPath: "",
    visibleByDefault: false,
    color: "#f472b6",
  },
  {
    id: "workforce_readiness",
    label: "Workforce readiness",
    category: "ai_analysis",
    dataType: "polygon",
    status: "planned",
    source: "Future data integration",
    sourceType: "authoritative_planned",
    sourceConfidence: "low",
    dataCompleteness: "unknown",
    description: "Planned future workforce-capacity layer.",
    limitation: "Not available in this build. No AI readiness scoring is calculated yet.",
    geoJsonPath: "",
    visibleByDefault: false,
    color: "#c084fc",
  },
  {
    id: "digital_access_gap",
    label: "Digital access gap",
    category: "ai_analysis",
    dataType: "polygon",
    status: "planned",
    source: "Future data integration",
    sourceType: "authoritative_planned",
    sourceConfidence: "low",
    dataCompleteness: "unknown",
    description: "Planned future digital inclusion layer.",
    limitation: "Not available in this build. No AI readiness scoring is calculated yet.",
    geoJsonPath: "",
    visibleByDefault: false,
    color: "#818cf8",
  },
  {
    id: "ai_literacy_gap",
    label: "AI literacy gap",
    category: "ai_analysis",
    dataType: "polygon",
    status: "planned",
    source: "Future data integration",
    sourceType: "authoritative_planned",
    sourceConfidence: "low",
    dataCompleteness: "unknown",
    description: "Planned future AI-literacy layer.",
    limitation: "Not available in this build. No AI readiness scoring is calculated yet.",
    geoJsonPath: "",
    visibleByDefault: false,
    color: "#f0abfc",
  },
];

export const availableInfrastructureLayers = infrastructureLayers.filter(
  (layer) => layer.status === "available"
);

export const plannedInfrastructureLayers = infrastructureLayers.filter(
  (layer) => layer.status === "planned"
);

export const defaultVisibleInfrastructureLayerIds = availableInfrastructureLayers
  .filter((layer) => layer.visibleByDefault)
  .map((layer) => layer.id);

export const infrastructureLayersById = infrastructureLayers.reduce(
  (accumulator, layer) => {
    accumulator[layer.id] = layer;
    return accumulator;
  },
  {} as Record<InfrastructureLayerId, InfrastructureLayerConfig>
);

export const infrastructureCategoryLabels: Record<
  InfrastructureLayerCategory,
  string
> = {
  power: "Power Infrastructure",
  network: "Network Infrastructure",
  public_service: "Public-Service Infrastructure",
  innovation_capacity: "Innovation and Human Capacity",
  land_environment: "Land, Water, and Environmental Context",
  transport_logistics: "Transport and Logistics Context",
  verification: "Verification Data Requirements",
  risk_land: "Future Risk and Land Layers",
  ai_analysis: "Future AI Analysis Layers",
};
