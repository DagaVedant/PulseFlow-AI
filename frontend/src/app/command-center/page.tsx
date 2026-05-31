/* Command Center page: hospital floor plan, live metrics, active alerts, and hospital score. */
"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  Activity, AlertTriangle, Bed, Clock, TrendingUp,
  Users, Zap, RefreshCw, Radio, Siren, DollarSign, ShieldCheck, Anchor, Award, Truck, MapPin, Timer
} from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";
import { useDemoStore } from "@/store/demoStore";
import {
  formatTime, formatPercent, statusColor, occupancyToStatus, cn
} from "@/lib/utils";
import type { Patient, DepartmentKey, DepartmentState, DepartmentStatus } from "@/types";
import type { LucideIcon } from "lucide-react";

// ─── MetricCard (inlined from components/metrics/MetricCard.tsx) ──────────────

const STATUS_STYLES = {
  healthy: { border: "rgba(0,255,136,0.2)",   bg: "rgba(0,255,136,0.04)",  color: "#00ff88", glow: "0 0 20px rgba(0,255,136,0.08)" },
  warning: { border: "rgba(255,170,0,0.25)",  bg: "rgba(255,170,0,0.05)",  color: "#ffaa00", glow: "0 0 20px rgba(255,170,0,0.08)" },
  critical:{ border: "rgba(255,59,59,0.3)",   bg: "rgba(255,59,59,0.06)",  color: "#ff3b3b", glow: "0 0 20px rgba(255,59,59,0.12)" },
  neutral: { border: "rgba(59,130,246,0.15)", bg: "rgba(59,130,246,0.04)", color: "#60a5fa", glow: "0 0 20px rgba(59,130,246,0.06)" },
};

function MetricCard({ icon: Icon, label, value, unit, status = "neutral", trend, subtitle, className }: {
  icon: LucideIcon; label: string; value: string | number; unit?: string;
  status?: "healthy" | "warning" | "critical" | "neutral";
  trend?: number; subtitle?: string; className?: string;
}) {
  const styles = STATUS_STYLES[status];
  return (
    <div className={cn("rounded-xl p-4 transition-all duration-300", className)}
      style={{ background: styles.bg, border: `1px solid ${styles.border}`, boxShadow: styles.glow }}>
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg" style={{ background: `${styles.color}18` }}>
          <Icon className="w-4 h-4" style={{ color: styles.color }} />
        </div>
        {trend !== undefined && (
          <div className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded",
            trend > 0 ? "text-red-400 bg-red-950/40" : "text-emerald-400 bg-emerald-950/40")}>
            {trend > 0 ? "↑" : "↓"} {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="space-y-0.5">
        <div className="text-xs text-slate-500 font-mono uppercase tracking-wide">{label}</div>
        <motion.div key={String(value)} initial={{ opacity: 0.7 }} animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }} className="flex items-baseline gap-1">
          <span className="text-3xl font-bold font-mono" style={{ color: styles.color }}>{value}</span>
          {unit && <span className="text-sm text-slate-500 font-mono">{unit}</span>}
        </motion.div>
        {subtitle && <div className="text-[10px] text-slate-600 font-mono">{subtitle}</div>}
      </div>
    </div>
  );
}

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
    <div className="rounded-xl flex flex-col min-h-[180px] overflow-hidden"
      style={{ background: "rgba(10,14,26,0.8)", border: "1px solid rgba(59,130,246,0.1)", flex: "1 1 180px" }}>
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
    setEvents((prev) => {
      const newEvent = { id: `alert-${latest.alert_id}-${Date.now()}`, text: `⚠ ${latest.message}`, color, clock: simClock(simRef.current) };
      return [newEvent, ...prev.slice(0, 11)];
    });
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

// ─── HospitalFloorPlan (inlined from components/hospital/HospitalFloorPlan.tsx) ─

const FLOOR = { width: 1100, height: 570 };
type RoomType = "er_bay"|"critical_bay"|"triage"|"nurse_stn"|"corridor"|"icu_bed"|"ward_bed"|"ct"|"mri"|"xray"|"lab";
interface RoomDef { x:number; y:number; w:number; h:number; label?:string; type?:RoomType; }
interface DeptZone { key:DepartmentKey; label:string; x:number; y:number; w:number; h:number; color:string; rooms?:RoomDef[]; }

