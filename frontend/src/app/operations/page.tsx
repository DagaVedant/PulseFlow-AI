/* Operations Hub: specialist availability grid and the Fixed Bottlenecks & Operational Constraints input panel. */
"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Network, Stethoscope, Lock, Plus, X, Clock, AlertOctagon
} from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useDemoStore } from "@/store/demoStore";
import type { Specialist, FixedBottleneck, BottleneckType } from "@/types";

const RESOURCE_TYPES: BottleneckType[] = [
  "Doctor", "Specialist", "Operating Room", "Equipment", "Bed", "Nurse",
];
const PRIORITIES = ["low", "medium", "high", "critical"] as const;

const PRIORITY_COLOR: Record<string, string> = {
  critical: "#ff3b3b", high: "#ffaa00", medium: "#ffe600", low: "#22c55e",
};

function statusStyle(status: string) {
  if (status === "available") return { color: "#22c55e", label: "AVAILABLE" };
  if (status === "in_surgery") return { color: "#ff3b3b", label: "IN SURGERY" };
  return { color: "#ffaa00", label: "BUSY" };
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
    priority: "high" as typeof PRIORITIES[number],
    release_in_min: 60,
    release_label: "",
    notes: "",
  });

  const submit = () => {
    if (!form.resource_name.trim()) return;
    addBottleneck({ ...form });
    setForm({ ...form, resource_name: "", status: "", notes: "", release_label: "" });
  };

  const groups: Record<string, Specialist[]> = {};
  for (const sp of specialists) {
    (groups[sp.specialty] ??= []).push(sp);
  }
  const availableCount = specialists.filter((s) => s.available_in_min === 0).length;

  return (
    <div className="flex flex-col h-full p-6 gap-5 overflow-hidden">

      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <Network className="w-6 h-6 text-blue-400" />
            Operations Hub
          </h1>
          <p className="text-sm text-slate-500 font-mono mt-1">
            Specialist availability · fixed operational constraints the optimizer must respect
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40">
            <span className="text-sm font-mono font-bold text-emerald-400">{availableCount}</span>
            <span className="text-xs font-mono text-slate-500 ml-1.5">available now</span>
          </div>
          <div className="px-4 py-2.5 rounded-xl bg-amber-950/30 border border-amber-800/40">
            <span className="text-sm font-mono font-bold text-amber-400">{bottlenecks.length}</span>
            <span className="text-xs font-mono text-slate-500 ml-1.5">fixed constraints</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 gap-5 min-h-0 overflow-hidden">

        <div className="flex-1 flex flex-col min-w-0 rounded-2xl p-5 overflow-hidden"
          style={{ background: "rgba(10,14,26,0.8)", border: "1px solid rgba(59,130,246,0.12)" }}>
          <div className="flex items-center gap-2 mb-4 flex-shrink-0">
            <Stethoscope className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Specialist Availability</span>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            {Object.entries(groups).map(([specialty, list]) => (
              <div key={specialty}>
                <div className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-2">{specialty}</div>
                <div className="grid grid-cols-2 gap-2.5">
                  {list.map((sp) => {
                    const ss = statusStyle(sp.status);
                    return (
                      <div key={sp.specialist_id} className="rounded-xl p-3"
                        style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${ss.color}30` }}>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-mono font-semibold text-slate-200 truncate">{sp.name}</div>
                            <div className="text-[10px] font-mono text-slate-600 truncate">{sp.role}</div>
                          </div>
                          <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                            style={{ background: `${ss.color}20`, color: ss.color }}>
                            {ss.label}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-600 truncate mb-2">{sp.current_assignment}</div>
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-slate-600">Load {sp.patient_load} · Q{sp.queue_length}</span>
                          <span className="font-bold" style={{ color: sp.available_in_min === 0 ? "#22c55e" : "#ffaa00" }}>
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
              <div className="text-center py-10 text-slate-600 font-mono text-sm">Connecting to roster...</div>
            )}
          </div>
        </div>

        <div className="w-[400px] flex-shrink-0 flex flex-col gap-4 overflow-hidden">

          <div className="rounded-2xl p-5 flex-shrink-0"
            style={{ background: "rgba(10,14,26,0.8)", border: "1px solid rgba(255,170,0,0.18)" }}>
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Fixed Bottlenecks &amp; Constraints</span>
            </div>

            <div className="space-y-2.5">
              <input
                value={form.resource_name}
                onChange={(e) => setForm({ ...form, resource_name: e.target.value })}
                placeholder="Resource name (e.g. Dr. Sarah Chen)"
                className="w-full px-3 py-2 rounded-lg text-sm font-mono bg-slate-900/60 border border-slate-700/50 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-600/50"
              />
              <div className="grid grid-cols-2 gap-2.5">
                <select
                  value={form.resource_type}
                  onChange={(e) => setForm({ ...form, resource_type: e.target.value as BottleneckType })}
                  className="px-3 py-2 rounded-lg text-sm font-mono bg-slate-900/60 border border-slate-700/50 text-slate-300 focus:outline-none"
                >
                  {RESOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as typeof PRIORITIES[number] })}
                  className="px-3 py-2 rounded-lg text-sm font-mono bg-slate-900/60 border border-slate-700/50 text-slate-300 focus:outline-none"
                >
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <input
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                placeholder="Status (e.g. In CABG Surgery)"
                className="w-full px-3 py-2 rounded-lg text-sm font-mono bg-slate-900/60 border border-slate-700/50 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-600/50"
              />
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50">
                  <Clock className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                  <input
                    type="number"
                    value={form.release_in_min}
                    onChange={(e) => setForm({ ...form, release_in_min: Number(e.target.value) })}
                    className="w-full bg-transparent text-sm font-mono text-slate-200 focus:outline-none"
                  />
                  <span className="text-[10px] font-mono text-slate-600 flex-shrink-0">min</span>
                </div>
                <input
                  value={form.release_label}
                  onChange={(e) => setForm({ ...form, release_label: e.target.value })}
                  placeholder="until (2:45 PM)"
                  className="px-3 py-2 rounded-lg text-sm font-mono bg-slate-900/60 border border-slate-700/50 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-600/50"
                />
              </div>
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Notes (optional)"
                className="w-full px-3 py-2 rounded-lg text-sm font-mono bg-slate-900/60 border border-slate-700/50 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-600/50"
              />
              <button
                onClick={submit}
                disabled={!form.resource_name.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-mono font-bold transition-all disabled:opacity-40"
                style={{ background: "rgba(255,170,0,0.14)", border: "1px solid rgba(255,170,0,0.4)", color: "#ffaa00" }}
              >
                <Plus className="w-4 h-4" /> Add Constraint
              </button>
            </div>
          </div>

          <div className="flex-1 rounded-2xl p-5 overflow-hidden flex flex-col"
            style={{ background: "rgba(10,14,26,0.8)", border: "1px solid rgba(59,130,246,0.12)" }}>
            <div className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3 flex-shrink-0">
              Active Constraints ({bottlenecks.length})
            </div>
            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
              <AnimatePresence mode="popLayout">
                {bottlenecks.map((bn) => (
                  <BottleneckRow key={bn.bottleneck_id} bn={bn} onRemove={() => removeBottleneck(bn.bottleneck_id)} isDemo={bn.bottleneck_id === demoConstraintId || bn.resource_name === DEMO_CONSTRAINT.resource_name} />
                ))}
              </AnimatePresence>
              {bottlenecks.length === 0 && (
                <div className="text-center py-8 text-slate-600 font-mono text-sm">
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

function BottleneckRow({ bn, onRemove, isDemo }: { bn: FixedBottleneck; onRemove: () => void; isDemo?: boolean }) {
  const serverMin = bn.release_in_min ?? 0;
  const [displayMin, setDisplayMin] = useState(serverMin);
  const color = PRIORITY_COLOR[bn.priority] ?? "#3b82f6";

  useEffect(() => {
    setDisplayMin((prev) => {
      if (Math.abs(prev - serverMin) > 2) return serverMin;
      return prev;
    });
  }, [serverMin, bn.bottleneck_id]);

  useEffect(() => {
    if (serverMin <= 0) return;
    const interval = setInterval(() => {
      setDisplayMin((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [bn.bottleneck_id]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      className="rounded-xl p-3"
      style={{
        background: isDemo ? `${color}08` : "rgba(255,255,255,0.025)",
        border: `1px solid ${isDemo ? color + "55" : color + "30"}`,
        boxShadow: isDemo ? `0 0 18px ${color}18` : "none",
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <AlertOctagon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
          <span className="text-sm font-mono font-semibold text-slate-200 truncate">{bn.resource_name}</span>
        </div>
        <button onClick={onRemove} className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-400">{bn.resource_type}</span>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold" style={{ background: `${color}20`, color }}>
          {bn.priority.toUpperCase()}
        </span>
      </div>
      <div className="text-xs font-mono text-slate-400">{bn.status}</div>
      {bn.notes && <div className="text-[10px] font-mono text-slate-600 mt-1">{bn.notes}</div>}
      <div className="flex items-center justify-between mt-2 text-[10px] font-mono">
        <span className="text-slate-600">
          {bn.release_label ? `until ${bn.release_label}` : ""}
        </span>
        {bn.release_in_min !== null && (
          <span className="font-bold" style={{ color }}>frees in {displayMin}m</span>
        )}
      </div>
    </motion.div>
  );
}
