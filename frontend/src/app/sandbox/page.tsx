/* Simulation Sandbox page: live configuration sliders and crisis-event toggles. */
"use client";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import {
  FlaskConical, Zap, AlertTriangle, RefreshCw,
  Minus, Plus, Activity, Users, Bed, Server
} from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useDemoStore } from "@/store/demoStore";
import { formatTime, formatPercent, cn } from "@/lib/utils";
import type { EventType } from "@/types";

function expandConfig(s: SimpleConfig): Record<string, number> {
  const doc = s.doctors;
  const nur = s.nurses;
  const beds = s.beds;
  return {
    arrival_rate:    s.arrival_rate,
    er_doctors:      Math.max(1, Math.round(doc * 0.35)),
    icu_doctors:     Math.max(1, Math.round(doc * 0.25)),
    ward_doctors:    Math.max(1, doc - Math.round(doc * 0.35) - Math.round(doc * 0.25)),
    er_nurses:       Math.max(2, Math.round(nur * 0.25)),
    icu_nurses:      Math.max(4, Math.round(nur * 0.40)),
    ward_nurses:     Math.max(4, nur - Math.round(nur * 0.25) - Math.round(nur * 0.40)),
    lab_technicians: s.technicians,
    er_beds:         Math.max(10, Math.round(beds * 0.28)),
    icu_beds:        Math.max(5,  Math.round(beds * 0.14)),
    ward_beds:       Math.max(20, beds - Math.round(beds * 0.28) - Math.round(beds * 0.14)),
    imaging_ct:      s.ct_scanners,
    imaging_mri:     s.mri_machines,
  };
}

interface SimpleConfig {
  arrival_rate: number;
  doctors: number;
  nurses: number;
  technicians: number;
  beds: number;
  ct_scanners: number;
  mri_machines: number;
}

const DEFAULTS: SimpleConfig = {
  arrival_rate: 9.5,
  doctors: 13,
  nurses: 48,
  technicians: 8,
  beds: 140,
  ct_scanners: 2,
  mri_machines: 2,
};

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  color?: string;
  unit?: string;
}

