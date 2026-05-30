/* Patient Intelligence page: four tracked executive patients with risk scores, specialist-await status, and inline constraint-aware AI recommendations. */
"use client";
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, AlertTriangle, Clock, Zap, RefreshCw,
  Stethoscope, ArrowRight, ShieldAlert, TrendingUp, CheckCircle2, Ban
} from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";
import { useDemoStore } from "@/store/demoStore";
import type { TrackedPatient } from "@/types";

const PRIORITY_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  critical: { color: "#ff3b3b", bg: "rgba(255,59,59,0.12)", label: "CRITICAL" },
  high:     { color: "#ffaa00", bg: "rgba(255,170,0,0.12)", label: "HIGH" },
  moderate: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", label: "MODERATE" },
  low:      { color: "#22c55e", bg: "rgba(34,197,94,0.12)", label: "LOW" },
};

function riskColor(pct: number): string {
  if (pct >= 80) return "#ff3b3b";
  if (pct >= 50) return "#ffaa00";
  if (pct >= 25) return "#3b82f6";
  return "#22c55e";
}

function specialistStatusStyle(status: string) {
  if (status === "available") return { color: "#22c55e", label: "AVAILABLE" };
  if (status === "in_surgery") return { color: "#ef4444", label: "IN SURGERY" };
  return { color: "#ffaa00", label: "BUSY" };
}

