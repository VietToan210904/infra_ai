import { useEffect, useMemo, useRef, useState } from "react";
import L, { type GeoJSON as LeafletGeoJSON, type LatLngBoundsExpression } from "leaflet";
import { Crosshair, Info, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { DEFAULT_CITY } from "@/data/cityConfig";
import {
  availableInfrastructureLayers,
  type InfrastructureFeatureCollection,
  type InfrastructureFeatureProperties,
  type InfrastructureLayerConfig,
  type InfrastructureLayerId,
  type InfrastructureLayerRuntimeState,
} from "@/data/infrastructureLayerRegistry";
import { loadGeoJsonLayer } from "@/lib/loadGeoJsonLayer";
import type { SelectedLocation } from "@/types/site";

interface MapPanelProps {
  selectedLocation: SelectedLocation | null;
  activeInfrastructureLayerIds: InfrastructureLayerId[];
  onInfrastructureLayerStateChange: (
    layerId: InfrastructureLayerId,
    state: InfrastructureLayerRuntimeState
  ) => void;
  onLocationSelect: (location: SelectedLocation) => void;
}

type BasemapKey = "satellite" | "streets";

const cityBounds: LatLngBoundsExpression = [
  [DEFAULT_CITY.bbox.south, DEFAULT_CITY.bbox.west],
  [DEFAULT_CITY.bbox.north, DEFAULT_CITY.bbox.east],
];

const satelliteTiles = {
  url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  attribution:
    "Tiles © Esri, Maxar, Earthstar Geographics, and the GIS User Community",
};

const streetTiles = {
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: "© OpenStreetMap contributors",
};

export function MapPanel({
  selectedLocation,
  activeInfrastructureLayerIds,
  onInfrastructureLayerStateChange,
  onLocationSelect,
}: MapPanelProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const geoJsonLayerRefs = useRef(
    new Map<InfrastructureLayerId, LeafletGeoJSON>()
  );
  const loadedCollectionsRef = useRef(
    new Map<InfrastructureLayerId, InfrastructureFeatureCollection>()
  );
  const loadingLayerIdsRef = useRef(new Set<InfrastructureLayerId>());
  const activeLayerIdsRef = useRef(activeInfrastructureLayerIds);
  const onLayerStateChangeRef = useRef(onInfrastructureLayerStateChange);
  const [mapReady, setMapReady] = useState(false);
  const [basemap, setBasemap] = useState<BasemapKey>("satellite");
  const [showBasemapNote, setShowBasemapNote] = useState(true);

  const selectedCoordinateText = useMemo(() => {
    if (!selectedLocation) {
      return "Awaiting site selection";
    }

    return `${selectedLocation.lat.toFixed(5)}, ${selectedLocation.lng.toFixed(5)}`;
  }, [selectedLocation]);

  useEffect(() => {
    activeLayerIdsRef.current = activeInfrastructureLayerIds;
  }, [activeInfrastructureLayerIds]);

  useEffect(() => {
    onLayerStateChangeRef.current = onInfrastructureLayerStateChange;
  }, [onInfrastructureLayerStateChange]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(mapContainerRef.current, {
      center: [DEFAULT_CITY.center.lat, DEFAULT_CITY.center.lng],
      zoom: 11,
      minZoom: 9,
      maxZoom: 19,
      maxBounds: cityBounds,
      maxBoundsViscosity: 0.85,
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
    });

    baseLayerRef.current = createTileLayer(basemap).addTo(map);
    map.fitBounds(cityBounds, { padding: [20, 20] });

    map.on("click", (event) => {
      onLocationSelect({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
        label: "Candidate AI Infrastructure Site",
      });
    });

    mapRef.current = map;
    const geoJsonLayerMap = geoJsonLayerRefs.current;
    setMapReady(true);

    return () => {
      geoJsonLayerMap.forEach((layer) => layer.remove());
      geoJsonLayerMap.clear();
      markerRef.current?.remove();
      markerRef.current = null;
      baseLayerRef.current?.remove();
      baseLayerRef.current = null;
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [basemap, onLocationSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    baseLayerRef.current?.remove();
    baseLayerRef.current = createTileLayer(basemap).addTo(map);
  }, [basemap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }

    availableInfrastructureLayers.forEach((layerConfig) => {
      const isActive = activeInfrastructureLayerIds.includes(layerConfig.id);
      const existingLayer = geoJsonLayerRefs.current.get(layerConfig.id);

      if (!isActive) {
        existingLayer?.remove();
        return;
      }

      if (existingLayer) {
        if (!map.hasLayer(existingLayer)) {
          existingLayer.addTo(map);
        }
        return;
      }

      const cachedCollection = loadedCollectionsRef.current.get(layerConfig.id);
      if (cachedCollection) {
        addInfrastructureGeoJsonLayer(map, layerConfig, cachedCollection);
        return;
      }

      void loadInfrastructureLayer(map, layerConfig);
    });
    // loadInfrastructureLayer only closes over stable refs and helpers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeInfrastructureLayerIds, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }

    if (!selectedLocation) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    const latLng: L.LatLngExpression = [
      selectedLocation.lat,
      selectedLocation.lng,
    ];

    if (!markerRef.current) {
      markerRef.current = L.marker(latLng).addTo(map);
    } else {
      markerRef.current.setLatLng(latLng);
    }

    markerRef.current.bindPopup("Candidate AI Infrastructure Site");
    map.flyTo(latLng, Math.max(map.getZoom(), 12), { duration: 0.65 });
  }, [mapReady, selectedLocation]);

  async function loadInfrastructureLayer(
    map: L.Map,
    layerConfig: InfrastructureLayerConfig
  ) {
    if (loadingLayerIdsRef.current.has(layerConfig.id)) {
      return;
    }

    loadingLayerIdsRef.current.add(layerConfig.id);
    onLayerStateChangeRef.current(layerConfig.id, { status: "loading" });

    try {
      const collection = await loadGeoJsonLayer(layerConfig.geoJsonPath);
      loadedCollectionsRef.current.set(layerConfig.id, collection);
      addInfrastructureGeoJsonLayer(map, layerConfig, collection);
      onLayerStateChangeRef.current(layerConfig.id, {
        status: "available",
        featureCount: collection.features.length,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? `${error.message}. Run the matching ingestion script and copy the GeoJSON files into apps/web/public/data.`
          : "Unable to load GeoJSON layer.";

      onLayerStateChangeRef.current(layerConfig.id, {
        status: "error",
        message,
      });
    } finally {
      loadingLayerIdsRef.current.delete(layerConfig.id);
    }
  }

  function addInfrastructureGeoJsonLayer(
    map: L.Map,
    layerConfig: InfrastructureLayerConfig,
    collection: InfrastructureFeatureCollection
  ) {
    const geoJsonLayer = L.geoJSON(collection, {
      pointToLayer: (_feature, latLng) =>
        L.circleMarker(latLng, {
          radius: 6,
          color: "#f8fafc",
          weight: 1.2,
          fillColor: layerConfig.color,
          fillOpacity: 0.88,
        }),
      style: (feature) => {
        const geometryType = feature?.geometry?.type;

        if (geometryType?.includes("Polygon")) {
          return {
            color: layerConfig.color,
            weight: 1.8,
            opacity: 0.9,
            fillColor: layerConfig.color,
            fillOpacity: 0.18,
          };
        }

        return {
          color: layerConfig.color,
          weight: layerConfig.id === "transmission_lines" ? 2.4 : 1.8,
          opacity: 0.92,
        };
      },
      onEachFeature: (feature, leafletLayer) => {
        leafletLayer.on("click", (event) => {
          L.DomEvent.stopPropagation(event);
        });
        leafletLayer.bindPopup(
          renderInfrastructurePopupHtml(
            feature.properties as InfrastructureFeatureProperties
          ),
          { maxWidth: 360 }
        );
      },
    }).addTo(map);

    geoJsonLayerRefs.current.set(layerConfig.id, geoJsonLayer);

    if (!activeLayerIdsRef.current.includes(layerConfig.id)) {
      geoJsonLayer.remove();
    }
  }

  return (
    <div className="relative h-[560px] min-h-[500px] overflow-hidden rounded-xl border bg-background/60 lg:h-[calc(100vh-360px)] lg:min-h-[560px] lg:max-h-[760px]">
      <div ref={mapContainerRef} className="h-full w-full" />

      {!mapReady && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/35">
          <div className="rounded-xl border bg-background/90 px-4 py-3 text-sm text-muted-foreground shadow-panel backdrop-blur">
            Loading satellite map...
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute left-4 top-4 z-[500] flex flex-wrap gap-2">
        <Badge variant="secondary">{DEFAULT_CITY.label}</Badge>
        <Badge variant="outline">
          {basemap === "satellite" ? "Esri satellite imagery" : "OpenStreetMap streets"}
        </Badge>
        <Badge variant="outline">OpenStreetMap layers</Badge>
        <Badge variant="outline">
          {activeInfrastructureLayerIds.length} visible overlays
        </Badge>
      </div>

      <div className="absolute left-4 top-14 z-[500] flex rounded-lg border bg-background/90 p-1 shadow-panel backdrop-blur">
        {(["satellite", "streets"] as BasemapKey[]).map((option) => (
          <button
            key={option}
            type="button"
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              basemap === option
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
            onClick={() => {
              setBasemap(option);
              setShowBasemapNote(true);
            }}
          >
            {option === "satellite" ? "Satellite" : "Streets"}
          </button>
        ))}
      </div>

      {showBasemapNote && (
        <div className="absolute right-4 top-4 z-[500] max-w-[320px] rounded-xl border bg-background/92 p-3 text-xs leading-relaxed text-muted-foreground shadow-panel backdrop-blur">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <p>
              No Mapbox account or card is required. Satellite uses public Esri
              imagery; Streets uses OpenStreetMap tiles.
            </p>
            <button
              type="button"
              className="ml-1 rounded-md p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              onClick={() => setShowBasemapNote(false)}
              aria-label="Dismiss basemap note"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-[500] max-w-[330px] rounded-xl border bg-background/90 p-3 shadow-panel backdrop-blur">
        <div className="flex items-start gap-2">
          <Crosshair className="mt-0.5 h-4 w-4 text-primary" />
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Selected coordinates
            </p>
            <p className="mt-1 text-sm font-semibold">
              {selectedCoordinateText}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Click the map or choose a candidate site to move the marker.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function createTileLayer(basemap: BasemapKey) {
  const tiles = basemap === "satellite" ? satelliteTiles : streetTiles;

  return L.tileLayer(tiles.url, {
    attribution: tiles.attribution,
    maxZoom: 19,
    crossOrigin: true,
  });
}

function renderInfrastructurePopupHtml(
  properties: InfrastructureFeatureProperties
) {
  const limitation =
    properties.data_limitation ??
    "OpenStreetMap data may be incomplete or outdated and must be validated before planning or investment decisions.";
  const sourceId =
    properties.osm_id ??
    properties.source_id ??
    properties.peeringdb_id ??
    "Unknown";

  return `
    <div class="space-y-2">
      <strong>${escapeHtml(properties.name || "Unnamed asset")}</strong>
      <div>Asset type: ${escapeHtml(properties.asset_type || "Unknown")}</div>
      <div>Category: ${escapeHtml(properties.category || "Infrastructure")}</div>
      <div>Source: ${escapeHtml(properties.source || "OpenStreetMap")}</div>
      <div>Confidence: ${escapeHtml(formatMetadataLabel(properties.source_confidence || "medium"))}</div>
      <div>Completeness: ${escapeHtml(formatMetadataLabel(properties.data_completeness || "unknown"))}</div>
      <div>Source ID: ${escapeHtml(String(sourceId))}</div>
      <hr/>
      <div><strong>Data limitation:</strong> ${escapeHtml(limitation)}</div>
    </div>
  `;
}

function formatMetadataLabel(value: unknown) {
  return String(value).replace(/_/g, " ");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
