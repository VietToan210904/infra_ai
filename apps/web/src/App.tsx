import { useCallback, useState } from "react";
import {
  BarChart3,
  Building2,
  Loader2,
  MapPin,
  Play,
  Satellite,
} from "lucide-react";

import { analyzeSite } from "@/api/siteApi";
import { AgentChatPanel } from "@/components/AgentChatPanel";
import { DataTransparencyNotice } from "@/components/DataTransparencyNotice";
import { InfrastructureLayerPanel } from "@/components/InfrastructureLayerPanel";
import { InfrastructureSelector } from "@/components/InfrastructureSelector";
import { MapPanel } from "@/components/MapPanel";
import { ReadinessReportPanel } from "@/components/ReadinessReportPanel";
import { ScenarioSelector, scenarioLabels } from "@/components/ScenarioSelector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEFAULT_CITY } from "@/data/cityConfig";
import {
  defaultVisibleInfrastructureLayerIds,
  type InfrastructureLayerId,
  type InfrastructureLayerRuntimeState,
} from "@/data/infrastructureLayerRegistry";
import { candidateZones } from "@/data/mockGeoJson";
import { cn } from "@/lib/utils";
import type {
  InfrastructureType,
  ScenarioType,
  SelectedLocation,
  SiteAnalysisResult,
} from "@/types/site";

