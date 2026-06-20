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
import {
  SAIGON_BOUNDS,
  SAIGON_CENTER,
  candidateZones,
  syntheticLayerData,
} from "@/data/mockGeoJson";
import type { CandidateZone, LayerKey, SelectedLocation } from "@/types/site";

interface MapPanelProps {
  selectedLocation: SelectedLocation | null;
  activeLayers: LayerKey[];
  onLocationSelect: (location: SelectedLocation) => void;
}

const layerStyles: Record<
  LayerKey,
  {
    sourceId: string;
    layerId: string;
    outlineLayerId?: string;
    color: string;
    kind: "circle" | "fill";
  }
> = {
  education: {
    sourceId: "education-readiness-source",
    layerId: "education-readiness-layer",
    color: "#245c7e",
    kind: "circle",
  },
  healthcare: {
    sourceId: "healthcare-readiness-source",
    layerId: "healthcare-readiness-layer",
    color: "#327f78",
    kind: "circle",
  },
  government: {
    sourceId: "government-readiness-source",
    layerId: "government-readiness-layer",
    color: "#b9822f",
    kind: "circle",
  },
  overall_readiness: {
    sourceId: "overall-readiness-source",
    layerId: "overall-readiness-fill-layer",
    outlineLayerId: "overall-readiness-outline-layer",
    color: "#4f7f4a",
    kind: "fill",
  },
};

export function MapPanel({
  selectedLocation,
  activeLayers,
  onLocationSelect,
}: MapPanelProps) {
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  const selectedCoordinateText = useSelectedCoordinateText(selectedLocation);

  return (
    <div className="relative h-[560px] min-h-[500px] overflow-hidden rounded-[22px] border bg-card lg:h-[calc(100vh-360px)] lg:min-h-[560px] lg:max-h-[760px]">
      {mapboxToken ? (
        <RealMap
          activeLayers={activeLayers}
          mapboxToken={mapboxToken}
          selectedLocation={selectedLocation}
          onLocationSelect={onLocationSelect}
        />
      ) : (
        <MapFallback
          selectedLocation={selectedLocation}
          onLocationSelect={onLocationSelect}
        />
      )}

      <MapOverlayChips
        activeLayerCount={activeLayers.length}
        isRealMap={Boolean(mapboxToken)}
      />
      <SelectedSiteCard selectedCoordinateText={selectedCoordinateText} />
    </div>
  );
}

