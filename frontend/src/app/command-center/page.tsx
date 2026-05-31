/* Command Center page: hospital floor plan, live metrics, active alerts, and hospital score. */
"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import {
  Activity, AlertTriangle, Bed, Clock, TrendingUp,
  Users, Zap, RefreshCw, Radio, Siren, DollarSign, ShieldCheck, Anchor, Award, Truck, MapPin, Timer
} from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";
import { useDemoStore } from "@/store/demoStore";
import { HospitalFloorPlan } from "@/components/hospital/HospitalFloorPlan";
import { MetricCard } from "@/components/metrics/MetricCard";
import {
  formatTime, formatPercent, statusColor, occupancyToStatus
} from "@/lib/utils";
import type { Patient, DepartmentKey, DepartmentState } from "@/types";

const DEPT_KEYS = ["er", "labs", "imaging", "icu", "ward"] as const;

function DiversionBanner({ metrics }: { metrics: any }) {
  const risk = metrics.diversion_risk ?? 0;
  const mins = metrics.minutes_to_diversion ?? 0;
  const cost = metrics.delay_cost_per_hour ?? 0;
  const sla  = metrics.sla_compliance ?? 1;
  const boarding = metrics.boarding_count ?? 0;
  const deteriorating = metrics.deteriorating_count ?? 0;
  const sepsis = metrics.sepsis_count ?? 0;

  const color = risk > 0.80 ? "#ff3b3b" : risk > 0.60 ? "#ffaa00" : "#22c55e";
  const label = risk > 0.80 ? "HIGH RISK" : risk > 0.60 ? "ELEVATED" : "NORMAL";

  return (
    <div className="flex items-center gap-3 flex-shrink-0 rounded-xl px-4 py-2.5 flex-wrap"
      style={{ background: "rgba(10,14,26,0.8)", border: `1px solid ${color}30` }}>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Siren className="w-3.5 h-3.5" style={{ color }} />
        <span className="text-[10px] font-mono font-bold uppercase" style={{ color }}>Diversion {label}</span>
        <div className="w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full" style={{ background: color }}
            animate={{ width: `${Math.round(risk * 100)}%` }} transition={{ duration: 1.5 }} />
        </div>
        <span className="text-[10px] font-mono" style={{ color }}>{Math.round(risk * 100)}%</span>
        {risk > 0.60 && mins > 0 && (
          <span className="text-[10px] font-mono text-slate-500">~{mins}m</span>
        )}
      </div>

      <div className="w-px h-4 bg-slate-700 flex-shrink-0" />

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <DollarSign className="w-3 h-3 text-yellow-500" />
        <span className="text-[10px] font-mono text-yellow-400">${cost.toLocaleString()}/hr delay cost</span>
      </div>

      <div className="w-px h-4 bg-slate-700 flex-shrink-0" />

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <ShieldCheck className="w-3 h-3" style={{ color: sla < 0.70 ? "#ff3b3b" : "#22c55e" }} />
        <span className="text-[10px] font-mono" style={{ color: sla < 0.70 ? "#ff3b3b" : "#22c55e" }}>
          {Math.round(sla * 100)}% SLA
        </span>
      </div>

      {boarding > 0 && (
        <>
          <div className="w-px h-4 bg-slate-700 flex-shrink-0" />
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Anchor className="w-3 h-3 text-orange-400" />
            <span className="text-[10px] font-mono text-orange-400">{boarding} boarding</span>
          </div>
        </>
      )}

      {deteriorating > 0 && (
        <>
          <div className="w-px h-4 bg-slate-700 flex-shrink-0" />
          <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
            className="flex items-center gap-1.5 flex-shrink-0">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span className="text-[10px] font-mono text-red-400">{deteriorating} deteriorating</span>
          </motion.div>
        </>
      )}

      {sepsis > 0 && (
        <>
          <div className="w-px h-4 bg-slate-700 flex-shrink-0" />
          <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1, repeat: Infinity }}
            className="flex items-center gap-1.5 flex-shrink-0">
            <Zap className="w-3 h-3 text-red-500" />
            <span className="text-[10px] font-mono text-red-400">{sepsis} sepsis risk</span>
          </motion.div>
        </>
      )}
    </div>
  );
}

