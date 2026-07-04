"use client";
import { useState, useEffect, useMemo } from "react";
import {
  Network,
  Stethoscope,
  Lock,
  Plus,
  X,
  Clock,
  AlertOctagon,
} from "lucide-react";
import Sidebar from "@/components/liquid-glass/Sidebar";
import { useSimulationStore } from "@/store/simulationStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useDemoStore } from "@/store/demoStore";
import { StatusBadge, type ClinicalStatus } from "@/components/ui/StatusBadge";
import type { Specialist, FixedBottleneck, BottleneckType } from "@/types";

const RESOURCE_TYPES: BottleneckType[] = [
  "Doctor",
  "Specialist",
  "Operating Room",
  "Equipment",
  "Bed",
  "Nurse",
];
const PRIORITIES = ["low", "medium", "high", "critical"] as const;

const PRIORITY_STATUS: Record<string, ClinicalStatus> = {
  critical: "critical",
  high: "flagged",
  medium: "flagged",
  low: "safe",
};

function statusStyle(status: string): {
  status: ClinicalStatus;
  label: string;
} {
  if (status === "available") return { status: "safe", label: "Available" };
  if (status === "in_surgery")
    return { status: "critical", label: "In Surgery" };
  return { status: "flagged", label: "Busy" };
}

const DEMO_CONSTRAINT = {
  resource_name: "Dr. Nina Patel",
  resource_type: "Specialist" as BottleneckType,
  status: "In CABG Surgery",
  priority: "critical" as const,
  release_in_min: 90,
  release_label: "3:30 PM",
  notes: "Open-heart — OR 2 unavailable",
};

