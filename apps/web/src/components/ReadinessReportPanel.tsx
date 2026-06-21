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
  Bot,
} from "lucide-react";

import { HumanReviewWarning } from "@/components/HumanReviewWarning";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { planningFocusLabels } from "@/data/planningOptions";
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

function GapSummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background/35 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
        {label}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {value}
      </p>
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

function SectorCard({
  sector,
  index,
  evidence,
}: {
  sector: SectorReadiness;
  index: number;
  evidence: SiteAnalysisResult["matchedEvidence"];
}) {
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
          <div className="rounded-lg border bg-card/40 p-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Evidence
            </p>
            {evidence.length > 0 ? (
              <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-muted-foreground">
                {evidence.slice(0, 2).map((item) => (
                  <li key={`${sector.name}-${item.layerId}-${item.name}`}>
                    {item.name} ({item.layerLabel}
                    {item.distanceKm !== null
                      ? `, ${item.distanceKm.toFixed(2)} km`
                      : ""}
                    )
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                No direct sector-specific evidence was active for this sector.
                Treat the score as a proxy until better data is added.
              </p>
            )}
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
          Scorecard for infrastructure, sector readiness, gaps, and strategic next steps.
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

              <WhyThisScoreSection analysis={analysis} />

              <section className="space-y-3 rounded-[20px] border bg-background/35 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Bot className="h-4 w-4 text-primary" />
                    Agent review
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={analysis.agentReview.scoreReliability === "High" ? "success" : analysis.agentReview.scoreReliability === "Medium" ? "warning" : "outline"}>
                      {analysis.agentReview.scoreReliability} reliability
                    </Badge>
                    <Badge variant="outline">
                      {analysis.agentReview.usedLlm ? "LLM-assisted" : "Rule-based"}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {analysis.agentReview.summary}
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <AgentReviewList
                    title="Evidence strengths"
                    items={analysis.agentReview.evidenceStrengths}
                  />
                  <AgentReviewList
                    title="Evidence gaps"
                    items={analysis.agentReview.evidenceGaps}
                  />
                  <AgentReviewList
                    title="Challenged assumptions"
                    items={analysis.agentReview.challengedAssumptions}
                  />
                  <AgentReviewList
                    title="Next validation steps"
                    items={analysis.agentReview.nextValidationSteps}
                  />
                </div>
                <AgentReviewList
                  title="Uncertainty notes"
                  items={analysis.agentReview.uncertaintyNotes}
                />
                {analysis.agentReview.evidenceCitations.length > 0 && (
                  <AgentReviewList
                    title="Evidence citations"
                    items={analysis.agentReview.evidenceCitations}
                  />
                )}
                {analysis.agentReview.excludedEvidenceNotes.length > 0 && (
                  <AgentReviewList
                    title="Excluded evidence notes"
                    items={analysis.agentReview.excludedEvidenceNotes}
                  />
                )}
              </section>

              <section className="space-y-3 rounded-[20px] border bg-background/35 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <MapPin className="h-4 w-4 text-primary" />
                    Evidence used for scoring
                  </h3>
                  <Badge variant="outline">
                    {analysis.evidenceSummary.scoredLayerCount} scored layers
                  </Badge>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {analysis.evidenceSummary.summary}
                </p>
                <div className="grid gap-3 md:grid-cols-4">
                  <EvidenceMetric
                    label="Active layers"
                    value={analysis.evidenceSummary.activeLayerCount}
                  />
                  <EvidenceMetric
                    label="Real/open layers"
                    value={analysis.evidenceSummary.realOpenLayerCount}
                  />
                  <EvidenceMetric
                    label="Synthetic excluded"
                    value={analysis.evidenceSummary.syntheticLayerCount}
                  />
                  <EvidenceMetric
                    label="Nearest evidence"
                    value={
                      analysis.evidenceSummary.nearestEvidenceKm === null
                        ? "n/a"
                        : `${analysis.evidenceSummary.nearestEvidenceKm.toFixed(2)} km`
                    }
                  />
                </div>
                <p className="rounded-xl border bg-card/40 p-3 text-sm leading-relaxed text-muted-foreground">
                  {analysis.evidenceSummary.confidenceImpact}
                </p>
              </section>

              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold">Evidence-backed score drivers</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Each component score below shows the evidence used, the nearest
                    matched assets, and the data caveat. Feature counts indicate
                    mapped proximity, not verified capacity or feasibility.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {analysis.scoreDrivers.map((driver) => (
                    <ScoreDriverCard
                      key={driver.component}
                      driver={driver}
                      evidence={evidenceForDriver(analysis, driver)}
                    />
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Nearest matched evidence</h3>
                {analysis.matchedEvidence.length > 0 ? (
                  <div className="space-y-2">
                    {analysis.matchedEvidence.slice(0, 6).map((evidence) => (
                      <EvidenceCard
                        key={`${evidence.layerId}-${evidence.name}-${evidence.distanceKm}`}
                        evidence={evidence}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border bg-background/35 p-3 text-sm text-muted-foreground">
                    No nearby real/open evidence features were matched for the active layers.
                  </p>
                )}
              </section>

              <section className="grid gap-3 md:grid-cols-2">
                <AgentReviewList
                  title="Excluded synthetic context"
                  items={
                    analysis.excludedSyntheticLayers.length > 0
                      ? analysis.excludedSyntheticLayers.map(
                          (layer) => `${layer.layerLabel}: ${layer.reason}`
                        )
                      : ["No synthetic layers were active or excluded from scoring."]
                  }
                />
                <AgentReviewList
                  title="Validation checklist"
                  items={analysis.dataGaps}
                />
              </section>

              <section className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border bg-background/35 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Planning focus
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {planningFocusLabels[analysis.intent]}
                  </p>
                </div>
                <div className="rounded-xl border bg-background/35 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Recommended path
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {analysis.recommendedInfrastructurePath}
                  </p>
                </div>
                <div className="rounded-xl border bg-background/35 p-3 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Query summary
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {analysis.querySummary}
                  </p>
                </div>
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
                      <HorizontalBar label="Digital access" score={analysis.componentScores.digitalAccess} icon={<Wifi className="h-3 w-3" />} />
                      <HorizontalBar label="AI literacy" score={analysis.componentScores.aiLiteracy} icon={<BookOpen className="h-3 w-3" />} />
                      <HorizontalBar label="Data maturity" score={analysis.componentScores.dataMaturity} icon={<FileText className="h-3 w-3" />} />
                      <HorizontalBar label="Equity" score={analysis.componentScores.equity} icon={<HandHeart className="h-3 w-3" />} />
                      <HorizontalBar label="Resilience" score={analysis.componentScores.resilience} icon={<ShieldAlert className="h-3 w-3" />} />
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Confidence and data quality</h3>
                <p className="rounded-xl border bg-background/35 p-3 text-sm leading-relaxed text-muted-foreground">
                  {analysis.confidenceExplanation}
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <HorizontalBar label="Data completeness" score={analysis.componentScores.dataCompleteness} icon={<FileText className="h-3 w-3" />} />
                  <HorizontalBar label="Data freshness" score={analysis.componentScores.dataFreshness} icon={<TrendingUp className="h-3 w-3" />} />
                  <HorizontalBar label="Source reliability" score={analysis.componentScores.sourceReliability} icon={<ShieldAlert className="h-3 w-3" />} />
                  <HorizontalBar label="Geographic resolution" score={analysis.componentScores.geographicResolution} icon={<MapPin className="h-3 w-3" />} />
                </div>
              </section>

              <Separator />

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Gap summary</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <GapSummaryItem label="Digital access gap" value={analysis.gapSummary.digitalAccess} />
                  <GapSummaryItem label="AI literacy gap" value={analysis.gapSummary.aiLiteracy} />
                  <GapSummaryItem label="Infrastructure gap" value={analysis.gapSummary.infrastructure} />
                  <GapSummaryItem label="Data-quality gap" value={analysis.gapSummary.dataQuality} />
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
                    <SectorCard
                      key={sector.name}
                      sector={sector}
                      index={i}
                      evidence={sectorEvidence(analysis, sector.name)}
                    />
                  ))}
                </div>
              </section>

              <Separator />

              {/* ── Risks ── */}
              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldAlert className="h-4 w-4 text-amber-300" />
                  Main risks and guardrails
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {[...analysis.bottlenecks, ...analysis.warnings].map((risk, index) => (
                    <li key={`${risk}-${index}`} className="rounded-xl border bg-background/35 p-3">
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
            : "Click a location or choose a candidate zone to generate a readiness report."}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The report will summarize compute, connectivity, power, data, governance,
          AI literacy, sector readiness, and recommended first steps.
        </p>
      </div>
    </div>
  );
}

function AgentReviewList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border bg-card/40 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
        {title}
      </p>
      <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EvidenceMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border bg-card/40 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-primary">{value}</p>
    </div>
  );
}

function WhyThisScoreSection({ analysis }: { analysis: SiteAnalysisResult }) {
  const sortedDrivers = [...analysis.scoreDrivers].sort((a, b) => b.score - a.score);
  const strongest = sortedDrivers.slice(0, 3);
  const weakest = [...analysis.scoreDrivers].sort((a, b) => a.score - b.score).slice(0, 3);

  return (
    <section className="space-y-3 rounded-[20px] border bg-background/35 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Why this score?</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            The overall {analysis.suitability.score}/100 score is calculated from
            component scores, active real/open evidence layers, scenario
            assumptions, and data-quality confidence. Synthetic layers are shown
            as context but excluded from numeric scoring.
          </p>
        </div>
        <Badge variant={readinessVariantFromLevel(analysis.suitability.level)}>
          {analysis.suitability.level}
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <EvidenceMetric
          label="Matched evidence"
          value={analysis.evidenceSummary.matchedFeatureCount}
        />
        <EvidenceMetric
          label="Scored layers"
          value={analysis.evidenceSummary.scoredLayerCount}
        />
        <EvidenceMetric
          label="Synthetic excluded"
          value={analysis.evidenceSummary.syntheticLayerCount}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <DriverSummaryList title="What raises the score" drivers={strongest} />
        <DriverSummaryList title="What lowers the score" drivers={weakest} />
      </div>

      <div className="rounded-xl border border-amber-300/40 bg-amber-50/70 p-3 text-sm leading-relaxed text-amber-950">
        <span className="font-semibold">Important:</span> matched features are
        evidence volume and proximity. They do not prove grid capacity, fiber
        service level, cooling availability, land rights, permits, or project
        feasibility.
      </div>
    </section>
  );
}

function DriverSummaryList({
  title,
  drivers,
}: {
  title: string;
  drivers: SiteAnalysisResult["scoreDrivers"];
}) {
  return (
    <div className="rounded-xl border bg-card/40 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
        {title}
      </p>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        {drivers.map((driver) => (
          <li key={driver.component} className="flex items-start gap-2">
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: getScoreColor(driver.score) }}
            />
            <span>
              <span className="font-medium text-foreground">
                {driver.component}: {driver.score}/100
              </span>
              {driver.nearestEvidenceKm !== null
                ? `; nearest evidence ${driver.nearestEvidenceKm.toFixed(2)} km`
                : "; no direct nearby evidence"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function readinessVariantFromLevel(level: string): "success" | "warning" | "outline" {
  if (level.toLowerCase().includes("strong")) return "success";
  if (level.toLowerCase().includes("moderate")) return "warning";
  return "outline";
}

function ScoreDriverCard({
  driver,
  evidence,
}: {
  driver: SiteAnalysisResult["scoreDrivers"][number];
  evidence: SiteAnalysisResult["matchedEvidence"];
}) {
  return (
    <div className="rounded-xl border bg-background/35 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{driver.component}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {driver.evidenceCount} nearby feature(s)
            {driver.nearestEvidenceKm !== null
              ? `; nearest ${driver.nearestEvidenceKm.toFixed(2)} km`
              : ""}
          </p>
        </div>
        <Badge variant={getReadinessVariant(driver.score)}>{driver.score}</Badge>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {driver.explanation}
      </p>
      {driver.supportingLayers.length > 0 && (
        <p className="mt-2 text-xs text-slate-500">
          Layers: {driver.supportingLayers.join(", ")}
        </p>
      )}
      <div className="mt-3 rounded-lg border bg-card/40 p-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Evidence behind this component
        </p>
        {evidence.length > 0 ? (
          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
            {evidence.slice(0, 3).map((item) => (
              <li key={`${item.layerId}-${item.name}`} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>
                  {item.name} ({item.layerLabel}
                  {item.distanceKm !== null
                    ? `, ${item.distanceKm.toFixed(2)} km`
                    : ""}
                  ; confidence {item.sourceConfidence}; completeness{" "}
                  {item.dataCompleteness})
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            No direct real/open evidence feature was matched for this component.
            This score is a proxy or baseline until a relevant authoritative
            dataset is added.
          </p>
        )}
      </div>
      {driver.excludedSyntheticLayers.length > 0 && (
        <p className="mt-2 rounded-lg border border-amber-300/40 bg-amber-50/70 p-2 text-xs leading-relaxed text-amber-950">
          Synthetic context excluded from scoring:{" "}
          {driver.excludedSyntheticLayers.join(", ")}.
        </p>
      )}
    </div>
  );
}

function evidenceForDriver(
  analysis: SiteAnalysisResult,
  driver: SiteAnalysisResult["scoreDrivers"][number]
) {
  return analysis.matchedEvidence.filter((item) =>
    driver.supportingLayers.includes(item.layerLabel)
  );
}

function sectorEvidence(analysis: SiteAnalysisResult, sectorName: string) {
  const normalized = sectorName.toLowerCase();
  const layerTokens =
    normalized === "education"
      ? ["education"]
      : normalized === "healthcare"
        ? ["healthcare"]
        : normalized === "government"
          ? ["government", "public safety"]
          : normalized === "workforce"
            ? ["education", "tech", "research"]
            : normalized === "nonprofits"
              ? ["healthcare", "education", "government"]
              : [];

  return analysis.matchedEvidence.filter((item) =>
    layerTokens.some((token) => item.layerLabel.toLowerCase().includes(token))
  );
}

function EvidenceCard({
  evidence,
}: {
  evidence: SiteAnalysisResult["matchedEvidence"][number];
}) {
  return (
    <div className="rounded-xl border bg-background/35 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{evidence.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {evidence.layerLabel} · {evidence.assetType} · {evidence.source}
          </p>
        </div>
        <Badge variant="outline">
          {evidence.distanceKm === null
            ? evidence.relation
            : `${evidence.distanceKm.toFixed(2)} km`}
        </Badge>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Confidence: {evidence.sourceConfidence}; completeness:{" "}
        {evidence.dataCompleteness}. {evidence.dataLimitation}
      </p>
    </div>
  );
}
