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
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {scenarioOptions.map(([optionValue, label]) => (
            <SelectItem key={optionValue} value={optionValue}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