const DEPT_ZONES: DeptZone[] = [
  { key:"er", label:"EMERGENCY DEPARTMENT", x:10, y:10, w:720, h:240, color:"#ef4444",
    rooms:[
      {x:15,y:15,w:145,h:105,label:"Triage",type:"triage"},{x:170,y:15,w:105,h:105,label:"Bay 1",type:"er_bay"},
      {x:285,y:15,w:105,h:105,label:"Bay 2",type:"er_bay"},{x:400,y:15,w:105,h:105,label:"Bay 3",type:"er_bay"},
      {x:515,y:15,w:105,h:105,label:"Bay 4",type:"er_bay"},{x:620,y:15,w:105,h:105,label:"Bay 5",type:"er_bay"},
      {x:15,y:130,w:145,h:105,label:"Critical",type:"critical_bay"},{x:170,y:130,w:105,h:105,label:"Bay 6",type:"er_bay"},
      {x:285,y:130,w:105,h:105,label:"Bay 7",type:"er_bay"},{x:400,y:130,w:105,h:105,label:"Bay 8",type:"er_bay"},
      {x:515,y:130,w:105,h:105,label:"Bay 9",type:"er_bay"},{x:620,y:130,w:105,h:105,label:"Bay 10",type:"er_bay"},
      {x:10,y:243,w:375,h:6,type:"corridor"},{x:395,y:238,w:335,h:11,label:"Nurse Stn",type:"nurse_stn"},
    ]},
  { key:"labs", label:"LABORATORY", x:740, y:10, w:350, h:240, color:"#8b5cf6",
    rooms:[{x:745,y:15,w:168,h:110,label:"Lab A",type:"lab"},{x:920,y:15,w:165,h:110,label:"Lab B",type:"lab"},
           {x:745,y:135,w:168,h:110,label:"Lab C",type:"lab"},{x:920,y:135,w:165,h:110,label:"Lab D",type:"lab"}]},
  { key:"imaging", label:"IMAGING", x:10, y:264, w:320, h:296, color:"#06b6d4",
    rooms:[{x:15,y:269,w:150,h:135,label:"CT-1",type:"ct"},{x:175,y:269,w:150,h:135,label:"CT-2",type:"ct"},
           {x:15,y:414,w:150,h:141,label:"MRI",type:"mri"},{x:175,y:414,w:150,h:141,label:"X-Ray",type:"xray"}]},
  { key:"icu", label:"INTENSIVE CARE UNIT", x:340, y:264, w:370, h:296, color:"#f59e0b",
    rooms:[{x:345,y:269,w:88,h:135,label:"ICU-1",type:"icu_bed"},{x:438,y:269,w:88,h:135,label:"ICU-2",type:"icu_bed"},
           {x:531,y:269,w:88,h:135,label:"ICU-3",type:"icu_bed"},{x:619,y:269,w:87,h:135,label:"ICU-4",type:"icu_bed"},
           {x:345,y:414,w:88,h:141,label:"ICU-5",type:"icu_bed"},{x:438,y:414,w:88,h:141,label:"ICU-6",type:"icu_bed"},
           {x:531,y:414,w:88,h:141,label:"ICU-7",type:"icu_bed"},{x:619,y:414,w:87,h:141,label:"ICU-8",type:"icu_bed"}]},
  { key:"ward", label:"GENERAL WARD", x:720, y:264, w:370, h:296, color:"#22c55e",
    rooms:[{x:725,y:269,w:88,h:135,label:"W-A",type:"ward_bed"},{x:818,y:269,w:88,h:135,label:"W-B",type:"ward_bed"},
           {x:911,y:269,w:88,h:135,label:"W-C",type:"ward_bed"},{x:1000,y:269,w:85,h:135,label:"W-D",type:"ward_bed"},
           {x:725,y:414,w:88,h:141,label:"W-E",type:"ward_bed"},{x:818,y:414,w:88,h:141,label:"W-F",type:"ward_bed"},
           {x:911,y:414,w:88,h:141,label:"W-G",type:"ward_bed"},{x:1000,y:414,w:85,h:141,label:"W-H",type:"ward_bed"}]},
];

const DEPT_PATIENT_AREA: Record<string,{x:number;y:number;w:number;h:number}> = {
  er:{x:175,y:20,w:545,h:220}, triage:{x:20,y:20,w:140,h:105}, labs:{x:750,y:20,w:330,h:225},
  imaging:{x:20,y:274,w:300,h:281}, icu:{x:350,y:274,w:355,h:281}, ward:{x:730,y:274,w:355,h:281},
  registration:{x:350,y:274,w:355,h:281}, discharge:{x:20,y:274,w:300,h:281},
};