function RealMap({
  activeLayers,
  mapboxToken,
  selectedLocation,
  onLocationSelect,
}: MapPanelProps & { mapboxToken: string }) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const selectedMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const candidateMarkerRefs = useRef<
    Array<{ id: string; element: HTMLButtonElement; marker: mapboxgl.Marker }>
  >([]);
  const activeLayersRef = useRef(activeLayers);
  const onLocationSelectRef = useRef(onLocationSelect);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    activeLayersRef.current = activeLayers;
  }, [activeLayers]);

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
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [SAIGON_CENTER.lng, SAIGON_CENTER.lat],
      zoom: 11.7,
      maxBounds: SAIGON_BOUNDS,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    });

    map.scrollZoom.enable();
    map.touchZoomRotate.disableRotation();
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new mapboxgl.ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-right");
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      addSyntheticLayers(map, activeLayersRef.current);
      addCandidateMarkers(map, onLocationSelectRef, candidateMarkerRefs);
      setMapLoaded(true);
    });

    map.on("click", (event) => {
      onLocationSelectRef.current({
        lat: event.lngLat.lat,
        lng: event.lngLat.lng,
        label: "Custom Saigon planning point",
      });
    });

    mapRef.current = map;

    return () => {
      selectedMarkerRef.current?.remove();
      candidateMarkerRefs.current.forEach(({ marker }) => marker.remove());
      candidateMarkerRefs.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [mapboxToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) {
      return;
    }

    Object.entries(layerStyles).forEach(([key, style]) => {
      const visibility = activeLayers.includes(key as LayerKey)
        ? "visible"
        : "none";
      if (map.getLayer(style.layerId)) {
        map.setLayoutProperty(style.layerId, "visibility", visibility);
      }
      if (style.outlineLayerId && map.getLayer(style.outlineLayerId)) {
        map.setLayoutProperty(style.outlineLayerId, "visibility", visibility);
      }
    });
  }, [activeLayers, mapLoaded]);

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

  return <div ref={mapContainerRef} className="h-full w-full" />;
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
    const [[west, south], [east, north]] = SAIGON_BOUNDS;

    onLocationSelect({
      lng: west + x * (east - west),
      lat: north - y * (north - south),
      label: "Custom Saigon planning point",
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

      {selectedPosition && !candidateZones.some((zone) => isSameLocation(selectedLocation, zone)) && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full"
          style={{ left: `${selectedPosition.x}%`, top: `${selectedPosition.y}%` }}
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
  isRealMap,
}: {
  activeLayerCount: number;
  isRealMap: boolean;
}) {
  return (
    <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-2">
      <Badge variant="outline" className="border-white/15 bg-[#0f1d2a]/80 text-[#edf7f6] backdrop-blur">
        Ho Chi Minh City
      </Badge>
      <Badge variant="outline" className="border-white/15 bg-[#0f1d2a]/80 text-[#edf7f6] backdrop-blur">
        {isRealMap ? "Satellite" : "Demo map layer active"}
      </Badge>
      <Badge variant="outline" className="border-white/15 bg-[#0f1d2a]/80 text-[#edf7f6] backdrop-blur">
        Planning layers {activeLayerCount}
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
  const [[west, south], [east, north]] = SAIGON_BOUNDS;
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

function addSyntheticLayers(map: mapboxgl.Map, activeLayers: LayerKey[]) {
  (Object.keys(layerStyles) as LayerKey[]).forEach((key) => {
    const style = layerStyles[key];
    const visibility = activeLayers.includes(key) ? "visible" : "none";

    if (!map.getSource(style.sourceId)) {
      map.addSource(style.sourceId, {
        type: "geojson",
        data: syntheticLayerData[key],
      });
    }

    if (style.kind === "circle" && !map.getLayer(style.layerId)) {
      map.addLayer({
        id: style.layerId,
        type: "circle",
        source: style.sourceId,
        layout: { visibility },
        paint: {
          "circle-color": style.color,
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            5,
            14,
            10,
          ],
          "circle-opacity": 0.86,
          "circle-stroke-color": "#f8fafc",
          "circle-stroke-width": 1.4,
        },
      });
      registerLayerPopup(map, style.layerId);
    }

    if (style.kind === "fill" && !map.getLayer(style.layerId)) {
      map.addLayer({
        id: style.layerId,
        type: "fill",
        source: style.sourceId,
        layout: { visibility },
        paint: {
          "fill-color": [
            "interpolate",
            ["linear"],
            ["get", "readinessScore"],
            60,
            "#b9822f",
            75,
            "#4f7f4a",
            90,
            "#327f78",
          ],
          "fill-opacity": 0.28,
        },
      });

      if (style.outlineLayerId && !map.getLayer(style.outlineLayerId)) {
        map.addLayer({
          id: style.outlineLayerId,
          type: "line",
          source: style.sourceId,
          layout: { visibility },
          paint: {
            "line-color": style.color,
            "line-width": 2,
            "line-opacity": 0.8,
          },
        });
      }

      registerLayerPopup(map, style.layerId);
    }
  });
}

function registerLayerPopup(map: mapboxgl.Map, layerId: string) {
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

    const properties = feature.properties as
      | {
          name?: string;
          readinessScore?: number;
          confidence?: string;
        }
      | undefined;

    new mapboxgl.Popup({ offset: 16 })
      .setLngLat(event.lngLat)
      .setHTML(
        `<strong>${escapeHtml(properties?.name ?? "Planning layer")}</strong><br/>Readiness score: ${properties?.readinessScore ?? "N/A"}<br/>Confidence: ${properties?.confidence ?? "N/A"}`
      )
      .addTo(map);
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
