import {
  FileText,
  MapPin,
  ShieldAlert,
  TrendingUp,
  Zap,
  Wifi,
  Droplets,
  Building,
  BookOpen,
  Users,
  HeartPulse,
  Landmark,
  HandHeart,
} from "lucide-react";

import { HumanReviewWarning } from "@/components/HumanReviewWarning";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { SelectedLocation, SiteAnalysisResult, SectorReadiness, ComponentScores } from "@/types/site";

interface ReadinessReportPanelProps {
  analysis: SiteAnalysisResult | null;
  isLoading: boolean;
  scenarioLabel: string;
  selectedLocation: SelectedLocation | null;
}

// ── Color helpers ──────────────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 65) return "#f59e0b";
  return "#ef4444";
}

function getReadinessLabel(score: number) {
  if (score >= 80) return "Strong";
  if (score >= 65) return "Moderate";
  return "Low";
}

function getReadinessVariant(score: number): "success" | "warning" | "outline" {
  if (score >= 80) return "success";
  if (score >= 65) return "warning";
  return "outline";
}

// ── Donut Chart ────────────────────────────────────────────────────────────
// Fixed canvas: 100×100 SVG + label below. Used for sector cards (size=100).

const CHART_W = 100; // fixed width for ALL sector charts
const CHART_H = 100; // fixed height for ALL sector charts

function DonutChart({ score, size = CHART_W, label }: { score: number; size?: number; label: string }) {
  const radius = (size - 18) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="flex flex-col items-center gap-1" style={{ width: CHART_W }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#334155" strokeWidth={9} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={9}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        {/* score number — always dark-friendly */}
        <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize={size * 0.22} fontWeight="700">
          {score}
        </text>
        <text x={size / 2} y={size / 2 + size * 0.18} textAnchor="middle"
          fill="#94a3b8" fontSize={size * 0.11}>
          /100
        </text>
      </svg>
      <span className="text-xs font-medium text-slate-400 text-center leading-tight">{label}</span>
    </div>
  );
}

// ── Radar Chart ────────────────────────────────────────────────────────────

function RadarChart({ scores }: { scores: ComponentScores }) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 76;
  const labels = ["Power", "Connectivity", "Cooling", "Feasibility", "Compute", "Demand", "Governance"];
  const values = [
    scores.power, scores.connectivity, scores.coolingWater,
    scores.physicalFeasibility, scores.computeEcosystem,
    scores.sectorDemand, scores.governance,
  ];
  const n = labels.length;

  function point(i: number, r: number) {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  }

  const gridLevels = [20, 40, 60, 80, 100];
  const dataPoints = values.map((v, i) => point(i, (v / 100) * maxR));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid rings */}
        {gridLevels.map((level) => {
          const pts = Array.from({ length: n }, (_, i) => point(i, (level / 100) * maxR));
          const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
          return <path key={level} d={path} fill="none" stroke="#2d3f55" strokeWidth={1} />;
        })}
        {/* Axis lines */}
        {Array.from({ length: n }, (_, i) => {
          const outer = point(i, maxR);
          return <line key={i} x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke="#2d3f55" strokeWidth={1} />;
        })}
        {/* Data polygon */}
        <path d={dataPath} fill="rgba(82,184,214,0.18)" stroke="#52b8d6" strokeWidth={2} />
        {/* Data points */}
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={getScoreColor(values[i])} stroke="#0f1e2e" strokeWidth={1} />
        ))}
        {/* Labels — bright enough on dark bg */}
        {Array.from({ length: n }, (_, i) => {
          const pos = point(i, maxR + 17);
          return (
            <text key={i} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle"
              fill="#0B0D17" fontSize={9} fontWeight="500">
              {labels[i]}
            </text>
          );
        })}
      </svg>
      <p className="text-xs font-medium text-slate-400">Infrastructure component scores</p>
    </div>
  );
}

// ── Horizontal Bar Chart ───────────────────────────────────────────────────

