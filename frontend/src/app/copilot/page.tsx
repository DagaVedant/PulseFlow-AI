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
import { useSimulationStore } from "@/store/simulationStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import { api } from "@/lib/api";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";
import { formatTime, formatPercent, cn } from "@/lib/utils";
import type { CopilotAnalysis, StaffingRecommendation, HospitalMetrics } from "@/types";
import { useDemoStore } from "@/store/demoStore";
import { useTypewriter } from "@/hooks/useTypewriter";

const URGENCY_CLASS: Record<string, string> = {
  low: "text-muted",
  medium: "text-status-flagged",
  high: "text-status-flagged",
  critical: "text-status-critical",
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

  const { displayed: narrativeText, done: narrativeDone } = useTypewriter(
    opt?.ai_narrative?.narrative ?? "",
    18,
  );

  const radarData = metrics
    ? [
        { metric: "ER", value: Math.round(metrics.er_utilization * 100) },
        { metric: "ICU", value: Math.round(metrics.icu_utilization * 100) },
        { metric: "Beds", value: Math.round(metrics.bed_utilization * 100) },
        { metric: "Staff", value: Math.round(metrics.staff_utilization * 100) },
        { metric: "Flow", value: Math.min(100, Math.round(metrics.throughput_per_hour * 10)) },
      ]
    : [];

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-[20px] font-medium text-ink flex items-center gap-2">
            <Brain className="w-5 h-5 text-muted" />
            Copilot
          </h1>
          <p className="text-[13px] text-muted mt-1">Bottleneck detection · OR-Tools optimization · AI planning</p>
        </div>
        <button
          data-tour="cp-run"
          onClick={runAnalysis}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-medium bg-ink text-canvas disabled:opacity-60 hover:opacity-90 transition-opacity"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" /> Analyzing...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" /> Run analysis
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="flex-shrink-0 px-4 py-2 rounded-lg text-[13px] border border-status-critical text-status-critical">
          {error}
        </div>
      )}

      <div className="flex flex-1 gap-4 min-h-0 overflow-hidden">
        <div className="flex flex-col gap-4 w-[260px] flex-shrink-0 overflow-y-auto">
          <div data-tour="cp-radar" className="border border-line rounded-lg p-5">
            <div className="text-[11px] font-medium text-muted uppercase mb-4">System health radar</div>
            {radarData.length > 0 ? (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%">
                    <PolarGrid stroke="#26314f" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: "#aab4c8", fontWeight: 500 }} />
                    <Radar name="Utilization" dataKey="value" stroke="#ffffff" fill="#ffffff" fillOpacity={0.12} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-[13px] text-muted">Waiting for data...</div>
            )}
          </div>

          {metrics && (
            <div className="border border-line rounded-lg p-5 space-y-3">
              <div className="text-[11px] font-medium text-muted uppercase">Current metrics</div>
              {[
                ["Avg wait", formatTime(metrics.avg_wait_time), metrics.avg_wait_time > 120 ? "text-status-critical" : metrics.avg_wait_time > 80 ? "text-status-flagged" : "text-status-safe"],
                ["Bed util", formatPercent(metrics.bed_utilization), metrics.bed_utilization > 0.92 ? "text-status-critical" : "text-ink"],
                ["ICU util", formatPercent(metrics.icu_utilization), metrics.icu_utilization > 0.9 ? "text-status-critical" : "text-ink"],
                ["Staff util", formatPercent(metrics.staff_utilization), "text-ink"],
                ["Critical", String(metrics.critical_patients), metrics.critical_patients > 5 ? "text-status-critical" : "text-ink"],
              ].map(([label, val, colorClass]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[13px] text-muted">{label}</span>
                  <span className={"mono text-[15px] font-medium " + colorClass}>{val}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col gap-4 overflow-y-auto min-w-0">
          {loading && (
            <div className="border border-line rounded-lg p-8 flex items-center justify-center gap-4">
              <RefreshCw className="w-5 h-5 text-muted animate-spin" />
              <div>
                <div className="text-[15px] text-ink mb-1">Running optimization engine...</div>
                <div className="text-[13px] text-muted">OR-Tools LP · SimPy state analysis · AI narrative</div>
              </div>
            </div>
          )}

          {analysis && !loading && (
            <>
              {explanation && (
                <div className="border border-line rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="w-4 h-4 text-muted" />
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-medium text-ink">AI COPILOT ANALYSIS</span>
                      {explanation.severity && (
                        <span
                          className={
                            "text-[11px] font-medium " +
                            (explanation.severity === "critical" ? "text-status-critical" : explanation.severity === "high" ? "text-status-flagged" : "text-muted")
                          }
                        >
                          {explanation.severity.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[15px] text-ink leading-relaxed">{explanation.explanation}</p>
                </div>
              )}

              {opt && (
                <div className="border border-line rounded-lg overflow-hidden">
                  <div className="grid grid-cols-3 border-b border-line">
                    {[
                      { icon: Clock, label: "Wait reduction", value: `${opt.predicted_wait_reduction.toFixed(0)}m` },
                      { icon: TrendingUp, label: "Throughput +", value: `${opt.predicted_throughput_increase.toFixed(0)}%` },
                      { icon: Activity, label: "Util improvement", value: `${(opt.predicted_utilization_improvement * 100).toFixed(0)}%` },
                    ].map((kpi, idx) => {
                      const Icon = kpi.icon;
                      return (
                        <div
                          key={kpi.label}
                          className={"flex flex-col items-center justify-center py-5 text-center " + (idx < 2 ? "border-r border-line" : "")}
                        >
                          <Icon className="w-4 h-4 mb-2 text-muted" />
                          <div className="mono text-[17px] font-medium text-ink">{kpi.value}</div>
                          <div className="text-[11px] text-muted mt-1">{kpi.label}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-6 space-y-5">
                    <div>
                      <div className="text-[11px] font-medium text-muted uppercase mb-3">Root cause analysis</div>
                      <div className="space-y-2">
                        {opt.root_causes.map((cause, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-status-flagged flex-shrink-0 mt-1" />
                            <span className="text-[13px] text-muted leading-relaxed">{cause}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-medium text-muted uppercase mb-3">Intervention plan</div>
                      <div className="space-y-2">
                        {opt.intervention_plan.map((step, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="border border-line w-6 h-6 rounded text-[11px] font-medium flex items-center justify-center flex-shrink-0 mt-0.5 text-muted">
                              {i + 1}
                            </div>
                            <span className="text-[13px] text-ink leading-relaxed">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {opt.recommendations.length > 0 && (
                      <div>
                        <div className="text-[11px] font-medium text-muted uppercase mb-3">Staff reallocation</div>
                        <div className="space-y-2">
                          {opt.recommendations.slice(0, 4).map((rec, i) => (
                            <div key={i} className="border border-line flex items-center justify-between px-4 py-2 rounded-lg">
                              <div className="min-w-0 flex-1">
                                <div className="text-[13px] text-ink">{rec.department}: {rec.resource_type}</div>
                                <div className="text-[11px] text-muted mt-1 truncate">{rec.reason}</div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-4 mono text-[13px]">
                                <span className="text-muted">{rec.current}</span>
                                <ChevronRight className="w-4 h-4 text-muted" />
                                <span className={"font-medium " + (URGENCY_CLASS[rec.urgency] ?? "text-ink")}>{rec.recommended}</span>
                                <span className={"text-[11px] font-medium " + (URGENCY_CLASS[rec.urgency] ?? "text-ink")}>
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
                      <div className="border border-line p-4 rounded-lg">
                        <div className="text-[11px] font-medium text-muted uppercase mb-2">AI narrative</div>
                        <p className="text-[13px] text-muted leading-relaxed">
                          {narrativeText}
                          {!narrativeDone && (
                            <span className="ml-[1px] inline-block h-[13px] w-[2px] bg-ink animate-pulse align-middle" />
                          )}
                        </p>
                      </div>
                    )}

                    {snapshot && metrics && (
                      <div className="border border-line rounded-lg p-4">
                        <div className="text-[11px] text-muted font-medium uppercase mb-3">Before → after analysis</div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          {[
                            {
                              label: "Avg wait",
                              before: formatTime(snapshot.avg_wait_time),
                              after: formatTime(metrics.avg_wait_time),
                              better: metrics.avg_wait_time < snapshot.avg_wait_time,
                            },
                            {
                              label: "Bed util",
                              before: formatPercent(snapshot.bed_utilization),
                              after: formatPercent(metrics.bed_utilization),
                              better: metrics.bed_utilization < snapshot.bed_utilization,
                            },
                            {
                              label: "Critical",
                              before: String(snapshot.critical_patients),
                              after: String(metrics.critical_patients),
                              better: metrics.critical_patients < snapshot.critical_patients,
                            },
                          ].map(({ label, before, after, better }) => (
                            <div key={label} className="border border-line rounded-lg p-2">
                              <div className="text-[10px] text-muted uppercase mb-1">{label}</div>
                              <div className="mono text-[11px] text-muted line-through">{before}</div>
                              <div className={"mono text-[13px] font-medium " + (better ? "text-status-safe" : "text-status-critical")}>{after}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        onClick={implementAll}
                        disabled={implementing || implemented}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg text-[13px] font-medium bg-ink text-canvas disabled:opacity-70 hover:opacity-90 transition-opacity"
                      >
                        {implemented ? (
                          <>
                            <CheckCircle className="w-5 h-5" /> All recommendations applied to simulation
                          </>
                        ) : implementing ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" /> Applying to simulation...
                          </>
                        ) : (
                          <>
                            <Play className="w-5 h-5" /> Implement all AI recommendations
                          </>
                        )}
                      </button>
                      {implemented && (
                        <p className="text-center text-[11px] text-muted mt-2">
                          Saved at {implementedAt} by clinician · Simulation is updating, watch the floor plan for instant impact
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="w-[220px] flex flex-col gap-4 overflow-y-auto flex-shrink-0">
          <div className="border border-line rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-muted" />
              <span className="text-[11px] font-medium text-muted uppercase">Predicted bottlenecks</span>
            </div>

            {predictions.length === 0 ? (
              <div className="text-center py-6 text-[13px] text-muted">
                {analysis ? "No bottlenecks predicted" : "Run analysis to see predictions"}
              </div>
            ) : (
              <div className="space-y-4">
                {predictions.map((pred, i) => {
                  const tone =
                    pred.severity === "critical" ? "text-status-critical" : pred.severity === "warning" ? "text-status-flagged" : "text-ink";
                  const barColor = pred.severity === "critical" ? "#e08462" : pred.severity === "warning" ? "#e8b563" : "#aab4c8";
                  return (
                    <div key={i} className="border border-line rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={"text-[13px] font-medium " + tone}>{pred.department}</span>
                        <span className="text-[11px] text-muted">ETA {pred.eta_minutes}m</span>
                      </div>
                      <div className="text-[11px] text-muted mb-2">
                        {pred.metric} {pred.trend_direction === "increasing" ? "↑" : "→"}
                      </div>
                      <div className="flex justify-between text-[11px] mono mb-2">
                        <span className="text-muted">Now {formatPercent(pred.current_value)}</span>
                        <span className={tone}>Peak {formatPercent(pred.predicted_breach)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-elevated rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pred.confidence * 100}%`, background: barColor }} />
                        </div>
                        <span className="text-[11px] mono text-muted">{Math.round(pred.confidence * 100)}%</span>
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