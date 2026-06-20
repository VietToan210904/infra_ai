import { Layers, LockKeyhole } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { LayerKey } from "@/types/site";

type LayerItem = {
  key: LayerKey | string;
  label: string;
  working: boolean;
};

const layerGroups: Array<{ title: string; items: LayerItem[] }> = [
  {
    title: "Infrastructure",
    items: [
      { key: "power_readiness", label: "Power readiness", working: false },
      { key: "connectivity", label: "Connectivity", working: false },
      { key: "cooling_water", label: "Cooling and water risk", working: false },
      { key: "physical_feasibility", label: "Physical feasibility", working: false },
    ],
  },
  {
    title: "Sector",
    items: [
      { key: "education", label: "Education readiness", working: true },
      { key: "workforce", label: "Workforce readiness", working: false },
      { key: "healthcare", label: "Healthcare readiness", working: true },
      { key: "government", label: "Government readiness", working: true },
      { key: "nonprofit", label: "Nonprofit readiness", working: false },
    ],
  },
  {
    title: "Readiness",
    items: [
      { key: "overall_readiness", label: "Overall readiness heatmap", working: true },
      { key: "digital_access_gap", label: "Digital access gap", working: false },
      { key: "ai_literacy_gap", label: "AI literacy gap", working: false },
      { key: "data_confidence", label: "Data confidence", working: false },
    ],
  },
];

interface LayerTogglePanelProps {
  activeLayers: LayerKey[];
  onToggleLayer: (layer: LayerKey) => void;
}

export function LayerTogglePanel({
  activeLayers,
  onToggleLayer,
}: LayerTogglePanelProps) {
  return (
    <section className="rounded-[20px] border bg-card/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Layers className="h-4 w-4 text-primary" />
            Planning layers
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Demo planning layers help orient the site review. They are not
            authoritative public records.
          </p>
        </div>
        <Badge variant="outline">Demo data</Badge>
      </div>

      <TooltipProvider delayDuration={150}>
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          {layerGroups.map((group) => (
            <div key={group.title} className="space-y-2">
              <div className="text-xs font-medium uppercase text-muted-foreground">
                {group.title}
              </div>
              <div className="flex flex-wrap gap-2">
                {group.items.map((item) => {
                  const isActive =
                    item.working && activeLayers.includes(item.key as LayerKey);
                  const control = (
                    <Button
                      type="button"
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      disabled={!item.working}
                      className={cn(
                        "h-8 rounded-full px-3 text-xs",
                        isActive && "border-primary",
                        !item.working &&
                          "border-border/70 bg-transparent text-muted-foreground/70"
                      )}
                      onClick={() => onToggleLayer(item.key as LayerKey)}
                    >
                      <span>{item.label}</span>
                      {!item.working && (
                        <LockKeyhole className="ml-1.5 h-3 w-3 shrink-0" />
                      )}
                    </Button>
                  );

                  if (item.working) {
                    return <div key={item.key}>{control}</div>;
                  }

                  return (
                    <Tooltip key={item.key}>
                      <TooltipTrigger asChild>
                        <div>{control}</div>
                      </TooltipTrigger>
                      <TooltipContent>
                        Planned layer for a later data integration.
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </TooltipProvider>
    </section>
  );
}
