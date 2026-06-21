import {
  type MouseEvent,
  type MutableRefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import mapboxgl from "mapbox-gl";
import { Crosshair, MapPin } from "lucide-react";

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
import { candidateZones } from "@/data/mockGeoJson";
import { loadGeoJsonLayer } from "@/lib/loadGeoJsonLayer";
import type { CandidateZone, SelectedLocation } from "@/types/site";

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

type InfrastructureMapLayerIds = {
  sourceId: string;
  fillLayerId: string;
  outlineLayerId: string;
  lineLayerId: string;
  circleLayerId: string;
};

const polygonFilter = [
  "any",
  ["==", ["geometry-type"], "Polygon"],
  ["==", ["geometry-type"], "MultiPolygon"],
] as mapboxgl.FilterSpecification;

const lineFilter = [
  "any",
  ["==", ["geometry-type"], "LineString"],
  ["==", ["geometry-type"], "MultiLineString"],
] as mapboxgl.FilterSpecification;

const pointFilter = [
  "any",
  ["==", ["geometry-type"], "Point"],
  ["==", ["geometry-type"], "MultiPoint"],
] as mapboxgl.FilterSpecification;

const registeredPopupLayerIdsByMap = new WeakMap<mapboxgl.Map, Set<string>>();

export function MapPanel({
  selectedLocation,
  activeInfrastructureLayerIds,
  onInfrastructureLayerStateChange,
  onLocationSelect,
}: MapPanelProps) {
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  const selectedCoordinateText = useSelectedCoordinateText(selectedLocation);

  return (
    <div className="relative h-[560px] min-h-[500px] overflow-hidden rounded-[22px] border bg-card lg:h-[calc(100vh-360px)] lg:min-h-[560px] lg:max-h-[760px]">
      {mapboxToken ? (
        <RealMap
          activeInfrastructureLayerIds={activeInfrastructureLayerIds}
          mapboxToken={mapboxToken}
          selectedLocation={selectedLocation}
          onInfrastructureLayerStateChange={onInfrastructureLayerStateChange}
          onLocationSelect={onLocationSelect}
        />
      ) : (
        <MapFallback
          selectedLocation={selectedLocation}
          onLocationSelect={onLocationSelect}
        />
      )}

      <MapOverlayChips
        activeLayerCount={activeInfrastructureLayerIds.length}
        basemapLabel={mapboxToken ? "Mapbox satellite" : "Demo map fallback"}
        isRealMap={Boolean(mapboxToken)}
      />
      <SelectedSiteCard selectedCoordinateText={selectedCoordinateText} />
    </div>
  );
}

function RealMap({
  activeInfrastructureLayerIds,
  mapboxToken,
  selectedLocation,
  onInfrastructureLayerStateChange,
  onLocationSelect,
}: MapPanelProps & { mapboxToken: string }) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const selectedMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const candidateMarkerRefs = useRef<
    Array<{ id: string; element: HTMLButtonElement; marker: mapboxgl.Marker }>
  >([]);
  const infrastructureLayerRefs = useRef(
    new Map<InfrastructureLayerId, InfrastructureMapLayerIds>()
  );
  const loadedCollectionsRef = useRef(
    new Map<InfrastructureLayerId, InfrastructureFeatureCollection>()
  );
  const loadingLayerIdsRef = useRef(new Set<InfrastructureLayerId>());
  const activeLayerIdsRef = useRef(activeInfrastructureLayerIds);
  const onLayerStateChangeRef = useRef(onInfrastructureLayerStateChange);
  const onLocationSelectRef = useRef(onLocationSelect);
  const currentStyleBasemapRef = useRef<BasemapKey>("satellite");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [basemap, setBasemap] = useState<BasemapKey>("satellite");

  useEffect(() => {
    activeLayerIdsRef.current = activeInfrastructureLayerIds;
  }, [activeInfrastructureLayerIds]);

  useEffect(() => {
    onLayerStateChangeRef.current = onInfrastructureLayerStateChange;
  }, [onInfrastructureLayerStateChange]);

  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    mapboxgl.accessToken = mapboxToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: getMapboxStyle("satellite"),
      center: [DEFAULT_CITY.center.lng, DEFAULT_CITY.center.lat],
      zoom: 11.2,
      minZoom: 9,
      maxZoom: 18.5,
      maxBounds: DEFAULT_CITY.bounds,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    });

    map.scrollZoom.enable();
    map.touchZoomRotate.disableRotation();
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new mapboxgl.ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-right");
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    map.on("style.load", () => {
      infrastructureLayerRefs.current.clear();
      rehydrateCachedInfrastructureLayers(
        map,
        loadedCollectionsRef.current,
        activeLayerIdsRef.current,
        infrastructureLayerRefs
      );
    });

    map.on("load", () => {
      addCandidateMarkers(map, onLocationSelectRef, candidateMarkerRefs);
      map.fitBounds(DEFAULT_CITY.bounds, { padding: 26, duration: 0 });
      setMapLoaded(true);
    });

    map.on("click", (event) => {
      const interactiveLayerIds = getInteractiveInfrastructureLayerIds(
        map,
        infrastructureLayerRefs.current
      );
      const renderedInfrastructureFeatures =
        interactiveLayerIds.length > 0
          ? map.queryRenderedFeatures(event.point, {
              layers: interactiveLayerIds,
            })
          : [];

      if (renderedInfrastructureFeatures.length > 0) {
        return;
      }

      onLocationSelectRef.current({
        lat: event.lngLat.lat,
        lng: event.lngLat.lng,
        label: "Candidate AI Infrastructure Site",
      });
    });

    mapRef.current = map;
    const infrastructureLayerMap = infrastructureLayerRefs.current;
    const loadedCollectionsMap = loadedCollectionsRef.current;
    const loadingLayerIdsSet = loadingLayerIdsRef.current;

    return () => {
      selectedMarkerRef.current?.remove();
      candidateMarkerRefs.current.forEach(({ marker }) => marker.remove());
      candidateMarkerRefs.current = [];
      infrastructureLayerMap.clear();
      loadedCollectionsMap.clear();
      loadingLayerIdsSet.clear();
      map.remove();
      mapRef.current = null;
    };
  }, [mapboxToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || currentStyleBasemapRef.current === basemap) {
      return;
    }

    currentStyleBasemapRef.current = basemap;
    map.setStyle(getMapboxStyle(basemap));
  }, [basemap, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) {
      return;
    }

    availableInfrastructureLayers.forEach((layerConfig) => {
      const isActive = activeInfrastructureLayerIds.includes(layerConfig.id);
      const existingLayerIds = infrastructureLayerRefs.current.get(layerConfig.id);

      if (!isActive) {
        if (existingLayerIds) {
          setInfrastructureLayerVisibility(map, existingLayerIds, false);
        }
        return;
      }

      const cachedCollection = loadedCollectionsRef.current.get(layerConfig.id);
      if (cachedCollection) {
        const layerIds =
          existingLayerIds ??
          addInfrastructureGeoJsonLayer(
            map,
            layerConfig,
            cachedCollection,
            infrastructureLayerRefs,
            activeLayerIdsRef.current
          );
        setInfrastructureLayerVisibility(map, layerIds, true);
        return;
      }

      void loadInfrastructureLayer(
        map,
        layerConfig,
        loadedCollectionsRef,
        loadingLayerIdsRef,
        infrastructureLayerRefs,
        activeLayerIdsRef,
        onLayerStateChangeRef
      );
    });
  }, [activeInfrastructureLayerIds, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) {
      return;
    }

    updateCandidateMarkerStates(candidateMarkerRefs.current, selectedLocation);

    if (!selectedLocation) {
      selectedMarkerRef.current?.remove();
      selectedMarkerRef.current = null;
      return;
    }

    const lngLat: [number, number] = [
      selectedLocation.lng,
      selectedLocation.lat,
    ];
    const popupHtml = `<strong>${escapeHtml(selectedLocation.label ?? "Selected planning site")}</strong><br/>${selectedLocation.lat.toFixed(5)}, ${selectedLocation.lng.toFixed(5)}`;

    if (!selectedMarkerRef.current) {
      selectedMarkerRef.current = new mapboxgl.Marker({
        anchor: "bottom",
        element: createSelectedMarkerElement(),
      })
        .setLngLat(lngLat)
        .setPopup(new mapboxgl.Popup({ offset: 22 }).setHTML(popupHtml))
        .addTo(map);
    } else {
      selectedMarkerRef.current.setPopup(
        new mapboxgl.Popup({ offset: 22 }).setHTML(popupHtml)
      );
      selectedMarkerRef.current.setLngLat(lngLat);
    }
    map.flyTo({
      center: lngLat,
      zoom: Math.max(map.getZoom(), 12.15),
      essential: true,
      duration: 650,
    });
  }, [mapLoaded, selectedLocation]);

  return (
    <>
      <div ref={mapContainerRef} className="h-full w-full" />
      <div className="absolute left-4 top-14 z-10 flex rounded-xl border bg-card/95 p-1 shadow-panel backdrop-blur">
        {(["satellite", "streets"] as BasemapKey[]).map((option) => (
          <button
            key={option}
            type="button"
            className={[
              "rounded-lg px-3 py-1.5 text-xs font-medium transition",
              basemap === option
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            ].join(" ")}
            onClick={() => setBasemap(option)}
          >
            {option === "satellite" ? "Satellite" : "Streets"}
          </button>
        ))}
      </div>
      {!mapLoaded && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-card/35">
          <div className="rounded-2xl border bg-card/95 px-4 py-3 text-sm text-muted-foreground shadow-panel backdrop-blur">
            Loading Mapbox map...
          </div>
        </div>
      )}
    </>
  );
}