function _fpColor(sev:string):string { return ({low:"#22c55e",medium:"#ffe600",high:"#ffaa00",critical:"#ff3b3b"} as any)[sev]??"#64748b"; }
function _fpDots(patients:Patient[]) {
  const groups: Record<string,Patient[]> = {};
  for (const p of patients) { (groups[p.current_department]??=[]).push(p); }
  const rng=(s:string)=>{let h=0;for(let i=0;i<s.length;i++)h=(Math.imul(31,h)+s.charCodeAt(i))|0;return Math.abs(h)/2147483647;};
  const dots: {id:string;x:number;y:number;severity:string;state:string}[] = [];
  for (const [dk, dps] of Object.entries(groups)) {
    const a = DEPT_PATIENT_AREA[dk]; if (!a) continue;
    dps.forEach(p=>{
      const rx=rng(p.patient_id+"px"),ry=rng(p.patient_id+"py");
      const jx=(rng(p.patient_id+"jx")-0.5)*10,jy=(rng(p.patient_id+"jy")-0.5)*10;
      dots.push({id:p.patient_id,
        x:Math.max(a.x+6,Math.min(a.x+a.w-6,a.x+10+rx*(a.w-20)+jx)),
        y:Math.max(a.y+6,Math.min(a.y+a.h-6,a.y+10+ry*(a.h-20)+jy)),
        severity:p.severity,state:p.state});
    });
  }
  return dots;
}

