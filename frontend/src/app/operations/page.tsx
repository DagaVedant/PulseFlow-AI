"use client";
import { useState, useEffect, useMemo } from "react";
import { Network, Stethoscope, Lock, Plus, X, Clock, AlertOctagon } from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useDemoStore } from "@/store/demoStore";
import { StatusBadge, type ClinicalStatus } from "@/components/ui/StatusBadge";
import type { Specialist, FixedBottleneck, BottleneckType } from "@/types";

const RESOURCE_TYPES: BottleneckType[] = ["Doctor", "Specialist", "Operating Room", "Equipment", "Bed", "Nurse"];
const PRIORITIES = ["low", "medium", "high", "critical"] as const;

const PRIORITY_STATUS: Record<string, ClinicalStatus> = {
  critical: "critical",
  high: "flagged",
  medium: "flagged",
  low: "safe",
};

function statusStyle(status: string): { status: ClinicalStatus; label: string } {
  if (status === "available") return { status: "safe", label: "Available" };
  if (status === "in_surgery") return { status: "critical", label: "In surgery" };
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
        const match = bottlenecks.find((b) => b.resource_name === DEMO_CONSTRAINT.resource_name);
        if (match) removeBottleneck(match.bottleneck_id);
      }
    }
  }, [pendingAction]);

  useEffect(() => {
    const match = bottlenecks.find((b) => b.resource_name === DEMO_CONSTRAINT.resource_name);
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
    setForm({ ...form, resource_name: "", status: "", notes: "", release_label: "" });
    setLastSaved(new Date().toLocaleTimeString());
  };

  const groups: Record<string, Specialist[]> = {};
  for (const sp of specialists) {
    (groups[sp.specialty] ??= []).push(sp);
  }
  const availableCount = specialists.filter((s) => s.available_in_min === 0).length;

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-[20px] font-medium text-ink flex items-center gap-2">
            <Network className="w-5 h-5 text-muted" />
            Operations
          </h1>
          <p className="text-[13px] text-muted mt-1">
            Specialist availability · fixed operational constraints the optimizer must respect
          </p>
        </div>
        <div data-tour="ops-stats" className="flex items-center gap-3">
          <div className="border border-line rounded-lg px-4 py-2">
            <span className="mono text-[15px] font-medium text-status-safe">{availableCount}</span>
            <span className="text-[11px] text-muted ml-2">available now</span>
          </div>
          <div className="border border-status-flagged rounded-lg px-4 py-2">
            <span className="mono text-[15px] font-medium text-status-flagged">{bottlenecks.length}</span>
            <span className="text-[11px] text-status-flagged ml-2">fixed constraints</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0 overflow-hidden">
        <div data-tour="ops-specialists" className="border border-line flex-1 flex flex-col min-w-0 rounded-lg p-6 overflow-hidden">
          <div className="flex items-center gap-2 mb-4 flex-shrink-0">
            <Stethoscope className="w-4 h-4 text-muted" />
            <span className="text-[12px] font-medium text-ink uppercase tracking-wider">Specialist availability</span>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {Object.entries(groups).map(([specialty, list]) => (
              <div key={specialty}>
                <div className="text-[11px] font-medium text-muted uppercase tracking-wider mb-2">{specialty}</div>
                <div className="grid grid-cols-2 gap-2">
                  {list.map((sp) => {
                    const ss = statusStyle(sp.status);
                    return (
                      <div key={sp.specialist_id} className="border border-line rounded-lg p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0 flex-1">
                            <div className="mono text-[13px] font-medium text-ink truncate">{sp.name}</div>
                            <div className="text-[11px] text-muted truncate">{sp.role}</div>
                          </div>
                          <StatusBadge status={ss.status} label={ss.label} className="flex-shrink-0" />
                        </div>
                        <div className="text-[11px] text-muted truncate mb-2">{sp.current_assignment}</div>
                        <div className="flex items-center justify-between text-[11px] mono">
                          <span className="text-muted">Load {sp.patient_load} · Q{sp.queue_length}</span>
                          <span className={sp.available_in_min === 0 ? "text-status-safe font-medium" : "text-status-flagged font-medium"}>
                            {sp.available_in_min === 0 ? "free now" : `free in ${sp.available_in_min}m`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {specialists.length === 0 && (
              <div className="text-center py-8 text-muted text-sm">Loading specialist roster...</div>
            )}
          </div>
        </div>

        <div className="w-[380px] flex-shrink-0 flex flex-col gap-4 overflow-hidden">
          <div className="border border-line rounded-lg p-6 flex-shrink-0">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-4 h-4 text-muted" />
              <span className="text-[12px] font-medium text-ink uppercase tracking-wider">Fixed bottlenecks and constraints</span>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="constraint-resource-name" className="block text-[11px] font-medium text-muted mb-2">
                  Resource name
                </label>
                <input
                  id="constraint-resource-name"
                  value={form.resource_name}
                  onChange={(e) => setForm({ ...form, resource_name: e.target.value })}
                  autoComplete="off"
                  className="mono w-full px-4 py-2 rounded-lg text-[13px] text-ink bg-canvas border border-line focus:outline-none focus:border-ink"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="constraint-resource-type" className="block text-[11px] font-medium text-muted mb-2">
                    Type
                  </label>
                  <select
                    id="constraint-resource-type"
                    value={form.resource_type}
                    onChange={(e) => setForm({ ...form, resource_type: e.target.value as BottleneckType })}
                    className="w-full px-3 py-2 rounded-lg text-[13px] text-ink bg-canvas border border-line focus:outline-none focus:border-ink"
                  >
                    {RESOURCE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="constraint-priority" className="block text-[11px] font-medium text-muted mb-2">
                    Priority
                  </label>
                  <select
                    id="constraint-priority"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as (typeof PRIORITIES)[number] })}
                    className="w-full px-3 py-2 rounded-lg text-[13px] text-ink bg-canvas border border-line focus:outline-none focus:border-ink"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="constraint-status" className="block text-[11px] font-medium text-muted mb-2">
                  Status
                </label>
                <input
                  id="constraint-status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  autoComplete="off"
                  className="mono w-full px-4 py-2 rounded-lg text-[13px] text-ink bg-canvas border border-line focus:outline-none focus:border-ink"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="constraint-release-min" className="block text-[11px] font-medium text-muted mb-2">
                    Release in (min)
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-line bg-canvas">
                    <Clock className="w-4 h-4 text-muted flex-shrink-0" />
                    <input
                      id="constraint-release-min"
                      type="number"
                      autoComplete="off"
                      value={form.release_in_min}
                      onChange={(e) => setForm({ ...form, release_in_min: Number(e.target.value) })}
                      className="mono w-full bg-transparent text-[13px] text-ink focus:outline-none"
                    />
                    <span className="text-[11px] text-muted flex-shrink-0">min</span>
                  </div>
                </div>
                <div>
                  <label htmlFor="constraint-release-label" className="block text-[11px] font-medium text-muted mb-2">
                    Until (clock)
                  </label>
                  <input
                    id="constraint-release-label"
                    value={form.release_label}
                    onChange={(e) => setForm({ ...form, release_label: e.target.value })}
                    autoComplete="off"
                    className="mono w-full px-4 py-2 rounded-lg text-[13px] text-ink bg-canvas border border-line focus:outline-none focus:border-ink"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="constraint-notes" className="block text-[11px] font-medium text-muted mb-2">
                  Notes (optional)
                </label>
                <input
                  id="constraint-notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  autoComplete="off"
                  className="mono w-full px-4 py-2 rounded-lg text-[13px] text-ink bg-canvas border border-line focus:outline-none focus:border-ink"
                />
              </div>
              <button
                onClick={submit}
                disabled={!form.resource_name.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-medium bg-ink text-canvas disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" /> Add constraint
              </button>
              {lastSaved && <div className="text-[11px] text-muted">Saved at {lastSaved} by clinician</div>}
            </div>
          </div>

          <div className="border border-line flex-1 rounded-lg p-6 overflow-hidden flex flex-col">
            <div className="text-[11px] font-medium text-muted uppercase tracking-wider mb-4 flex-shrink-0">
              Active constraints ({bottlenecks.length})
            </div>
            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
              {bottlenecks.map((bn) => (
                <BottleneckRow key={bn.bottleneck_id} bn={bn} onRemove={() => removeBottleneck(bn.bottleneck_id)} />
              ))}
              {bottlenecks.length === 0 && (
                <div className="text-center py-8 text-muted text-sm">
                  No fixed constraints. The optimizer treats all resources as movable.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BottleneckRow({ bn, onRemove }: { bn: FixedBottleneck; onRemove: () => void }) {
  const displayMin = bn.release_in_min ?? 0;
  const priorityStatus = PRIORITY_STATUS[bn.priority] ?? "flagged";

  return (
    <div className="border border-line rounded-lg p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <AlertOctagon className="w-4 h-4 flex-shrink-0 text-muted" />
          <span className="mono text-[13px] font-medium text-ink truncate">{bn.resource_name}</span>
        </div>
        <button
          onClick={onRemove}
          aria-label={`Remove constraint for ${bn.resource_name}`}
          className="flex items-center justify-center w-8 h-8 rounded text-muted hover:text-status-critical transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] px-2 py-1 rounded border border-line text-muted">{bn.resource_type}</span>
        <StatusBadge status={priorityStatus} label={bn.priority} />
      </div>
      <div className="mono text-[13px] text-muted">{bn.status}</div>
      {bn.notes && <div className="text-[11px] text-muted mt-1">{bn.notes}</div>}
      <div className="flex items-center justify-between mt-2 text-[11px] mono">
        <span className="text-muted">{bn.release_label ? `until ${bn.release_label}` : ""}</span>
        {bn.release_in_min !== null && <span className="font-medium text-ink">frees in {displayMin}m</span>}
      </div>
    </div>
  );
}