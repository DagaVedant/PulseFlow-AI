/* Command Center page: hospital floor plan, live metrics, and active alerts. */
"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import {
  Activity, AlertTriangle, Bed, Clock, TrendingUp,
  Users, Zap, RefreshCw, Radio
} from "lucide-react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { useSimulationStore } from "@/store/simulationStore";
import { HospitalFloorPlan } from "@/components/hospital/HospitalFloorPlan";
import { MetricCard } from "@/components/metrics/MetricCard";
import {
  formatTime, formatPercent, statusColor, cn, occupancyToStatus
} from "@/lib/utils";
import type { Patient } from "@/types";

const DEPT_KEYS = ["er", "labs", "imaging", "icu", "ward"] as const;

function LiveEventLog({ patients, alerts }: { patients: Patient[]; alerts: any[] }) {
  const [events, setEvents] = useState<{ id: string; text: string; color: string; ts: number }[]>([]);
  const prevCountRef = useRef(0);

  useEffect(() => {
    const criticalNew = patients.filter(
      (p) => (p.severity === "critical" || p.severity === "high") && p.state === "triage"
    );
    const count = patients.length;
    if (count !== prevCountRef.current && count > 0) {
      const p = patients[patients.length - 1];
      const color = p?.severity === "critical" ? "#f87171" : p?.severity === "high" ? "#fbbf24" : "#60a5fa";
      const text = p?.severity === "critical" || p?.severity === "high"
        ? `${p.severity.toUpperCase()} — ${p.name || "Patient"} admitted · ${p.chief_complaint || ""}`
        : `Patient admitted to ${p?.current_department?.toUpperCase() || "ER"}`;
      setEvents((prev) => [{ id: `${Date.now()}`, text, color, ts: Date.now() }, ...prev.slice(0, 11)]);
      prevCountRef.current = count;
    }
  }, [patients.length]);

  useEffect(() => {
    if (alerts.length === 0) return;
    const latest = alerts[alerts.length - 1];
    const color = latest.severity === "critical" ? "#f87171" : latest.severity === "warning" ? "#fbbf24" : "#60a5fa";
    setEvents((prev) => [{ id: `alert-${latest.alert_id}`, text: `⚠ ${latest.message}`, color, ts: Date.now() }, ...prev.slice(0, 11)]);
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
                className="text-[10px] font-mono truncate"
                style={{ color: e.color }}
              >
                {e.text}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

export default function CommandCenterPage() {
  const { hospitalState, criticalAlerts, isConnected } = useSimulationStore();
  const metrics = hospitalState?.metrics;
  const departments = hospitalState?.departments ?? {};
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
              { label: "Medium", color: "#f59e0b" },
              { label: "High", color: "#ef4444" },
              { label: "Critical", color: "#dc2626" },
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
          <LiveEventLog patients={hospitalState?.patients ?? []} alerts={hospitalState?.alerts ?? []} />

          {}
          <div
            className="rounded-xl flex flex-col flex-1 min-h-0 overflow-hidden"
            style={{
              background: "rgba(10,14,26,0.8)",
              border: "1px solid rgba(59,130,246,0.1)",
            }}
          >
            {}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800/60 flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-xs text-slate-400 font-mono uppercase tracking-wide">
                Active Alerts
              </span>
              {(hospitalState?.alerts ?? []).length > 0 && (
                <span className="ml-auto text-xs font-mono font-bold text-red-400 bg-red-950/50 px-2 py-0.5 rounded">
                  {(hospitalState?.alerts ?? []).length}
                </span>
              )}
            </div>

            {}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
              {(hospitalState?.alerts ?? []).length === 0 ? (
                <div className="text-xs text-slate-600 font-mono text-center py-6">
                  No active alerts
                </div>
              ) : (
                [...(hospitalState?.alerts ?? [])].reverse().map((alert) => (
                  <motion.div
                    key={alert.alert_id}
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-2.5 py-2 border-b border-slate-800/40 last:border-0"
                  >
                    <span
                      className="flex-shrink-0 text-sm mt-0.5"
                      style={{
                        color: alert.severity === "critical" ? "#f87171"
                          : alert.severity === "warning" ? "#fbbf24"
                          : "#60a5fa",
                      }}
                    >
                      {alert.severity === "critical" ? "●" : alert.severity === "warning" ? "◆" : "○"}
                    </span>
                    <div className="min-w-0">
                      <div
                        className="text-xs font-mono font-semibold capitalize mb-0.5"
                        style={{
                          color: alert.severity === "critical" ? "#fca5a5"
                            : alert.severity === "warning" ? "#fde68a"
                            : "#93c5fd",
                        }}
                      >
                        {alert.department.toUpperCase()} — {alert.severity}
                      </div>
                      <div className="text-xs text-slate-400 leading-snug">
                        {alert.message}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