function _FpBed({x,y,w,h,color,monitor=false}:{x:number;y:number;w:number;h:number;color:string;monitor?:boolean}) {
  const bw=Math.min(w-18,70),bh=Math.min(h-36,38),bx=x+w/2-bw/2,by=y+h/2-bh/2+(monitor?8:5);
  return (<g opacity={0.75}>
    <rect x={bx} y={by} width={bw} height={bh} rx="3" fill="rgba(10,14,26,0.5)" stroke={color} strokeWidth="0.9" opacity={0.5}/>
    <rect x={bx} y={by} width={5} height={bh} rx="2" fill={color} opacity={0.45}/>
    <rect x={bx+bw-5} y={by} width={5} height={bh} rx="2" fill={color} opacity={0.3}/>
    <rect x={bx+7} y={by+3} width={bw*0.28} height={bh*0.65} rx="2" fill={color} opacity={0.28}/>
    <rect x={bx+7+bw*0.28+2} y={by+3} width={bw*0.58} height={bh*0.75} rx="1" fill={color} opacity={0.1}/>
    <rect x={bx+5} y={by+bh+1} width={6} height={3} rx="1.5" fill={color} opacity={0.28}/>
    <rect x={bx+bw-11} y={by+bh+1} width={6} height={3} rx="1.5" fill={color} opacity={0.28}/>
    {monitor&&<><rect x={bx+bw/2-16} y={by-24} width={32} height={19} rx="2" fill="rgba(10,14,26,0.8)" stroke={color} strokeWidth="0.6" opacity={0.65}/>
      <polyline points={`${bx+bw/2-12},${by-14} ${bx+bw/2-6},${by-14} ${bx+bw/2-4},${by-20} ${bx+bw/2-2},${by-9} ${bx+bw/2},${by-14} ${bx+bw/2+10},${by-14}`} fill="none" stroke={color} strokeWidth="1.2" opacity={0.65}/>
      <line x1={bx+bw+5} y1={by-18} x2={bx+bw+5} y2={by+bh+2} stroke={color} strokeWidth="1" opacity={0.35}/></>}
    {!monitor&&<line x1={bx+bw+4} y1={by-5} x2={bx+bw+4} y2={by+bh+2} stroke={color} strokeWidth="0.8" opacity={0.25}/>}
  </g>);
}
function _FpCT({x,y,w,h,color}:{x:number;y:number;w:number;h:number;color:string}) {
  const cx=x+w/2-10,cy=y+h/2-5;
  return (<g opacity={0.72}><circle cx={cx} cy={cy} r={30} fill="none" stroke={color} strokeWidth="11" opacity={0.32}/>
    <circle cx={cx} cy={cy} r={17} fill="rgba(6,182,212,0.05)" stroke={color} strokeWidth="1" opacity={0.45}/>
    <rect x={cx+2} y={cy-5} width={52} height={10} rx="3" fill={color} opacity={0.22} stroke={color} strokeWidth="0.6"/>
    <rect x={cx+46} y={cy+5} width={10} height={22} rx="2" fill={color} opacity={0.18}/>
    <rect x={cx-48} y={cy-18} width={12} height={26} rx="2" fill={color} opacity={0.14} stroke={color} strokeWidth="0.5"/>
    {[-13,-7,-1].map(dy=><rect key={dy} x={cx-46} y={cy+dy} width={8} height={3} rx="0.8" fill={color} opacity={0.4}/>)}
  </g>);
}
function _FpMRI({x,y,w,h,color}:{x:number;y:number;w:number;h:number;color:string}) {
  const cx=x+w/2-5,cy=y+h/2-5;
  return (<g opacity={0.72}><rect x={cx-42} y={cy-27} width={84} height={55} rx="27" fill="none" stroke={color} strokeWidth="11" opacity={0.32}/>
    <rect x={cx-26} y={cy-17} width={52} height={35} rx="17" fill="rgba(6,182,212,0.04)" stroke={color} strokeWidth="1" opacity={0.4}/>
    <rect x={cx-8} y={cy-5} width={65} height={10} rx="3" fill={color} opacity={0.22} stroke={color} strokeWidth="0.6"/>
    <rect x={cx-40} y={cy+28} width={80} height={8} rx="2" fill={color} opacity={0.18}/>
  </g>);
}
function _FpXRay({x,y,w,h,color}:{x:number;y:number;w:number;h:number;color:string}) {
  const cx=x+w/2,cy=y+h/2;
  return (<g opacity={0.72}><rect x={cx-3} y={cy-48} width={6} height={68} rx="2.5" fill={color} opacity={0.32}/>
    <rect x={cx-38} y={cy-48} width={76} height={5} rx="2" fill={color} opacity={0.28}/>
    <rect x={cx-24} y={cy-65} width={48} height={20} rx="3" fill="rgba(10,14,26,0.6)" stroke={color} strokeWidth="0.8" opacity={0.55}/>
    <line x1={cx-18} y1={cy-58} x2={cx+18} y2={cy-58} stroke={color} strokeWidth="0.7" opacity={0.35}/>
    <line x1={cx-18} y1={cy-52} x2={cx+18} y2={cy-52} stroke={color} strokeWidth="0.7" opacity={0.35}/>
    <rect x={cx-38} y={cy+22} width={76} height={11} rx="3" fill={color} opacity={0.2} stroke={color} strokeWidth="0.6}"/>
    <rect x={cx-6} y={cy+33} width={12} height={18} rx="2" fill={color} opacity={0.18}/>
  </g>);
}
function _FpLab({x,y,w,h,color}:{x:number;y:number;w:number;h:number;color:string}) {
  const lx=x+w/2-42,ly=y+h/2-18;
  return (<g opacity={0.72}><rect x={lx} y={ly+30} width={28} height={7} rx="2.5" fill={color} opacity={0.38}/>
    <rect x={lx+10} y={ly-2} width={5} height={33} rx="1.5" fill={color} opacity={0.32}/>
    <rect x={lx+2} y={ly-2} width={21} height={5} rx="1.5" fill={color} opacity={0.3}/>
    <rect x={lx+1} y={ly-10} width={11} height={10} rx="2" fill="rgba(10,14,26,0.5)" stroke={color} strokeWidth="0.7" opacity={0.55}/>
    <rect x={lx+5} y={ly+13} width={23} height={5} rx="1" fill={color} opacity={0.3}/>
    <circle cx={lx+12} cy={ly+22} r="3.5" fill="none" stroke={color} strokeWidth="1.2" opacity={0.4}/>
    <path d={`M${lx+36} ${ly+32} L${lx+34} ${ly+14} L${lx+38} ${ly+8} L${lx+48} ${ly+8} L${lx+52} ${ly+14} L${lx+50} ${ly+32} Z`} fill={color} opacity={0.14} stroke={color} strokeWidth="0.9}"/>
    <rect x={lx+56} y={ly-2} width={9} height={34} rx="4.5" fill={color} opacity={0.14} stroke={color} strokeWidth="0.9}"/>
  </g>);
}
function _FpTriage({x,y,w,h,color}:{x:number;y:number;w:number;h:number;color:string}) {
  const cx=x+w/2,cy=y+h/2;
  return (<g opacity={0.65}><rect x={cx-35} y={cy-5} width={70} height={28} rx="3" fill="rgba(10,14,26,0.4)" stroke={color} strokeWidth="0.8" opacity={0.45}/>
    <rect x={cx-30} y={cy-22} width={28} height={18} rx="2" fill="rgba(10,14,26,0.7)" stroke={color} strokeWidth="0.6" opacity={0.55}/>
    {[-18,-14,-10].map(dy=><rect key={dy} x={cx-26} y={cy+dy} width={dy===-10?14:20} height={2} rx="0.5" fill={color} opacity={0.3}/>)}
    <rect x={cx+10} y={cy-18} width={18} height={14} rx="2" fill={color} opacity={0.12} stroke={color} strokeWidth="0.5}"/>
    <rect x={cx-48} y={cy+5} width={14} height={18} rx="2" fill={color} opacity={0.18}/>
    <rect x={cx+34} y={cy+5} width={14} height={18} rx="2" fill={color} opacity={0.18}/>
  </g>);
}
function _FpEquipment({room,color}:{room:RoomDef;color:string}) {
  const {x,y,w,h,type}=room;
  if(type==="er_bay")       return <_FpBed x={x} y={y} w={w} h={h} color={color}/>;
  if(type==="critical_bay") return <_FpBed x={x} y={y} w={w} h={h} color={color} monitor/>;
  if(type==="icu_bed")      return <_FpBed x={x} y={y} w={w} h={h} color={color} monitor/>;
  if(type==="ward_bed")     return <_FpBed x={x} y={y} w={w} h={h} color={color}/>;
  if(type==="triage")       return <_FpTriage x={x} y={y} w={w} h={h} color={color}/>;
  if(type==="ct")           return <_FpCT x={x} y={y} w={w} h={h} color={color}/>;
  if(type==="mri")          return <_FpMRI x={x} y={y} w={w} h={h} color={color}/>;
  if(type==="xray")         return <_FpXRay x={x} y={y} w={w} h={h} color={color}/>;
  if(type==="lab")          return <_FpLab x={x} y={y} w={w} h={h} color={color}/>;
  if(type==="nurse_stn") return (<g opacity={0.4}><rect x={x+4} y={y+1} width={w-8} height={h-2} rx="1" fill={color} opacity={0.12}/><text x={x+w/2} y={y+h/2+3} textAnchor="middle" fontSize="6" fill={color} opacity={0.5} fontFamily="monospace">NURSE STN</text></g>);
  return null;
}

