"use client";
import { useState, useCallback, useEffect, useRef, useMemo, useId } from "react";
import { FlaskConical, Zap, AlertTriangle, RefreshCw, Minus, Plus, Activity, Users, Bed, Server } from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useDemoStore } from "@/store/simulationStore";
import { formatTime, formatPercent } from "@/lib/utils";
import type { EventType } from "@/types";

function expandConfig(s: SimpleConfig): Record<string, number> {
  const doc = s.doctors;
  const nur = s.nurses;
  const beds = s.beds;
  return {
    arrival_rate: s.arrival_rate,
    er_doctors: Math.max(1, Math.round(doc * 0.35)),
    icu_doctors: Math.max(1, Math.round(doc * 0.25)),
    ward_doctors: Math.max(1, doc - Math.round(doc * 0.35) - Math.round(doc * 0.25)),
    er_nurses: Math.max(2, Math.round(nur * 0.25)),
    icu_nurses: Math.max(4, Math.round(nur * 0.4)),
    ward_nurses: Math.max(4, nur - Math.round(nur * 0.25) - Math.round(nur * 0.4)),
    lab_technicians: s.technicians,
    er_beds: Math.max(10, Math.round(beds * 0.28)),
    icu_beds: Math.max(5, Math.round(beds * 0.14)),
    ward_beds: Math.max(20, beds - Math.round(beds * 0.28) - Math.round(beds * 0.14)),
    imaging_ct: s.ct_scanners,
    imaging_mri: s.mri_machines,
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
  unit?: string;
}

function Slider({ label, value, min, max, step = 1, onChange, unit = "" }: SliderProps) {
  const inputId = useId();
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <label htmlFor={inputId} className="text-[13px] text-muted font-medium">
          {label}
        </label>
        <span className="mono text-[15px] font-medium text-ink">
          {value}
          {unit}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(Math.max(min, value - step))}
          className="border border-line w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-elevated transition-colors flex-shrink-0"
        >
          <Minus className="w-4 h-4" />
        </button>
        <input
          id={inputId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-1.5 appearance-none rounded-full cursor-pointer bg-line accent-ink"
        />
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(Math.min(max, value + step))}
          className="border border-line w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-elevated transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

const EVENTS: { key: EventType; label: string; desc: string; icon: any }[] = [
  { key: "flu_outbreak", label: "Flu outbreak", desc: "2.5× arrivals", icon: AlertTriangle },
  { key: "covid_surge", label: "COVID surge", desc: "1.8× + isolation", icon: AlertTriangle },
  { key: "heatwave", label: "Heatwave", desc: "1.4× arrivals", icon: Zap },
  { key: "mass_casualty", label: "Mass casualty", desc: "15 critical patients", icon: AlertTriangle },
  { key: "ct_failure", label: "CT failure", desc: "Scanner offline", icon: Server },
  { key: "mri_failure", label: "MRI failure", desc: "Scanner offline", icon: Server },
  { key: "lab_slowdown", label: "Lab slowdown", desc: "2.5× processing time", icon: Activity },
];

export default function SandboxPage() {
  const { hospitalState } = useSimulationStore();
  const { triggerEvent, updateConfig } = useWebSocket();

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

  const set = (key: keyof SimpleConfig) => (v: number) => setCfg((prev) => ({ ...prev, [key]: v }));

  const toggleEvent = useCallback(
    (event: EventType) => {
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
    },
    [triggerEvent],
  );

  const clearAll = () => {
    setActiveEvents(new Set());
    triggerEvent("clear_event");
  };

  const { pendingAction, clearAction } = useDemoStore();
  useEffect(() => {
    if (pendingAction !== "sandbox_demo") return;
    clearAction();

    setActiveEvents(new Set(["flu_outbreak" as EventType]));
    triggerEvent("flu_outbreak", {});
    setCfg((prev) => ({ ...prev, arrival_rate: parseFloat((DEFAULTS.arrival_rate * 2.5).toFixed(1)) }));

    const t1 = setTimeout(() => {
      setCfg({ ...DEFAULTS, doctors: 40, nurses: 100, arrival_rate: parseFloat((DEFAULTS.arrival_rate * 2.5).toFixed(1)) });
    }, 6000);

    const t2 = setTimeout(() => {
      setActiveEvents(new Set());
      triggerEvent("clear_event");
      setCfg(DEFAULTS);
    }, 14000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pendingAction]);

  const projected = useMemo(() => {
    const arr = cfg.arrival_rate / DEFAULTS.arrival_rate;

    const erS = Math.max(1, Math.round(cfg.doctors * 0.35) + Math.max(2, Math.round(cfg.nurses * 0.25)));
    const erSD = Math.max(1, Math.round(DEFAULTS.doctors * 0.35) + Math.max(2, Math.round(DEFAULTS.nurses * 0.25)));
    const erB = Math.max(10, Math.round(cfg.beds * 0.28)) / 40;

    const icuS = Math.max(1, Math.round(cfg.doctors * 0.25) + Math.max(4, Math.round(cfg.nurses * 0.4)));
    const icuSD = Math.max(1, Math.round(DEFAULTS.doctors * 0.25) + Math.max(4, Math.round(DEFAULTS.nurses * 0.4)));
    const icuB = Math.max(5, Math.round(cfg.beds * 0.14)) / 20;

    const wS = Math.max(
      1,
      cfg.doctors -
        Math.round(cfg.doctors * 0.35) -
        Math.round(cfg.doctors * 0.25) +
        cfg.nurses -
        Math.max(2, Math.round(cfg.nurses * 0.25)) -
        Math.max(4, Math.round(cfg.nurses * 0.4)),
    );
    const wSD = Math.max(
      1,
      DEFAULTS.doctors -
        Math.round(DEFAULTS.doctors * 0.35) -
        Math.round(DEFAULTS.doctors * 0.25) +
        DEFAULTS.nurses -
        Math.max(2, Math.round(DEFAULTS.nurses * 0.25)) -
        Math.max(4, Math.round(DEFAULTS.nurses * 0.4)),
    );
    const wB = Math.max(20, cfg.beds - Math.round(cfg.beds * 0.28) - Math.round(cfg.beds * 0.14)) / 80;

    const calc = (sNow: number, sDef: number, bRatio: number, baseQ: number, baseOcc: number) => {
      const sr = sNow / sDef;
      return {
        queue: Math.max(0, Math.round((arr * baseQ) / sr)),
        occupancy: Math.min(0.99, Math.max(0.02, (arr * baseOcc * Math.min(1.5, sr)) / bRatio)),
      };
    };

    return {
      er: calc(erS, erSD, erB, 18, 0.52),
      icu: calc(icuS, icuSD, icuB, 3, 0.62),
      ward: calc(wS, wSD, wB, 2, 0.4),
    };
  }, [cfg]);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-[20px] font-medium text-ink flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-muted" />
            Sandbox
          </h1>
          <p className="text-[13px] text-muted mt-1">
            Changes apply automatically, events and constraints drive dynamic delays and resource competition
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {(hospitalState?.care?.bottlenecks?.length ?? 0) > 0 && (
            <div className="border border-status-flagged rounded-lg px-4 py-2">
              <span className="text-[11px] font-medium text-status-flagged">
                {hospitalState?.care?.bottlenecks.length} fixed constraint
                {(hospitalState?.care?.bottlenecks.length ?? 0) === 1 ? "" : "s"} active
              </span>
            </div>
          )}
          {activeEvents.size > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] border border-line text-muted hover:text-ink transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Clear events
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0 overflow-hidden">
        <div className="w-[300px] flex flex-col gap-4 overflow-y-auto flex-shrink-0">
          <div data-tour="sb-controls" className="border border-line rounded-lg p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted" />
              <span className="text-[12px] font-medium text-ink uppercase tracking-wider">Staffing</span>
            </div>
            <Slider label="Arrival rate" value={cfg.arrival_rate} min={2} max={25} step={0.5} onChange={set("arrival_rate")} unit="/hr" />
            <Slider label="Doctors" value={cfg.doctors} min={3} max={40} onChange={set("doctors")} />
            <Slider label="Nurses" value={cfg.nurses} min={12} max={100} onChange={set("nurses")} />
            <Slider label="Lab technicians" value={cfg.technicians} min={2} max={20} onChange={set("technicians")} />
            <div className="pt-2 text-[11px] text-muted border-t border-line">
              Doctors and nurses auto-distributed across ER / ICU / Ward
            </div>
          </div>

          <div className="border border-line rounded-lg p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Bed className="w-4 h-4 text-muted" />
              <span className="text-[12px] font-medium text-ink uppercase tracking-wider">Infrastructure</span>
            </div>
            <Slider label="Hospital beds" value={cfg.beds} min={60} max={300} onChange={set("beds")} />
            <Slider label="CT scanners" value={cfg.ct_scanners} min={0} max={5} onChange={set("ct_scanners")} />
            <Slider label="MRI machines" value={cfg.mri_machines} min={0} max={4} onChange={set("mri_machines")} />
            <div className="pt-2 text-[11px] text-muted border-t border-line">Beds split: ~28% ER · 14% ICU · 58% Ward</div>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4 overflow-y-auto min-w-0">
          <div className="border border-line rounded-lg p-6 flex-shrink-0">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-muted" />
              <span className="text-[12px] font-medium text-ink uppercase tracking-wider">Emergency events</span>
              {activeEvents.size > 0 && (
                <span className="ml-2 text-[11px] font-medium text-status-critical">{activeEvents.size} ACTIVE</span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-3">
              {EVENTS.map((event) => {
                const Icon = event.icon;
                const isActive = activeEvents.has(event.key);
                return (
                  <button
                    type="button"
                    key={event.key}
                    onClick={() => toggleEvent(event.key)}
                    aria-pressed={isActive}
                    className={
                      "flex flex-col items-center gap-2 p-4 rounded-lg text-center transition-colors border " +
                      (isActive ? "border-status-critical" : "border-line hover:bg-elevated")
                    }
                  >
                    <Icon className={"w-5 h-5 " + (isActive ? "text-status-critical" : "text-muted")} />
                    <div>
                      <div className={"text-[11px] font-medium " + (isActive ? "text-status-critical" : "text-ink")}>
                        {event.label}
                      </div>
                      <div className="text-[10px] text-muted mt-1">{event.desc}</div>
                    </div>
                    {isActive && <span className="text-[10px] font-medium text-status-critical">Active</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {hospitalState?.departments && (
            <div className="border border-line rounded-lg p-6 flex-1 min-h-0 overflow-y-auto">
              <div className="text-[12px] font-medium text-ink uppercase tracking-wider mb-4">
                Department status: adjust sliders to see changes
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(["er", "icu", "ward"] as const).map((dept) => {
                  const d = hospitalState.departments[dept];
                  if (!d) return null;
                  const p = projected[dept];
                  return (
                    <div key={dept} className="border border-line rounded-lg p-4">
                      <div className="text-[11px] font-medium text-ink uppercase tracking-wider mb-2">
                        {dept === "er" ? "Emergency" : dept === "icu" ? "ICU" : "Ward"}
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="text-[10px] text-muted mb-1">Occupancy</div>
                          <div
                            className={
                              "mono text-[17px] font-medium " +
                              (p.occupancy > 0.9 ? "text-status-critical" : p.occupancy > 0.7 ? "text-status-flagged" : "text-ink")
                            }
                          >
                            {formatPercent(p.occupancy)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted mb-1">Queue</div>
                          <div
                            className={
                              "mono text-[17px] font-medium " +
                              (p.queue > 8 ? "text-status-critical" : p.queue > 4 ? "text-status-flagged" : "text-ink")
                            }
                          >
                            {p.queue}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted mb-1">Wait</div>
                          <div
                            className={
                              "mono text-[17px] font-medium " +
                              (d.avg_wait_time > 120 ? "text-status-critical" : d.avg_wait_time > 80 ? "text-status-flagged" : "text-ink")
                            }
                          >
                            {formatTime(d.avg_wait_time)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-2 border-t border-line text-[11px] text-muted">
                Try: reduce doctors to see queues grow · reduce beds to see occupancy spike · increase arrival rate for cascading effects
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}