import type { InfrastructureFeatureCollection } from "@/data/infrastructureLayerRegistry";

export async function loadGeoJsonLayer(
  path: string
): Promise<InfrastructureFeatureCollection> {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Unable to load ${path}: ${response.status}`);
  }

  const payload = (await response.json()) as Partial<InfrastructureFeatureCollection>;

  if (payload.type !== "FeatureCollection" || !Array.isArray(payload.features)) {
    throw new Error(`Invalid GeoJSON FeatureCollection at ${path}`);
  }

  return payload as InfrastructureFeatureCollection;
}