export default function OperationsPage() {
  const { hospitalState } = useSimulationStore();
  const { addBottleneck, removeBottleneck } = useWebSocket();
  const { pendingAction, clearAction } = useDemoStore();
  const care = hospitalState?.care;
  const specialists = care?.specialists ?? [];
  const bottlenecks = care?.bottlenecks ?? [];

  const [demoConstraintId, setDemoConstraintId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  useEffect(() => {
    if (pendingAction === "add_constraint") {
      clearAction();
      addBottleneck(DEMO_CONSTRAINT);
    } else if (pendingAction === "remove_constraint") {
      clearAction();
      if (demoConstraintId) {
        removeBottleneck(demoConstraintId);
        setDemoConstraintId(null);
      } else {
        const match = bottlenecks.find(
          (b) => b.resource_name === DEMO_CONSTRAINT.resource_name,
        );
        if (match) removeBottleneck(match.bottleneck_id);
      }
    }
  }, [pendingAction]);

  useEffect(() => {
    const match = bottlenecks.find(
      (b) => b.resource_name === DEMO_CONSTRAINT.resource_name,
    );
    if (match && !demoConstraintId) setDemoConstraintId(match.bottleneck_id);
  }, [bottlenecks]);

  const [form, setForm] = useState({
    resource_name: "",
    resource_type: "Specialist" as BottleneckType,
    status: "",
    priority: "high" as (typeof PRIORITIES)[number],
    release_in_min: 60,
    release_label: "",
    notes: "",
  });

  const submit = () => {
    if (!form.resource_name.trim()) return;
    addBottleneck({ ...form });
    setForm({
      ...form,
      resource_name: "",
      status: "",
      notes: "",
      release_label: "",
    });
    setLastSaved(new Date().toLocaleTimeString());
  };

  const groups: Record<string, Specialist[]> = {};
  for (const sp of specialists) {
    (groups[sp.specialty] ??= []).push(sp);
  }
  const availableCount = specialists.filter(
    (s) => s.available_in_min === 0,
  ).length;

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

        <main className="flex-1 h-screen overflow-hidden flex flex-col p-8 gap-4">
          <div className="flex items-center justify-between flex-shrink-0">
            <div>
              <h1 className="cursive text-[44px] font-bold leading-tight text-white drop-shadow-[0_2px_18px_rgba(4,18,54,0.5)] flex items-center gap-3">
                <Network className="w-8 h-8 text-white/80" />
                Operations
              </h1>
              <p className="text-[13px] text-white/70 mt-1 ml-1">
                Specialist availability · fixed operational constraints the
                optimizer must respect
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="glass rounded-[16px] px-4 py-2">
                <span className="mono text-[16px] font-bold text-emerald-600">
                  {availableCount}
                </span>
                <span className="text-[11px] text-neutral-500 ml-2">
                  available now
                </span>
              </div>
              <div
                className="glass rounded-[16px] px-4 py-2"
                style={{
                  background:
                    "linear-gradient(150deg, rgba(224,168,140,0.5), rgba(206,138,110,0.32))",
                }}
              >
                <span className="mono text-[16px] font-bold text-[#5c2b1c]">
                  {bottlenecks.length}
                </span>
                <span className="text-[11px] text-[#7a3b25] ml-2">
                  fixed constraints
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-1 gap-4 min-h-0 overflow-hidden">
            <div className="glass flex-1 flex flex-col min-w-0 rounded-[26px] p-6 overflow-hidden">
              <div className="flex items-center gap-2 mb-4 flex-shrink-0">
                <Stethoscope className="w-5 h-5 text-neutral-500" />
                <span className="text-[12px] font-semibold text-neutral-700 uppercase tracking-wider">
                  Specialist Availability
                </span>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {Object.entries(groups).map(([specialty, list]) => (
                  <div key={specialty}>
                    <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                      {specialty}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {list.map((sp) => {
                        const ss = statusStyle(sp.status);
                        return (
                          <div
                            key={sp.specialist_id}
                            className="glass-soft rounded-[16px] p-4"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="min-w-0 flex-1">
                                <div className="mono text-[13px] font-semibold text-neutral-800 truncate">
                                  {sp.name}
                                </div>
                                <div className="text-[11px] text-neutral-500 truncate">
                                  {sp.role}
                                </div>
                              </div>
                              <StatusBadge
                                status={ss.status}
                                label={ss.label}
                                className="flex-shrink-0"
                              />
                            </div>
                            <div className="text-[11px] text-neutral-500 truncate mb-2">
                              {sp.current_assignment}
                            </div>
                            <div className="flex items-center justify-between text-[11px] mono">
                              <span className="text-neutral-500">
                                Load {sp.patient_load} · Q{sp.queue_length}
                              </span>
                              <span
                                className="font-bold"
                                style={{
                                  color:
                                    sp.available_in_min === 0
                                      ? "#059669"
                                      : "#D97706",
                                }}
                              >
                                {sp.available_in_min === 0
                                  ? "free now"
                                  : `free in ${sp.available_in_min}m`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {specialists.length === 0 && (
                  <div className="text-center py-8 text-neutral-500 text-sm">
                    Loading specialist roster...
                  </div>
                )}
              </div>
            </div>

            <div className="w-[400px] flex-shrink-0 flex flex-col gap-4 overflow-hidden">
              <div className="glass rounded-[26px] p-6 flex-shrink-0">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="w-5 h-5 text-neutral-500" />
                  <span className="text-[12px] font-semibold text-neutral-700 uppercase tracking-wider">
                    Fixed Bottlenecks &amp; Constraints
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="constraint-resource-name"
                      className="block text-[11px] font-medium text-neutral-500 mb-2"
                    >
                      Resource name
                    </label>
                    <input
                      id="constraint-resource-name"
                      value={form.resource_name}
                      onChange={(e) =>
                        setForm({ ...form, resource_name: e.target.value })
                      }
                      autoComplete="off"
                      className="glass-soft w-full px-4 py-2 rounded-[12px] text-[13px] mono text-neutral-800 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="constraint-resource-type"
                        className="block text-[11px] font-medium text-neutral-500 mb-2"
                      >
                        Type
                      </label>
                      <select
                        id="constraint-resource-type"
                        value={form.resource_type}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            resource_type: e.target.value as BottleneckType,
                          })
                        }
                        className="glass-soft w-full px-3 py-2 rounded-[12px] text-[13px] text-neutral-800 focus:outline-none"
                      >
                        {RESOURCE_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="constraint-priority"
                        className="block text-[11px] font-medium text-neutral-500 mb-2"
                      >
                        Priority
                      </label>
                      <select
                        id="constraint-priority"
                        value={form.priority}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            priority: e.target
                              .value as (typeof PRIORITIES)[number],
                          })
                        }
                        className="glass-soft w-full px-3 py-2 rounded-[12px] text-[13px] text-neutral-800 focus:outline-none"
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="constraint-status"
                      className="block text-[11px] font-medium text-neutral-500 mb-2"
                    >
                      Status
                    </label>
                    <input
                      id="constraint-status"
                      value={form.status}
                      onChange={(e) =>
                        setForm({ ...form, status: e.target.value })
                      }
                      autoComplete="off"
                      className="glass-soft w-full px-4 py-2 rounded-[12px] text-[13px] mono text-neutral-800 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="constraint-release-min"
                        className="block text-[11px] font-medium text-neutral-500 mb-2"
                      >
                        Release in (min)
                      </label>
                      <div className="glass-soft flex items-center gap-2 px-3 py-2 rounded-[12px]">
                        <Clock className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                        <input
                          id="constraint-release-min"
                          type="number"
                          autoComplete="off"
                          value={form.release_in_min}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              release_in_min: Number(e.target.value),
                            })
                          }
                          className="w-full bg-transparent text-[13px] mono text-neutral-800 focus:outline-none"
                        />
                        <span className="text-[11px] text-neutral-500 flex-shrink-0">
                          min
                        </span>
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="constraint-release-label"
                        className="block text-[11px] font-medium text-neutral-500 mb-2"
                      >
                        Until (clock)
                      </label>
                      <input
                        id="constraint-release-label"
                        value={form.release_label}
                        onChange={(e) =>
                          setForm({ ...form, release_label: e.target.value })
                        }
                        autoComplete="off"
                        className="glass-soft w-full px-4 py-2 rounded-[12px] text-[13px] mono text-neutral-800 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="constraint-notes"
                      className="block text-[11px] font-medium text-neutral-500 mb-2"
                    >
                      Notes (optional)
                    </label>
                    <input
                      id="constraint-notes"
                      value={form.notes}
                      onChange={(e) =>
                        setForm({ ...form, notes: e.target.value })
                      }
                      autoComplete="off"
                      className="glass-soft w-full px-4 py-2 rounded-[12px] text-[13px] mono text-neutral-800 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={submit}
                    disabled={!form.resource_name.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[14px] text-[13px] font-bold text-white shadow-[0_10px_20px_-6px_rgba(6,95,70,0.5)] disabled:opacity-40 transition-opacity"
                    style={{
                      background: "linear-gradient(135deg,#10b981,#059669)",
                    }}
                  >
                    <Plus className="w-4 h-4" /> Add Constraint
                  </button>
                  {lastSaved && (
                    <div className="text-[11px] text-neutral-500">
                      Saved at {lastSaved} by clinician
                    </div>
                  )}
                </div>
              </div>

              <div className="glass flex-1 rounded-[26px] p-6 overflow-hidden flex flex-col">
                <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-4 flex-shrink-0">
                  Active Constraints ({bottlenecks.length})
                </div>
                <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                  {bottlenecks.map((bn) => (
                    <BottleneckRow
                      key={bn.bottleneck_id}
                      bn={bn}
                      onRemove={() => removeBottleneck(bn.bottleneck_id)}
                    />
                  ))}
                  {bottlenecks.length === 0 && (
                    <div className="text-center py-8 text-neutral-500 text-sm">
                      No fixed constraints. The optimizer treats all resources
                      as movable.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function BottleneckRow({
  bn,
  onRemove,
}: {
  bn: FixedBottleneck;
  onRemove: () => void;
}) {
  const displayMin = bn.release_in_min ?? 0;
  const priorityStatus = PRIORITY_STATUS[bn.priority] ?? "flagged";

  return (
    <div className="glass-soft rounded-[16px] p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <AlertOctagon className="w-4 h-4 flex-shrink-0 text-neutral-500" />
          <span className="mono text-[13px] font-semibold text-neutral-800 truncate">
            {bn.resource_name}
          </span>
        </div>
        <button
          onClick={onRemove}
          aria-label={`Remove constraint for ${bn.resource_name}`}
          className="flex items-center justify-center w-9 h-9 -m-2 rounded text-neutral-500 hover:text-red-500 transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] px-2 py-1 rounded bg-black/[0.06] text-neutral-600">
          {bn.resource_type}
        </span>
        <StatusBadge status={priorityStatus} label={bn.priority} />
      </div>
      <div className="text-[13px] mono text-neutral-500">{bn.status}</div>
      {bn.notes && (
        <div className="text-[11px] text-neutral-500 mt-1">{bn.notes}</div>
      )}
      <div className="flex items-center justify-between mt-2 text-[11px] mono">
        <span className="text-neutral-500">
          {bn.release_label ? `until ${bn.release_label}` : ""}
        </span>
        {bn.release_in_min !== null && (
          <span className="font-bold text-neutral-700">
            frees in {displayMin}m
          </span>
        )}
      </div>
    </div>
  );
}
