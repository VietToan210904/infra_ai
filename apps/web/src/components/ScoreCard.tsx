import { Activity, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Suitability } from "@/types/site";

interface ScoreCardProps {
  suitability: Suitability;
}

export function ScoreCard({ suitability }: ScoreCardProps) {
  const confidenceVariant =
    suitability.confidence === "High"
      ? "success"
      : suitability.confidence === "Medium"
        ? "warning"
        : "outline";

  return (
    <section className="rounded-[20px] border bg-card/70 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4 text-primary" />
            Suitability score
          </div>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-4xl font-semibold tracking-normal">
              {suitability.score}
            </span>
            <span className="pb-1 text-sm text-muted-foreground">/100</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant={confidenceVariant}>{suitability.confidence} confidence</Badge>
          <Badge variant="secondary" className="gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            {suitability.level}
          </Badge>
        </div>
      </div>
      <Progress value={suitability.score} className="mt-4" />
    </section>
  );
}