function MapFallback({
  selectedLocation,
  onLocationSelect,
}: {
  selectedLocation: SelectedLocation | null;
  onLocationSelect: (location: SelectedLocation) => void;
}) {
  function handleMapClick(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const [[west, south], [east, north]] = DEFAULT_CITY.bounds;

    onLocationSelect({
      lng: west + x * (east - west),
      lat: north - y * (north - south),
      label: "Candidate AI Infrastructure Site",
    });
  }

  const selectedPosition = selectedLocation
    ? getMapPosition(selectedLocation.lng, selectedLocation.lat)
    : null;

  return (
    <div
      className="map-texture relative h-full w-full cursor-crosshair overflow-hidden"
      onClick={handleMapClick}
      role="button"
      tabIndex={0}
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(255_255_255_/_0.04)_1px,transparent_1px),linear-gradient(0deg,rgb(255_255_255_/_0.035)_1px,transparent_1px)] bg-[size:72px_72px]" />
      <div className="absolute left-[8%] top-[58%] h-16 w-[88%] -rotate-6 rounded-full border border-cyan-100/20 bg-cyan-200/8 blur-[1px]" />
      <div className="absolute left-[48%] top-[-10%] h-[125%] w-12 rotate-[18deg] rounded-full bg-sky-200/10 blur-[2px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgb(6_15_26_/_0.22)_78%)]" />

      {[
        { label: "Thu Duc", x: 67, y: 25 },
        { label: "Binh Thanh", x: 51, y: 42 },
        { label: "District 1", x: 47, y: 52 },
        { label: "Thu Thiem", x: 56, y: 54 },
        { label: "District 7", x: 49, y: 69 },
        { label: "Saigon River", x: 61, y: 48 },
      ].map((district) => (
        <div
          key={district.label}
          className="pointer-events-none absolute rounded-md bg-background/32 px-2 py-1 text-xs font-medium text-slate-200/78 backdrop-blur"
          style={{ left: `${district.x}%`, top: `${district.y}%` }}
        >
          {district.label}
        </div>
      ))}

      {candidateZones.map((zone) => {
        const position = getMapPosition(zone.lng, zone.lat);
        const isSelected = isSameLocation(selectedLocation, zone);
        return (
          <CandidateMarker
            key={zone.id}
            isSelected={isSelected}
            label={zone.label}
            left={position.x}
            top={position.y}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onLocationSelect({
                lat: zone.lat,
                lng: zone.lng,
                label: zone.label,
              });
            }}
          />
        );
      })}

      {selectedPosition &&
        !candidateZones.some((zone) => isSameLocation(selectedLocation, zone)) && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full"
            style={{
              left: `${selectedPosition.x}%`,
              top: `${selectedPosition.y}%`,
            }}
          >
            <div className="relative">
              <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/50 bg-primary/15" />
              <div className="relative rounded-full border border-white bg-primary p-2 text-primary-foreground shadow-[0_10px_24px_rgb(0_0_0_/0.45)]">
                <MapPin className="h-5 w-5" />
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

function CandidateMarker({
  isSelected,
  label,
  left,
  onClick,
  top,
}: {
  isSelected: boolean;
  label: string;
  left: number;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  top: number;
}) {
  return (
    <button
      type="button"
      className={[
        "absolute -translate-x-1/2 -translate-y-full rounded-full border p-1.5 shadow-[0_8px_18px_rgb(0_0_0_/0.35)] transition hover:scale-105",
        isSelected
          ? "border-white bg-primary text-primary-foreground"
          : "border-white/65 bg-[#ffd05b] text-slate-950 hover:bg-[#ffe38b]",
      ].join(" ")}
      style={{ left: `${left}%`, top: `${top}%` }}
      onClick={onClick}
      title={label}
      aria-label={`Select ${label}`}
    >
      <MapPin className={isSelected ? "h-5 w-5" : "h-4 w-4"} />
    </button>
  );
}

function MapOverlayChips({
  activeLayerCount,
  basemapLabel,
  isRealMap,
}: {
  activeLayerCount: number;
  basemapLabel: string;
  isRealMap: boolean;
}) {
  return (
    <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-2">
      <Badge variant="outline" className="border-white/15 bg-[#0f1d2a]/80 text-[#edf7f6] backdrop-blur">
        {DEFAULT_CITY.shortLabel}
      </Badge>
      <Badge variant="outline" className="border-white/15 bg-[#0f1d2a]/80 text-[#edf7f6] backdrop-blur">
        {basemapLabel}
      </Badge>
      <Badge variant="outline" className="border-white/15 bg-[#0f1d2a]/80 text-[#edf7f6] backdrop-blur">
        {isRealMap ? "Open-data layers" : "Token required for live layers"} {activeLayerCount}
      </Badge>
    </div>
  );
}

function SelectedSiteCard({
  selectedCoordinateText,
}: {
  selectedCoordinateText: string;
}) {
  return (
    <div className="absolute bottom-4 left-4 max-w-[330px] rounded-2xl border bg-card/95 p-3 shadow-panel backdrop-blur">
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
  );
}

function useSelectedCoordinateText(selectedLocation: SelectedLocation | null) {
  return useMemo(() => {
    if (!selectedLocation) {
      return "Awaiting site selection";
    }

    return `${selectedLocation.lat.toFixed(5)}, ${selectedLocation.lng.toFixed(5)}`;
  }, [selectedLocation]);
}

async function loadInfrastructureLayer(
  map: mapboxgl.Map,
  layerConfig: InfrastructureLayerConfig,
  loadedCollectionsRef: MutableRefObject<
    Map<InfrastructureLayerId, InfrastructureFeatureCollection>
  >,
  loadingLayerIdsRef: MutableRefObject<Set<InfrastructureLayerId>>,
  infrastructureLayerRefs: MutableRefObject<
    Map<InfrastructureLayerId, InfrastructureMapLayerIds>
  >,
  activeLayerIdsRef: MutableRefObject<InfrastructureLayerId[]>,
  onLayerStateChangeRef: MutableRefObject<
    (layerId: InfrastructureLayerId, state: InfrastructureLayerRuntimeState) => void
  >
) {
  if (loadingLayerIdsRef.current.has(layerConfig.id)) {
    return;
  }

  loadingLayerIdsRef.current.add(layerConfig.id);
  onLayerStateChangeRef.current(layerConfig.id, { status: "loading" });

  try {
    const collection = await loadGeoJsonLayer(layerConfig.geoJsonPath);
    loadedCollectionsRef.current.set(layerConfig.id, collection);
    addInfrastructureGeoJsonLayer(
      map,
      layerConfig,
      collection,
      infrastructureLayerRefs,
      activeLayerIdsRef.current
    );
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

function rehydrateCachedInfrastructureLayers(
  map: mapboxgl.Map,
  loadedCollections: Map<InfrastructureLayerId, InfrastructureFeatureCollection>,
  activeLayerIds: InfrastructureLayerId[],
  infrastructureLayerRefs: MutableRefObject<
    Map<InfrastructureLayerId, InfrastructureMapLayerIds>
  >
) {
  loadedCollections.forEach((collection, layerId) => {
    const layerConfig = availableInfrastructureLayers.find(
      (item) => item.id === layerId
    );
    if (!layerConfig) {
      return;
    }

    addInfrastructureGeoJsonLayer(
      map,
      layerConfig,
      collection,
      infrastructureLayerRefs,
      activeLayerIds
    );
  });
}

function addInfrastructureGeoJsonLayer(
  map: mapboxgl.Map,
  layerConfig: InfrastructureLayerConfig,
  collection: InfrastructureFeatureCollection,
  infrastructureLayerRefs: MutableRefObject<
    Map<InfrastructureLayerId, InfrastructureMapLayerIds>
  >,
  activeLayerIds: InfrastructureLayerId[]
) {
  const layerIds = getInfrastructureMapLayerIds(layerConfig.id);
  const visibility = activeLayerIds.includes(layerConfig.id)
    ? "visible"
    : "none";

  if (!map.getSource(layerIds.sourceId)) {
    map.addSource(layerIds.sourceId, {
      type: "geojson",
      data: collection,
    });
  } else {
    const source = map.getSource(layerIds.sourceId) as mapboxgl.GeoJSONSource;
    source.setData(collection);
  }

  if (!map.getLayer(layerIds.fillLayerId)) {
    map.addLayer({
      id: layerIds.fillLayerId,
      type: "fill",
      source: layerIds.sourceId,
      filter: polygonFilter,
      layout: { visibility },
      paint: {
        "fill-color": layerConfig.color,
        "fill-opacity": 0.2,
      },
    });
    registerInfrastructureLayerPopup(map, layerIds.fillLayerId, layerConfig);
  }

  if (!map.getLayer(layerIds.outlineLayerId)) {
    map.addLayer({
      id: layerIds.outlineLayerId,
      type: "line",
      source: layerIds.sourceId,
      filter: polygonFilter,
      layout: { visibility },
      paint: {
        "line-color": layerConfig.color,
        "line-opacity": 0.9,
        "line-width": 1.8,
      },
    });
    registerInfrastructureLayerPopup(map, layerIds.outlineLayerId, layerConfig);
  }

  if (!map.getLayer(layerIds.lineLayerId)) {
    map.addLayer({
      id: layerIds.lineLayerId,
      type: "line",
      source: layerIds.sourceId,
      filter: lineFilter,
      layout: {
        "line-cap": "round",
        "line-join": "round",
        visibility,
      },
      paint: {
        "line-color": layerConfig.color,
        "line-opacity": 0.92,
        "line-width": layerConfig.id === "transmission_lines" ? 2.6 : 2,
      },
    });
    registerInfrastructureLayerPopup(map, layerIds.lineLayerId, layerConfig);
  }

  if (!map.getLayer(layerIds.circleLayerId)) {
    map.addLayer({
      id: layerIds.circleLayerId,
      type: "circle",
      source: layerIds.sourceId,
      filter: pointFilter,
      layout: { visibility },
      paint: {
        "circle-color": layerConfig.color,
        "circle-opacity": 0.88,
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          9,
          4,
          13,
          7,
          16,
          10,
        ],
        "circle-stroke-color": "#f8fafc",
        "circle-stroke-opacity": 0.95,
        "circle-stroke-width": 1.2,
      },
    });
    registerInfrastructureLayerPopup(map, layerIds.circleLayerId, layerConfig);
  }

  infrastructureLayerRefs.current.set(layerConfig.id, layerIds);
  return layerIds;
}

function setInfrastructureLayerVisibility(
  map: mapboxgl.Map,
  layerIds: InfrastructureMapLayerIds,
  isVisible: boolean
) {
  const visibility = isVisible ? "visible" : "none";

  Object.values(layerIds).forEach((layerId) => {
    if (layerId !== layerIds.sourceId && map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", visibility);
    }
  });
}

function registerInfrastructureLayerPopup(
  map: mapboxgl.Map,
  layerId: string,
  layerConfig: InfrastructureLayerConfig
) {
  let registeredLayerIds = registeredPopupLayerIdsByMap.get(map);
  if (!registeredLayerIds) {
    registeredLayerIds = new Set<string>();
    registeredPopupLayerIdsByMap.set(map, registeredLayerIds);
  }

  if (registeredLayerIds.has(layerId)) {
    return;
  }
  registeredLayerIds.add(layerId);

  map.on("mouseenter", layerId, () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", layerId, () => {
    map.getCanvas().style.cursor = "";
  });

  map.on("click", layerId, (event) => {
    const feature = event.features?.[0];
    if (!feature) {
      return;
    }

    event.originalEvent.stopPropagation();

    new mapboxgl.Popup({ offset: 16, maxWidth: "360px" })
      .setLngLat(event.lngLat)
      .setHTML(
        renderInfrastructurePopupHtml(
          feature.properties as InfrastructureFeatureProperties,
          layerConfig
        )
      )
      .addTo(map);
  });
}

function getInteractiveInfrastructureLayerIds(
  map: mapboxgl.Map,
  infrastructureLayerIds: Map<InfrastructureLayerId, InfrastructureMapLayerIds>
) {
  return Array.from(infrastructureLayerIds.values()).flatMap((layerIds) =>
    [
      layerIds.fillLayerId,
      layerIds.outlineLayerId,
      layerIds.lineLayerId,
      layerIds.circleLayerId,
    ].filter((layerId) => map.getLayer(layerId))
  );
}

function addCandidateMarkers(
  map: mapboxgl.Map,
  onLocationSelectRef: MutableRefObject<(location: SelectedLocation) => void>,
  candidateMarkerRefs: MutableRefObject<
    Array<{ id: string; element: HTMLButtonElement; marker: mapboxgl.Marker }>
  >
) {
  candidateMarkerRefs.current.forEach(({ marker }) => marker.remove());
  candidateMarkerRefs.current = candidateZones.map((zone) => {
    const element = createCandidateMarkerElement(zone);
    const marker = new mapboxgl.Marker({
      anchor: "bottom",
      element,
    })
      .setLngLat([zone.lng, zone.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 18 }).setHTML(
          `<strong>${escapeHtml(zone.label)}</strong><br/>${escapeHtml(zone.description)}`
        )
      )
      .addTo(map);

    element.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onLocationSelectRef.current({
        lat: zone.lat,
        lng: zone.lng,
        label: zone.label,
      });
      marker.togglePopup();
    });

    return { id: zone.id, element, marker };
  });
}

