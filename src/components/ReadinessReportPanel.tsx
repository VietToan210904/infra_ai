import { FileText, MapPin, ShieldAlert } from "lucide-react";

import { HumanReviewWarning } from "@/components/HumanReviewWarning";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { SelectedLocation, SiteAnalysisResult } from "@/types/site";

interface ReadinessReportPanelProps {
  analysis: SiteAnalysisResult | null;
  isLoading: boolean;
  scenarioLabel: string;
  selectedLocation: SelectedLocation | null;
}

export function ReadinessReportPanel({
  analysis,
  isLoading,
  scenarioLabel,
  selectedLocation,
}: ReadinessReportPanelProps) {
  const readinessLabel = analysis
    ? getReadinessLabel(analysis.suitability.score)
    : null;
  const readinessVariant =
    readinessLabel === "Strong"
      ? "success"
      : readinessLabel === "Moderate"
        ? "warning"
        : "outline";

  return (
    <Card className="flex min-h-[620px] flex-col rounded-xl shadow-none xl:h-[calc(100vh-132px)]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Readiness report
          </CardTitle>
          <Badge variant="secondary">{scenarioLabel}</Badge>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Executive summary for infrastructure, civic readiness, and next-step
          review.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {isLoading ? (
          <ReportSkeleton />
        ) : analysis ? (
          <ScrollArea className="min-h-[520px] flex-1 pr-4">
            <div className="space-y-5 pb-1">
              <section className="rounded-xl border bg-background/35 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Readiness score
                    </p>
                    <div className="mt-2 flex items-end gap-2">
                      <span className="text-5xl font-semibold tracking-normal">
                        {analysis.suitability.score}
                      </span>
                      <span className="pb-2 text-sm text-muted-foreground">
                        / 100
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={readinessVariant}>
                      {readinessLabel} readiness
                    </Badge>
                    <Badge variant="outline">
                      {analysis.suitability.confidence} confidence
                    </Badge>
                  </div>
                </div>
                <Progress value={analysis.suitability.score} className="mt-5" />
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Executive summary</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {analysis.suitability.recommendation}
                </p>
              </section>

              <Separator />

              <ReportScoreSection
                title="Infrastructure readiness"
                rows={[
                  ["Power capacity", analysis.componentScores.power],
                  ["Fiber connectivity", analysis.componentScores.connectivity],
                  ["Cooling and water", analysis.componentScores.coolingWater],
                  ["Land feasibility", analysis.componentScores.physicalFeasibility],
                ]}
              />
              <Separator />
              <ReportScoreSection
                title="Civic readiness"
                rows={[
                  ["Education readiness", getSectorScore(analysis, "Education")],
                  ["Workforce readiness", getSectorScore(analysis, "Workforce")],
                  ["Healthcare readiness", getSectorScore(analysis, "Healthcare")],
                  ["Government data readiness", getSectorScore(analysis, "Government")],
                ]}
              />
              <Separator />

              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldAlert className="h-4 w-4 text-amber-300" />
                  Main risks
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {analysis.bottlenecks.map((risk) => (
                    <li key={risk} className="rounded-xl border bg-background/35 p-3">
                      {risk}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Recommended next steps</h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.priorityInvestments.map((investment) => (
                    <Badge key={investment} variant="outline" className="px-2.5 py-1">
                      {investment}
                    </Badge>
                  ))}
                </div>
                <div className="rounded-xl border bg-background/35 p-3">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    First 0-6 months
                  </p>
                  <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                    {analysis.roadmap[0]?.actions.map((action) => (
                      <li key={action} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              <HumanReviewWarning />
            </div>
          </ScrollArea>
        ) : (
          <EmptyReportState selectedLocation={selectedLocation} />
        )}
      </CardContent>
    </Card>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-background/45 p-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-4 h-10 w-24" />
        <Skeleton className="mt-4 h-3 w-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-full" />
        ))}
      </div>
    </div>
  );
}

function EmptyReportState({
  selectedLocation,
}: {
  selectedLocation: SelectedLocation | null;
}) {
  return (
    <div className="flex min-h-[460px] flex-1 items-center justify-center rounded-xl border bg-background/35 p-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border bg-secondary/50 text-primary">
          <MapPin className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-base font-semibold">
          {selectedLocation
            ? "Run analysis to generate the readiness report"
            : "Choose a site on the map to generate a readiness report."}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The report will summarize infrastructure readiness, civic demand,
          main risks, and recommended first steps for a public-sector review.
        </p>
      </div>
    </div>
  );
}

function ReportScoreSection({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, number]>;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="space-y-3">
        {rows.map(([label, score]) => (
          <div key={label} className="rounded-xl border bg-background/30 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm text-slate-200">{label}</span>
              <ReadinessPill score={score} />
            </div>
            <Progress value={score} />
          </div>
        ))}
      </div>
    </section>
  );
}

function ReadinessPill({ score }: { score: number }) {
  const label = getReadinessLabel(score);
  const variant =
    label === "Strong" ? "success" : label === "Moderate" ? "warning" : "outline";

  return (
    <Badge variant={variant} className="shrink-0">
      {label} {score}
    </Badge>
  );
}

function getReadinessLabel(score: number) {
  if (score >= 80) {
    return "Strong";
  }
  if (score >= 65) {
    return "Moderate";
  }
  return "Low";
}

function getSectorScore(analysis: SiteAnalysisResult, name: string) {
  return analysis.sectors.find((sector) => sector.name === name)?.score ?? 0;
}