function HospitalFloorPlan() {
  const { hospitalState } = useSimulationStore();
  const [tooltip, setTooltip] = useState<{dept:DepartmentKey;x:number;y:number}|null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const depts  = (hospitalState?.departments ?? {}) as Record<DepartmentKey, DepartmentState>;
  const patientDots = useMemo(() => _fpDots(hospitalState?.patients ?? []), [hospitalState?.patients]);
  const getDeptStatus = (key:DepartmentKey): DepartmentStatus => (depts[key]?.status as DepartmentStatus) ?? "healthy";
  const getDeptOcc    = (key:DepartmentKey): number => depts[key]?.occupancy ?? 0;

  return (
    <div className="relative w-full h-full select-none">
      <svg ref={svgRef} viewBox={`0 0 ${FLOOR.width} ${FLOOR.height}`} className="w-full h-full" style={{background:"transparent"}}>
        <defs>
          <pattern id="fp-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(59,130,246,0.04)" strokeWidth="0.5"/>
          </pattern>
          {["healthy","warning","critical"].map(s=>(
            <radialGradient key={s} id={`fp-grad-${s}`} cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor={s==="healthy"?"rgba(0,255,136,0.1)":s==="warning"?"rgba(255,170,0,0.1)":"rgba(255,59,59,0.13)"}/>
              <stop offset="100%" stopColor="transparent"/>
            </radialGradient>
          ))}
        </defs>
        <rect width={FLOOR.width} height={FLOOR.height} fill="url(#fp-grid)"/>
        <rect x={5} y={5} width={FLOOR.width-10} height={FLOOR.height-10} fill="none" stroke="rgba(59,130,246,0.12)" strokeWidth="1" rx="4"/>
        {DEPT_ZONES.map(zone=>{
          const status=getDeptStatus(zone.key),occupancy=getDeptOcc(zone.key),sColor=statusColor(status);
          return (
            <g key={zone.key} onMouseEnter={()=>setTooltip({dept:zone.key,x:zone.x+zone.w/2,y:zone.y})} onMouseLeave={()=>setTooltip(null)}>
              <rect x={zone.x} y={zone.y} width={zone.w} height={zone.h} fill={`url(#fp-grad-${status})`} stroke={sColor} strokeWidth="1.2" strokeOpacity="0.4" rx="4"/>
              {zone.rooms?.map((room,ri)=>(
                <g key={ri}>
                  {room.type!=="corridor"&&room.type!=="nurse_stn"&&<rect x={room.x+2} y={room.y+2} width={room.w-4} height={room.h-4} fill="rgba(0,0,0,0.18)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.6" rx="2"/>}
                  <_FpEquipment room={room} color={zone.color}/>
                  {room.label&&room.type!=="corridor"&&<text x={room.x+room.w/2} y={room.y+room.h-7} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.35)" fontFamily="JetBrains Mono, monospace" fontWeight="600">{room.label}</text>}
                </g>
              ))}
              <text x={zone.x+8} y={zone.y+14} fontSize="9" fontWeight="700" fill={sColor} fillOpacity="0.9" fontFamily="JetBrains Mono, monospace" letterSpacing="0.8">{zone.label}</text>
              <circle cx={zone.x+zone.w-12} cy={zone.y+12} r="5" fill={sColor} style={{filter:`drop-shadow(0 0 5px ${sColor})`,animation:status==="critical"?"pulse-critical 1.5s infinite":undefined}}/>
              <text x={zone.x+zone.w-24} y={zone.y+15} textAnchor="end" fontSize="8" fill={sColor} fillOpacity="0.85" fontFamily="monospace">{Math.round(occupancy*100)}%</text>
              <rect x={zone.x+2} y={zone.y+zone.h-4} width={Math.max(0,(zone.w-4)*occupancy)} height="3" fill={sColor} fillOpacity="0.55" rx="1.5"/>
            </g>
          );
        })}
        <rect x={10} y={254} width={1080} height={8} fill="rgba(59,130,246,0.03)" stroke="rgba(59,130,246,0.07)" strokeWidth="0.5"/>
        <text x={550} y={260} textAnchor="middle" fontSize="6" fill="rgba(59,130,246,0.28)" fontFamily="monospace">— MAIN CORRIDOR —</text>
        <AnimatePresence mode="popLayout">
          {patientDots.map(dot=>(
            <motion.circle key={dot.id} cx={dot.x} cy={dot.y}
              r={dot.severity==="critical"?5:dot.severity==="high"?4.5:4}
              fill={_fpColor(dot.severity)} fillOpacity={0.88}
              initial={{scale:0,opacity:0}} animate={{cx:dot.x,cy:dot.y,scale:1,opacity:0.88}} exit={{scale:0,opacity:0}}
              transition={{type:"spring",stiffness:28,damping:24,duration:4.0}}
              style={{filter:dot.severity==="critical"?`drop-shadow(0 0 6px ${_fpColor(dot.severity)})`:`drop-shadow(0 0 2px ${_fpColor(dot.severity)})`}}
            />
          ))}
        </AnimatePresence>
        {tooltip&&depts[tooltip.dept]&&(()=>{
          const d=depts[tooltip.dept],s=d.status as DepartmentStatus,sc=statusColor(s);
          const tx=Math.min(tooltip.x,850),ty=Math.max(tooltip.y-105,8);
          return (<g>
            <rect x={tx-88} y={ty} width={176} height={98} fill="rgba(10,14,26,0.97)" stroke={sc} strokeWidth="1" strokeOpacity="0.5" rx="5"/>
            <text x={tx} y={ty+15} textAnchor="middle" fontSize="10" fontWeight="700" fill={sc} fontFamily="monospace">{d.display_name?.toUpperCase()}</text>
            <line x1={tx-82} y1={ty+20} x2={tx+82} y2={ty+20} stroke={sc} strokeWidth="0.5" strokeOpacity="0.3"/>
            {[["Occupancy",formatPercent(d.occupancy)],["Queue",`${d.queue_length} patients`],["Avg Wait",formatTime(d.avg_wait_time)],["Beds Avail",`${d.beds_available}`]].map(([label,val],i)=>(
              <g key={label}><text x={tx-80} y={ty+34+i*15} fontSize="8.5" fill="rgba(148,163,184,0.85)" fontFamily="monospace">{label}</text><text x={tx+80} y={ty+34+i*15} textAnchor="end" fontSize="8.5" fill="rgba(226,232,240,0.95)" fontFamily="monospace" fontWeight="600">{val}</text></g>
            ))}
          </g>);
        })()}
      </svg>
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
        <div className="w-[320px] flex flex-col gap-3 overflow-y-auto flex-shrink-0 min-h-0">
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
