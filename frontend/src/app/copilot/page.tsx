"use client";
import { useState, useCallback, useEffect, useMemo } from "react";
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
import Sidebar from "@/components/liquid-glass/Sidebar";
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
    text: "text-neutral-500",
    badge: "bg-black/[0.05] text-neutral-600",
  },
  medium: {
    text: "text-amber-600",
    badge: "text-amber-700",
  },
  high: {
    text: "text-amber-600",
    badge: "text-amber-700",
  },
  critical: {
    text: "text-red-500",
    badge: "text-red-600",
  },
};

const URGENCY_BADGE_BG: Record<string, string> = {
  low: "rgba(0,0,0,0.05)",
  medium: "rgba(245,158,11,0.14)",
  high: "rgba(245,158,11,0.14)",
  critical: "rgba(220,38,38,0.12)",
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

  const bgStyle = useMemo(
    () => ({
      background:
        "linear-gradient(180deg, #0a3a63 0%, #08265a 45%, #061a4a 100%)",
    }),
    [],
  );

  const columns = useMemo(
    () => [
      {
        flex: 1.2,
        bg: "linear-gradient(180deg, #4aa3c9 0%, #0c2f7a 62%, #061a4a 100%)",
      },
      {
        flex: 1.0,
        bg: "linear-gradient(180deg, #1fae9e 0%, #0d3a7e 60%, #06214f 100%)",
      },
      {
        flex: 1.35,
        bg: "linear-gradient(180deg, #6fbfe6 0%, #123f86 58%, #07235a 100%)",
      },
      {
        flex: 0.75,
        bg: "linear-gradient(180deg, #a9d8f2 0%, #2f78c0 40%, #0a2c6e 100%)",
      },
      {
        flex: 1.1,
        bg: "linear-gradient(360deg, #7cc4ec 0%, #123c82 60%, #08245a 100%)",
      },
      {
        flex: 1.0,
        bg: "linear-gradient(180deg, #2bb6cf 0%, #0d3480 58%, #061f52 100%)",
      },
      {
        flex: 1.28,
        bg: "linear-gradient(180deg, #57a8e0 0%, #103a82 60%, #071f56 100%)",
      },
      {
        flex: 0.85,
        bg: "linear-gradient(180deg, #22b3a6 0%, #0e3c7e 55%, #063a5e 100%)",
      },
      {
        flex: 1.15,
        bg: "linear-gradient(180deg, #86cbef 0%, #123f88 60%, #07225a 100%)",
      },
    ],
    [],
  );

  return (
    <div className="min-h-screen w-full flex overflow-hidden" style={bgStyle}>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute inset-0 flex gap-2 px-1"
          style={{ filter: "blur(9px)" }}
        >
          {columns.map((c, i) => (
            <div
              key={i}
              className="-mt-[9%] h-[118%] rounded-[140px] wallpaper-col"
              style={{
                flex: c.flex,
                background: c.bg,
                animationDelay: `${i * 0.6}s`,
              }}
            />
          ))}
        </div>
        <div
          className="absolute rounded-[120px] wallpaper-capsule-a"
          style={{
            width: 130,
            height: 230,
            top: "26%",
            left: "47%",
            background: "linear-gradient(180deg, #a9d8f2, #123f86)",
            filter: "blur(7px)",
          }}
        />
        <div
          className="absolute rounded-full wallpaper-capsule-b"
          style={{
            width: 150,
            height: 190,
            top: "44%",
            left: "45%",
            background: "linear-gradient(180deg, #6fbfe6, #0a2c6e)",
            filter: "blur(7px)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(1200px 700px at 20% 0%, rgba(255,255,255,0.16), rgba(255,255,255,0) 55%)," +
              "linear-gradient(180deg, rgba(4,18,54,0.15), rgba(4,18,54,0.35))",
          }}
        />
      </div>

      <div className="relative z-10 flex w-full">
        <Sidebar />

        <main className="flex-1 h-screen overflow-hidden flex flex-col p-8 gap-4">
          <div className="flex items-center justify-between flex-shrink-0">
            <div>
              <h1 className="cursive text-[44px] font-bold leading-tight text-white drop-shadow-[0_2px_18px_rgba(4,18,54,0.5)] flex items-center gap-3">
                <Brain className="w-8 h-8 text-white/80" />
                Copilot
              </h1>
              <p className="text-[13px] text-white/70 mt-1 ml-1">
                Bottleneck detection · OR-Tools optimization · AI planning
              </p>
            </div>
            <button
              onClick={runAnalysis}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-[14px] text-[13px] font-bold text-white shadow-[0_10px_20px_-6px_rgba(6,95,70,0.5)] disabled:opacity-60 transition-opacity"
              style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Analyzing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" /> Run Analysis
                </>
              )}
            </button>
          </div>

          {error && (
            <div
              className="flex-shrink-0 px-4 py-2 rounded-[12px] text-[13px] text-white"
              style={{
                background: "linear-gradient(120deg, #c0603f, #a84a34)",
              }}
            >
              {error}
            </div>
          )}

          <div className="flex flex-1 gap-4 min-h-0 overflow-hidden">
            <div className="flex flex-col gap-4 w-[280px] flex-shrink-0 overflow-y-auto">
              <div className="glass rounded-[22px] p-5">
                <div className="text-[11px] font-semibold text-neutral-500 uppercase mb-4">
                  System Health Radar
                </div>
                {radarData.length > 0 ? (
                  <div className="h-[230px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} cx="50%" cy="50%">
                        <PolarGrid stroke="rgba(0,0,0,0.1)" />
                        <PolarAngleAxis
                          dataKey="metric"
                          tick={{
                            fontSize: 12,
                            fill: "#475569",
                            fontWeight: 600,
                          }}
                        />
                        <Radar
                          name="Utilization"
                          dataKey="value"
                          stroke="#059669"
                          fill="#059669"
                          fillOpacity={0.16}
                          strokeWidth={2}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[230px] flex items-center justify-center text-[13px] text-neutral-500">
                    Waiting for data...
                  </div>
                )}
              </div>

              {metrics && (
                <div className="glass rounded-[22px] p-5 space-y-3">
                  <div className="text-[11px] font-semibold text-neutral-500 uppercase">
                    Current Metrics
                  </div>
                  {[
                    [
                      "Avg Wait",
                      formatTime(metrics.avg_wait_time),
                      metrics.avg_wait_time > 120
                        ? "text-red-500"
                        : metrics.avg_wait_time > 80
                          ? "text-amber-500"
                          : "text-emerald-600",
                    ],
                    [
                      "Bed Util",
                      formatPercent(metrics.bed_utilization),
                      metrics.bed_utilization > 0.92
                        ? "text-red-500"
                        : "text-neutral-800",
                    ],
                    [
                      "ICU Util",
                      formatPercent(metrics.icu_utilization),
                      metrics.icu_utilization > 0.9
                        ? "text-red-500"
                        : "text-neutral-800",
                    ],
                    [
                      "Staff Util",
                      formatPercent(metrics.staff_utilization),
                      "text-neutral-800",
                    ],
                    [
                      "Critical",
                      String(metrics.critical_patients),
                      metrics.critical_patients > 5
                        ? "text-red-500"
                        : "text-neutral-800",
                    ],
                  ].map(([label, val, colorClass]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between"
                    >
                      <span className="text-[13px] text-neutral-500">
                        {label}
                      </span>
                      <span
                        className={
                          "text-[15px] font-bold mono " + (colorClass as string)
                        }
                      >
                        {val}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col gap-4 overflow-y-auto min-w-0">
              {loading && (
                <div className="glass rounded-[22px] p-8 flex items-center justify-center gap-4">
                  <RefreshCw className="w-6 h-6 text-neutral-500 animate-spin" />
                  <div>
                    <div className="text-[15px] text-neutral-800 mb-1">
                      Running optimization engine...
                    </div>
                    <div className="text-[13px] text-neutral-500">
                      OR-Tools LP · SimPy state analysis · AI narrative
                    </div>
                  </div>
                </div>
              )}

              {analysis && !loading && (
                <>
                  {explanation && (
                    <div className="glass rounded-[22px] p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 rounded-[12px] bg-black/[0.05]">
                          <Brain className="w-5 h-5 text-neutral-500" />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-bold text-neutral-800">
                            AI COPILOT ANALYSIS
                          </span>
                          {explanation.severity && (
                            <span
                              className="text-[11px] font-medium px-2 py-1 rounded-[8px]"
                              style={{
                                color:
                                  explanation.severity === "critical"
                                    ? "#dc2626"
                                    : explanation.severity === "high"
                                      ? "#b45309"
                                      : "#4b5563",
                                background:
                                  explanation.severity === "critical"
                                    ? "rgba(220,38,38,0.12)"
                                    : explanation.severity === "high"
                                      ? "rgba(245,158,11,0.14)"
                                      : "rgba(0,0,0,0.05)",
                              }}
                            >
                              {explanation.severity.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-[15px] text-neutral-800 leading-relaxed">
                        {explanation.explanation}
                      </p>
                    </div>
                  )}

                  {opt && (
                    <div className="glass rounded-[22px] overflow-hidden">
                      <div className="grid grid-cols-3 border-b border-black/[0.06]">
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
                            color: "text-neutral-800",
                          },
                          {
                            icon: Activity,
                            label: "Util Improvement",
                            value: `${(opt.predicted_utilization_improvement * 100).toFixed(0)}%`,
                            color: "text-neutral-800",
                          },
                        ].map((kpi, idx) => {
                          const Icon = kpi.icon;
                          return (
                            <div
                              key={kpi.label}
                              className={
                                "flex flex-col items-center justify-center py-5 text-center " +
                                (idx < 2 ? "border-r border-black/[0.06]" : "")
                              }
                            >
                              <Icon className={"w-5 h-5 mb-2 " + kpi.color} />
                              <div
                                className={
                                  "text-[17px] font-bold mono " + kpi.color
                                }
                              >
                                {kpi.value}
                              </div>
                              <div className="text-[11px] text-neutral-500 mt-1">
                                {kpi.label}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="p-6 space-y-5">
                        <div>
                          <div className="text-[11px] font-semibold text-neutral-500 uppercase mb-3">
                            Root Cause Analysis
                          </div>
                          <div className="space-y-2">
                            {opt.root_causes.map((cause, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-1" />
                                <span className="text-[13px] text-neutral-600 leading-relaxed">
                                  {cause}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] font-semibold text-neutral-500 uppercase mb-3">
                            Intervention Plan
                          </div>
                          <div className="space-y-2">
                            {opt.intervention_plan.map((step, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <div className="glass-soft w-6 h-6 rounded-[8px] text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 text-neutral-600">
                                  {i + 1}
                                </div>
                                <span className="text-[13px] text-neutral-800 leading-relaxed">
                                  {step}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {opt.recommendations.length > 0 && (
                          <div>
                            <div className="text-[11px] font-semibold text-neutral-500 uppercase mb-3">
                              Staff Reallocation
                            </div>
                            <div className="space-y-2">
                              {opt.recommendations.slice(0, 4).map((rec, i) => (
                                <div
                                  key={i}
                                  className="glass-soft flex items-center justify-between px-4 py-2 rounded-[14px]"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="text-[13px] text-neutral-800">
                                      {rec.department} — {rec.resource_type}
                                    </div>
                                    <div className="text-[11px] text-neutral-500 mt-1 truncate">
                                      {rec.reason}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                    <span className="text-[13px] mono text-neutral-500">
                                      {rec.current}
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-neutral-500" />
                                    <span
                                      className={
                                        "text-[13px] font-bold mono " +
                                        (URGENCY_CLASS[rec.urgency]?.text ??
                                          "text-neutral-800")
                                      }
                                    >
                                      {rec.recommended}
                                    </span>
                                    <span
                                      className={
                                        "text-[11px] font-bold mono px-2 py-1 rounded-[8px] " +
                                        (URGENCY_CLASS[rec.urgency]?.badge ??
                                          "text-neutral-800")
                                      }
                                      style={{
                                        background:
                                          URGENCY_BADGE_BG[rec.urgency] ??
                                          "rgba(0,0,0,0.05)",
                                      }}
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
                          <div className="glass-soft p-4 rounded-[16px]">
                            <div className="text-[11px] font-semibold text-neutral-500 uppercase mb-2">
                              AI Narrative
                            </div>
                            <p className="text-[13px] text-neutral-600 leading-relaxed">
                              {opt.ai_narrative.narrative}
                            </p>
                          </div>
                        )}

                        {snapshot && metrics && (
                          <div
                            className="rounded-[16px] p-4"
                            style={{
                              background:
                                "linear-gradient(150deg, rgba(167,220,190,0.5), rgba(140,200,170,0.3))",
                            }}
                          >
                            <div className="text-[11px] text-[#15603a] font-semibold uppercase mb-3">
                              Before → After Analysis
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              {[
                                {
                                  label: "Avg Wait",
                                  before: formatTime(snapshot.avg_wait_time),
                                  after: formatTime(metrics.avg_wait_time),
                                  better:
                                    metrics.avg_wait_time <
                                    snapshot.avg_wait_time,
                                },
                                {
                                  label: "Bed Util",
                                  before: formatPercent(
                                    snapshot.bed_utilization,
                                  ),
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
                                  className="glass-soft rounded-[12px] p-2"
                                >
                                  <div className="text-[10px] text-neutral-500 uppercase mb-1">
                                    {label}
                                  </div>
                                  <div className="text-[11px] text-neutral-400 mono line-through">
                                    {before}
                                  </div>
                                  <div
                                    className={
                                      "text-[13px] font-bold mono " +
                                      (better
                                        ? "text-emerald-600"
                                        : "text-red-500")
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
                              "w-full flex items-center justify-center gap-2 py-3.5 rounded-[16px] text-[13px] font-bold transition-opacity disabled:opacity-70 " +
                              (implemented ? "text-white" : "text-white")
                            }
                            style={{
                              background: implemented
                                ? "linear-gradient(135deg,#10b981,#059669)"
                                : "linear-gradient(135deg,#10b981,#059669)",
                            }}
                          >
                            {implemented ? (
                              <>
                                <CheckCircle className="w-5 h-5" /> All
                                recommendations applied to simulation
                              </>
                            ) : implementing ? (
                              <>
                                <RefreshCw className="w-5 h-5 animate-spin" />{" "}
                                Applying to simulation...
                              </>
                            ) : (
                              <>
                                <Play className="w-5 h-5" /> Implement All AI
                                Recommendations
                              </>
                            )}
                          </button>
                          {implemented && (
                            <p className="text-center text-[11px] text-white/70 mt-2">
                              Saved at {implementedAt} by clinician · Simulation
                              is updating — watch the floor plan for instant
                              impact
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
              <div className="glass rounded-[22px] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4 text-neutral-500" />
                  <span className="text-[11px] font-semibold text-neutral-500 uppercase">
                    Predicted Bottlenecks
                  </span>
                </div>

                {predictions.length === 0 ? (
                  <div className="text-center py-6 text-[13px] text-neutral-500">
                    {analysis
                      ? "No bottlenecks predicted"
                      : "Run analysis to see predictions"}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {predictions.map((pred, i) => {
                      const tone =
                        pred.severity === "critical"
                          ? { text: "text-red-500", bar: "#dc2626" }
                          : pred.severity === "warning"
                            ? { text: "text-amber-500", bar: "#f59e0b" }
                            : { text: "text-neutral-800", bar: "#6b7280" };
                      return (
                        <div key={i} className="glass-soft rounded-[16px] p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className={"text-[13px] font-bold " + tone.text}
                            >
                              {pred.department}
                            </span>
                            <span className="text-[11px] text-neutral-500">
                              ETA {pred.eta_minutes}m
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-500 mb-2">
                            {pred.metric}{" "}
                            {pred.trend_direction === "increasing" ? "↑" : "→"}
                          </div>
                          <div className="flex justify-between text-[11px] mono mb-2">
                            <span className="text-neutral-500">
                              Now {formatPercent(pred.current_value)}
                            </span>
                            <span className={tone.text}>
                              Peak {formatPercent(pred.predicted_breach)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-[6px] bg-black/[0.06] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${pred.confidence * 100}%`,
                                  background: tone.bar,
                                }}
                              />
                            </div>
                            <span className="text-[11px] mono text-neutral-500">
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
        </main>
      </div>
    </div>
  );
}
