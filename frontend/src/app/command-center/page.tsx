"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  Bed,
  Clock,
  TrendingUp,
  Users,
  Zap,
  Radio,
  Siren,
  DollarSign,
  ShieldCheck,
  Anchor,
  Award,
  Truck,
  MapPin,
  Timer,
} from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";
import { useDemoStore } from "@/store/demoStore";
import {
  formatTime,
  formatPercent,
  statusColor,
  statusBg,
  statusBorder,
  occupancyToStatus,
  cn,
} from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PrivacyMask } from "@/components/ui/PrivacyMask";
import type {
  Patient,
  DepartmentKey,
  DepartmentState,
  DepartmentStatus,
} from "@/types";
import type { LucideIcon } from "lucide-react";

const STATUS_STYLES = {
  healthy: {
    className: "bg-safe-soft border-safe-line",
    color: "text-safe-ink",
  },
  warning: {
    className: "bg-flag-soft border-flag-line",
    color: "text-flag-ink",
  },
  critical: { className: "bg-crit-soft border-crit-line", color: "text-crit-ink" },
  neutral: {
    className: "bg-clinical-surface border-clinical-border",
    color: "text-ink",
  },
};

function MetricCard({
  icon: Icon,
  label,
  value,
  unit,
  status = "neutral",
  trend,
  subtitle,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  status?: "healthy" | "warning" | "critical" | "neutral";
  trend?: number;
  subtitle?: string;
  className?: string;
}) {
  const styles = STATUS_STYLES[status];
  return (
    <div className={cn("border rounded-lg p-4", styles.className, className)}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-2 rounded-lg bg-clinical-canvas", styles.color)}>
          <Icon className="w-4 h-4" />
        </div>
        {trend !== undefined && (
          <div
            className={cn(
              "text-xs font-mono font-medium px-2 py-1 rounded",
              trend > 0
                ? "text-crit-ink bg-crit-soft"
                : "text-safe-ink bg-safe-soft",
            )}
          >
            {trend > 0 ? "↑" : "↓"} {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="space-y-2">
        <div className="text-xs text-muted font-medium uppercase tracking-wide">
          {label}
        </div>
        <div className="flex items-baseline gap-2">
          <span className={cn("text-3xl font-bold font-mono", styles.color)}>
            {value}
          </span>
          {unit && (
            <span className="text-sm text-muted font-mono">{unit}</span>
          )}
        </div>
        {subtitle && (
          <div className="text-xs text-muted font-mono">{subtitle}</div>
        )}
      </div>
    </div>
  );
}

const DEPT_KEYS = ["er", "labs", "imaging", "icu", "ward"] as const;

function DiversionBanner({ metrics }: { metrics: any }) {
  const risk = metrics.diversion_risk ?? 0;
  const mins = metrics.minutes_to_diversion ?? 0;
  const cost = metrics.delay_cost_per_hour ?? 0;
  const sla = metrics.sla_compliance ?? 1;
  const boarding = metrics.boarding_count ?? 0;
  const deteriorating = metrics.deteriorating_count ?? 0;
  const sepsis = metrics.sepsis_count ?? 0;

  const riskStatus: DepartmentStatus =
    risk > 0.8 ? "critical" : risk > 0.6 ? "warning" : "healthy";
  const riskColor = statusColor(riskStatus);
  const label = risk > 0.8 ? "HIGH RISK" : risk > 0.6 ? "ELEVATED" : "NORMAL";
  const riskTextClass =
    riskStatus === "critical"
      ? "text-crit-ink"
      : riskStatus === "warning"
        ? "text-flag-ink"
        : "text-safe-ink";
  const slaClass = sla < 0.7 ? "text-crit-ink" : "text-safe-ink";

  return (
    <div className="flex items-center gap-4 flex-shrink-0 border border-clinical-border bg-clinical-surface rounded-lg px-4 py-2 flex-wrap">
      <div className="flex items-center gap-2 flex-shrink-0">
        <Siren className={cn("w-4 h-4", riskTextClass)} />
        <span
          className={cn("text-xs font-mono font-bold uppercase", riskTextClass)}
        >
          Diversion {label}
        </span>
        <div className="w-28 h-2 bg-clinical-canvas border border-clinical-border rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.round(risk * 100)}%`,
              background: riskColor,
            }}
          />
        </div>
        <span className={cn("text-xs font-mono", riskTextClass)}>
          {Math.round(risk * 100)}%
        </span>
        {risk > 0.6 && mins > 0 && (
          <span className="text-xs font-mono text-muted">~{mins}m</span>
        )}
      </div>

      <div className="w-px h-4 bg-clinical-border flex-shrink-0" />

      <div className="flex items-center gap-2 flex-shrink-0">
        <DollarSign className="w-4 h-4 text-flag-ink" />
        <span className="text-xs font-mono text-flag-ink">
          ${cost.toLocaleString()}/hr delay cost
        </span>
      </div>

      <div className="w-px h-4 bg-clinical-border flex-shrink-0" />

      <div className="flex items-center gap-2 flex-shrink-0">
        <ShieldCheck className={cn("w-4 h-4", slaClass)} />
        <span className={cn("text-xs font-mono", slaClass)}>
          {Math.round(sla * 100)}% SLA
        </span>
      </div>

      {boarding > 0 && (
        <>
          <div className="w-px h-4 bg-clinical-border flex-shrink-0" />
          <div className="flex items-center gap-2 flex-shrink-0">
            <Anchor className="w-4 h-4 text-flag-ink" />
            <span className="text-xs font-mono text-flag-ink">
              {boarding} boarding
            </span>
          </div>
        </>
      )}

      {deteriorating > 0 && (
        <>
          <div className="w-px h-4 bg-clinical-border flex-shrink-0" />
          <div className="flex items-center gap-2 flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-crit-ink" />
            <span className="text-xs font-mono text-crit-ink">
              {deteriorating} deteriorating
            </span>
          </div>
        </>
      )}

      {sepsis > 0 && (
        <>
          <div className="w-px h-4 bg-clinical-border flex-shrink-0" />
          <div className="flex items-center gap-2 flex-shrink-0">
            <Zap className="w-4 h-4 text-crit-ink" />
            <span className="text-xs font-mono text-crit-ink">
              {sepsis} sepsis risk
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function computeHospitalScore(metrics: any): number {
  if (!metrics) return 0;
  const sla = (metrics.sla_compliance ?? 1) * 100;
  const bedUtil = metrics.bed_utilization ?? 0;
  const waitPenalty = Math.max(
    0,
    Math.min(100, 100 - (metrics.avg_wait_time ?? 0) / 2),
  );
  const divPenalty = (1 - (metrics.diversion_risk ?? 0)) * 100;
  const throughput = Math.min(100, (metrics.throughput_per_hour ?? 0) * 8);
  const bedScore = bedUtil < 0.95 ? 100 - Math.abs(bedUtil - 0.8) * 100 : 20;
  return Math.round(
    sla * 0.25 +
      waitPenalty * 0.25 +
      divPenalty * 0.2 +
      throughput * 0.15 +
      bedScore * 0.15,
  );
}

function HospitalScore({ metrics }: { metrics: any }) {
  const score = computeHospitalScore(metrics);
  const scoreStatus: DepartmentStatus =
    score >= 80 ? "healthy" : score >= 60 ? "warning" : "critical";
  const color = statusColor(scoreStatus);
  const label = score >= 80 ? "GOOD" : score >= 60 ? "FAIR" : "CRITICAL";
  const scoreTextClass =
    scoreStatus === "critical"
      ? "text-crit-ink"
      : scoreStatus === "warning"
        ? "text-flag-ink"
        : "text-safe-ink";
  const circumference = 2 * Math.PI * 20;
  const dashOffset = circumference * (1 - score / 100);

  return (
    <div className="flex items-center gap-4 flex-shrink-0 border border-clinical-border bg-clinical-surface rounded-lg px-4 py-2">
      <div className="relative w-12 h-12 flex-shrink-0">
        <svg viewBox="0 0 50 50" className="w-full h-full -rotate-90">
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="4"
          />
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("text-xs font-mono font-bold", scoreTextClass)}>
            {score}
          </span>
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Award className={cn("w-4 h-4", scoreTextClass)} />
          <span
            className={cn(
              "text-xs font-mono font-bold uppercase",
              scoreTextClass,
            )}
          >
            Hospital Score
          </span>
        </div>
        <span className="text-xs font-mono text-muted">
          {label} — composite efficiency index
        </span>
      </div>
    </div>
  );
}

const AMBULANCE_ORIGINS = [
  "Cedar Rd & 5th Ave",
  "Lakeside Park",
  "Downtown Plaza",
  "Highway 12 Exit 7",
  "Riverside Community",
  "Northgate Mall",
  "Airport Terminal B",
  "Industrial District",
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
      (p) =>
        (p.severity === "critical" || p.severity === "high") &&
        p.state === "arriving",
    );
    critHigh.forEach((p) => {
      if (seenRef.current.has(p.patient_id)) return;
      seenRef.current.add(p.patient_id);
      const rng = (s: string) => {
        let h = 0;
        for (let i = 0; i < s.length; i++)
          h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
        return Math.abs(h) / 2147483647;
      };
      const unit: AmbulanceUnit = {
        id: p.patient_id,
        unit: `AMB-${String(counterRef.current++).padStart(3, "0")}`,
        origin:
          AMBULANCE_ORIGINS[
            Math.floor(rng(p.patient_id + "o") * AMBULANCE_ORIGINS.length)
          ],
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
          .filter((u) => u.eta_min > 0 || simTime - u.dispatched_at < 10),
      );
    }, 60000 / 60);
    return () => clearInterval(interval);
  }, [simTime]);

  return units;
}

function AmbulancePanel({
  patients,
  simTime,
}: {
  patients: Patient[];
  simTime: number;
}) {
  const units = useAmbulanceSimulation(simTime, patients);

  const hourBuckets: Record<number, number> = {};
  units.forEach((u) => {
    const h = Math.floor(u.dispatched_at / 60) % 24;
    hourBuckets[h] = (hourBuckets[h] ?? 0) + 1;
  });
  const peakHour = Object.entries(hourBuckets).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex gap-2 mb-4">
        <div className="flex-1 border border-flag-line bg-flag-soft rounded-lg p-2 text-center">
          <div className="text-lg font-mono font-bold text-flag-ink">
            {units.length}
          </div>
          <div className="text-xs font-medium text-muted uppercase">
            En Route
          </div>
        </div>
        <div className="flex-1 border border-crit-line bg-crit-soft rounded-lg p-2 text-center">
          <div className="text-lg font-mono font-bold text-crit-ink">
            {units.filter((u) => u.severity === "critical").length}
          </div>
          <div className="text-xs font-medium text-muted uppercase">
            Critical
          </div>
        </div>
        <div className="flex-1 border border-clinical-border bg-clinical-canvas rounded-lg p-2 text-center">
          <div className="text-lg font-mono font-bold text-ink">
            {peakHour
              ? `${String(Number(peakHour[0])).padStart(2, "0")}:00`
              : "--"}
          </div>
          <div className="text-xs font-medium text-muted uppercase">
            Peak Hr
          </div>
        </div>
      </div>

      {units.length === 0 ? (
        <div className="text-sm text-muted font-mono text-center py-6">
          No ambulances currently dispatched
        </div>
      ) : (
        units.map((u) => {
          const sevStatus =
            u.severity === "critical"
              ? "critical"
              : u.severity === "high"
                ? "flagged"
                : "safe";
          const sevText =
            sevStatus === "critical"
              ? "text-crit-ink"
              : sevStatus === "flagged"
                ? "text-flag-ink"
                : "text-muted";
          const sevBorder =
            sevStatus === "critical"
              ? "border-crit-line bg-crit-soft"
              : sevStatus === "flagged"
                ? "border-flag-line bg-flag-soft"
                : "border-clinical-border bg-clinical-canvas";
          return (
            <div key={u.id} className={cn("rounded-lg p-2 border", sevBorder)}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Truck className={cn("w-4 h-4 flex-shrink-0", sevText)} />
                  <span className={cn("text-sm font-mono font-bold", sevText)}>
                    {u.unit}
                  </span>
                  <StatusBadge
                    status={sevStatus}
                    label={u.severity.toUpperCase()}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-muted" />
                  <span className={cn("text-xs font-mono font-bold", sevText)}>
                    {u.eta_min === 0 ? "ARRIVING" : `${u.eta_min}m`}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-muted">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{u.origin}</span>
              </div>
              <div className="text-xs font-mono text-muted mt-2 truncate">
                {u.complaint}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function AlertsAmbulancePanel({
  alerts,
  patients,
  simTime,
}: {
  alerts: any[];
  patients: Patient[];
  simTime: number;
}) {
  const [tab, setTab] = useState<"alerts" | "ambulances">("alerts");
  const { pendingAction, clearAction } = useDemoStore();

  useEffect(() => {
    if (pendingAction === "view_ambulances") {
      clearAction();
      setTab("ambulances");
    }
  }, [pendingAction]);

  return (
    <div
      className="border border-clinical-border bg-clinical-surface rounded-lg flex flex-col min-h-[180px] overflow-hidden"
      style={{ flex: "1 1 180px" }}
    >
      <div className="flex items-center border-b border-clinical-border flex-shrink-0">
        <button
          onClick={() => setTab("alerts")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-xs font-medium uppercase tracking-wide border-b-2",
            tab === "alerts"
              ? "text-crit-ink border-crit-ink"
              : "text-muted border-transparent",
          )}
        >
          <AlertTriangle className="w-4 h-4" />
          Alerts
          {alerts.length > 0 && (
            <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-crit-soft text-crit-ink">
              {alerts.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("ambulances")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-xs font-medium uppercase tracking-wide border-b-2",
            tab === "ambulances"
              ? "text-flag-ink border-flag-ink"
              : "text-muted border-transparent",
          )}
        >
          <Truck className="w-4 h-4" />
          Ambulances
        </button>
      </div>

      {tab === "alerts" ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {alerts.length === 0 ? (
            <div className="text-sm text-muted font-mono text-center py-6">
              No active alerts
            </div>
          ) : (
            [...alerts].reverse().map((alert) => {
              const sevStatus =
                alert.severity === "critical"
                  ? "critical"
                  : alert.severity === "warning"
                    ? "flagged"
                    : "safe";
              const sevText =
                sevStatus === "critical"
                  ? "text-crit-ink"
                  : sevStatus === "flagged"
                    ? "text-flag-ink"
                    : "text-muted";
              return (
                <div
                  key={alert.alert_id}
                  className="flex gap-2 py-2 border-b border-clinical-border last:border-0"
                >
                  <StatusBadge
                    status={sevStatus}
                    label={alert.severity.toUpperCase()}
                    className="flex-shrink-0 self-start"
                  />
                  <div className="min-w-0">
                    <div
                      className={cn(
                        "text-xs font-mono font-semibold capitalize mb-2",
                        sevText,
                      )}
                    >
                      {alert.department.toUpperCase()} — {alert.severity}
                    </div>
                    <div className="text-xs text-muted leading-snug">
                      {alert.message}
                    </div>
                  </div>
                </div>
              );
            })
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

function LiveEventLog({
  patients,
  alerts,
  simTime,
}: {
  patients: Patient[];
  alerts: any[];
  simTime: number;
}) {
  const [events, setEvents] = useState<
    {
      id: string;
      text: string;
      name?: string;
      prefix?: string;
      suffix?: string;
      colorClass: string;
      clock: string;
    }[]
  >([]);
  const prevCountRef = useRef(0);
  const simRef = useRef(simTime);
  simRef.current = simTime;

  useEffect(() => {
    const count = patients.length;
    if (count !== prevCountRef.current && count > 0) {
      const p = patients[patients.length - 1];
      const colorClass =
        p?.severity === "critical"
          ? "text-crit-ink"
          : p?.severity === "high"
            ? "text-flag-ink"
            : "text-muted";
      if (p?.severity === "critical" || p?.severity === "high") {
        setEvents((prev) => [
          {
            id: `${Date.now()}`,
            text: "",
            prefix: `${p.severity.toUpperCase()} — `,
            name: p.name || "Patient",
            suffix: ` admitted · ${p.chief_complaint || ""}`,
            colorClass,
            clock: simClock(simRef.current),
          },
          ...prev.slice(0, 11),
        ]);
      } else {
        setEvents((prev) => [
          {
            id: `${Date.now()}`,
            text: `Patient admitted to ${p?.current_department?.toUpperCase() || "ER"}`,
            colorClass,
            clock: simClock(simRef.current),
          },
          ...prev.slice(0, 11),
        ]);
      }
      prevCountRef.current = count;
    }
  }, [patients.length]);

  useEffect(() => {
    if (alerts.length === 0) return;
    const latest = alerts[alerts.length - 1];
    const colorClass =
      latest.severity === "critical"
        ? "text-crit-ink"
        : latest.severity === "warning"
          ? "text-flag-ink"
          : "text-muted";
    setEvents((prev) => {
      const newEvent = {
        id: `alert-${latest.alert_id}-${Date.now()}`,
        text: `⚠ ${latest.message}`,
        colorClass,
        clock: simClock(simRef.current),
      };
      return [newEvent, ...prev.slice(0, 11)];
    });
  }, [alerts.length]);

  return (
    <div className="border border-clinical-border bg-clinical-surface rounded-lg p-4 flex-shrink-0">
      <div className="flex items-center gap-2 mb-2">
        <Radio className="w-4 h-4 text-muted" />
        <span className="text-xs text-muted font-medium uppercase tracking-wide">
          Live Event Feed
        </span>
      </div>
      <div className="space-y-2 max-h-[88px] overflow-hidden">
        {events.length === 0 ? (
          <div className="text-xs text-muted font-mono py-2">
            Monitoring...
          </div>
        ) : (
          events.slice(0, 4).map((e) => (
            <div
              key={e.id}
              className="text-xs font-mono truncate flex items-center gap-2"
            >
              <span className="text-muted flex-shrink-0 tabular-nums">
                {e.clock}
              </span>
              {e.name ? (
                <span
                  className={cn(
                    "truncate inline-flex items-center",
                    e.colorClass,
                  )}
                >
                  {e.prefix}
                  <PrivacyMask
                    value={e.name}
                    label="Patient name"
                    fieldId={`evt-${e.id}`}
                  />
                  {e.suffix}
                </span>
              ) : (
                <span className={cn("truncate", e.colorClass)}>{e.text}</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}


const FLOOR = { width: 1100, height: 570 };
type RoomType =
  | "er_bay"
  | "critical_bay"
  | "triage"
  | "nurse_stn"
  | "corridor"
  | "icu_bed"
  | "ward_bed"
  | "ct"
  | "mri"
  | "xray"
  | "lab";
interface RoomDef {
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  type?: RoomType;
}
interface DeptZone {
  key: DepartmentKey;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  rooms?: RoomDef[];
}

const DEPT_ZONES: DeptZone[] = [
  {
    key: "er",
    label: "EMERGENCY DEPARTMENT",
    x: 10,
    y: 10,
    w: 720,
    h: 240,
    color: "#475569",
    rooms: [
      { x: 15, y: 15, w: 145, h: 105, label: "Triage", type: "triage" },
      { x: 170, y: 15, w: 105, h: 105, label: "Bay 1", type: "er_bay" },
      { x: 285, y: 15, w: 105, h: 105, label: "Bay 2", type: "er_bay" },
      { x: 400, y: 15, w: 105, h: 105, label: "Bay 3", type: "er_bay" },
      { x: 515, y: 15, w: 105, h: 105, label: "Bay 4", type: "er_bay" },
      { x: 620, y: 15, w: 105, h: 105, label: "Bay 5", type: "er_bay" },
      {
        x: 15,
        y: 130,
        w: 145,
        h: 105,
        label: "Critical",
        type: "critical_bay",
      },
      { x: 170, y: 130, w: 105, h: 105, label: "Bay 6", type: "er_bay" },
      { x: 285, y: 130, w: 105, h: 105, label: "Bay 7", type: "er_bay" },
      { x: 400, y: 130, w: 105, h: 105, label: "Bay 8", type: "er_bay" },
      { x: 515, y: 130, w: 105, h: 105, label: "Bay 9", type: "er_bay" },
      { x: 620, y: 130, w: 105, h: 105, label: "Bay 10", type: "er_bay" },
      { x: 10, y: 243, w: 375, h: 6, type: "corridor" },
      { x: 395, y: 238, w: 335, h: 11, label: "Nurse Stn", type: "nurse_stn" },
    ],
  },
  {
    key: "labs",
    label: "LABORATORY",
    x: 740,
    y: 10,
    w: 350,
    h: 240,
    color: "#475569",
    rooms: [
      { x: 745, y: 15, w: 168, h: 110, label: "Lab A", type: "lab" },
      { x: 920, y: 15, w: 165, h: 110, label: "Lab B", type: "lab" },
      { x: 745, y: 135, w: 168, h: 110, label: "Lab C", type: "lab" },
      { x: 920, y: 135, w: 165, h: 110, label: "Lab D", type: "lab" },
    ],
  },
  {
    key: "imaging",
    label: "IMAGING",
    x: 10,
    y: 264,
    w: 320,
    h: 296,
    color: "#475569",
    rooms: [
      { x: 15, y: 269, w: 150, h: 135, label: "CT-1", type: "ct" },
      { x: 175, y: 269, w: 150, h: 135, label: "CT-2", type: "ct" },
      { x: 15, y: 414, w: 150, h: 141, label: "MRI", type: "mri" },
      { x: 175, y: 414, w: 150, h: 141, label: "X-Ray", type: "xray" },
    ],
  },
  {
    key: "icu",
    label: "INTENSIVE CARE UNIT",
    x: 340,
    y: 264,
    w: 370,
    h: 296,
    color: "#475569",
    rooms: [
      { x: 345, y: 269, w: 88, h: 135, label: "ICU-1", type: "icu_bed" },
      { x: 438, y: 269, w: 88, h: 135, label: "ICU-2", type: "icu_bed" },
      { x: 531, y: 269, w: 88, h: 135, label: "ICU-3", type: "icu_bed" },
      { x: 619, y: 269, w: 87, h: 135, label: "ICU-4", type: "icu_bed" },
      { x: 345, y: 414, w: 88, h: 141, label: "ICU-5", type: "icu_bed" },
      { x: 438, y: 414, w: 88, h: 141, label: "ICU-6", type: "icu_bed" },
      { x: 531, y: 414, w: 88, h: 141, label: "ICU-7", type: "icu_bed" },
      { x: 619, y: 414, w: 87, h: 141, label: "ICU-8", type: "icu_bed" },
    ],
  },
  {
    key: "ward",
    label: "GENERAL WARD",
    x: 720,
    y: 264,
    w: 370,
    h: 296,
    color: "#475569",
    rooms: [
      { x: 725, y: 269, w: 88, h: 135, label: "W-A", type: "ward_bed" },
      { x: 818, y: 269, w: 88, h: 135, label: "W-B", type: "ward_bed" },
      { x: 911, y: 269, w: 88, h: 135, label: "W-C", type: "ward_bed" },
      { x: 1000, y: 269, w: 85, h: 135, label: "W-D", type: "ward_bed" },
      { x: 725, y: 414, w: 88, h: 141, label: "W-E", type: "ward_bed" },
      { x: 818, y: 414, w: 88, h: 141, label: "W-F", type: "ward_bed" },
      { x: 911, y: 414, w: 88, h: 141, label: "W-G", type: "ward_bed" },
      { x: 1000, y: 414, w: 85, h: 141, label: "W-H", type: "ward_bed" },
    ],
  },
];

const DEPT_PATIENT_AREA: Record<
  string,
  { x: number; y: number; w: number; h: number }
> = {
  er: { x: 175, y: 20, w: 545, h: 220 },
  triage: { x: 20, y: 20, w: 140, h: 105 },
  labs: { x: 750, y: 20, w: 330, h: 225 },
  imaging: { x: 20, y: 274, w: 300, h: 281 },
  icu: { x: 350, y: 274, w: 355, h: 281 },
  ward: { x: 730, y: 274, w: 355, h: 281 },
  registration: { x: 350, y: 274, w: 355, h: 281 },
  discharge: { x: 20, y: 274, w: 300, h: 281 },
};

function _fpColor(sev: string): string {
  return (
    (
      {
        low: "#059669",
        medium: "#D97706",
        high: "#EA580C",
        critical: "#DC2626",
      } as any
    )[sev] ?? "#475569"
  );
}
function _halton(index: number, base: number): number {
  let f = 1,
    r = 0,
    i = index + 1;
  while (i > 0) {
    f /= base;
    r += f * (i % base);
    i = Math.floor(i / base);
  }
  return r;
}

const SEV_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};
const MAX_DOTS_PER_DEPT = 14;

function _fpDots(patients: Patient[]) {
  const groups: Record<string, Patient[]> = {};
  for (const p of patients) {
    (groups[p.current_department] ??= []).push(p);
  }

  const jitter = (s: string, salt: string) => {
    let h = 0;
    const t = s + salt;
    for (let i = 0; i < t.length; i++)
      h = (Math.imul(31, h) + t.charCodeAt(i)) | 0;
    return (Math.abs(h) / 2147483647 - 0.5) * 14;
  };

  const dots: {
    id: string;
    x: number;
    y: number;
    severity: string;
    state: string;
  }[] = [];
  for (const [dk, dps] of Object.entries(groups)) {
    const a = DEPT_PATIENT_AREA[dk];
    if (!a) continue;
    const visible = [...dps]
      .sort(
        (a, b) => (SEV_ORDER[a.severity] ?? 3) - (SEV_ORDER[b.severity] ?? 3),
      )
      .slice(0, MAX_DOTS_PER_DEPT);
    visible.forEach((p, i) => {
      const bx = _halton(i, 2);
      const by = _halton(i, 3);
      const x = a.x + 12 + bx * (a.w - 24) + jitter(p.patient_id, "x");
      const y = a.y + 12 + by * (a.h - 24) + jitter(p.patient_id, "y");
      dots.push({
        id: p.patient_id,
        x: Math.max(a.x + 6, Math.min(a.x + a.w - 6, x)),
        y: Math.max(a.y + 6, Math.min(a.y + a.h - 6, y)),
        severity: p.severity,
        state: p.state,
      });
    });
  }
  return dots;
}

function _FpBed({
  x,
  y,
  w,
  h,
  color,
  monitor = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  monitor?: boolean;
}) {
  const bw = Math.min(w - 18, 70),
    bh = Math.min(h - 36, 38),
    bx = x + w / 2 - bw / 2,
    by = y + h / 2 - bh / 2 + (monitor ? 8 : 5);
  return (
    <g opacity={0.6}>
      <rect
        x={bx}
        y={by}
        width={bw}
        height={bh}
        rx="3"
        fill="#F8FAFC"
        stroke={color}
        strokeWidth="0.9"
        opacity={0.6}
      />
      <rect
        x={bx}
        y={by}
        width={5}
        height={bh}
        rx="2"
        fill={color}
        opacity={0.45}
      />
      <rect
        x={bx + bw - 5}
        y={by}
        width={5}
        height={bh}
        rx="2"
        fill={color}
        opacity={0.3}
      />
      <rect
        x={bx + 7}
        y={by + 3}
        width={bw * 0.28}
        height={bh * 0.65}
        rx="2"
        fill={color}
        opacity={0.28}
      />
      <rect
        x={bx + 7 + bw * 0.28 + 2}
        y={by + 3}
        width={bw * 0.58}
        height={bh * 0.75}
        rx="1"
        fill={color}
        opacity={0.1}
      />
      <rect
        x={bx + 5}
        y={by + bh + 1}
        width={6}
        height={3}
        rx="1.5"
        fill={color}
        opacity={0.28}
      />
      <rect
        x={bx + bw - 11}
        y={by + bh + 1}
        width={6}
        height={3}
        rx="1.5"
        fill={color}
        opacity={0.28}
      />
      {monitor && (
        <>
          <rect
            x={bx + bw / 2 - 16}
            y={by - 24}
            width={32}
            height={19}
            rx="2"
            fill="#FFFFFF"
            stroke={color}
            strokeWidth="0.6"
            opacity={0.65}
          />
          <polyline
            points={`${bx + bw / 2 - 12},${by - 14} ${bx + bw / 2 - 6},${by - 14} ${bx + bw / 2 - 4},${by - 20} ${bx + bw / 2 - 2},${by - 9} ${bx + bw / 2},${by - 14} ${bx + bw / 2 + 10},${by - 14}`}
            fill="none"
            stroke={color}
            strokeWidth="1.2"
            opacity={0.65}
          />
          <line
            x1={bx + bw + 5}
            y1={by - 18}
            x2={bx + bw + 5}
            y2={by + bh + 2}
            stroke={color}
            strokeWidth="1"
            opacity={0.35}
          />
        </>
      )}
      {!monitor && (
        <line
          x1={bx + bw + 4}
          y1={by - 5}
          x2={bx + bw + 4}
          y2={by + bh + 2}
          stroke={color}
          strokeWidth="0.8"
          opacity={0.25}
        />
      )}
    </g>
  );
}
function _FpCT({
  x,
  y,
  w,
  h,
  color,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}) {
  const cx = x + w / 2 - 10,
    cy = y + h / 2 - 5;
  return (
    <g opacity={0.6}>
      <circle
        cx={cx}
        cy={cy}
        r={30}
        fill="none"
        stroke={color}
        strokeWidth="11"
        opacity={0.32}
      />
      <circle
        cx={cx}
        cy={cy}
        r={17}
        fill="#F8FAFC"
        stroke={color}
        strokeWidth="1"
        opacity={0.45}
      />
      <rect
        x={cx + 2}
        y={cy - 5}
        width={52}
        height={10}
        rx="3"
        fill={color}
        opacity={0.22}
        stroke={color}
        strokeWidth="0.6"
      />
      <rect
        x={cx + 46}
        y={cy + 5}
        width={10}
        height={22}
        rx="2"
        fill={color}
        opacity={0.18}
      />
      <rect
        x={cx - 48}
        y={cy - 18}
        width={12}
        height={26}
        rx="2"
        fill={color}
        opacity={0.14}
        stroke={color}
        strokeWidth="0.5"
      />
      {[-13, -7, -1].map((dy) => (
        <rect
          key={dy}
          x={cx - 46}
          y={cy + dy}
          width={8}
          height={3}
          rx="0.8"
          fill={color}
          opacity={0.4}
        />
      ))}
    </g>
  );
}
function _FpMRI({
  x,
  y,
  w,
  h,
  color,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}) {
  const cx = x + w / 2 - 5,
    cy = y + h / 2 - 5;
  return (
    <g opacity={0.6}>
      <rect
        x={cx - 42}
        y={cy - 27}
        width={84}
        height={55}
        rx="27"
        fill="none"
        stroke={color}
        strokeWidth="11"
        opacity={0.32}
      />
      <rect
        x={cx - 26}
        y={cy - 17}
        width={52}
        height={35}
        rx="17"
        fill="#F8FAFC"
        stroke={color}
        strokeWidth="1"
        opacity={0.4}
      />
      <rect
        x={cx - 8}
        y={cy - 5}
        width={65}
        height={10}
        rx="3"
        fill={color}
        opacity={0.22}
        stroke={color}
        strokeWidth="0.6"
      />
      <rect
        x={cx - 40}
        y={cy + 28}
        width={80}
        height={8}
        rx="2"
        fill={color}
        opacity={0.18}
      />
    </g>
  );
}
function _FpXRay({
  x,
  y,
  w,
  h,
  color,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}) {
  const cx = x + w / 2,
    cy = y + h / 2;
  return (
    <g opacity={0.6}>
      <rect
        x={cx - 3}
        y={cy - 48}
        width={6}
        height={68}
        rx="2.5"
        fill={color}
        opacity={0.32}
      />
      <rect
        x={cx - 38}
        y={cy - 48}
        width={76}
        height={5}
        rx="2"
        fill={color}
        opacity={0.28}
      />
      <rect
        x={cx - 24}
        y={cy - 65}
        width={48}
        height={20}
        rx="3"
        fill="#F8FAFC"
        stroke={color}
        strokeWidth="0.8"
        opacity={0.55}
      />
      <line
        x1={cx - 18}
        y1={cy - 58}
        x2={cx + 18}
        y2={cy - 58}
        stroke={color}
        strokeWidth="0.7"
        opacity={0.35}
      />
      <line
        x1={cx - 18}
        y1={cy - 52}
        x2={cx + 18}
        y2={cy - 52}
        stroke={color}
        strokeWidth="0.7"
        opacity={0.35}
      />
      <rect
        x={cx - 38}
        y={cy + 22}
        width={76}
        height={11}
        rx="3"
        fill={color}
        opacity={0.2}
        stroke={color}
        strokeWidth="0.6"
      />
      <rect
        x={cx - 6}
        y={cy + 33}
        width={12}
        height={18}
        rx="2"
        fill={color}
        opacity={0.18}
      />
    </g>
  );
}
function _FpLab({
  x,
  y,
  w,
  h,
  color,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}) {
  const lx = x + w / 2 - 42,
    ly = y + h / 2 - 18;
  return (
    <g opacity={0.6}>
      <rect
        x={lx}
        y={ly + 30}
        width={28}
        height={7}
        rx="2.5"
        fill={color}
        opacity={0.38}
      />
      <rect
        x={lx + 10}
        y={ly - 2}
        width={5}
        height={33}
        rx="1.5"
        fill={color}
        opacity={0.32}
      />
      <rect
        x={lx + 2}
        y={ly - 2}
        width={21}
        height={5}
        rx="1.5"
        fill={color}
        opacity={0.3}
      />
      <rect
        x={lx + 1}
        y={ly - 10}
        width={11}
        height={10}
        rx="2"
        fill="#F8FAFC"
        stroke={color}
        strokeWidth="0.7"
        opacity={0.55}
      />
      <rect
        x={lx + 5}
        y={ly + 13}
        width={23}
        height={5}
        rx="1"
        fill={color}
        opacity={0.3}
      />
      <circle
        cx={lx + 12}
        cy={ly + 22}
        r="3.5"
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        opacity={0.4}
      />
      <path
        d={`M${lx + 36} ${ly + 32} L${lx + 34} ${ly + 14} L${lx + 38} ${ly + 8} L${lx + 48} ${ly + 8} L${lx + 52} ${ly + 14} L${lx + 50} ${ly + 32} Z`}
        fill={color}
        opacity={0.14}
        stroke={color}
        strokeWidth="0.9"
      />
      <rect
        x={lx + 56}
        y={ly - 2}
        width={9}
        height={34}
        rx="4.5"
        fill={color}
        opacity={0.14}
        stroke={color}
        strokeWidth="0.9"
      />
    </g>
  );
}
function _FpTriage({
  x,
  y,
  w,
  h,
  color,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}) {
  const cx = x + w / 2,
    cy = y + h / 2;
  return (
    <g opacity={0.55}>
      <rect
        x={cx - 35}
        y={cy - 5}
        width={70}
        height={28}
        rx="3"
        fill="#F8FAFC"
        stroke={color}
        strokeWidth="0.8"
        opacity={0.45}
      />
      <rect
        x={cx - 30}
        y={cy - 22}
        width={28}
        height={18}
        rx="2"
        fill="#FFFFFF"
        stroke={color}
        strokeWidth="0.6"
        opacity={0.55}
      />
      {[-18, -14, -10].map((dy) => (
        <rect
          key={dy}
          x={cx - 26}
          y={cy + dy}
          width={dy === -10 ? 14 : 20}
          height={2}
          rx="0.5"
          fill={color}
          opacity={0.3}
        />
      ))}
      <rect
        x={cx + 10}
        y={cy - 18}
        width={18}
        height={14}
        rx="2"
        fill={color}
        opacity={0.12}
        stroke={color}
        strokeWidth="0.5"
      />
      <rect
        x={cx - 48}
        y={cy + 5}
        width={14}
        height={18}
        rx="2"
        fill={color}
        opacity={0.18}
      />
      <rect
        x={cx + 34}
        y={cy + 5}
        width={14}
        height={18}
        rx="2"
        fill={color}
        opacity={0.18}
      />
    </g>
  );
}
function _FpEquipment({ room, color }: { room: RoomDef; color: string }) {
  const { x, y, w, h, type } = room;
  if (type === "er_bay")
    return <_FpBed x={x} y={y} w={w} h={h} color={color} />;
  if (type === "critical_bay")
    return <_FpBed x={x} y={y} w={w} h={h} color={color} monitor />;
  if (type === "icu_bed")
    return <_FpBed x={x} y={y} w={w} h={h} color={color} monitor />;
  if (type === "ward_bed")
    return <_FpBed x={x} y={y} w={w} h={h} color={color} />;
  if (type === "triage")
    return <_FpTriage x={x} y={y} w={w} h={h} color={color} />;
  if (type === "ct") return <_FpCT x={x} y={y} w={w} h={h} color={color} />;
  if (type === "mri") return <_FpMRI x={x} y={y} w={w} h={h} color={color} />;
  if (type === "xray") return <_FpXRay x={x} y={y} w={w} h={h} color={color} />;
  if (type === "lab") return <_FpLab x={x} y={y} w={w} h={h} color={color} />;
  if (type === "nurse_stn")
    return (
      <g opacity={0.4}>
        <rect
          x={x + 4}
          y={y + 1}
          width={w - 8}
          height={h - 2}
          rx="1"
          fill={color}
          opacity={0.12}
        />
        <text
          x={x + w / 2}
          y={y + h / 2 + 3}
          textAnchor="middle"
          fontSize="12"
          fill={color}
          opacity={0.6}
          fontFamily="monospace"
        >
          NURSE STN
        </text>
      </g>
    );
  return null;
}

const FP_TINT: Record<DepartmentStatus, string> = {
  healthy: "#ECFDF5",
  warning: "#FFFBEB",
  critical: "#FEF2F2",
};

function HospitalFloorPlan() {
  const { hospitalState } = useSimulationStore();
  const [tooltip, setTooltip] = useState<{
    dept: DepartmentKey;
    x: number;
    y: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const depts = (hospitalState?.departments ?? {}) as Record<
    DepartmentKey,
    DepartmentState
  >;
  const patientDots = useMemo(
    () => _fpDots(hospitalState?.patients ?? []),
    [hospitalState?.patients],
  );
  const getDeptStatus = (key: DepartmentKey): DepartmentStatus =>
    (depts[key]?.status as DepartmentStatus) ?? "healthy";
  const getDeptOcc = (key: DepartmentKey): number => depts[key]?.occupancy ?? 0;

  return (
    <div className="relative w-full h-full select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${FLOOR.width} ${FLOOR.height}`}
        className="w-full h-full"
        style={{ background: "transparent" }}
      >
        <defs>
          <pattern
            id="fp-grid"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 24 0 L 0 0 0 24"
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="0.5"
              strokeOpacity="0.5"
            />
          </pattern>
        </defs>
        <rect width={FLOOR.width} height={FLOOR.height} fill="url(#fp-grid)" />
        <rect
          x={5}
          y={5}
          width={FLOOR.width - 10}
          height={FLOOR.height - 10}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth="1"
          rx="4"
        />
        {DEPT_ZONES.map((zone) => {
          const status = getDeptStatus(zone.key),
            occupancy = getDeptOcc(zone.key),
            sColor = statusColor(status);
          return (
            <g
              key={zone.key}
              onMouseEnter={() =>
                setTooltip({
                  dept: zone.key,
                  x: zone.x + zone.w / 2,
                  y: zone.y,
                })
              }
              onMouseLeave={() => setTooltip(null)}
            >
              <rect
                x={zone.x}
                y={zone.y}
                width={zone.w}
                height={zone.h}
                fill={FP_TINT[status]}
                stroke={sColor}
                strokeWidth="1.2"
                rx="4"
              />
              {zone.rooms?.map((room, ri) => (
                <g key={ri}>
                  {room.type !== "corridor" && room.type !== "nurse_stn" && (
                    <rect
                      x={room.x + 2}
                      y={room.y + 2}
                      width={room.w - 4}
                      height={room.h - 4}
                      fill="#FFFFFF"
                      stroke="#E2E8F0"
                      strokeWidth="0.6"
                      rx="2"
                    />
                  )}
                  <_FpEquipment room={room} color={zone.color} />
                  {room.label && room.type !== "corridor" && (
                    <text
                      x={room.x + room.w / 2}
                      y={room.y + room.h - 7}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#475569"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="600"
                    >
                      {room.label}
                    </text>
                  )}
                </g>
              ))}
              <text
                x={zone.x + 8}
                y={zone.y + 16}
                fontSize="12"
                fontWeight="700"
                fill={sColor}
                fontFamily="JetBrains Mono, monospace"
                letterSpacing="0.8"
              >
                {zone.label}
              </text>
              <circle
                cx={zone.x + zone.w - 12}
                cy={zone.y + 12}
                r="5"
                fill={sColor}
              />
              <text
                x={zone.x + zone.w - 24}
                y={zone.y + 16}
                textAnchor="end"
                fontSize="12"
                fill={sColor}
                fontFamily="monospace"
                fontWeight="600"
              >
                {Math.round(occupancy * 100)}%
              </text>
              <rect
                x={zone.x + 2}
                y={zone.y + zone.h - 4}
                width={Math.max(0, (zone.w - 4) * occupancy)}
                height="3"
                fill={sColor}
                rx="1.5"
              />
            </g>
          );
        })}
        <rect
          x={10}
          y={254}
          width={1080}
          height={8}
          fill="#F1F5F9"
          stroke="#E2E8F0"
          strokeWidth="0.5"
        />
        <text
          x={550}
          y={260}
          textAnchor="middle"
          fontSize="12"
          fill="#475569"
          fontFamily="monospace"
        >
          — MAIN CORRIDOR —
        </text>
        {patientDots.map((dot) => (
          <circle
            key={dot.id}
            cx={dot.x}
            cy={dot.y}
            r={
              dot.severity === "critical"
                ? 5
                : dot.severity === "high"
                  ? 4.5
                  : 4
            }
            fill={_fpColor(dot.severity)}
          />
        ))}
        {tooltip &&
          depts[tooltip.dept] &&
          (() => {
            const d = depts[tooltip.dept],
              s = d.status as DepartmentStatus,
              sc = statusColor(s);
            const tx = Math.min(tooltip.x, 850),
              ty = Math.max(tooltip.y - 105, 8);
            return (
              <g>
                <rect
                  x={tx - 88}
                  y={ty}
                  width={176}
                  height={98}
                  fill="#FFFFFF"
                  stroke={sc}
                  strokeWidth="1"
                  rx="5"
                />
                <text
                  x={tx}
                  y={ty + 16}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="700"
                  fill={sc}
                  fontFamily="monospace"
                >
                  {d.display_name?.toUpperCase()}
                </text>
                <line
                  x1={tx - 82}
                  y1={ty + 22}
                  x2={tx + 82}
                  y2={ty + 22}
                  stroke="#E2E8F0"
                  strokeWidth="0.5"
                />
                {[
                  ["Occupancy", formatPercent(d.occupancy)],
                  ["Queue", `${d.queue_length} patients`],
                  ["Avg Wait", formatTime(d.avg_wait_time)],
                  ["Beds Avail", `${d.beds_available}`],
                ].map(([label, val], i) => (
                  <g key={label}>
                    <text
                      x={tx - 80}
                      y={ty + 36 + i * 15}
                      fontSize="12"
                      fill="#475569"
                      fontFamily="monospace"
                    >
                      {label}
                    </text>
                    <text
                      x={tx + 80}
                      y={ty + 36 + i * 15}
                      textAnchor="end"
                      fontSize="12"
                      fill="#0F172A"
                      fontFamily="monospace"
                      fontWeight="600"
                    >
                      {val}
                    </text>
                  </g>
                ))}
              </g>
            );
          })()}
      </svg>
    </div>
  );
}

export default function CommandCenterPage() {
  const { hospitalState } = useSimulationStore();
  const metrics = hospitalState?.metrics;
  const departments = (hospitalState?.departments ?? {}) as Record<
    DepartmentKey,
    DepartmentState
  >;
  const kpis = [
    {
      icon: Clock,
      label: "Avg Wait",
      value: metrics ? formatTime(metrics.avg_wait_time) : "--",
      status: !metrics
        ? "neutral"
        : metrics.avg_wait_time > 120
          ? "critical"
          : metrics.avg_wait_time > 80
            ? "warning"
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
      status: !metrics
        ? "neutral"
        : metrics.bed_utilization > 0.92
          ? "critical"
          : metrics.bed_utilization > 0.82
            ? "warning"
            : "healthy",
    },
    {
      icon: Activity,
      label: "ICU Util",
      value: metrics ? formatPercent(metrics.icu_utilization) : "--",
      status: !metrics
        ? "neutral"
        : metrics.icu_utilization > 0.9
          ? "critical"
          : metrics.icu_utilization > 0.78
            ? "warning"
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
      status: !metrics
        ? "neutral"
        : (metrics.critical_patients ?? 0) > 8
          ? "critical"
          : (metrics.critical_patients ?? 0) > 4
            ? "warning"
            : "healthy",
    },
  ] as const;

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-hidden bg-clinical-canvas">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-ink tracking-wide">
            Hospital Command Center
          </h1>
          <p className="text-xs text-muted font-mono mt-2">
            Real-time digital twin visualization • Patient flow simulation
          </p>
        </div>
        <div />
      </div>

      <div className="grid grid-cols-6 gap-4 flex-shrink-0">
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

      <div className="flex items-center gap-4 flex-shrink-0">
        {metrics && <DiversionBanner metrics={metrics} />}
        {metrics && <HospitalScore metrics={metrics} />}
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden min-h-0">
        <div className="flex-1 border border-clinical-border bg-clinical-surface rounded-lg overflow-hidden relative">
          <div className="absolute top-4 left-4 z-10">
            <div className="text-xs font-mono px-2 py-1 rounded border border-clinical-border bg-clinical-surface text-muted">
              FLOOR PLAN — ACTIVE PATIENTS SHOWN
            </div>
          </div>

          <div className="absolute top-4 right-4 z-10 flex items-center gap-4 px-2 py-1 rounded border border-clinical-border bg-clinical-surface">
            {[
              { label: "Low", color: "#059669" },
              { label: "Medium", color: "#D97706" },
              { label: "High", color: "#EA580C" },
              { label: "Critical", color: "#DC2626" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: s.color }}
                />
                <span className="text-xs text-muted font-mono">
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          <div className="absolute inset-0 p-4 pt-10">
            <HospitalFloorPlan />
          </div>

          <div className="absolute bottom-4 left-4 z-10">
            <div className="text-xs font-mono px-2 py-1 rounded border border-clinical-border bg-clinical-surface text-muted">
              {hospitalState?.patients?.length ?? 0} PATIENTS ACTIVE
            </div>
          </div>
        </div>

        <div className="w-[320px] flex flex-col gap-4 overflow-y-auto flex-shrink-0 min-h-0">
          <div className="border border-clinical-border bg-clinical-surface rounded-lg p-4 flex-shrink-0">
            <div className="text-xs text-muted font-medium uppercase mb-4 tracking-wide">
              Department Status
            </div>
            <div className="space-y-4">
              {DEPT_KEYS.map((key) => {
                const dept = departments[key];
                if (!dept) return null;
                const status = occupancyToStatus(dept.occupancy);
                const sColor = statusColor(status);
                const sText =
                  status === "critical"
                    ? "text-crit-ink"
                    : status === "warning"
                      ? "text-flag-ink"
                      : "text-safe-ink";
                const badgeStatus =
                  status === "critical"
                    ? "critical"
                    : status === "warning"
                      ? "flagged"
                      : "safe";

                return (
                  <div key={key} className="flex items-start gap-2">
                    <StatusBadge
                      status={badgeStatus}
                      label={
                        status === "critical"
                          ? "CRIT"
                          : status === "warning"
                            ? "WARN"
                            : "OK"
                      }
                      className="flex-shrink-0 mt-2"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-ink font-medium truncate">
                          {dept.display_name}
                        </span>
                        <span
                          className={cn(
                            "text-sm font-mono ml-2 flex-shrink-0",
                            sText,
                          )}
                        >
                          {formatPercent(dept.occupancy)}
                        </span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-clinical-canvas border border-clinical-border overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            background: sColor,
                            width: `${Math.round(dept.occupancy * 100)}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-xs text-muted font-mono">
                          {dept.current_patients}/{dept.capacity} beds
                        </span>
                        {dept.queue_length > 0 && (
                          <span
                            className={cn("text-xs font-mono font-bold", sText)}
                          >
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

          <LiveEventLog
            patients={hospitalState?.patients ?? []}
            alerts={hospitalState?.alerts ?? []}
            simTime={hospitalState?.sim_time ?? 0}
          />

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
