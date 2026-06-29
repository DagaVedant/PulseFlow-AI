"use client";
import { useState, useCallback, useEffect } from "react";
import {
  Brain,
  Zap,
  AlertTriangle,
  TrendingUp,
  Clock,
  Target,
  ChevronRight,
  RefreshCw,
  Activity,
  CheckCircle,
  Play,
} from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import { api } from "@/lib/api";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { formatTime, formatPercent, cn } from "@/lib/utils";
import type {
  CopilotAnalysis,
  StaffingRecommendation,
  HospitalMetrics,
} from "@/types";
import { useDemoStore } from "@/store/demoStore";

const URGENCY_CLASS: Record<string, { text: string; badge: string }> = {
  low: {
    text: "text-slate-600",
    badge: "bg-slate-100 text-slate-700 border border-clinical-border",
  },
  medium: {
    text: "text-amber-600",
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  high: {
    text: "text-amber-600",
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  critical: {
    text: "text-red-600",
    badge: "bg-red-50 text-red-700 border border-red-200",
  },
};

function recsToConfig(recs: StaffingRecommendation[]): Record<string, number> {
  const map: Record<string, Record<string, string>> = {
    ER: { doctors: "er_doctors", nurses: "er_nurses" },
    ICU: { doctors: "icu_doctors", nurses: "icu_nurses" },
    Ward: { doctors: "ward_doctors", nurses: "ward_nurses" },
    Laboratory: { technicians: "lab_technicians" },
  };
  const updates: Record<string, number> = {};
  for (const rec of recs) {
    const dept = map[rec.department];
    if (dept) {
      const key = dept[rec.resource_type];
      if (key) updates[key] = rec.recommended;
    }
  }
  return updates;
}

export default function CopilotPage() {
  const { hospitalState, setLatestOptimization } = useSimulationStore();
  const { updateConfig } = useWebSocket();

  const [analysis, setAnalysis] = useState<CopilotAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [implemented, setImplemented] = useState(false);
  const [implementing, setImplementing] = useState(false);
  const [implementedAt, setImplementedAt] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<HospitalMetrics | null>(null);

  const metrics = hospitalState?.metrics;

  const { pendingAction, clearAction } = useDemoStore();
  useEffect(() => {
    if (pendingAction === "run_copilot") {
      clearAction();
      runAnalysis();
    }
  }, [pendingAction]);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    setImplemented(false);
    setSnapshot((hospitalState?.metrics as any) ?? null);
    try {
      const result = await api.getCopilotAnalysis();
      setAnalysis(result);
      if (result.optimization) setLatestOptimization(result.optimization);
    } catch (err: any) {
      setError(err?.message ?? "Analysis failed");
    } finally {
      setLoading(false);
    }
  }, [setLatestOptimization, hospitalState?.metrics]);

  const implementAll = useCallback(async () => {
    if (!analysis?.optimization?.recommendations?.length) return;
    setImplementing(true);
    const configUpdates = recsToConfig(analysis.optimization.recommendations);
    if (Object.keys(configUpdates).length > 0) {
      updateConfig(configUpdates);
      await new Promise((r) => setTimeout(r, 600));
    }
    setImplementedAt(new Date().toLocaleTimeString());
    setImplemented(true);
    setImplementing(false);
  }, [analysis, updateConfig]);

  const opt = analysis?.optimization;
  const explanation = analysis?.explanation;
  const predictions = analysis?.bottleneck_predictions ?? [];

  const radarData = metrics
    ? [
        { metric: "ER", value: Math.round(metrics.er_utilization * 100) },
        { metric: "ICU", value: Math.round(metrics.icu_utilization * 100) },
        { metric: "Beds", value: Math.round(metrics.bed_utilization * 100) },
        { metric: "Staff", value: Math.round(metrics.staff_utilization * 100) },
        {
          metric: "Flow",
          value: Math.min(100, Math.round(metrics.throughput_per_hour * 10)),
        },
      ]
    : [];

  return (
    <div className="flex flex-col h-full p-6 gap-6 overflow-hidden font-sans bg-clinical-canvas">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Brain className="w-6 h-6 text-slate-600" aria-hidden="true" />
            AI Operations Copilot
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Bottleneck detection · OR-Tools optimization · AI planning
          </p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="flex items-center gap-2 min-h-11 px-4 rounded-lg text-sm font-medium border border-clinical-border bg-clinical-surface text-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-60"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />{" "}
              Analyzing...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" aria-hidden="true" /> Run Analysis
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="flex-shrink-0 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-1 gap-6 min-h-0 overflow-hidden">
        <div className="flex flex-col gap-6 w-[300px] flex-shrink-0 overflow-y-auto">
          <div className="border border-clinical-border bg-clinical-surface rounded-lg p-4">
            <div className="text-xs text-slate-600 font-medium uppercase mb-4">
              System Health Radar
            </div>
            {radarData.length > 0 ? (
              <div className="h-[256px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%">
                    <PolarGrid stroke="#E2E8F0" />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fontSize: 12, fill: "#475569", fontWeight: 600 }}
                    />
                    <Radar
                      name="Utilization"
                      dataKey="value"
                      stroke="#475569"
                      fill="#475569"
                      fillOpacity={0.12}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[256px] flex items-center justify-center text-sm text-slate-600">
                Waiting for data...
              </div>
            )}
          </div>

          {metrics && (
            <div className="border border-clinical-border bg-clinical-surface rounded-lg p-4 space-y-4">
              <div className="text-xs text-slate-600 font-medium uppercase">
                Current Metrics
              </div>
              {[
                [
                  "Avg Wait",
                  formatTime(metrics.avg_wait_time),
                  metrics.avg_wait_time > 120
                    ? "text-red-600"
                    : metrics.avg_wait_time > 80
                      ? "text-amber-600"
                      : "text-emerald-600",
                ],
                [
                  "Bed Util",
                  formatPercent(metrics.bed_utilization),
                  metrics.bed_utilization > 0.92
                    ? "text-red-600"
                    : "text-slate-900",
                ],
                [
                  "ICU Util",
                  formatPercent(metrics.icu_utilization),
                  metrics.icu_utilization > 0.9
                    ? "text-red-600"
                    : "text-slate-900",
                ],
                [
                  "Staff Util",
                  formatPercent(metrics.staff_utilization),
                  "text-slate-900",
                ],
                [
                  "Critical",
                  String(metrics.critical_patients),
                  metrics.critical_patients > 5
                    ? "text-red-600"
                    : "text-slate-900",
                ],
              ].map(([label, val, colorClass]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{label}</span>
                  <span
                    className={
                      "text-base font-bold font-mono " + (colorClass as string)
                    }
                  >
                    {val}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col gap-6 overflow-y-auto min-w-0">
          {loading && (
            <div className="border border-clinical-border bg-clinical-surface rounded-lg p-8 flex items-center justify-center gap-4">
              <RefreshCw
                className="w-6 h-6 text-slate-600 animate-spin"
                aria-hidden="true"
              />
              <div>
                <div className="text-base text-slate-900 mb-1">
                  Running optimization engine...
                </div>
                <div className="text-sm text-slate-600">
                  OR-Tools LP · SimPy state analysis · AI narrative
                </div>
              </div>
            </div>
          )}

          {analysis && !loading && (
            <>
              {explanation && (
                <div className="border border-clinical-border bg-clinical-surface rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-slate-100">
                      <Brain
                        className="w-5 h-5 text-slate-600"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">
                        AI COPILOT ANALYSIS
                      </span>
                      {explanation.severity && (
                        <span
                          className={cn(
                            "text-xs font-medium px-2 py-1 rounded border",
                            explanation.severity === "critical"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : explanation.severity === "high"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-slate-100 text-slate-700 border-clinical-border",
                          )}
                        >
                          {explanation.severity.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-base text-slate-900 leading-relaxed">
                    {explanation.explanation}
                  </p>
                </div>
              )}

              {opt && (
                <div className="border border-clinical-border bg-clinical-surface rounded-lg overflow-hidden">
                  <div className="grid grid-cols-3 border-b border-clinical-border">
                    {[
                      {
                        icon: Clock,
                        label: "Wait Reduction",
                        value: `${opt.predicted_wait_reduction.toFixed(0)}m`,
                        color: "text-emerald-600",
                      },
                      {
                        icon: TrendingUp,
                        label: "Throughput +",
                        value: `${opt.predicted_throughput_increase.toFixed(0)}%`,
                        color: "text-slate-900",
                      },
                      {
                        icon: Activity,
                        label: "Util Improvement",
                        value: `${(opt.predicted_utilization_improvement * 100).toFixed(0)}%`,
                        color: "text-slate-900",
                      },
                    ].map((kpi, idx) => {
                      const Icon = kpi.icon;
                      return (
                        <div
                          key={kpi.label}
                          className={
                            "flex flex-col items-center justify-center py-6 text-center " +
                            (idx < 2 ? "border-r border-clinical-border" : "")
                          }
                        >
                          <Icon
                            className={"w-5 h-5 mb-2 " + kpi.color}
                            aria-hidden="true"
                          />
                          <div
                            className={
                              "text-lg font-bold font-mono " + kpi.color
                            }
                          >
                            {kpi.value}
                          </div>
                          <div className="text-xs text-slate-600 mt-1">
                            {kpi.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-6 space-y-6">
                    <div>
                      <div className="text-xs text-slate-600 font-medium uppercase mb-4">
                        Root Cause Analysis
                      </div>
                      <div className="space-y-2">
                        {opt.root_causes.map((cause, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <AlertTriangle
                              className="w-4 h-4 text-amber-600 flex-shrink-0 mt-1"
                              aria-hidden="true"
                            />
                            <span className="text-sm text-slate-600 leading-relaxed">
                              {cause}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-600 font-medium uppercase mb-4">
                        Intervention Plan
                      </div>
                      <div className="space-y-2">
                        {opt.intervention_plan.map((step, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 bg-slate-100 text-slate-600 border border-clinical-border">
                              {i + 1}
                            </div>
                            <span className="text-sm text-slate-900 leading-relaxed">
                              {step}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {opt.recommendations.length > 0 && (
                      <div>
                        <div className="text-xs text-slate-600 font-medium uppercase mb-4">
                          Staff Reallocation
                        </div>
                        <div className="space-y-2">
                          {opt.recommendations.slice(0, 4).map((rec, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between px-4 py-2 rounded-lg border border-clinical-border bg-clinical-surface"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-sm text-slate-900">
                                  {rec.department} — {rec.resource_type}
                                </div>
                                <div className="text-xs text-slate-600 mt-1 truncate">
                                  {rec.reason}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                <span className="text-sm font-mono text-slate-600">
                                  {rec.current}
                                </span>
                                <ChevronRight
                                  className="w-4 h-4 text-slate-600"
                                  aria-hidden="true"
                                />
                                <span
                                  className={
                                    "text-sm font-bold font-mono " +
                                    (URGENCY_CLASS[rec.urgency]?.text ??
                                      "text-slate-900")
                                  }
                                >
                                  {rec.recommended}
                                </span>
                                <span
                                  className={
                                    "text-xs font-bold font-mono px-2 py-1 rounded " +
                                    (URGENCY_CLASS[rec.urgency]?.badge ??
                                      "bg-slate-100 text-slate-700 border border-clinical-border")
                                  }
                                >
                                  {rec.delta > 0 ? "+" : ""}
                                  {rec.delta}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {opt.ai_narrative?.narrative && (
                      <div className="p-4 rounded-lg border border-clinical-border bg-clinical-surface">
                        <div className="text-xs text-slate-600 font-medium uppercase mb-2">
                          AI Narrative
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {opt.ai_narrative.narrative}
                        </p>
                      </div>
                    )}

                    {snapshot && metrics && (
                      <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50">
                        <div className="text-xs text-emerald-700 font-medium uppercase mb-4">
                          Before → After Analysis
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          {[
                            {
                              label: "Avg Wait",
                              before: formatTime(snapshot.avg_wait_time),
                              after: formatTime(metrics.avg_wait_time),
                              better:
                                metrics.avg_wait_time < snapshot.avg_wait_time,
                            },
                            {
                              label: "Bed Util",
                              before: formatPercent(snapshot.bed_utilization),
                              after: formatPercent(metrics.bed_utilization),
                              better:
                                metrics.bed_utilization <
                                snapshot.bed_utilization,
                            },
                            {
                              label: "Critical",
                              before: String(snapshot.critical_patients),
                              after: String(metrics.critical_patients),
                              better:
                                metrics.critical_patients <
                                snapshot.critical_patients,
                            },
                          ].map(({ label, before, after, better }) => (
                            <div
                              key={label}
                              className="rounded bg-clinical-surface border border-clinical-border p-2"
                            >
                              <div className="text-xs text-slate-600 uppercase mb-1">
                                {label}
                              </div>
                              <div className="text-xs text-slate-600 font-mono line-through">
                                {before}
                              </div>
                              <div
                                className={
                                  "text-sm font-bold font-mono " +
                                  (better ? "text-emerald-600" : "text-red-600")
                                }
                              >
                                {after}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        onClick={implementAll}
                        disabled={implementing || implemented}
                        className={
                          "w-full flex items-center justify-center gap-2 min-h-11 py-4 rounded-lg text-sm font-bold border transition-colors " +
                          (implemented
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-clinical-surface border-clinical-border text-slate-900 hover:bg-slate-50 disabled:opacity-60")
                        }
                      >
                        {implemented ? (
                          <>
                            <CheckCircle
                              className="w-5 h-5"
                              aria-hidden="true"
                            />{" "}
                            All recommendations applied to simulation
                          </>
                        ) : implementing ? (
                          <>
                            <RefreshCw
                              className="w-5 h-5 animate-spin"
                              aria-hidden="true"
                            />{" "}
                            Applying to simulation...
                          </>
                        ) : (
                          <>
                            <Play className="w-5 h-5" aria-hidden="true" />{" "}
                            Implement All AI Recommendations
                          </>
                        )}
                      </button>
                      {implemented && (
                        <p className="text-center text-xs text-slate-600 mt-2">
                          Saved at {implementedAt} by clinician · Simulation is
                          updating — watch the floor plan for instant impact
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="w-[240px] flex flex-col gap-4 overflow-y-auto flex-shrink-0">
          <div className="border border-clinical-border bg-clinical-surface rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-slate-600" aria-hidden="true" />
              <span className="text-xs text-slate-600 font-medium uppercase">
                Predicted Bottlenecks
              </span>
            </div>

            {predictions.length === 0 ? (
              <div className="text-center py-6 text-sm text-slate-600">
                {analysis
                  ? "No bottlenecks predicted"
                  : "Run analysis to see predictions"}
              </div>
            ) : (
              <div className="space-y-4">
                {predictions.map((pred, i) => {
                  const tone =
                    pred.severity === "critical"
                      ? { text: "text-red-600", bar: "bg-red-600" }
                      : pred.severity === "warning"
                        ? { text: "text-amber-600", bar: "bg-amber-600" }
                        : { text: "text-slate-900", bar: "bg-slate-600" };
                  return (
                    <div
                      key={i}
                      className="border border-clinical-border bg-clinical-surface rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={"text-sm font-bold " + tone.text}>
                          {pred.department}
                        </span>
                        <span className="text-xs text-slate-600">
                          ETA {pred.eta_minutes}m
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mb-2">
                        {pred.metric}{" "}
                        {pred.trend_direction === "increasing" ? "↑" : "→"}
                      </div>
                      <div className="flex justify-between text-xs font-mono mb-2">
                        <span className="text-slate-600">
                          Now {formatPercent(pred.current_value)}
                        </span>
                        <span className={tone.text}>
                          Peak {formatPercent(pred.predicted_breach)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={"h-full rounded-full " + tone.bar}
                            style={{ width: `${pred.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-slate-600">
                          {Math.round(pred.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
