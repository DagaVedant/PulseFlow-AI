"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Radio, Sparkles, RefreshCw, MessageSquare } from "lucide-react";
import Sidebar from "@/components/liquid-glass/Sidebar";
import { useSimulationStore } from "@/store/simulationStore";
import { api } from "@/lib/api";
import { formatSimTime, formatPercent } from "@/lib/utils";

const toneColor = {
  green: "#059669",
  amber: "#f59e0b",
  coral: "#c0603f",
};

const chipStyle = {
  green: { color: "#15803d", background: "rgba(5,150,105,0.14)" },
  amber: { color: "#a16207", background: "rgba(245,158,11,0.15)" },
  coral: { color: "#c0603f", background: "rgba(192,96,63,0.14)" },
};

function severityTone(sev) {
  if (sev === "critical") return "coral";
  if (sev === "warning") return "amber";
  return "green";
}

export default function AiInsights() {
  const { hospitalState } = useSimulationStore();
  const [clock, setClock] = useState(null);
  const [feedIdx, setFeedIdx] = useState(0);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getCopilotAnalysis();
      setAnalysis(result);
    } catch (err) {
      setError(err?.message ?? "Analysis failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  const feedMessages = useMemo(() => {
    const msgs = (hospitalState?.alerts ?? []).map((a) => a.message);
    return msgs.length > 0 ? msgs : ["Waiting for live hospital data..."];
  }, [hospitalState?.alerts]);

  useEffect(() => {
    setClock(hospitalState ? formatSimTime(hospitalState.sim_time) : "--:--");
  }, [hospitalState?.sim_time]);

  useEffect(() => {
    const id = setInterval(
      () => setFeedIdx((i) => (i + 1) % feedMessages.length),
      4200,
    );
    return () => clearInterval(id);
  }, [feedMessages.length]);

  const predictions = analysis?.bottleneck_predictions ?? [];
  const opt = analysis?.optimization;

  const forecast = predictions.slice(0, 4).map((p) => ({
    name: p.department,
    event:
      p.trend_direction === "increasing"
        ? `peak in ${p.eta_minutes}m`
        : "stable",
    pct: Math.round((p.confidence ?? 0.5) * 100),
    tone: severityTone(p.severity),
  }));

  const aiStats = {
    bottlenecks: predictions.length,
    optimizations: opt?.recommendations?.length ?? 0,
    confidence: opt ? Math.round(opt.confidence * 100) : 0,
    timeSaved: opt ? `${Math.round(opt.predicted_wait_reduction)}m` : "—",
  };

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

        <main className="flex-1 px-8 pb-10 pt-10 md:px-12 lg:px-16 max-w-[1600px]">
          <div className="flex items-center justify-between">
            <h1 className="cursive text-[52px] font-bold leading-tight tracking-tight text-white drop-shadow-[0_2px_18px_rgba(4,18,54,0.5)]">
              AI insights
            </h1>
            <button
              onClick={fetchAnalysis}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-[14px] text-[13px] font-bold text-white shadow-[0_10px_20px_-6px_rgba(6,95,70,0.5)] disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              {loading ? "Refreshing..." : "Refresh analysis"}
            </button>
          </div>

          {error && (
            <div
              className="mt-4 px-4 py-2 rounded-[12px] text-[13px] text-white"
              style={{
                background: "linear-gradient(120deg, #c0603f, #a84a34)",
              }}
            >
              {error}
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div
              className="glass card-hover rounded-[20px] p-5"
              style={{
                background:
                  "linear-gradient(150deg, rgba(224,168,140,0.5), rgba(206,138,110,0.32))",
              }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[#7a3b25]">
                Bottlenecks
              </span>
              <div className="mt-1 text-[28px] font-bold leading-none text-[#5c2b1c]">
                {aiStats.bottlenecks}
              </div>
            </div>
            <div className="glass card-hover rounded-[20px] p-5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-neutral-500">
                Optimizations
              </span>
              <div className="mt-1 text-[28px] font-bold leading-none text-neutral-800">
                {aiStats.optimizations}
              </div>
            </div>
            <div className="glass card-hover rounded-[20px] p-5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-neutral-500">
                Confidence
              </span>
              <div className="mt-1 text-[28px] font-bold leading-none text-emerald-600">
                {aiStats.confidence}%
              </div>
            </div>
            <div className="glass card-hover rounded-[20px] p-5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-neutral-500">
                Wait reduction
              </span>
              <div className="mt-1 text-[28px] font-bold leading-none text-neutral-800">
                {aiStats.timeSaved}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="glass card-hover rounded-[26px] p-7 lg:col-span-6">
              <h3 className="text-[20px] font-bold text-neutral-800">
                Bottleneck forecast
              </h3>
              <div className="mt-5 flex flex-col gap-3.5">
                {forecast.map((f) => (
                  <div key={f.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-[13px] font-semibold"
                        style={{
                          color: f.tone === "coral" ? "#9a3f28" : "#4b5563",
                        }}
                      >
                        {f.name}
                      </span>
                      <span
                        className="mono text-[11px] px-2 py-0.5 rounded-[8px]"
                        style={chipStyle[f.tone]}
                      >
                        {f.event}
                      </span>
                    </div>
                    <div className="h-[5px] rounded-full bg-black/[0.07] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${f.pct}%`,
                          background: toneColor[f.tone],
                          transition: "width 0.9s cubic-bezier(0.22,1,0.36,1)",
                        }}
                      />
                    </div>
                  </div>
                ))}
                {forecast.length === 0 && (
                  <div className="text-[13px] text-neutral-500">
                    {loading
                      ? "Running forecast..."
                      : "No bottlenecks predicted"}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 lg:col-span-6">
              {opt && (
                <div
                  className="glass card-hover rounded-[26px] p-6"
                  style={{
                    background:
                      "linear-gradient(150deg, rgba(167,220,190,0.55), rgba(140,200,170,0.32))",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[#15603a]">
                      <Sparkles size={14} />
                      Optimizer
                    </div>
                    <span className="mono text-[11px] text-[#15603a]">
                      {Math.round(opt.confidence * 100)}% conf
                    </span>
                  </div>
                  <div className="mt-2 text-[16px] font-extrabold text-[#14532d] leading-snug">
                    {opt.intervention_plan.slice(0, 2).map((a, i) => (
                      <div key={i}>{a}</div>
                    ))}
                  </div>
                  <div className="mt-1.5 text-[12px] text-[#2f6b4c]">
                    projected −{Math.round(opt.predicted_wait_reduction)}m avg
                    wait
                  </div>
                </div>
              )}

              <div className="glass card-hover rounded-[26px] p-6">
                <div className="flex items-center gap-2 text-[12px] font-bold text-neutral-800 mb-1.5">
                  <MessageSquare size={14} className="text-emerald-600" />
                  AI narrative
                </div>
                <div className="text-[12px] leading-[1.55] text-neutral-600">
                  {opt?.ai_narrative?.narrative ??
                    analysis?.explanation?.explanation ??
                    (loading
                      ? "Generating narrative..."
                      : "No narrative available")}
                </div>
              </div>
            </div>
          </div>

          <div className="glass-soft mono mt-4 flex items-center gap-3 rounded-[22px] px-7 py-4 text-[13px] text-neutral-500">
            <Radio size={15} className="text-emerald-600 animate-pulse" />
            <span className="font-semibold text-neutral-600">LIVE</span>
            <span>{clock}</span>
            <span className="text-neutral-300">·</span>
            <span key={feedIdx} className="tick animate-[fadeIn_0.5s_ease]">
              {feedMessages[feedIdx]}
            </span>
          </div>
        </main>
      </div>
    </div>
  );
}
