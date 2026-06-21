import {
  type MouseEvent,
  type MutableRefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import mapboxgl from "mapbox-gl";
import {
  ChevronDown,
  ChevronUp,
  Crosshair,
  Layers,
  MapPin,
  RotateCcw,
} from "lucide-react";

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

type BasemapKey = "satellite" | "satellite_clean" | "streets";

type InfrastructureMapLayerIds = {
  sourceId: string;
  fillLayerId: string;
  outlineCasingLayerId: string;
  outlineLayerId: string;
  lineCasingLayerId: string;
  lineLayerId: string;
  circleHaloLayerId: string;
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

const basemapOptions: Array<{ key: BasemapKey; label: string }> = [
  { key: "satellite", label: "Satellite" },
  { key: "satellite_clean", label: "Satellite only" },
  { key: "streets", label: "Streets" },
];

export function MapPanel({
  selectedLocation,
  activeInfrastructureLayerIds,
  onInfrastructureLayerStateChange,
  onLocationSelect,
}: MapPanelProps) {
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  const [basemap, setBasemap] = useState<BasemapKey>("satellite");
  const selectedCoordinateText = useSelectedCoordinateText(selectedLocation);

  return (
    <div className="relative h-[560px] min-h-[500px] overflow-hidden rounded-[22px] border bg-card lg:h-[calc(100vh-360px)] lg:min-h-[560px] lg:max-h-[760px]">
      {mapboxToken ? (
        <RealMap
          activeInfrastructureLayerIds={activeInfrastructureLayerIds}
          basemap={basemap}
          mapboxToken={mapboxToken}
          selectedLocation={selectedLocation}
          onInfrastructureLayerStateChange={onInfrastructureLayerStateChange}
          onBasemapChange={setBasemap}
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
        basemapLabel={mapboxToken ? getBasemapLabel(basemap) : "Demo map fallback"}
        isRealMap={Boolean(mapboxToken)}
      />
      <SelectedSiteCard selectedCoordinateText={selectedCoordinateText} />
    </div>
  );
}

function RealMap({
  activeInfrastructureLayerIds,
  basemap,
  mapboxToken,
  selectedLocation,
  onInfrastructureLayerStateChange,
  onBasemapChange,
  onLocationSelect,
}: MapPanelProps & {
  basemap: BasemapKey;
  mapboxToken: string;
  onBasemapChange: (basemap: BasemapKey) => void;
}) {
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
  const currentStyleBasemapRef = useRef<BasemapKey>(basemap);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadedFeatureCounts, setLoadedFeatureCounts] = useState<
    Partial<Record<InfrastructureLayerId, number>>
  >({});

  const activeLegendLayers = useMemo(
    () =>
      activeInfrastructureLayerIds
        .map((layerId) =>
          availableInfrastructureLayers.find((layer) => layer.id === layerId)
        )
        .filter((layer): layer is InfrastructureLayerConfig => Boolean(layer)),
    [activeInfrastructureLayerIds]
  );

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
      orderInfrastructureLayers(map, infrastructureLayerRefs.current);
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
        setLoadedFeatureCounts((current) => ({
          ...current,
          [layerConfig.id]: cachedCollection.features.length,
        }));
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
        orderInfrastructureLayers(map, infrastructureLayerRefs.current);
        return;
      }

      void loadInfrastructureLayer(
        map,
        layerConfig,
        loadedCollectionsRef,
        loadingLayerIdsRef,
        infrastructureLayerRefs,
        activeLayerIdsRef,
        onLayerStateChangeRef,
        (layerId, featureCount) => {
          setLoadedFeatureCounts((current) => ({
            ...current,
            [layerId]: featureCount,
          }));
        }
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
      <div className="absolute left-4 top-14 z-10 flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border bg-card/95 p-1 shadow-panel backdrop-blur">
          {basemapOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              className={[
                "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                basemap === option.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              ].join(" ")}
              onClick={() => onBasemapChange(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-xl border bg-card/95 text-primary shadow-panel backdrop-blur transition hover:bg-secondary"
          onClick={() => resetMapView(mapRef.current)}
          title="Reset map view"
          aria-label="Reset map view"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {activeLegendLayers.length > 0 && (
        <InfrastructureMapLegend
          featureCounts={loadedFeatureCounts}
          layers={activeLegendLayers}
        />
      )}

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

function InfrastructureMapLegend({
  featureCounts,
  layers,
}: {
  featureCounts: Partial<Record<InfrastructureLayerId, number>>;
  layers: InfrastructureLayerConfig[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleLayers = isExpanded ? layers : layers.slice(0, 7);
  const hiddenLayerCount = layers.length - visibleLayers.length;

  return (
    <div
      className={[
        "absolute bottom-[4.25rem] right-4 z-10 hidden w-[320px] max-w-[calc(100%-2rem)] rounded-2xl border bg-card/95 p-3 shadow-panel backdrop-blur md:block",
        isExpanded ? "max-h-[420px]" : "max-h-[270px]",
      ].join(" ")}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 rounded-xl text-left transition hover:text-primary"
        onClick={() => setIsExpanded((current) => !current)}
        aria-expanded={isExpanded}
      >
        <span className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
          <Layers className="h-3.5 w-3.5 shrink-0 text-primary" />
          Visible overlays
          <span className="rounded-full border bg-background/60 px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
            {layers.length}
          </span>
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      <div
        className={[
          "mt-3 space-y-2 overflow-y-auto pr-1",
          isExpanded ? "max-h-[350px]" : "max-h-[190px]",
        ].join(" ")}
      >
        {visibleLayers.map((layer) => (
          <div
            key={layer.id}
            className="flex items-start gap-2 rounded-lg px-1 py-0.5 text-xs"
          >
            <span
              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full border border-white shadow-[0_0_0_2px_rgb(15_23_42_/0.38)]"
              style={{ backgroundColor: layer.color }}
            />
            <span className="min-w-0 flex-1 whitespace-normal break-words leading-snug font-medium">
              {layer.label}
            </span>
            {typeof featureCounts[layer.id] === "number" && (
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {featureCounts[layer.id]}
              </span>
            )}
          </div>
        ))}

        {hiddenLayerCount > 0 && (
          <button
            type="button"
            className="w-full rounded-lg border bg-background/55 px-2 py-1.5 text-xs font-medium text-primary transition hover:bg-secondary"
            onClick={() => setIsExpanded(true)}
          >
            Show {hiddenLayerCount} more overlays
          </button>
        )}
      </div>
    </div>
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
  >,
  onLoadedFeatureCount: (
    layerId: InfrastructureLayerId,
    featureCount: number
  ) => void
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
    orderInfrastructureLayers(map, infrastructureLayerRefs.current);
    onLayerStateChangeRef.current(layerConfig.id, {
      status: "available",
      featureCount: collection.features.length,
    });
    onLoadedFeatureCount(layerConfig.id, collection.features.length);
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
        "fill-opacity": 0.26,
      },
    });
    registerInfrastructureLayerPopup(map, layerIds.fillLayerId, layerConfig);
  }

  if (!map.getLayer(layerIds.outlineCasingLayerId)) {
    map.addLayer({
      id: layerIds.outlineCasingLayerId,
      type: "line",
      source: layerIds.sourceId,
      filter: polygonFilter,
      layout: { visibility },
      paint: {
        "line-color": "#07111d",
        "line-opacity": 0.78,
        "line-width": 4,
      },
    });
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
        "line-opacity": 0.96,
        "line-width": 2,
      },
    });
  }

  if (!map.getLayer(layerIds.lineCasingLayerId)) {
    map.addLayer({
      id: layerIds.lineCasingLayerId,
      type: "line",
      source: layerIds.sourceId,
      filter: lineFilter,
      layout: {
        "line-cap": "round",
        "line-join": "round",
        visibility,
      },
      paint: {
        "line-color": "#07111d",
        "line-opacity": 0.82,
        "line-width": layerConfig.id === "transmission_lines" ? 6 : 5,
      },
    });
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
        "line-opacity": 0.98,
        "line-width": layerConfig.id === "transmission_lines" ? 3 : 2.4,
      },
    });
    registerInfrastructureLayerPopup(map, layerIds.lineLayerId, layerConfig);
  }

  if (!map.getLayer(layerIds.circleHaloLayerId)) {
    map.addLayer({
      id: layerIds.circleHaloLayerId,
      type: "circle",
      source: layerIds.sourceId,
      filter: pointFilter,
      layout: { visibility },
      paint: {
        "circle-color": "#07111d",
        "circle-opacity": 0.72,
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          9,
          7,
          13,
          10,
          16,
          14,
        ],
      },
    });
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
        "circle-opacity": 0.96,
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          9,
          4.8,
          13,
          7.5,
          16,
          10.5,
        ],
        "circle-stroke-color": "#f8fafc",
        "circle-stroke-opacity": 0.98,
        "circle-stroke-width": 1.6,
      },
    });
    registerInfrastructureLayerPopup(map, layerIds.circleLayerId, layerConfig);
  }

  infrastructureLayerRefs.current.set(layerConfig.id, layerIds);
  return layerIds;
}

