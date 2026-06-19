import { Progress } from "@/components/ui/progress";
import type { ComponentScores } from "@/types/site";

const scoreRows: Array<{
  key: keyof ComponentScores;
  label: string;
}> = [
  { key: "power", label: "Power and grid readiness" },
  { key: "connectivity", label: "Connectivity and latency" },
  { key: "coolingWater", label: "Cooling and water feasibility" },
  { key: "physicalFeasibility", label: "Physical site feasibility" },
  { key: "computeEcosystem", label: "Compute ecosystem access" },
  { key: "sectorDemand", label: "Sector demand and public benefit" },
  { key: "governance", label: "Governance and responsible AI readiness" },
];

interface ComponentScoreBarsProps {
  scores: ComponentScores;
}

export function ComponentScoreBars({ scores }: ComponentScoreBarsProps) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Component readiness</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Scores are deterministic mock outputs for the current scenario.
        </p>
      </div>
      <div className="space-y-3">
        {scoreRows.map((row) => (
          <div key={row.key} className="space-y-1.5">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-medium text-foreground">{scores[row.key]}</span>
            </div>
            <Progress value={scores[row.key]} />
          </div>
        ))}
      </div>
    </section>
  );
}