function computeHospitalScore(metrics: any): number {
  if (!metrics) return 0;
  const sla    = (metrics.sla_compliance ?? 1) * 100;
  const bedUtil = metrics.bed_utilization ?? 0;
  const waitPenalty = Math.max(0, Math.min(100, 100 - (metrics.avg_wait_time ?? 0) / 2));
  const divPenalty  = (1 - (metrics.diversion_risk ?? 0)) * 100;
  const throughput  = Math.min(100, (metrics.throughput_per_hour ?? 0) * 8);
  const bedScore    = bedUtil < 0.95 ? 100 - Math.abs(bedUtil - 0.80) * 100 : 20;
  return Math.round((sla * 0.25 + waitPenalty * 0.25 + divPenalty * 0.20 + throughput * 0.15 + bedScore * 0.15));
}

function HospitalScore({ metrics }: { metrics: any }) {
  const score = computeHospitalScore(metrics);
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#ffaa00" : "#ff3b3b";
  const label = score >= 80 ? "GOOD" : score >= 60 ? "FAIR" : "CRITICAL";
  const circumference = 2 * Math.PI * 20;
  const dashOffset = circumference * (1 - score / 100);

  return (
    <div className="flex items-center gap-3 flex-shrink-0 rounded-xl px-4 py-2.5"
      style={{ background: "rgba(10,14,26,0.8)", border: `1px solid ${color}30` }}>
      <div className="relative w-12 h-12 flex-shrink-0">
        <svg viewBox="0 0 50 50" className="w-full h-full -rotate-90">
          <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
          <motion.circle
            cx="25" cy="25" r="20" fill="none" stroke={color} strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-mono font-bold" style={{ color }}>{score}</span>
        </div>
      </div>
      <div>
        <div className="flex items-center gap-1.5 mb-0.5">
          <Award className="w-3 h-3" style={{ color }} />
          <span className="text-[10px] font-mono font-bold uppercase" style={{ color }}>Hospital Score</span>
        </div>
        <span className="text-[9px] font-mono text-slate-500">{label} — composite efficiency index</span>
      </div>
    </div>
  );
}

const AMBULANCE_ORIGINS = [
  "Cedar Rd & 5th Ave", "Lakeside Park", "Downtown Plaza", "Highway 12 Exit 7",
  "Riverside Community", "Northgate Mall", "Airport Terminal B", "Industrial District",
];

interface AmbulanceUnit {
  id: string;
  unit: string;
  origin: string;
  eta_min: number;
  severity: string;
  complaint: string;
  dispatched_at: number;
}

function useAmbulanceSimulation(simTime: number, patients: Patient[]) {
  const [units, setUnits] = useState<AmbulanceUnit[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const counterRef = useRef(1);

  useEffect(() => {
    const critHigh = patients.filter(
      (p) => (p.severity === "critical" || p.severity === "high") && p.state === "arriving"
    );
    critHigh.forEach((p) => {
      if (seenRef.current.has(p.patient_id)) return;
      seenRef.current.add(p.patient_id);
      const rng = (s: string) => {
        let h = 0;
        for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
        return Math.abs(h) / 2147483647;
      };
      const unit: AmbulanceUnit = {
        id: p.patient_id,
        unit: `AMB-${String(counterRef.current++).padStart(3, "0")}`,
        origin: AMBULANCE_ORIGINS[Math.floor(rng(p.patient_id + "o") * AMBULANCE_ORIGINS.length)],
        eta_min: Math.floor(rng(p.patient_id + "e") * 8) + 2,
        severity: p.severity,
        complaint: p.chief_complaint || "Trauma",
        dispatched_at: simTime,
      };
      setUnits((prev) => [unit, ...prev.slice(0, 9)]);
    });
  }, [patients.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      setUnits((prev) =>
        prev
          .map((u) => ({ ...u, eta_min: Math.max(0, u.eta_min - 1) }))
          .filter((u) => u.eta_min > 0 || simTime - u.dispatched_at < 10)
      );
    }, 60000 / 60);
    return () => clearInterval(interval);
  }, [simTime]);

  return units;
}