function orderInfrastructureLayers(
  map: mapboxgl.Map,
  infrastructureLayerIds: Map<InfrastructureLayerId, InfrastructureMapLayerIds>
) {
  const layers = Array.from(infrastructureLayerIds.values());
  const orderedLayerIds = [
    ...layers.map((layerIds) => layerIds.fillLayerId),
    ...layers.map((layerIds) => layerIds.outlineCasingLayerId),
    ...layers.map((layerIds) => layerIds.outlineLayerId),
    ...layers.map((layerIds) => layerIds.lineCasingLayerId),
    ...layers.map((layerIds) => layerIds.lineLayerId),
    ...layers.map((layerIds) => layerIds.circleHaloLayerId),
    ...layers.map((layerIds) => layerIds.circleLayerId),
  ];

  orderedLayerIds.forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.moveLayer(layerId);
    }
  });
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
      layerIds.outlineCasingLayerId,
      layerIds.outlineLayerId,
      layerIds.lineCasingLayerId,
      layerIds.lineLayerId,
      layerIds.circleHaloLayerId,
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
  if (basemap === "satellite_clean") {
    return "mapbox://styles/mapbox/satellite-v9";
  }

  return basemap === "satellite"
    ? "mapbox://styles/mapbox/satellite-streets-v12"
    : "mapbox://styles/mapbox/streets-v12";
}

function getBasemapLabel(basemap: BasemapKey) {
  return basemapOptions.find((option) => option.key === basemap)?.label ?? "Mapbox";
}

function resetMapView(map: mapboxgl.Map | null) {
  map?.fitBounds(DEFAULT_CITY.bounds, {
    duration: 650,
    padding: 26,
  });
}

function getInfrastructureMapLayerIds(
  layerId: InfrastructureLayerId
): InfrastructureMapLayerIds {
  return {
    sourceId: `infrastructure-${layerId}-source`,
    fillLayerId: `infrastructure-${layerId}-fill`,
    outlineCasingLayerId: `infrastructure-${layerId}-outline-casing`,
    outlineLayerId: `infrastructure-${layerId}-outline`,
    lineCasingLayerId: `infrastructure-${layerId}-line-casing`,
    lineLayerId: `infrastructure-${layerId}-line`,
    circleHaloLayerId: `infrastructure-${layerId}-circle-halo`,
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