function App() {
  const [selectedLocation, setSelectedLocation] =
    useState<SelectedLocation | null>(null);
  const [infrastructureType, setInfrastructureType] =
    useState<InfrastructureType>("PUBLIC_AI_COMPUTE_HUB");
  const [scenario, setScenario] = useState<ScenarioType>("BUILD_NOW");
  const [activeInfrastructureLayerIds, setActiveInfrastructureLayerIds] =
    useState<InfrastructureLayerId[]>(defaultVisibleInfrastructureLayerIds);
  const [infrastructureLayerStates, setInfrastructureLayerStates] = useState<
    Partial<Record<InfrastructureLayerId, InfrastructureLayerRuntimeState>>
  >({});
  const [analysis, setAnalysis] = useState<SiteAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const handleLocationSelect = useCallback((location: SelectedLocation) => {
    setSelectedLocation(location);
    setAnalysis(null);
    setAnalysisError(null);
  }, []);

  const runAnalysis = useCallback(
    async (overrides?: Partial<{ infrastructureType: InfrastructureType; scenario: ScenarioType }>) => {
      if (!selectedLocation) {
        return;
      }

      setIsAnalyzing(true);
      setAnalysisError(null);
      try {
        const result = await analyzeSite({
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
          infrastructureType:
            overrides?.infrastructureType ?? infrastructureType,
          activeLayers: activeInfrastructureLayerIds,
          scenario: overrides?.scenario ?? scenario,
        });
        setAnalysis(result);
      } catch {
        setAnalysisError("Unable to generate the mock readiness blueprint.");
      } finally {
        setIsAnalyzing(false);
      }
    },
    [activeInfrastructureLayerIds, infrastructureType, scenario, selectedLocation]
  );

  function handleInfrastructureLayerToggle(layerId: InfrastructureLayerId) {
    setActiveInfrastructureLayerIds((current) =>
      current.includes(layerId)
        ? current.filter((item) => item !== layerId)
        : [...current, layerId]
    );
  }

  const handleInfrastructureLayerStateChange = useCallback(
    (layerId: InfrastructureLayerId, state: InfrastructureLayerRuntimeState) => {
      setInfrastructureLayerStates((current) => ({
        ...current,
        [layerId]: state,
      }));
    },
    []
  );

  function handleInfrastructureChange(next: InfrastructureType) {
    setInfrastructureType(next);
    if (analysis) {
      void runAnalysis({ infrastructureType: next });
    }
  }

  function handleScenarioChange(next: ScenarioType) {
    setScenario(next);
    if (analysis) {
      void runAnalysis({ scenario: next });
    }
  }

  const selectedZone = selectedLocation
    ? candidateZones.find(
        (zone) =>
          Math.abs(zone.lat - selectedLocation.lat) < 0.0001 &&
          Math.abs(zone.lng - selectedLocation.lng) < 0.0001
      )
    : null;
  const selectedZoneId = selectedZone?.id ?? null;
  const selectedSiteName =
    selectedZone?.label ?? selectedLocation?.label ?? "Custom Saigon site";
  const selectedSiteContext =
    selectedZone?.description ?? "User-selected point inside the Saigon planning area.";
  const selectedCoordinates = selectedLocation
    ? `${selectedLocation.lat.toFixed(5)}, ${selectedLocation.lng.toFixed(5)}`
    : "Choose a candidate site or click the map";

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[linear-gradient(180deg,#0a1420_0%,#0d1724_48%,#09111c_100%)] xl:h-screen xl:overflow-hidden">
      <div className="flex min-h-screen w-full flex-col gap-5 px-4 py-4 lg:px-6 xl:h-screen xl:min-h-0 2xl:px-8">
        <header className="civic-panel flex shrink-0 flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-primary/12 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-normal">
                  InfraAI SiteCompass
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Open-data satellite infrastructure planning
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Open data</Badge>
            <Badge variant="warning">Human review required</Badge>
            <Badge variant="secondary">Satellite layer</Badge>
          </div>
        </header>

        <div className="grid flex-1 gap-5 xl:min-h-0 xl:dashboard-three-panel xl:items-stretch">
          <section className="civic-panel space-y-5 p-5 xl:h-full xl:min-h-0 xl:overflow-y-auto">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-base font-semibold">
                  <Satellite className="h-4 w-4 text-primary" />
                  Infrastructure satellite map
                </div>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Toggle open-data infrastructure layers and inspect mapped city
                  assets before future scoring or AI recommendations are added.
                </p>
              </div>
              <Badge variant="outline">Planning region: {DEFAULT_CITY.label}</Badge>
            </div>

            <MapPanel
              selectedLocation={selectedLocation}
              activeInfrastructureLayerIds={activeInfrastructureLayerIds}
              onInfrastructureLayerStateChange={
                handleInfrastructureLayerStateChange
              }
              onLocationSelect={handleLocationSelect}
            />

            <DataTransparencyNotice />

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">Candidate sites</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Start with a civic, technology, or logistics-adjacent zone.
                  </p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {candidateZones.map((zone) => (
                  <button
                    key={zone.id}
                    type="button"
                    className={cn(
                      "rounded-xl border bg-background/35 p-3 text-left transition hover:border-primary/60 hover:bg-secondary/50",
                      selectedZoneId === zone.id &&
                        "border-primary bg-primary/10 shadow-[0_0_0_1px_rgb(82_184_214_/0.2)]"
                    )}
                    onClick={() =>
                      handleLocationSelect({
                        lat: zone.lat,
                        lng: zone.lng,
                        label: zone.label,
                      })
                    }
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{zone.label}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {zone.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <div className="grid gap-3 lg:grid-cols-2">
              <InfrastructureSelector
                value={infrastructureType}
                onChange={handleInfrastructureChange}
              />
              <ScenarioSelector
                value={scenario}
                onChange={handleScenarioChange}
              />
            </div>

            <section className="rounded-xl border bg-background/35 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Selected site
                    </p>
                    <h2 className="mt-1 text-lg font-semibold">
                      {selectedLocation ? selectedSiteName : "Awaiting site selection"}
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                      {selectedLocation
                        ? selectedSiteContext
                        : "Choose a candidate site or click the map to begin a planning review."}
                    </p>
                  </div>
                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <StatusItem label="Coordinates" value={selectedCoordinates} />
                    <StatusItem label="Scenario" value={scenarioLabels[scenario]} />
                  </div>
                </div>

                <Button
                  type="button"
                  className="h-11 min-w-[170px] gap-2 self-start lg:self-center"
                  disabled={!selectedLocation || isAnalyzing}
                  onClick={() => void runAnalysis()}
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Analyze site
                </Button>
              </div>

              {analysisError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>{analysisError}</AlertDescription>
                </Alert>
              )}
            </section>

            <InfrastructureLayerPanel
              activeLayerIds={activeInfrastructureLayerIds}
              layerStates={infrastructureLayerStates}
              onToggleLayer={handleInfrastructureLayerToggle}
            />
          </section>

          <section className="min-h-[620px] xl:h-full xl:min-h-0">
            <AgentChatPanel
              selectedLocation={selectedLocation}
              analysis={analysis}
            />
          </section>

          <section className="min-h-[620px] xl:h-full xl:min-h-0">
            <ReadinessReportPanel
              analysis={analysis}
              isLoading={isAnalyzing}
              scenarioLabel={scenarioLabels[scenario]}
              selectedLocation={selectedLocation}
            />
          </section>
        </div>

        <footer className="civic-panel flex shrink-0 flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-muted-foreground">
          <span>
            Demo planning data for Saigon. Recommendations require engineering,
            environmental, and public-sector review.
          </span>
          <span className="flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
            FastAPI-ready endpoints: analyze site and planning chat
          </span>
        </footer>
      </div>
    </main>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card/45 p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-1 font-semibold", !value && "text-muted-foreground")}>
        {value}
      </p>
    </div>
  );
}

export default App;