function AmbulancePanel({ patients, simTime }: { patients: Patient[]; simTime: number }) {
  const units = useAmbulanceSimulation(simTime, patients);

  const hourBuckets: Record<number, number> = {};
  units.forEach((u) => {
    const h = Math.floor(u.dispatched_at / 60) % 24;
    hourBuckets[h] = (hourBuckets[h] ?? 0) + 1;
  });
  const peakHour = Object.entries(hourBuckets).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
      <div className="flex gap-2 mb-3">
        <div className="flex-1 rounded-lg px-3 py-2 text-center"
          style={{ background: "rgba(255,170,0,0.08)", border: "1px solid rgba(255,170,0,0.2)" }}>
          <div className="text-lg font-mono font-bold text-amber-400">{units.length}</div>
          <div className="text-[9px] font-mono text-slate-500 uppercase">En Route</div>
        </div>
        <div className="flex-1 rounded-lg px-3 py-2 text-center"
          style={{ background: "rgba(255,59,59,0.08)", border: "1px solid rgba(255,59,59,0.2)" }}>
          <div className="text-lg font-mono font-bold text-red-400">
            {units.filter((u) => u.severity === "critical").length}
          </div>
          <div className="text-[9px] font-mono text-slate-500 uppercase">Critical</div>
        </div>
        <div className="flex-1 rounded-lg px-3 py-2 text-center"
          style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
          <div className="text-lg font-mono font-bold text-blue-400">
            {peakHour ? `${String(Number(peakHour[0])).padStart(2, "0")}:00` : "--"}
          </div>
          <div className="text-[9px] font-mono text-slate-500 uppercase">Peak Hr</div>
        </div>
      </div>

      {units.length === 0 ? (
        <div className="text-xs text-slate-600 font-mono text-center py-6">
          No ambulances currently dispatched
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {units.map((u) => {
            const color = u.severity === "critical" ? "#ff3b3b" : u.severity === "high" ? "#ffaa00" : "#60a5fa";
            return (
              <motion.div key={u.id}
                initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}
                className="rounded-lg p-2.5 border"
                style={{ background: `${color}08`, borderColor: `${color}30` }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-3 h-3 flex-shrink-0" style={{ color }} />
                    <span className="text-xs font-mono font-bold" style={{ color }}>{u.unit}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold"
                      style={{ background: `${color}20`, color }}>{u.severity}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Timer className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] font-mono font-bold" style={{ color }}>
                      {u.eta_min === 0 ? "ARRIVING" : `${u.eta_min}m`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                  <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                  <span className="truncate">{u.origin}</span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">{u.complaint}</div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
}

function AlertsAmbulancePanel({ alerts, patients, simTime }: { alerts: any[]; patients: Patient[]; simTime: number }) {
  const [tab, setTab] = useState<"alerts" | "ambulances">("alerts");
  const { pendingAction, clearAction } = useDemoStore();

  useEffect(() => {
    if (pendingAction === "view_ambulances") {
      clearAction();
      setTab("ambulances");
    }
  }, [pendingAction]);

  return (
    <div className="rounded-xl flex flex-col flex-1 min-h-0 overflow-hidden"
      style={{ background: "rgba(10,14,26,0.8)", border: "1px solid rgba(59,130,246,0.1)" }}>
      <div className="flex items-center border-b border-slate-800/60 flex-shrink-0">
        <button
          onClick={() => setTab("alerts")}
          className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-mono uppercase tracking-wide transition-colors"
          style={{ color: tab === "alerts" ? "#f87171" : "#475569", borderBottom: tab === "alerts" ? "2px solid #f87171" : "2px solid transparent" }}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Alerts
          {alerts.length > 0 && (
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ml-0.5"
              style={{ background: "rgba(255,59,59,0.2)", color: "#ff3b3b" }}>{alerts.length}</span>
          )}
        </button>
        <button
          onClick={() => setTab("ambulances")}
          className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-mono uppercase tracking-wide transition-colors"
          style={{ color: tab === "ambulances" ? "#fb923c" : "#475569", borderBottom: tab === "ambulances" ? "2px solid #fb923c" : "2px solid transparent" }}
        >
          <Truck className="w-3.5 h-3.5" />
          Ambulances
        </button>
      </div>

      {tab === "alerts" ? (
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {alerts.length === 0 ? (
            <div className="text-xs text-slate-600 font-mono text-center py-6">No active alerts</div>
          ) : (
            [...alerts].reverse().map((alert) => (
              <motion.div key={alert.alert_id} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }}
                className="flex gap-2.5 py-2 border-b border-slate-800/40 last:border-0">
                <span className="flex-shrink-0 text-sm mt-0.5"
                  style={{ color: alert.severity === "critical" ? "#ff3b3b" : alert.severity === "warning" ? "#ffaa00" : "#60a5fa" }}>
                  {alert.severity === "critical" ? "●" : alert.severity === "warning" ? "◆" : "○"}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-mono font-semibold capitalize mb-0.5"
                    style={{ color: alert.severity === "critical" ? "#ff3b3b" : alert.severity === "warning" ? "#ffaa00" : "#93c5fd" }}>
                    {alert.department.toUpperCase()} — {alert.severity}
                  </div>
                  <div className="text-xs text-slate-400 leading-snug">{alert.message}</div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      ) : (
        <AmbulancePanel patients={patients} simTime={simTime} />
      )}
    </div>
  );
}

function simClock(simTime: number): string {
  const totalMin = Math.max(0, Math.floor(simTime));
  const hh = String(Math.floor(totalMin / 60) % 24).padStart(2, "0");
  const mm = String(Math.floor(totalMin % 60)).padStart(2, "0");
  return `${hh}:${mm}`;
}

function LiveEventLog({ patients, alerts, simTime }: { patients: Patient[]; alerts: any[]; simTime: number }) {
  const [events, setEvents] = useState<{ id: string; text: string; color: string; clock: string }[]>([]);
  const prevCountRef = useRef(0);
  const simRef = useRef(simTime);
  simRef.current = simTime;

  useEffect(() => {
    const count = patients.length;
    if (count !== prevCountRef.current && count > 0) {
      const p = patients[patients.length - 1];
      const color = p?.severity === "critical" ? "#ff3b3b" : p?.severity === "high" ? "#ffaa00" : "#60a5fa";
      const text = p?.severity === "critical" || p?.severity === "high"
        ? `${p.severity.toUpperCase()} — ${p.name || "Patient"} admitted · ${p.chief_complaint || ""}`
        : `Patient admitted to ${p?.current_department?.toUpperCase() || "ER"}`;
      setEvents((prev) => [{ id: `${Date.now()}`, text, color, clock: simClock(simRef.current) }, ...prev.slice(0, 11)]);
      prevCountRef.current = count;
    }
  }, [patients.length]);

  useEffect(() => {
    if (alerts.length === 0) return;
    const latest = alerts[alerts.length - 1];
    const color = latest.severity === "critical" ? "#ff3b3b" : latest.severity === "warning" ? "#ffaa00" : "#60a5fa";
    setEvents((prev) => [{ id: `alert-${latest.alert_id}`, text: `⚠ ${latest.message}`, color, clock: simClock(simRef.current) }, ...prev.slice(0, 11)]);
  }, [alerts.length]);

  return (
    <div
      className="rounded-xl p-3 flex-shrink-0"
      style={{ background: "rgba(10,14,26,0.8)", border: "1px solid rgba(59,130,246,0.1)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Radio className="w-3 h-3 text-blue-400" />
        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wide">Live Event Feed</span>
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-auto"
        />
      </div>
      <div className="space-y-1 max-h-[88px] overflow-hidden">
        {events.length === 0 ? (
          <div className="text-[10px] text-slate-700 font-mono py-1">Monitoring...</div>
        ) : (
          <AnimatePresence mode="popLayout">
            {events.slice(0, 4).map((e) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="text-[10px] font-mono truncate flex items-center gap-2"
              >
                <span className="text-slate-600 flex-shrink-0 tabular-nums">{e.clock}</span>
                <span className="truncate" style={{ color: e.color }}>{e.text}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

export default function CommandCenterPage() {
  const { hospitalState, isConnected } = useSimulationStore();
  const metrics = hospitalState?.metrics;
  const departments = (hospitalState?.departments ?? {}) as Record<DepartmentKey, DepartmentState>;
  const kpis = [
    {
      icon: Clock,
      label: "Avg Wait",
      value: metrics ? formatTime(metrics.avg_wait_time) : "--",
      status: !metrics ? "neutral"
        : metrics.avg_wait_time > 120 ? "critical"
        : metrics.avg_wait_time > 80 ? "warning"
        : "healthy",
    },
    {
      icon: Users,
      label: "Active Pts",
      value: metrics?.active_patients ?? "--",
      status: "neutral",
    },
    {
      icon: Bed,
      label: "Bed Util",
      value: metrics ? formatPercent(metrics.bed_utilization) : "--",
      status: !metrics ? "neutral"
        : metrics.bed_utilization > 0.92 ? "critical"
        : metrics.bed_utilization > 0.82 ? "warning"
        : "healthy",
    },
    {
      icon: Activity,
      label: "ICU Util",
      value: metrics ? formatPercent(metrics.icu_utilization) : "--",
      status: !metrics ? "neutral"
        : metrics.icu_utilization > 0.90 ? "critical"
        : metrics.icu_utilization > 0.78 ? "warning"
        : "healthy",
    },
    {
      icon: TrendingUp,
      label: "Throughput",
      value: metrics ? `${metrics.throughput_per_hour.toFixed(1)}/hr` : "--",
      status: "neutral",
    },
    {
      icon: Zap,
      label: "Critical",
      value: metrics?.critical_patients ?? "--",
      status: !metrics ? "neutral"
        : (metrics.critical_patients ?? 0) > 8 ? "critical"
        : (metrics.critical_patients ?? 0) > 4 ? "warning"
        : "healthy",
    },
  ] as const;

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-hidden">
      {}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-white tracking-wide">
            Hospital Command Center
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Real-time digital twin visualization • Patient flow simulation
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isConnected && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-800/40">
              <RefreshCw className="w-3 h-3 text-red-400 animate-spin" />
              <span className="text-[11px] text-red-400 font-mono">Connecting...</span>
            </div>
          )}
          <div
            className="px-3 py-1.5 rounded-lg text-[11px] font-mono"
            style={{
              background: "rgba(59,130,246,0.08)",
              border: "1px solid rgba(59,130,246,0.2)",
              color: "#60a5fa",
            }}
          >
            {isConnected ? "● LIVE SIMULATION" : "○ OFFLINE MODE"}
          </div>
        </div>
      </div>

      {}
      <div className="grid grid-cols-6 gap-3 flex-shrink-0">
        {kpis.map((kpi) => (
          <MetricCard
            key={kpi.label}
            icon={kpi.icon}
            label={kpi.label}
            value={kpi.value}
            status={kpi.status as any}
          />
        ))}
      </div>

      {}
      <div className="flex items-center gap-3 flex-shrink-0">
        {metrics && <DiversionBanner metrics={metrics} />}
        {metrics && <HospitalScore metrics={metrics} />}
      </div>

      {}
      <div className="flex flex-1 gap-4 overflow-hidden min-h-0">
        {}
        <div
          className="flex-1 rounded-xl overflow-hidden relative"
          style={{
            background: "rgba(6,10,20,0.95)",
            border: "1px solid rgba(59,130,246,0.12)",
            boxShadow: "inset 0 0 60px rgba(59,130,246,0.03)",
          }}
        >
          <div className="absolute top-3 left-3 z-10">
            <div
              className="text-[9px] font-mono px-2 py-1 rounded"
              style={{
                background: "rgba(10,14,26,0.8)",
                border: "1px solid rgba(59,130,246,0.2)",
                color: "#475569",
              }}
            >
              FLOOR PLAN — ACTIVE PATIENTS SHOWN
            </div>
          </div>

          {}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-3 px-3 py-1.5 rounded"
            style={{ background: "rgba(10,14,26,0.85)", border: "1px solid rgba(59,130,246,0.15)" }}>
            {[
              { label: "Low", color: "#22c55e" },
              { label: "Medium", color: "#ffe600" },
              { label: "High", color: "#ffaa00" },
              { label: "Critical", color: "#ff3b3b" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: s.color, boxShadow: `0 0 4px ${s.color}` }} />
                <span className="text-[9px] text-slate-500 font-mono">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="absolute inset-0 p-3 pt-10">
            <HospitalFloorPlan />
          </div>

          {}
          <div className="absolute bottom-3 left-3 z-10">
            <div
              className="text-[9px] font-mono px-2 py-1 rounded"
              style={{
                background: "rgba(10,14,26,0.8)",
                border: "1px solid rgba(59,130,246,0.2)",
                color: "#475569",
              }}
            >
              {(hospitalState?.patients?.length ?? 0)} PATIENTS ACTIVE
            </div>
          </div>
        </div>

        {}
        <div className="w-[320px] flex flex-col gap-3 overflow-hidden flex-shrink-0">
          {}
          <div
            className="rounded-xl p-3 flex-shrink-0"
            style={{
              background: "rgba(10,14,26,0.8)",
              border: "1px solid rgba(59,130,246,0.1)",
            }}
          >
            <div className="text-[10px] text-slate-500 font-mono uppercase mb-2 tracking-wide">
              Department Status
            </div>
            <div className="space-y-1.5">
              {DEPT_KEYS.map((key) => {
                const dept = departments[key];
                if (!dept) return null;
                const status = occupancyToStatus(dept.occupancy);
                const sColor = statusColor(status);

                return (
                  <div key={key} className="flex items-center gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{
                        background: sColor,
                        boxShadow: `0 0 4px ${sColor}`,
                        animation: status === "critical" ? "pulse-critical 1.5s infinite" : undefined,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-300 font-medium truncate">
                          {dept.display_name}
                        </span>
                        <span className="text-xs font-mono ml-2 flex-shrink-0" style={{ color: sColor }}>
                          {formatPercent(dept.occupancy)}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: sColor, opacity: 0.7 }}
                          animate={{ width: `${Math.round(dept.occupancy * 100)}%` }}
                          transition={{ duration: 2.5, ease: "easeOut" }}
                        />
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-[11px] text-slate-600 font-mono">
                          {dept.current_patients}/{dept.capacity} beds
                        </span>
                        {dept.queue_length > 0 && (
                          <span className="text-[11px] font-mono font-bold" style={{ color: sColor }}>
                            Q:{dept.queue_length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {}
          <LiveEventLog patients={hospitalState?.patients ?? []} alerts={hospitalState?.alerts ?? []} simTime={hospitalState?.sim_time ?? 0} />

          {}
          <AlertsAmbulancePanel
            alerts={hospitalState?.alerts ?? []}
            patients={hospitalState?.patients ?? []}
            simTime={hospitalState?.sim_time ?? 0}
          />
        </div>
      </div>
    </div>
  );
}
