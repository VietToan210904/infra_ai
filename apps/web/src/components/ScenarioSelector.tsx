import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ScenarioType } from "@/types/site";

export const scenarioLabels: Record<ScenarioType, string> = {
  BUILD_NOW: "Build now",
  UPGRADE_FIBER_FIRST: "Upgrade fiber first",
  VALIDATE_GRID_FIRST: "Validate grid capacity first",
  AI_LITERACY_TRAINING: "Launch AI literacy training",
  CLOUD_FIRST: "Cloud-first instead of local infrastructure",
  DELAY_INVESTMENT: "Delay investment",
  GOVERNANCE_FIRST: "Governance first",
  EDGE_PILOT_FIRST: "Edge pilot first",
  OPEN_DATA_PLATFORM_FIRST: "Open data platform first",
};

export const scenarioDetails: Record<
  ScenarioType,
  { label: string; description: string; changes: string }
> = {
  BUILD_NOW: {
    label: scenarioLabels.BUILD_NOW,
    description: "Baseline view with no assumed intervention.",
    changes: "No component deltas.",
  },
  UPGRADE_FIBER_FIRST: {
    label: scenarioLabels.UPGRADE_FIBER_FIRST,
    description: "Assumes fiber and digital access upgrades happen before larger AI investment.",
    changes: "+connectivity, +digital access, +resilience.",
  },
  VALIDATE_GRID_FIRST: {
    label: scenarioLabels.VALIDATE_GRID_FIRST,
    description: "Assumes utility validation improves power evidence and reliability.",
    changes: "+power, +data completeness, +source reliability.",
  },
  AI_LITERACY_TRAINING: {
    label: scenarioLabels.AI_LITERACY_TRAINING,
    description: "Assumes training improves human readiness and adoption capacity.",
    changes: "+AI literacy, +sector demand, +equity.",
  },
  CLOUD_FIRST: {
    label: scenarioLabels.CLOUD_FIRST,
    description: "Assumes cloud-first delivery reduces local facility burden.",
    changes: "+cooling/water, +physical feasibility, +data maturity, -local compute ecosystem.",
  },
  DELAY_INVESTMENT: {
    label: scenarioLabels.DELAY_INVESTMENT,
    description: "Assumes delayed action weakens data freshness and momentum.",
    changes: "-data freshness, -sector demand, -resilience.",
  },
  GOVERNANCE_FIRST: {
    label: scenarioLabels.GOVERNANCE_FIRST,
    description: "Assumes policy, controls, and data governance are improved first.",
    changes: "+governance, +data maturity, +source reliability.",
  },
  EDGE_PILOT_FIRST: {
    label: scenarioLabels.EDGE_PILOT_FIRST,
    description: "Assumes small edge pilots improve local service readiness.",
    changes: "+resilience, +connectivity, +sector demand, +physical feasibility.",
  },
  OPEN_DATA_PLATFORM_FIRST: {
    label: scenarioLabels.OPEN_DATA_PLATFORM_FIRST,
    description: "Assumes city data platform foundations are built first.",
    changes: "+data maturity, +governance, +digital access.",
  },
};

const scenarioOptions = Object.entries(scenarioLabels) as Array<
  [ScenarioType, string]
>;

interface ScenarioSelectorProps {
  value: ScenarioType;
  onChange: (value: ScenarioType) => void;
}

export function ScenarioSelector({ value, onChange }: ScenarioSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium uppercase text-muted-foreground">
        Planning scenario
      </label>
      <Select value={value} onValueChange={(next) => onChange(next as ScenarioType)}>
        <SelectTrigger aria-label="Planning scenario">
          <SelectValue>{scenarioDetails[value].label}</SelectValue>
        </SelectTrigger>
        <SelectContent className="w-[min(92vw,360px)]">
          {scenarioOptions.map(([optionValue, label]) => (
            <SelectItem key={optionValue} value={optionValue}>
              <div className="flex min-w-0 flex-col gap-0.5 py-1">
                <span className="truncate">{label}</span>
                <span className="max-w-[300px] whitespace-normal text-xs leading-snug text-muted-foreground">
                  {scenarioDetails[optionValue].changes}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {scenarioDetails[value].description}
      </p>
    </div>
  );
}