function createCandidateMarkerElement(zone: CandidateZone) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "site-marker site-marker-candidate";
  element.title = zone.label;
  element.setAttribute("aria-label", `Select ${zone.label}`);
  element.innerHTML = mapPinSvg();

  return element;
}

function createSelectedMarkerElement() {
  const element = document.createElement("div");
  element.className = "site-marker site-marker-selected";
  element.innerHTML = mapPinSvg();

  return element;
}

function updateCandidateMarkerStates(
  markers: Array<{
    id: string;
    element: HTMLButtonElement;
    marker: mapboxgl.Marker;
  }>,
  selectedLocation: SelectedLocation | null
) {
  markers.forEach(({ id, element }) => {
    const zone = candidateZones.find((candidate) => candidate.id === id);
    const selected = zone ? isSameLocation(selectedLocation, zone) : false;
    element.classList.toggle("is-selected", selected);
    element.setAttribute("aria-pressed", String(selected));
  });
}

function mapPinSvg() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"></path>
      <circle cx="12" cy="10" r="3"></circle>
    </svg>
  `;
}

function getMapPosition(lng: number, lat: number) {
  const [[west, south], [east, north]] = DEFAULT_CITY.bounds;
  const x = ((lng - west) / (east - west)) * 100;
  const y = ((north - lat) / (north - south)) * 100;

  return {
    x: Math.max(4, Math.min(96, x)),
    y: Math.max(8, Math.min(92, y)),
  };
}

function isSameLocation(
  selectedLocation: SelectedLocation | null,
  zone: CandidateZone
) {
  if (!selectedLocation) {
    return false;
  }

  return (
    Math.abs(selectedLocation.lat - zone.lat) < 0.0001 &&
    Math.abs(selectedLocation.lng - zone.lng) < 0.0001
  );
}

function getMapboxStyle(basemap: BasemapKey) {
  return basemap === "satellite"
    ? "mapbox://styles/mapbox/satellite-streets-v12"
    : "mapbox://styles/mapbox/streets-v12";
}

function getInfrastructureMapLayerIds(
  layerId: InfrastructureLayerId
): InfrastructureMapLayerIds {
  return {
    sourceId: `infrastructure-${layerId}-source`,
    fillLayerId: `infrastructure-${layerId}-fill`,
    outlineLayerId: `infrastructure-${layerId}-outline`,
    lineLayerId: `infrastructure-${layerId}-line`,
    circleLayerId: `infrastructure-${layerId}-circle`,
  };
}

function renderInfrastructurePopupHtml(
  properties: InfrastructureFeatureProperties,
  layerConfig: InfrastructureLayerConfig
) {
  const limitation =
    properties.data_limitation ??
    layerConfig.limitation ??
    "Open-data layer must be validated before planning or investment decisions.";
  const sourceId =
    properties.osm_id ??
    properties.source_id ??
    properties.peeringdb_id ??
    "Unknown";

  return `
    <div class="space-y-2">
      <strong>${escapeHtml(properties.name || layerConfig.label || "Unnamed asset")}</strong>
      <div>Layer: ${escapeHtml(layerConfig.label)}</div>
      <div>Asset type: ${escapeHtml(properties.asset_type || "Unknown")}</div>
      <div>Category: ${escapeHtml(properties.category || layerConfig.category)}</div>
      <div>Source: ${escapeHtml(properties.source || layerConfig.source)}</div>
      <div>Confidence: ${escapeHtml(formatMetadataLabel(properties.source_confidence || layerConfig.sourceConfidence))}</div>
      <div>Completeness: ${escapeHtml(formatMetadataLabel(properties.data_completeness || layerConfig.dataCompleteness))}</div>
      <div>Source ID: ${escapeHtml(String(sourceId))}</div>
      <hr/>
      <div><strong>Data limitation:</strong> ${escapeHtml(String(limitation))}</div>
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