export default function PatientIntelPage() {
  const { hospitalState } = useSimulationStore();
  const patients = hospitalState?.care?.tracked_patients ?? [];

  const [analyzed, setAnalyzed] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // Reset analysis state on every mount so the cards never start with AI badges already visible.
  useEffect(() => {
    setAnalyzed(false);
    setAnalyzing(false);
  }, []);

  // No LLM round-trip — the constraint-aware recommendation IS the analysis.
  // "Analyze All" plays a brief shimmer, then reveals the AI badges.
  const analyzeAll = useCallback(async () => {
    if (patients.length === 0) return;
    setAnalyzing(true);
    await new Promise((r) => setTimeout(r, 1100));
    setAnalyzed(true);
    setAnalyzing(false);
  }, [patients.length]);

  const { pendingAction, clearAction } = useDemoStore();
  useEffect(() => {
    if (pendingAction === "analyze_patients" && patients.length > 0) {
      clearAction();
      analyzeAll();
    }
  }, [pendingAction]); // eslint-disable-line react-hooks/exhaustive-deps

  const highRisk = patients.filter((p) => p.risk_pct >= 80).length;

  return (
    <div className="flex flex-col h-full p-6 gap-5 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400" />
            Patient Intelligence
          </h1>
          <p className="text-sm text-slate-500 font-mono mt-1">
            Tracked high-acuity patients · specialist-await status · constraint-aware AI recommendations
          </p>
        </div>
        <div className="flex items-center gap-3">
          {highRisk > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-950/40 border border-red-800/40">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-sm font-mono font-bold text-red-400">
                {highRisk} HIGH RISK
              </span>
            </div>
          )}
          <button
            onClick={analyzeAll}
            disabled={analyzing || patients.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-mono font-bold transition-all"
            style={{
              background: analyzed ? "rgba(0,255,136,0.1)" : analyzing ? "rgba(59,130,246,0.08)" : "rgba(59,130,246,0.15)",
              border: `1px solid ${analyzed ? "rgba(0,255,136,0.35)" : "rgba(59,130,246,0.4)"}`,
              color: analyzed ? "#34d399" : analyzing ? "#60a5fa" : "#93c5fd",
            }}
          >
            {analyzing
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing...</>
              : analyzed
              ? <><CheckCircle2 className="w-4 h-4" /> Analysis Complete</>
              : <><Zap className="w-4 h-4" /> Analyze All {patients.length}</>
            }
          </button>
        </div>
      </div>

      {/* Patient grid */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {patients.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-slate-600 font-mono text-sm">
            Connecting to care coordination feed...
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 items-start">
            <AnimatePresence mode="popLayout">
              {patients.map((p) => (
                <TrackedCard
                  key={p.patient_id}
                  patient={p}
                  analyzing={analyzing}
                  analyzed={analyzed}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function TrackedCard({ patient: p, analyzing, analyzed }: {
  patient: TrackedPatient;
  analyzing: boolean;
  analyzed: boolean;
}) {
  const ps = PRIORITY_STYLE[p.priority] ?? PRIORITY_STYLE.moderate;
  const rColor = riskColor(p.risk_pct);
  const sp = p.specialist;
  const rec = p.recommendation;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="flex flex-col rounded-2xl p-5"
      style={{
        background: "rgba(15,22,41,0.7)",
        border: `1.5px solid ${ps.color}40`,
        boxShadow: p.priority === "critical" ? `0 0 24px ${ps.color}18` : "none",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="text-lg font-bold text-white leading-tight">{p.name}</div>
          <div className="text-xs text-slate-500 font-mono mt-0.5">
            #{p.patient_id} · Age {p.age}
          </div>
        </div>
        <span
          className="text-xs px-3 py-1.5 rounded-lg font-mono font-bold uppercase flex-shrink-0"
          style={{ background: ps.bg, color: ps.color }}
        >
          {ps.label}
        </span>
      </div>

      {/* Condition */}
      <div className="text-base font-semibold text-slate-200 mb-3">{p.condition}</div>

      {/* Metric row */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3 h-3 text-slate-600" />
            <span className="text-[10px] text-slate-600 font-mono uppercase">ED Wait</span>
          </div>
          <div className="text-xl font-bold font-mono" style={{ color: p.over_target ? "#ff3b3b" : "#e2e8f0" }}>
            {p.ed_wait_min}m
          </div>
          <div className="text-[9px] font-mono mt-0.5" style={{ color: p.over_target ? "#ff6b6b" : "#475569" }}>
            {p.over_target ? `+${p.over_target_min}m over target` : `target ${p.target_window_min}m`}
          </div>
        </div>

        <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="text-[10px] text-slate-600 font-mono uppercase mb-1">Risk</div>
          <div className="text-xl font-bold font-mono" style={{ color: rColor }}>{p.risk_pct}%</div>
          <div className="mt-1.5 h-1 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${p.risk_pct}%`, background: rColor, opacity: 0.8 }} />
          </div>
        </div>

        <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Stethoscope className="w-3 h-3 text-slate-600" />
            <span className="text-[10px] text-slate-600 font-mono uppercase">Awaiting</span>
          </div>
          <div className="text-sm font-bold font-mono text-slate-200 leading-tight">{p.awaiting_specialty}</div>
          <div className="text-[9px] font-mono mt-0.5 text-slate-600 truncate">{p.preferred_role}</div>
        </div>
      </div>

      {/* Specialist availability */}
      {sp && (
        <div className="flex items-center justify-between rounded-xl px-3 py-2.5 mb-3"
          style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-mono text-slate-300 truncate">{sp.name}</div>
            <div className="text-[10px] font-mono text-slate-600 truncate">{sp.current_assignment}</div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded"
              style={{ background: `${specialistStatusStyle(sp.status).color}20`, color: specialistStatusStyle(sp.status).color }}>
              {specialistStatusStyle(sp.status).label}
            </span>
            <span className="text-sm font-bold font-mono" style={{ color: sp.available_in_min === 0 ? "#22c55e" : "#ffaa00" }}>
              {sp.available_in_min === 0 ? "now" : `${sp.available_in_min}m`}
            </span>
          </div>
        </div>
      )}

      {/* AI Analysis box — hidden until Analyze All is clicked */}
      <AnimatePresence mode="wait">
        {analyzing ? (
          <motion.div
            key="shimmer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl p-3.5 mb-3"
            style={{ background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.18)" }}
          >
            <div className="flex items-center gap-2 mb-2.5">
              <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin flex-shrink-0" />
              <span className="text-[9px] font-mono font-bold text-blue-400">ANALYZING...</span>
            </div>
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-2.5 rounded bg-blue-500/15"
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                  style={{ width: `${90 - i * 18}%` }}
                />
              ))}
            </div>
          </motion.div>
        ) : analyzed ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl p-3.5 mb-3"
            style={{ background: rec.blocked ? "rgba(255,170,0,0.06)" : "rgba(59,130,246,0.06)", border: `1px solid ${rec.blocked ? "rgba(255,170,0,0.25)" : "rgba(59,130,246,0.22)"}` }}
          >
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                {rec.blocked
                  ? <Ban className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  : <ShieldAlert className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                <span className="text-xs font-bold font-mono leading-tight truncate" style={{ color: rec.blocked ? "#ffaa00" : "#93c5fd" }}>
                  {rec.title}
                </span>
              </div>
              <span className="flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded text-emerald-400 bg-emerald-950/50 flex-shrink-0">
                <CheckCircle2 className="w-2.5 h-2.5" /> AI ANALYSIS
              </span>
            </div>
            <div className="space-y-1.5 mb-3">
              {rec.reasons.map((reason, i) => (
                <div key={i} className="flex items-start gap-2">
                  <ArrowRight className="w-3 h-3 text-slate-600 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300 leading-relaxed">{reason}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: "rgba(34,197,94,0.1)" }}>
                <ShieldAlert className="w-3 h-3 text-emerald-400" />
                <span className="text-[11px] font-mono font-bold text-emerald-400">-{rec.deterioration_reduction}% risk</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: "rgba(59,130,246,0.1)" }}>
                <TrendingUp className="w-3 h-3 text-blue-400" />
                <span className="text-[11px] font-mono font-bold text-blue-400">+{rec.throughput_improvement}% flow</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl p-3.5 mb-3 flex items-center justify-center gap-2"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <Zap className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-xs font-mono text-slate-600">Click Analyze All to generate AI care plan</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pathway badges */}
      <div className="flex gap-1.5 flex-wrap mb-1">
        {p.pathway.map((step) => (
          <span key={step} className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800/60 text-slate-400 font-mono border border-slate-700/40">
            {step}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
