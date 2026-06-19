import type { FeatureCollection, Geometry } from "geojson";
import type { CandidateZone, LayerKey } from "@/types/site";

export const SAIGON_CENTER = {
  lat: 10.7769,
  lng: 106.7009,
};

export const SAIGON_BOUNDS: [[number, number], [number, number]] = [
  [106.35, 10.45],
  [107.1, 11.1],
];

export const candidateZones: CandidateZone[] = [
  {
    id: "shtp-thu-duc",
    label: "Saigon Hi-Tech Park / Thu Duc",
    lat: 10.8493,
    lng: 106.802,
    description: "Innovation corridor with compute ecosystem adjacency.",
  },
  {
    id: "thu-thiem-d2",
    label: "Thu Thiem / District 2 area",
    lat: 10.7817,
    lng: 106.7308,
    description: "Civic and commercial expansion area near the urban core.",
  },
  {
    id: "tan-thuan-d7",
    label: "Tan Thuan / District 7 area",
    lat: 10.7411,
    lng: 106.7188,
    description: "Business park and logistics-adjacent candidate zone.",
  },
  {
    id: "district-1-core",
    label: "District 1 civic core",
    lat: 10.7769,
    lng: 106.7009,
    description: "Central public-sector demand concentration.",
  },
];

export type SyntheticFeatureProperties = {
  name: string;
  readinessScore: number;
  confidence: "Low" | "Medium" | "High";
  layerType: LayerKey;
};

export type SyntheticFeatureCollection = FeatureCollection<
  Geometry,
  SyntheticFeatureProperties
>;

export const educationReadinessGeoJson: SyntheticFeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        name: "Synthetic Education Cluster A",
        readinessScore: 72,
        confidence: "Medium",
        layerType: "education",
      },
      geometry: {
        type: "Point",
        coordinates: [106.7001, 10.7798],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Synthetic Thu Duc Learning Node",
        readinessScore: 81,
        confidence: "Medium",
        layerType: "education",
      },
      geometry: {
        type: "Point",
        coordinates: [106.806, 10.8486],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Synthetic District 7 Skills Cluster",
        readinessScore: 68,
        confidence: "Medium",
        layerType: "education",
      },
      geometry: {
        type: "Point",
        coordinates: [106.7215, 10.7384],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Synthetic Binh Thanh Workforce Campus",
        readinessScore: 75,
        confidence: "Low",
        layerType: "education",
      },
      geometry: {
        type: "Point",
        coordinates: [106.714, 10.804],
      },
    },
  ],
};

export const healthcareReadinessGeoJson: SyntheticFeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        name: "Synthetic Healthcare Operations Hub",
        readinessScore: 66,
        confidence: "Medium",
        layerType: "healthcare",
      },
      geometry: {
        type: "Point",
        coordinates: [106.6913, 10.758],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Synthetic District 2 Care Network",
        readinessScore: 64,
        confidence: "Low",
        layerType: "healthcare",
      },
      geometry: {
        type: "Point",
        coordinates: [106.7334, 10.783],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Synthetic Thu Duc Clinical Admin Node",
        readinessScore: 70,
        confidence: "Medium",
        layerType: "healthcare",
      },
      geometry: {
        type: "Point",
        coordinates: [106.7898, 10.8654],
      },
    },
  ],
};

export const governmentReadinessGeoJson: SyntheticFeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        name: "Synthetic Civic Services Core",
        readinessScore: 83,
        confidence: "Medium",
        layerType: "government",
      },
      geometry: {
        type: "Point",
        coordinates: [106.7009, 10.7769],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Synthetic Thu Duc Public Services Node",
        readinessScore: 74,
        confidence: "Medium",
        layerType: "government",
      },
      geometry: {
        type: "Point",
        coordinates: [106.7619, 10.8527],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Synthetic South Saigon Admin Node",
        readinessScore: 69,
        confidence: "Low",
        layerType: "government",
      },
      geometry: {
        type: "Point",
        coordinates: [106.7164, 10.7425],
      },
    },
  ],
};

export const readinessZonesGeoJson: SyntheticFeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        name: "Synthetic Central Services Readiness Zone",
        readinessScore: 79,
        confidence: "Medium",
        layerType: "overall_readiness",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [106.674, 10.752],
            [106.72, 10.752],
            [106.735, 10.795],
            [106.688, 10.812],
            [106.662, 10.785],
            [106.674, 10.752],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Synthetic Thu Duc Innovation Readiness Zone",
        readinessScore: 82,
        confidence: "Medium",
        layerType: "overall_readiness",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [106.765, 10.814],
            [106.833, 10.818],
            [106.855, 10.878],
            [106.807, 10.899],
            [106.754, 10.872],
            [106.765, 10.814],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Synthetic South Saigon Upgrade Zone",
        readinessScore: 67,
        confidence: "Low",
        layerType: "overall_readiness",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [106.69, 10.705],
            [106.742, 10.708],
            [106.756, 10.753],
            [106.708, 10.767],
            [106.676, 10.742],
            [106.69, 10.705],
          ],
        ],
      },
    },
  ],
};

export const syntheticLayerData: Record<LayerKey, SyntheticFeatureCollection> = {
  education: educationReadinessGeoJson,
  healthcare: healthcareReadinessGeoJson,
  government: governmentReadinessGeoJson,
  overall_readiness: readinessZonesGeoJson,
};