function HorizontalBar({ label, score, icon }: { label: string; score: number; icon: React.ReactNode }) {
  const color = getScoreColor(score);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        {/* label: use explicit light colour that reads on both dark card & beige bg */}
        <span className="flex items-center gap-1.5 text-slate-600">
          <span className="text-primary">{icon}</span>
          {label}
        </span>
        <span className="font-semibold tabular-nums" style={{ color }}>{score}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700/60">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ── Gauge Chart ────────────────────────────────────────────────────────────


function GaugeChart({ score, label }: { score: number; label: string }) {
  const color = getScoreColor(score);

  const W = CHART_W;
  const H = CHART_H;

  const cx = W / 2;
  const cy = H / 2 + 10;
  const r = 34;
  const sw = 8;

  const START = 225;
  const SPAN = 270;

  function polarXY(compassDeg: number, radius: number) {
    const rad = ((compassDeg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  function arcPath(fromDeg: number, toDeg: number) {
    const p1 = polarXY(fromDeg, r);
    const p2 = polarXY(toDeg, r);
    // Span always goes clockwise; use the actual angular difference
    const span = ((toDeg - fromDeg) + 360) % 360;
    const large = span > 180 ? 1 : 0;
    return `M${p1.x.toFixed(2)},${p1.y.toFixed(2)} A${r},${r} 0 ${large},1 ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }

  const fillEnd = START + (score / 100) * SPAN;

  // Needle tip & base (triangle shape)
  const tip = polarXY(fillEnd, r - 5);
  const bl = polarXY(fillEnd + 90, 4);
  const br = polarXY(fillEnd - 90, 4);

  // "0" and "100" labels just outside the arc ends
  const zeroPos = polarXY(START, r + 11);
  const endPos = polarXY(START + SPAN, r + 11);

  return (
    <div className="flex flex-col items-center gap-0" style={{ width: CHART_W }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Track */}
        <path d={arcPath(START, START + SPAN)} fill="none" stroke="#334155" strokeWidth={sw} strokeLinecap="round" />
        {/* Fill */}
        {score > 0 && (
          <path d={arcPath(START, fillEnd)} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" />
        )}
        {/* Needle triangle */}
        <polygon
          points={`${tip.x.toFixed(1)},${tip.y.toFixed(1)} ${bl.x.toFixed(1)},${bl.y.toFixed(1)} ${br.x.toFixed(1)},${br.y.toFixed(1)}`}
          fill="#e2e8f0"
        />
        {/* Pivot */}
        <circle cx={cx} cy={cy} r={3.5} fill="#475569" stroke="#e2e8f0" strokeWidth={1} />
        {/* Tick labels */}
        <text x={zeroPos.x} y={zeroPos.y} textAnchor="middle" dominantBaseline="middle" fill="#64748b" fontSize={7}>0</text>
        <text x={endPos.x} y={endPos.y} textAnchor="middle" dominantBaseline="middle" fill="#64748b" fontSize={7}>100</text>
      </svg>

      <div className="flex items-baseline gap-0.5 -mt-1">
        <span className="text-xl font-bold tabular-nums" style={{ color }}>{score}</span>
        <span className="text-[10px] text-slate-400">/100</span>
      </div>
      <span className="text-xs font-medium text-slate-400 mt-0.5 text-center leading-tight">{label}</span>
    </div>
  );
}

// ── Stacked Bar (use cases) ────────────────────────────────────────────────

function UseCasePills({ useCases }: { useCases: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {useCases.map((uc) => (
        <span key={uc} className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2.5 py-0.5 text-xs font-medium text-sky-300">
          {uc}
        </span>
      ))}
    </div>
  );
}

// ── Sector icons ───────────────────────────────────────────────────────────

const sectorMeta: Record<string, { icon: React.ReactNode; color: string }> = {
  Government: { icon: <Landmark className="h-4 w-4" />, color: "#f59e0b" },
  Education: { icon: <BookOpen className="h-4 w-4" />, color: "#38bdf8" },
  Workforce: { icon: <Users className="h-4 w-4" />, color: "#a78bfa" },
  Healthcare: { icon: <HeartPulse className="h-4 w-4" />, color: "#34d399" },
  Nonprofits: { icon: <HandHeart className="h-4 w-4" />, color: "#fb923c" },
};

// ── Sector Card with appropriate chart ────────────────────────────────────

function SectorCard({ sector, index }: { sector: SectorReadiness; index: number }) {
  const meta = sectorMeta[sector.name] ?? { icon: <Building className="h-4 w-4" />, color: "#94a3b8" };
  const variant = getReadinessVariant(sector.score);

  // Alternate chart types per card: donut (even) ↔ gauge (odd)
  const useDonut = index % 2 === 0;

  return (
    <div className="rounded-xl border bg-background/30 p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span style={{ color: meta.color }}>{meta.icon}</span>
          <h4 className="text-sm font-semibold">{sector.name}</h4>
        </div>
        <Badge variant={variant}>{sector.level}</Badge>
      </div>

      {/* Chart + info row */}
      <div className="flex items-start gap-4">
        {/*
          Fixed-width, fixed-height box so DonutChart and GaugeChart
          occupy exactly the same space regardless of type.
          CHART_W = 100, GaugeChart needs a bit more vertical room
          because score number sits below the SVG (+36px).
        */}
        <div
          className="shrink-0 flex flex-col items-center justify-start"
          style={{ width: CHART_W, minHeight: CHART_H + 36 }}
        >
          {useDonut
            ? <DonutChart score={sector.score} size={CHART_W} label="Readiness" />
            : <GaugeChart score={sector.score} label="Readiness" />
          }
        </div>

        <div className="flex-1 min-w-0 space-y-2 pt-1">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Main gap</p>
            <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{sector.mainGap}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Use cases</p>
            <UseCasePills useCases={sector.suggestedUseCases} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────

export function ReadinessReportPanel({
  analysis,
  isLoading,
  scenarioLabel,
  selectedLocation,
}: ReadinessReportPanelProps) {
  const readinessLabel = analysis ? getReadinessLabel(analysis.suitability.score) : null;
  const readinessVariant = analysis ? getReadinessVariant(analysis.suitability.score) : "outline";

  return (
    <Card className="flex min-h-[620px] flex-col rounded-xl shadow-none xl:h-full xl:min-h-0 xl:overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Readiness report
          </CardTitle>
          <Badge variant="secondary">{scenarioLabel}</Badge>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Executive summary for infrastructure, civic readiness, and next-step review.
        </p>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col">
        {isLoading ? (
          <ReportSkeleton />
        ) : analysis ? (
          <ScrollArea className="min-h-[520px] flex-1 pr-4 xl:min-h-0">
            <div className="space-y-6 pb-2">

              {/* ── Overall score ── */}
              <section className="rounded-[20px] border border-transparent bg-[linear-gradient(135deg,#245c7e,#327f78)] p-5 text-white shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase text-white/72">
                      Readiness score
                    </p>
                    <div className="mt-2 flex items-end gap-2">
                      <span className="text-5xl font-semibold tracking-normal">
                        {analysis.suitability.score}
                      </span>
                      <span className="pb-2 text-sm text-white/72">
                        / 100
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={readinessVariant}>
                      {readinessLabel} readiness
                    </Badge>
                    <Badge variant="outline" className="border-white/22 bg-white/12 text-white">
                      {analysis.suitability.confidence} confidence
                    </Badge>
                  </div>
                </div>
                <Progress
                  value={analysis.suitability.score}
                  className="mt-5 bg-white/24 [&>div]:bg-[linear-gradient(90deg,#f8ead3,#ffffff)]"
                />
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Executive summary</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {analysis.suitability.recommendation}
                </p>
              </section>

              <Separator />

              {/* ── Infrastructure radar ── */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Infrastructure readiness
                </h3>
                <div className="rounded-xl border bg-background/30 p-4">
                  <div className="flex flex-wrap items-center gap-6 justify-center">
                    <RadarChart scores={analysis.componentScores} />
                    <div className="flex-1 min-w-[160px] space-y-3">
                      <HorizontalBar label="Power capacity" score={analysis.componentScores.power} icon={<Zap className="h-3 w-3" />} />
                      <HorizontalBar label="Connectivity" score={analysis.componentScores.connectivity} icon={<Wifi className="h-3 w-3" />} />
                      <HorizontalBar label="Cooling & water" score={analysis.componentScores.coolingWater} icon={<Droplets className="h-3 w-3" />} />
                      <HorizontalBar label="Physical feasibility" score={analysis.componentScores.physicalFeasibility} icon={<Building className="h-3 w-3" />} />
                      <HorizontalBar label="Compute ecosystem" score={analysis.componentScores.computeEcosystem} icon={<TrendingUp className="h-3 w-3" />} />
                      <HorizontalBar label="Sector demand" score={analysis.componentScores.sectorDemand} icon={<Users className="h-3 w-3" />} />
                      <HorizontalBar label="Governance" score={analysis.componentScores.governance} icon={<Landmark className="h-3 w-3" />} />
                    </div>
                  </div>
                </div>
              </section>

              <Separator />

              {/* ── Sector readiness cards ── */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Building className="h-4 w-4 text-primary" />
                  Civic sector readiness
                </h3>
                <div className="space-y-3">
                  {analysis.sectors.map((sector, i) => (
                    <SectorCard key={sector.name} sector={sector} index={i} />
                  ))}
                </div>
              </section>

              <Separator />

              {/* ── Risks ── */}
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

              {/* ── Priority investments ── */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Priority investments</h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.priorityInvestments.map((inv) => (
                    <Badge key={inv} variant="outline" className="px-2.5 py-1">
                      {inv}
                    </Badge>
                  ))}
                </div>
              </section>

              {/* ── Roadmap ── */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Strategic roadmap</h3>
                <div className="space-y-2">
                  {analysis.roadmap.map((phase, i) => (
                    <div key={phase.horizon} className="rounded-xl border bg-background/35 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                          style={{ backgroundColor: ["#22c55e", "#f59e0b", "#38bdf8"][i] + "33", color: ["#22c55e", "#f59e0b", "#38bdf8"][i] }}
                        >
                          {i + 1}
                        </div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground">{phase.horizon}</p>
                      </div>
                      <ul className="space-y-1.5 text-sm text-muted-foreground">
                        {phase.actions.map((action) => (
                          <li key={action} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
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
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  );
}

function EmptyReportState({ selectedLocation }: { selectedLocation: SelectedLocation | null }) {
  return (
    <div className="flex min-h-[460px] flex-1 items-center justify-center rounded-xl border bg-background/35 p-6 text-center xl:min-h-0">
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
          The report will summarize infrastructure readiness, civic demand, main risks, and recommended first steps for a public-sector review.
        </p>
      </div>
    </div>
  );
}