function Slider({ label, value, min, max, step = 1, onChange, color = "#3b82f6", unit = "" }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <span className="text-sm text-slate-400 font-medium">{label}</span>
        <span className="text-base font-bold font-mono" style={{ color }}>
          {value}{unit}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-colors flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-1.5 appearance-none rounded-full cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${color} ${pct}%, rgba(30,41,59,0.9) ${pct}%)`,
          }}
        />
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-colors flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

const EVENTS: { key: EventType; label: string; desc: string; color: string; icon: any }[] = [
  { key: "flu_outbreak",  label: "Flu Outbreak",   desc: "2.5× arrivals",        color: "#f59e0b", icon: AlertTriangle },
  { key: "covid_surge",   label: "COVID Surge",    desc: "1.8× + isolation",     color: "#ef4444", icon: AlertTriangle },
  { key: "heatwave",      label: "Heatwave",       desc: "1.4× arrivals",        color: "#f97316", icon: Zap },
  { key: "mass_casualty", label: "Mass Casualty",  desc: "15 critical patients", color: "#dc2626", icon: AlertTriangle },
  { key: "ct_failure",    label: "CT Failure",     desc: "Scanner offline",      color: "#8b5cf6", icon: Server },
  { key: "mri_failure",   label: "MRI Failure",    desc: "Scanner offline",      color: "#8b5cf6", icon: Server },
  { key: "lab_slowdown",  label: "Lab Slowdown",   desc: "2.5× processing time", color: "#06b6d4", icon: Activity },
];

export default function SandboxPage() {
  const { hospitalState } = useSimulationStore();
  const { triggerEvent, updateConfig } = useWebSocket();
  const metrics = hospitalState?.metrics;

  const [cfg, setCfg] = useState<SimpleConfig>(DEFAULTS);
  const [activeEvents, setActiveEvents] = useState<Set<EventType>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateConfig(expandConfig(cfg));
    }, 600);
    return () => clearTimeout(debounceRef.current);
  }, [cfg]);

  const set = (key: keyof SimpleConfig) => (v: number) =>
    setCfg((prev) => ({ ...prev, [key]: v }));

  const toggleEvent = useCallback((event: EventType) => {
    setActiveEvents((prev) => {
      const next = new Set(prev);
      if (next.has(event)) {
        next.delete(event);
        triggerEvent("clear_event");
      } else {
        next.add(event);
        triggerEvent(event, event === "mass_casualty" ? { count: 15 } : {});
      }
      return next;
    });
  }, [triggerEvent]);

  const clearAll = () => {
    setActiveEvents(new Set());
    triggerEvent("clear_event");
  };

  const { pendingAction, clearAction } = useDemoStore();
  useEffect(() => {
    if (pendingAction !== "sandbox_demo") return;
    clearAction();

    // Phase 1: flu outbreak — spike arrival rate so projected metrics jump
    setActiveEvents(new Set(["flu_outbreak" as EventType]));
    triggerEvent("flu_outbreak", {});
    setCfg((prev) => ({ ...prev, arrival_rate: parseFloat((DEFAULTS.arrival_rate * 2.5).toFixed(1)) }));

    // Phase 2: max staff to show recovery
    const t1 = setTimeout(() => {
      setCfg({ ...DEFAULTS, doctors: 40, nurses: 100, arrival_rate: parseFloat((DEFAULTS.arrival_rate * 2.5).toFixed(1)) });
    }, 6000);

    // Phase 3: clear everything
    const t2 = setTimeout(() => {
      setActiveEvents(new Set());
      triggerEvent("clear_event");
      setCfg(DEFAULTS);
    }, 14000);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [pendingAction]);

  const projected = useMemo(() => {
    const arr = cfg.arrival_rate / DEFAULTS.arrival_rate;

    const erS  = Math.max(1, Math.round(cfg.doctors * 0.35) + Math.max(2, Math.round(cfg.nurses * 0.25)));
    const erSD = Math.max(1, Math.round(DEFAULTS.doctors * 0.35) + Math.max(2, Math.round(DEFAULTS.nurses * 0.25)));
    const erB  = Math.max(10, Math.round(cfg.beds * 0.28)) / 40;

    const icuS  = Math.max(1, Math.round(cfg.doctors * 0.25) + Math.max(4, Math.round(cfg.nurses * 0.40)));
    const icuSD = Math.max(1, Math.round(DEFAULTS.doctors * 0.25) + Math.max(4, Math.round(DEFAULTS.nurses * 0.40)));
    const icuB  = Math.max(5, Math.round(cfg.beds * 0.14)) / 20;

    const wS  = Math.max(1, cfg.doctors - Math.round(cfg.doctors * 0.35) - Math.round(cfg.doctors * 0.25)
                          + cfg.nurses  - Math.max(2, Math.round(cfg.nurses * 0.25)) - Math.max(4, Math.round(cfg.nurses * 0.40)));
    const wSD = Math.max(1, DEFAULTS.doctors - Math.round(DEFAULTS.doctors * 0.35) - Math.round(DEFAULTS.doctors * 0.25)
                          + DEFAULTS.nurses  - Math.max(2, Math.round(DEFAULTS.nurses * 0.25)) - Math.max(4, Math.round(DEFAULTS.nurses * 0.40)));
    const wB  = Math.max(20, cfg.beds - Math.round(cfg.beds * 0.28) - Math.round(cfg.beds * 0.14)) / 80;

    const calc = (sNow: number, sDef: number, bRatio: number, baseQ: number, baseOcc: number) => {
      const sr = sNow / sDef;
      return {
        queue:    Math.max(0, Math.round(arr * baseQ / sr)),
        occupancy: Math.min(0.99, Math.max(0.02, arr * baseOcc * Math.min(1.5, sr) / bRatio)),
      };
    };

    return {
      er:   calc(erS,  erSD,  erB,  18, 0.52),
      icu:  calc(icuS, icuSD, icuB,  3, 0.62),
      ward: calc(wS,   wSD,   wB,    2, 0.40),
    };
  }, [cfg]);

  return (
    <div className="flex flex-col h-full p-5 gap-5 overflow-hidden">

      {}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-blue-400" />
            Simulation Sandbox
          </h1>
          <p className="text-sm text-slate-500 font-mono mt-0.5">
            Changes apply automatically · Toggle events to simulate crises
          </p>
        </div>
        {activeEvents.size > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-mono text-slate-300 transition-all"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <RefreshCw className="w-4 h-4" /> Clear Events
          </button>
        )}
      </div>

      <div className="flex flex-1 gap-5 min-h-0 overflow-hidden">

        {}
        <div className="w-[340px] flex flex-col gap-4 overflow-y-auto flex-shrink-0">

          {}
          <div
            className="rounded-2xl p-5 space-y-5"
            style={{ background: "rgba(10,14,26,0.8)", border: "1px solid rgba(59,130,246,0.12)" }}
          >
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Staffing</span>
            </div>
            <Slider label="Arrival Rate" value={cfg.arrival_rate} min={2} max={25} step={0.5}
              onChange={set("arrival_rate")} color="#3b82f6" unit="/hr" />
            <Slider label="Doctors" value={cfg.doctors} min={3} max={40}
              onChange={set("doctors")} color="#60a5fa" />
            <Slider label="Nurses" value={cfg.nurses} min={12} max={100}
              onChange={set("nurses")} color="#60a5fa" />
            <Slider label="Lab Technicians" value={cfg.technicians} min={2} max={20}
              onChange={set("technicians")} color="#8b5cf6" />
            <div className="pt-1 text-xs text-slate-700 font-mono border-t border-slate-800/50">
              Doctors & nurses auto-distributed across ER / ICU / Ward
            </div>
          </div>

          {}
          <div
            className="rounded-2xl p-5 space-y-5"
            style={{ background: "rgba(10,14,26,0.8)", border: "1px solid rgba(59,130,246,0.12)" }}
          >
            <div className="flex items-center gap-2">
              <Bed className="w-5 h-5 text-cyan-400" />
              <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Infrastructure</span>
            </div>
            <Slider label="Hospital Beds" value={cfg.beds} min={60} max={300}
              onChange={set("beds")} color="#06b6d4" />
            <Slider label="CT Scanners" value={cfg.ct_scanners} min={0} max={5}
              onChange={set("ct_scanners")} color="#06b6d4" />
            <Slider label="MRI Machines" value={cfg.mri_machines} min={0} max={4}
              onChange={set("mri_machines")} color="#06b6d4" />
            <div className="pt-1 text-xs text-slate-700 font-mono border-t border-slate-800/50">
              Beds split: ~28% ER · 14% ICU · 58% Ward
            </div>
          </div>
        </div>

        {}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto min-w-0">

          {}
          <div
            className="rounded-2xl p-5 flex-shrink-0"
            style={{ background: "rgba(10,14,26,0.8)", border: "1px solid rgba(59,130,246,0.12)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                Emergency Events
              </span>
              {activeEvents.size > 0 && (
                <span className="ml-2 text-xs font-mono font-bold text-yellow-400 px-2.5 py-1 rounded-lg bg-yellow-950/40">
                  {activeEvents.size} ACTIVE
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-3">
              {EVENTS.map((event) => {
                const Icon = event.icon;
                const isActive = activeEvents.has(event.key);
                return (
                  <motion.button
                    key={event.key}
                    onClick={() => toggleEvent(event.key)}
                    whileTap={{ scale: 0.96 }}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-all"
                    style={{
                      background: isActive ? `${event.color}14` : "rgba(255,255,255,0.025)",
                      border: `1.5px solid ${isActive ? `${event.color}50` : "rgba(255,255,255,0.07)"}`,
                      boxShadow: isActive ? `0 0 16px ${event.color}20` : "none",
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: isActive ? event.color : "#475569" }} />
                    <div>
                      <div className="text-xs font-semibold font-mono" style={{ color: isActive ? event.color : "#64748b" }}>
                        {event.label}
                      </div>
                      <div className="text-[10px] text-slate-700 font-mono mt-0.5">{event.desc}</div>
                    </div>
                    {isActive && (
                      <div className="w-2 h-2 rounded-full" style={{ background: event.color, boxShadow: `0 0 6px ${event.color}` }} />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {}
          {hospitalState?.departments && (
            <div
              className="rounded-2xl p-5 flex-1 min-h-0 overflow-y-auto"
              style={{ background: "rgba(10,14,26,0.8)", border: "1px solid rgba(59,130,246,0.12)" }}
            >
              <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                Department Status — Adjust Sliders to See Changes
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(["er", "icu", "ward"] as const).map((dept) => {
                  const d = hospitalState.departments[dept];
                  if (!d) return null;
                  const p = projected[dept];
                  const deptColor = dept === "er" ? "#60a5fa" : dept === "icu" ? "#f59e0b" : "#22c55e";
                  return (
                    <div
                      key={dept}
                      className="p-4 rounded-xl"
                      style={{
                        background: "rgba(255,255,255,0.025)",
                        border: `1px solid ${deptColor}40`,
                      }}
                    >
                      <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3" style={{ color: deptColor }}>
                        {dept === "er" ? "Emergency" : dept === "icu" ? "ICU" : "Ward"}
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="text-[10px] text-slate-600 font-mono mb-0.5">Occupancy</div>
                          <div className="text-xl font-bold font-mono" style={{ color: p.occupancy > 0.9 ? "#ff3b3b" : p.occupancy > 0.7 ? "#ffaa00" : deptColor }}>
                            {formatPercent(p.occupancy)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-600 font-mono mb-0.5">Queue</div>
                          <div className="text-xl font-bold font-mono" style={{ color: p.queue > 8 ? "#ff3b3b" : p.queue > 4 ? "#ffaa00" : "#64748b" }}>
                            {p.queue}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-600 font-mono mb-0.5">Wait</div>
                          <div className="text-lg font-bold font-mono" style={{ color: d.avg_wait_time > 120 ? "#ff3b3b" : d.avg_wait_time > 80 ? "#ffaa00" : "#64748b" }}>
                            {formatTime(d.avg_wait_time)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-700/50 text-xs text-slate-600 font-mono">
                💡 Try: Reduce Doctors to see queues grow | Reduce Beds to see occupancy spike | Increase Arrival Rate for cascading effects
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
