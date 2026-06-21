import {
  Beaker,
  Database,
  Factory,
  LockKeyhole,
  RadioTower,
  Route,
  ShieldCheck,
  Waves,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  infrastructureCategoryLabels,
  infrastructureLayers,
  type InfrastructureLayerCategory,
  type InfrastructureLayerId,
  type InfrastructureLayerRuntimeState,
  type InfrastructureLayerStatus,
} from "@/data/infrastructureLayerRegistry";
import { cn } from "@/lib/utils";

interface InfrastructureLayerPanelProps {
  activeLayerIds: InfrastructureLayerId[];
  layerStates: Partial<
    Record<InfrastructureLayerId, InfrastructureLayerRuntimeState>
  >;
  onToggleLayer: (layerId: InfrastructureLayerId) => void;
}

const orderedCategories: InfrastructureLayerCategory[] = [
  "power",
  "network",
  "innovation_capacity",
  "public_service",
  "land_environment",
  "transport_logistics",
  "verification",
];

const plannedLayerIds: InfrastructureLayerId[] = [
  "fiber_corridors",
  "flood_risk",
  "heat_risk",
  "water_availability",
  "zoning",
  "protected_land",
  "population_density",
  "workforce_readiness",
  "digital_access_gap",
  "ai_literacy_gap",
];

export function InfrastructureLayerPanel({
  activeLayerIds,
  layerStates,
  onToggleLayer,
}: InfrastructureLayerPanelProps) {
  return (
    <section className="rounded-xl border bg-background/35 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Database className="h-4 w-4 text-primary" />
            Real infrastructure layers
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            OpenStreetMap and external open-data overlays for early visual
            inspection. These layers do not verify grid capacity, fibre
            availability, or AI readiness.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">OpenStreetMap</Badge>
          <Badge variant="secondary">External sources</Badge>
          <Badge variant="outline">Open data</Badge>
          <Badge variant="warning">Not construction-ready</Badge>
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        {orderedCategories.map((category) => {
          const layers = infrastructureLayers.filter(
            (layer) => layer.category === category && layer.status !== "planned"
          );

          return (
            <LayerGroup
              key={category}
              title={infrastructureCategoryLabels[category]}
              category={category}
            >
              {layers.map((layer) => {
                const runtimeState = layerStates[layer.id];
                const isActive = activeLayerIds.includes(layer.id);
                const canToggle = layer.status === "available";

                return (
                  <button
                    key={layer.id}
                    type="button"
                    disabled={!canToggle}
                    className={cn(
                      "rounded-xl border bg-background/35 p-3 text-left transition hover:border-primary/60 hover:bg-secondary/45",
                      isActive &&
                        "border-primary bg-primary/10 shadow-[0_0_0_1px_rgb(82_184_214_/0.18)]",
                      !canToggle &&
                        "cursor-not-allowed border-border/70 bg-transparent opacity-80 hover:border-border/70 hover:bg-transparent"
                    )}
                    onClick={() => {
                      if (canToggle) {
                        onToggleLayer(layer.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">
                            {layer.label}
                          </span>
                          {canToggle && (
                            <Badge variant={isActive ? "default" : "outline"}>
                              {isActive ? "Visible" : "Hidden"}
                            </Badge>
                          )}
                          <LayerStatusBadge status={runtimeState?.status ?? layer.status} />
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                          {layer.description}
                        </p>
                      </div>
                      <span
                        className="mt-1 h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: layer.color }}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline">Source: {layer.source}</Badge>
                      <Badge variant="outline">
                        Confidence: {formatLabel(layer.sourceConfidence)}
                      </Badge>
                      <Badge variant="outline">
                        Completeness: {formatLabel(layer.dataCompleteness)}
                      </Badge>
                      {typeof runtimeState?.featureCount === "number" && (
                        <Badge variant="secondary">
                          {runtimeState.featureCount} assets
                        </Badge>
                      )}
                    </div>
                    <p className="mt-3 rounded-lg border border-amber-300/70 bg-amber-50/85 px-2.5 py-2 text-xs leading-relaxed text-amber-900">
                      {runtimeState?.message ?? layer.limitation}
                    </p>
                  </button>
                );
              })}
            </LayerGroup>
          );
        })}

        <LayerGroup title="Planned Future Layers" category="planned">
          {plannedLayerIds.map((layerId) => {
            const layer = infrastructureLayers.find((item) => item.id === layerId);
            if (!layer) {
              return null;
            }

            return (
              <div
                key={layer.id}
                className="rounded-xl border border-border/70 bg-transparent p-3 text-muted-foreground/75"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <LockKeyhole className="h-3.5 w-3.5" />
                  <span className="text-sm font-semibold">{layer.label}</span>
                  <Badge variant="outline">Planned</Badge>
                </div>
                <p className="mt-2 text-xs leading-relaxed">
                  {layer.description}
                </p>
              </div>
            );
          })}
        </LayerGroup>
      </div>
    </section>
  );
}

function LayerGroup({
  title,
  category,
  children,
}: {
  title: string;
  category: InfrastructureLayerCategory | "planned";
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
        <LayerGroupIcon category={category} />
        {title}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {children}
      </div>
    </div>
  );
}

function LayerGroupIcon({
  category,
}: {
  category: InfrastructureLayerCategory | "planned";
}) {
  if (category === "power") {
    return <Zap className="h-3.5 w-3.5" />;
  }
  if (category === "network") {
    return <RadioTower className="h-3.5 w-3.5" />;
  }
  if (category === "innovation_capacity") {
    return <Beaker className="h-3.5 w-3.5" />;
  }
  if (category === "land_environment") {
    return <Waves className="h-3.5 w-3.5" />;
  }
  if (category === "transport_logistics") {
    return <Route className="h-3.5 w-3.5" />;
  }
  if (category === "verification") {
    return <ShieldCheck className="h-3.5 w-3.5" />;
  }
  if (category === "public_service") {
    return <Factory className="h-3.5 w-3.5" />;
  }
  return <LockKeyhole className="h-3.5 w-3.5" />;
}

function LayerStatusBadge({ status }: { status: InfrastructureLayerStatus }) {
  if (status === "error") {
    return <Badge variant="destructive">Error</Badge>;
  }
  if (status === "loading") {
    return <Badge variant="warning">Loading</Badge>;
  }
  if (status === "needs_data") {
    return <Badge variant="warning">Needs data</Badge>;
  }
  if (status === "planned") {
    return <Badge variant="outline">Planned</Badge>;
  }
  return <Badge variant="success">Available</Badge>;
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/^\w/, (match: string) => match.toUpperCase());
}
