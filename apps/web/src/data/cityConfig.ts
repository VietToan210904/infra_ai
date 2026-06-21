export interface CityBoundingBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface CityConfig {
  id: string;
  label: string;
  shortLabel: string;
  center: {
    lat: number;
    lng: number;
  };
  bbox: CityBoundingBox;
  bounds: [[number, number], [number, number]];
  osmPublicPath: string;
  externalPublicPath: string;
  verificationPublicPath: string;
}

export const cityConfigs: Record<string, CityConfig> = {
  hcmc: {
    id: "hcmc",
    label: "Ho Chi Minh City / Saigon",
    shortLabel: "HCMC",
    center: {
      lat: 10.7769,
      lng: 106.7009,
    },
    bbox: {
      south: 10.35,
      west: 106.35,
      north: 11.2,
      east: 107.1,
    },
    bounds: [
      [106.35, 10.35],
      [107.1, 11.2],
    ],
    osmPublicPath: "/data/osm/hcmc",
    externalPublicPath: "/data/external/hcmc",
    verificationPublicPath: "/data/verification/hcmc",
  },
};

export const DEFAULT_CITY = cityConfigs.hcmc;
