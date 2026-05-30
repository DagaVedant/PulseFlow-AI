/* AI Copilot page: bottleneck analysis, optimization recommendations, and the AI narrative. */
"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Zap, AlertTriangle, TrendingUp,
  Clock, Target, ChevronRight, RefreshCw, Activity, CheckCircle, Play
} from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import { api } from "@/lib/api";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend
} from "recharts";
import { formatTime, formatPercent, cn } from "@/lib/utils";
import type { CopilotAnalysis, StaffingRecommendation } from "@/types";
import { useDemoStore } from "@/store/demoStore";

const URGENCY_COLORS: Record<string, string> = {
  low: "#475569",
  medium: "#3b82f6",
  high: "#f59e0b",
  critical: "#ef4444",
};

function recsToConfig(recs: StaffingRecommendation[]): Record<string, number> {
  const map: Record<string, Record<string, string>> = {
    ER:        { doctors: "er_doctors",   nurses: "er_nurses" },
    ICU:       { doctors: "icu_doctors",  nurses: "icu_nurses" },
    Ward:      { doctors: "ward_doctors", nurses: "ward_nurses" },
    Laboratory:{ technicians: "lab_technicians" },
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
  const [snapshot, setSnapshot] = useState<typeof hospitalState["metrics"] | null>(null);

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
    setSnapshot(hospitalState?.metrics as any ?? null);
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
    setImplemented(true);
    setImplementing(false);
  }, [analysis, updateConfig]);

  const opt = analysis?.optimization;
  const explanation = analysis?.explanation;
  const predictions = analysis?.bottleneck_predictions ?? [];

  const radarData = metrics ? [
    { metric: "ER",    value: Math.round(metrics.er_utilization * 100) },
    { metric: "ICU",   value: Math.round(metrics.icu_utilization * 100) },
    { metric: "Beds",  value: Math.round(metrics.bed_utilization * 100) },
    { metric: "Staff", value: Math.round(metrics.staff_utilization * 100) },
    { metric: "Flow",  value: Math.min(100, Math.round(metrics.throughput_per_hour * 10)) },
  ] : [];

  return (
    <div className="flex flex-col h-full p-5 gap-4 overflow-hidden">

      {}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <Brain className="w-6 h-6 text-blue-400" />
            AI Operations Copilot
          </h1>
          <p className="text-sm text-slate-500 font-mono mt-0.5">
            Bottleneck detection · OR-Tools optimization · AI planning
          </p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-mono font-bold transition-all"
          style={{
            background: loading ? "rgba(59,130,246,0.1)" : "rgba(59,130,246,0.18)",
            border: "1px solid rgba(59,130,246,0.45)",
            color: loading ? "#60a5fa" : "#93c5fd",
          }}
        >
          {loading
            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing...</>
            : <><Zap className="w-4 h-4" /> Run Analysis</>
          }
        </button>
      </div>

      {error && (
        <div className="flex-shrink-0 px-4 py-3 rounded-xl bg-red-950/40 border border-red-800/40 text-red-400 text-sm font-mono">
          {error}
        </div>
      )}

      <div className="flex flex-1 gap-4 min-h-0 overflow-hidden">

        {}
        <div className="flex flex-col gap-4 w-[300px] flex-shrink-0 overflow-y-auto">

          {}
          <div
            className="rounded-2xl p-4"
            style={{ background: "rgba(10,14,26,0.8)", border: "1px solid rgba(59,130,246,0.12)" }}
          >
            <div className="text-xs text-slate-500 font-mono uppercase mb-3 tracking-wider">
              System Health Radar
            </div>
            {radarData.length > 0 ? (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%">
                    <PolarGrid stroke="rgba(59,130,246,0.12)" />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fontSize: 12, fill: "#64748b", fontFamily: "monospace", fontWeight: 600 }}
                    />
                    <Radar
                      name="Utilization"
                      dataKey="value"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.18}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-sm text-slate-600 font-mono">
                Waiting for data...
              </div>
            )}
          </div>

          {}
          {hospitalState?.forecast_24h && hospitalState.forecast_24h.length > 0 && (
            <div className="rounded-2xl p-4"
              style={{ background: "rgba(10,14,26,0.8)", border: "1px solid rgba(59,130,246,0.12)" }}>
              <div className="text-xs text-slate-500 font-mono uppercase mb-1 tracking-wider">24h Demand Forecast</div>
              <div className="text-[9px] text-slate-700 font-mono mb-2">arrivals/hr vs staffing capacity</div>
              <div className="h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hospitalState.forecast_24h} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.07)" />
                    <XAxis dataKey="hour_of_day" tick={{ fontSize: 8, fill: "#475569", fontFamily: "monospace" }}
                      tickFormatter={(v) => `${v}h`} interval={5} />
                    <YAxis tick={{ fontSize: 8, fill: "#475569", fontFamily: "monospace" }} />
                    <Tooltip
                      contentStyle={{ background: "rgba(10,14,26,0.95)", border: "1px solid rgba(59,130,246,0.3)", fontSize: 10, fontFamily: "monospace" }}
                      labelFormatter={(v) => `Hour ${v}:00`}
                    />
                    <Area type="monotone" dataKey="staffing_capacity" stroke="#22c55e" strokeWidth={1}
                      fill="rgba(34,197,94,0.06)" strokeDasharray="4 2" name="Staff Cap" />
                    <Area type="monotone" dataKey="predicted_arrivals" stroke="#3b82f6" strokeWidth={1.5}
                      fill="rgba(59,130,246,0.12)" name="Predicted" />
                    <ReferenceLine x={0} stroke="rgba(255,255,255,0.3)" strokeDasharray="3 3" label={{ value: "NOW", fill: "#94a3b8", fontSize: 8, fontFamily: "monospace" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {hospitalState.forecast_24h.some(p => p.predicted_arrivals > p.staffing_capacity) && (
                <div className="mt-2 text-[9px] font-mono text-yellow-400 flex items-center gap-1">
                  <span>⚠</span> Predicted demand exceeds staffing capacity in upcoming hours
                </div>
              )}
            </div>
          )}

          {}
          {metrics && (
            <div
              className="rounded-2xl p-4 space-y-3"
              style={{ background: "rgba(10,14,26,0.8)", border: "1px solid rgba(59,130,246,0.12)" }}
            >
              <div className="text-xs text-slate-500 font-mono uppercase tracking-wider">
                Current Metrics
              </div>
              {[
                ["Avg Wait",   formatTime(metrics.avg_wait_time),      metrics.avg_wait_time > 120 ? "#ff3b3b" : metrics.avg_wait_time > 80 ? "#ffaa00" : "#00ff88"],
                ["Bed Util",   formatPercent(metrics.bed_utilization),  metrics.bed_utilization > 0.92 ? "#ff3b3b" : "#60a5fa"],
                ["ICU Util",   formatPercent(metrics.icu_utilization),  metrics.icu_utilization > 0.90 ? "#ff3b3b" : "#60a5fa"],
                ["Staff Util", formatPercent(metrics.staff_utilization),"#60a5fa"],
                ["Critical",   String(metrics.critical_patients),       metrics.critical_patients > 5 ? "#ff3b3b" : "#60a5fa"],
              ].map(([label, val, color]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 font-mono">{label}</span>
                  <span className="text-base font-bold font-mono" style={{ color: color as string }}>
                    {val}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto min-w-0">

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl p-8 flex items-center justify-center gap-4"
              style={{ background: "rgba(10,14,26,0.8)", border: "1px solid rgba(59,130,246,0.12)" }}
            >
              <Brain className="w-7 h-7 text-blue-400 animate-pulse" />
              <div>
                <div className="text-base font-mono text-blue-300 mb-1">Running optimization engine...</div>
                <div className="text-sm text-slate-500 font-mono">
                  OR-Tools LP · SimPy state analysis · AI narrative
                </div>
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {analysis && !loading && (
              <>
                {}
                {explanation && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-5"
                    style={{
                      background: "rgba(59,130,246,0.06)",
                      border: "1px solid rgba(59,130,246,0.22)",
                    }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 rounded-xl bg-blue-950/60">
                        <Brain className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-blue-300 font-mono">AI COPILOT ANALYSIS</span>
                        <span className="text-xs text-blue-700 font-mono px-2 py-0.5 rounded bg-blue-950/50">
                          {explanation.model}
                        </span>
                        {explanation.severity && (
                          <span className={cn(
                            "text-xs font-mono px-2 py-0.5 rounded",
                            explanation.severity === "critical" ? "bg-red-950/50 text-red-400"
                              : explanation.severity === "high" ? "bg-amber-950/50 text-amber-400"
                              : "bg-blue-950/50 text-blue-400"
                          )}>
                            {explanation.severity.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-base text-slate-200 leading-relaxed">
                      {explanation.explanation}
                    </p>
                  </motion.div>
                )}

                {}
                {opt && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 }}
                    className="rounded-2xl overflow-hidden"
                    style={{ background: "rgba(10,14,26,0.8)", border: "1px solid rgba(59,130,246,0.12)" }}
                  >
                    {}
                    <div className="grid grid-cols-3" style={{ borderBottom: "1px solid rgba(59,130,246,0.08)" }}>
                      {[
                        { icon: Clock,      label: "Wait Reduction",   value: `${opt.predicted_wait_reduction.toFixed(0)}m`,            color: "#00ff88" },
                        { icon: TrendingUp, label: "Throughput +",     value: `${opt.predicted_throughput_increase.toFixed(0)}%`,        color: "#3b82f6" },
                        { icon: Activity,   label: "Util Improvement", value: `${(opt.predicted_utilization_improvement * 100).toFixed(0)}%`, color: "#8b5cf6" },
                      ].map((kpi, idx) => {
                        const Icon = kpi.icon;
                        return (
                          <div
                            key={kpi.label}
                            className="flex flex-col items-center justify-center py-5 text-center"
                            style={{ borderRight: idx < 2 ? "1px solid rgba(59,130,246,0.08)" : "none" }}
                          >
                            <Icon className="w-5 h-5 mb-2" style={{ color: kpi.color }} />
                            <div className="text-2xl font-bold font-mono" style={{ color: kpi.color }}>
                              {kpi.value}
                            </div>
                            <div className="text-xs text-slate-600 font-mono mt-1">{kpi.label}</div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-5 space-y-5">
                      {}
                      <div>
                        <div className="text-xs text-slate-500 font-mono uppercase mb-3 tracking-wider">
                          Root Cause Analysis
                        </div>
                        <div className="space-y-2.5">
                          {opt.root_causes.map((cause, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                              <span className="text-sm text-slate-300 leading-relaxed">{cause}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {}
                      <div>
                        <div className="text-xs text-slate-500 font-mono uppercase mb-3 tracking-wider">
                          Intervention Plan
                        </div>
                        <div className="space-y-2.5">
                          {opt.intervention_plan.map((step, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <div
                                className="w-5 h-5 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5"
                                style={{ background: "rgba(59,130,246,0.18)", color: "#60a5fa" }}
                              >
                                {i + 1}
                              </div>
                              <span className="text-sm text-slate-200 leading-relaxed">{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {}
                      {opt.recommendations.length > 0 && (
                        <div>
                          <div className="text-xs text-slate-500 font-mono uppercase mb-3 tracking-wider">
                            Staff Reallocation
                          </div>
                          <div className="space-y-2">
                            {opt.recommendations.slice(0, 4).map((rec, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between px-4 py-3 rounded-xl"
                                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-mono text-slate-200">
                                    {rec.department} — {rec.resource_type}
                                  </div>
                                  <div className="text-xs text-slate-600 font-mono mt-0.5 truncate">
                                    {rec.reason}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2.5 flex-shrink-0 ml-4">
                                  <span className="text-sm font-mono text-slate-500">{rec.current}</span>
                                  <ChevronRight className="w-4 h-4 text-slate-700" />
                                  <span className="text-sm font-bold font-mono" style={{ color: URGENCY_COLORS[rec.urgency] ?? "#60a5fa" }}>
                                    {rec.recommended}
                                  </span>
                                  <span
                                    className="text-xs font-bold font-mono px-2 py-0.5 rounded-lg"
                                    style={{ background: `${URGENCY_COLORS[rec.urgency]}20`, color: URGENCY_COLORS[rec.urgency] }}
                                  >
                                    {rec.delta > 0 ? "+" : ""}{rec.delta}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {}
                      {opt.ai_narrative?.narrative && (
                        <div
                          className="p-4 rounded-xl"
                          style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.18)" }}
                        >
                          <div className="text-xs text-purple-400 font-mono uppercase mb-2 tracking-wider">
                            AI Narrative
                          </div>
                          <p className="text-sm text-slate-300 leading-relaxed">
                            {opt.ai_narrative.narrative}
                          </p>
                        </div>
                      )}

                      {}
                      {snapshot && metrics && (
                        <div
                          className="p-4 rounded-xl"
                          style={{ background: "rgba(0,255,136,0.04)", border: "1px solid rgba(0,255,136,0.15)" }}
                        >
                          <div className="text-xs text-emerald-500 font-mono uppercase mb-3 tracking-wider">
                            Before → After Analysis
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            {[
                              { label: "Avg Wait", before: formatTime(snapshot.avg_wait_time), after: formatTime(metrics.avg_wait_time), better: metrics.avg_wait_time < snapshot.avg_wait_time },
                              { label: "Bed Util", before: formatPercent(snapshot.bed_utilization), after: formatPercent(metrics.bed_utilization), better: metrics.bed_utilization < snapshot.bed_utilization },
                              { label: "Critical", before: String(snapshot.critical_patients), after: String(metrics.critical_patients), better: metrics.critical_patients < snapshot.critical_patients },
                            ].map(({ label, before, after, better }) => (
                              <div key={label} className="rounded-lg p-2" style={{ background: "rgba(0,0,0,0.2)" }}>
                                <div className="text-[9px] text-slate-600 font-mono uppercase mb-1">{label}</div>
                                <div className="text-xs text-slate-500 font-mono line-through">{before}</div>
                                <div className="text-sm font-bold font-mono" style={{ color: better ? "#00ff88" : "#ff3b3b" }}>{after}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {}
                      <div className="pt-1">
                        <button
                          onClick={implementAll}
                          disabled={implementing || implemented}
                          className="w-full flex items-center justify-center gap-3 py-4 rounded-xl text-sm font-bold font-mono transition-all"
                          style={
                            implemented
                              ? { background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.35)", color: "#00ff88" }
                              : implementing
                              ? { background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.3)", color: "#60a5fa" }
                              : { background: "rgba(59,130,246,0.14)", border: "1px solid rgba(59,130,246,0.45)", color: "#93c5fd", cursor: "pointer" }
                          }
                        >
                          {implemented ? (
                            <><CheckCircle className="w-5 h-5" /> All recommendations applied to simulation</>
                          ) : implementing ? (
                            <><RefreshCw className="w-5 h-5 animate-spin" /> Applying to simulation...</>
                          ) : (
                            <><Play className="w-5 h-5" /> Implement All AI Recommendations</>
                          )}
                        </button>
                        {implemented && (
                          <p className="text-center text-xs text-slate-600 font-mono mt-2">
                            Simulation is updating — watch the floor plan for instant impact
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </AnimatePresence>
        </div>

        {}
        <div className="w-[240px] flex flex-col gap-3 overflow-y-auto flex-shrink-0">
          <div
            className="rounded-2xl p-4"
            style={{ background: "rgba(10,14,26,0.8)", border: "1px solid rgba(59,130,246,0.12)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-slate-500 font-mono uppercase tracking-wider">
                Predicted Bottlenecks
              </span>
            </div>

            {predictions.length === 0 ? (
              <div className="text-center py-6 text-sm text-slate-700 font-mono">
                {analysis ? "No bottlenecks predicted" : "Run analysis to see predictions"}
              </div>
            ) : (
              <div className="space-y-3">
                {predictions.map((pred, i) => {
                  const sc = pred.severity === "critical" ? "#ff3b3b"
                    : pred.severity === "warning" ? "#ffaa00" : "#3b82f6";
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-xl p-3"
                      style={{ background: `${sc}08`, border: `1px solid ${sc}28` }}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-bold font-mono" style={{ color: sc }}>
                          {pred.department}
                        </span>
                        <span className="text-xs font-mono text-slate-500">ETA {pred.eta_minutes}m</span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono mb-2">
                        {pred.metric} {pred.trend_direction === "increasing" ? "↑" : "→"}
                      </div>
                      <div className="flex justify-between text-xs font-mono mb-2">
                        <span className="text-slate-600">Now {formatPercent(pred.current_value)}</span>
                        <span style={{ color: sc }}>Peak {formatPercent(pred.predicted_breach)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pred.confidence * 100}%`, background: sc, opacity: 0.65 }} />
                        </div>
                        <span className="text-xs font-mono text-slate-600">{Math.round(pred.confidence * 100)}%</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {opt && (
            <div
              className="rounded-2xl p-4"
              style={{ background: "rgba(10,14,26,0.8)", border: "1px solid rgba(59,130,246,0.12)" }}
            >
              <div className="text-xs text-slate-500 font-mono uppercase mb-3 tracking-wider">
                Engine Info
              </div>
              <div className="space-y-2">
                {[
                  ["Solver",     opt.solver.toUpperCase(), "#60a5fa"],
                  ["Confidence", formatPercent(opt.confidence), "#94a3b8"],
                  ["Bottleneck", opt.bottleneck_department || "None", "#fbbf24"],
                ].map(([label, val, color]) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-xs text-slate-600 font-mono">{label}</span>
                    <span className="text-xs font-bold font-mono" style={{ color }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
