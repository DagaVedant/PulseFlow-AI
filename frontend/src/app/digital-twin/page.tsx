/* Digital Twin page: React Flow network of departments with live flow rates.
   Includes HospitalGraph and DepartmentNode inlined from components/digital-twin/. */
"use client";
import { useCallback, useMemo, memo } from "react";
import ReactFlow, {
  Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  MarkerType, BackgroundVariant,
  Handle, Position, NodeProps,
  type Node, type Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import { motion } from "framer-motion";
import { Network } from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";
import { formatTime, statusColor } from "@/lib/utils";
import type { DepartmentState, DepartmentStatus, PatientFlow } from "@/types";

// ─── DepartmentNode ────────────────────────────────────────────────────────

interface DeptNodeData { dept: DepartmentState; key: string; }

const STATUS_GLOW: Record<DepartmentStatus, string> = {
  healthy: "0 0 25px rgba(0,255,136,0.25)",
  warning: "0 0 25px rgba(255,170,0,0.25)",
  critical:"0 0 30px rgba(255,59,59,0.35)",
};

const DepartmentNode = memo(({ data }: NodeProps<DeptNodeData>) => {
  const { dept } = data;
  if (!dept) return null;
  const status = dept.status as DepartmentStatus;
  const sColor = statusColor(status);
  const bar = (value: number, label: string) => (
    <div className="flex items-center gap-1.5">
      <div className="text-[8px] text-slate-600 font-mono w-12 flex-shrink-0">{label}</div>
      <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ background: sColor, opacity: 0.7 }}
          animate={{ width: `${Math.round(value * 100)}%` }} transition={{ duration: 2.5 }} />
      </div>
      <div className="text-[8px] font-mono w-7 text-right" style={{ color: sColor }}>{Math.round(value * 100)}%</div>
    </div>
  );
  return (
    <>
      <Handle type="target" position={Position.Top}  style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="rounded-xl overflow-hidden select-none"
        style={{ width: 210, background: "rgba(10,14,26,0.95)", border: `1.5px solid ${sColor}40`, boxShadow: STATUS_GLOW[status] }}>
        <div className="px-3 py-2 flex items-center justify-between"
          style={{ background: `${sColor}12`, borderBottom: `1px solid ${sColor}20` }}>
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider" style={{ color: sColor }}>{dept.display_name}</div>
            <div className="text-[8px] text-slate-600 font-mono">{dept.current_patients}/{dept.capacity} beds</div>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-2.5 h-2.5 rounded-full"
              style={{ background: sColor, boxShadow: `0 0 6px ${sColor}`, animation: status === "critical" ? "pulse-critical 1.5s infinite" : undefined }} />
            <div className="text-[7px] text-slate-700 font-mono uppercase">{status}</div>
          </div>
        </div>
        <div className="px-3 py-2 space-y-1.5">
          {bar(dept.occupancy, "Beds")}
          {bar(dept.resource_utilization, "Resources")}
          <div className="flex justify-between pt-1 border-t border-slate-800/50">
            {[["Queue", String(dept.queue_length)], ["Wait", formatTime(dept.avg_wait_time)], ["Avail", String(dept.beds_available)]].map(([label, val]) => (
              <div key={label} className="text-center">
                <div className="text-[8px] text-slate-600 font-mono">{label}</div>
                <div className="text-sm font-bold font-mono" style={{ color: label === "Queue" ? sColor : label === "Wait" ? "#cbd5e1" : "#94a3b8" }}>{val}</div>
              </div>
            ))}
            {((dept as any).burnout_risk || ((dept as any).boarding_count ?? 0) > 0) && (
              <div className="flex gap-1.5 mt-1.5 pt-1 border-t border-slate-800/30 flex-wrap">
                {(dept as any).burnout_risk && <span className="text-[7px] px-1.5 py-0.5 rounded font-mono font-bold bg-orange-950/60 text-orange-400 border border-orange-900/40">🔥 BURNOUT</span>}
                {((dept as any).boarding_count ?? 0) > 0 && <span className="text-[7px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-950/60 text-amber-400 border border-amber-900/40">⚓ {(dept as any).boarding_count}</span>}
              </div>
            )}
          </div>
        </div>
        <div className="h-1 bg-slate-900/50 overflow-hidden">
          <motion.div className="h-full" style={{ background: sColor, opacity: 0.5 }}
            animate={{ width: `${Math.round(dept.occupancy * 100)}%` }} transition={{ duration: 2.5 }} />
        </div>
      </motion.div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right}  style={{ opacity: 0 }} />
    </>
  );
});
DepartmentNode.displayName = "DepartmentNode";

// ─── HospitalGraph ────────────────────────────────────────────────────────

const NODE_TYPES = { department: DepartmentNode };
const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  er:        { x: 200, y: 50  },
  labs:      { x: 50,  y: 250 },
  imaging:   { x: 350, y: 250 },
  icu:       { x: 200, y: 450 },
  ward:      { x: 550, y: 350 },
  discharge: { x: 550, y: 550 },
};

function flowWeight(v: number) { return Math.max(1, Math.min(5, 1 + v * 0.5)); }
function flowColor(v: number) { return v >= 5 ? "#ff3b3b" : v >= 3 ? "#ffaa00" : "#3b82f6"; }

function buildEdges(flow: PatientFlow): Edge[] {
  const edge = (id: string, src: string, tgt: string, val: number, labelColor = "#60a5fa", dasharray?: string): Edge => ({
    id, source: src, target: tgt, animated: val > 0,
    label: val > 0 ? `${val}` : "",
    labelStyle: { fill: labelColor, fontSize: 10, fontFamily: "monospace" },
    labelBgStyle: { fill: "rgba(10,14,26,0.8)" },
    style: { stroke: flowColor(val), strokeWidth: flowWeight(val), opacity: 0.7, ...(dasharray ? { strokeDasharray: dasharray } : {}) },
    markerEnd: { type: MarkerType.ArrowClosed, color: flowColor(val) },
  });
  return [
    edge("er-labs",      "er",      "labs",      flow.er_to_labs),
    edge("er-imaging",   "er",      "imaging",   flow.er_to_imaging),
    edge("er-icu",       "er",      "icu",        flow.er_to_icu,   "#f59e0b", "5 3"),
    edge("er-ward",      "er",      "ward",       flow.er_to_ward),
    edge("labs-imaging", "labs",    "imaging",    flow.labs_to_imaging),
    edge("imaging-icu",  "imaging", "icu",        flow.imaging_to_icu, "#f59e0b"),
    edge("imaging-ward", "imaging", "ward",       flow.imaging_to_ward),
    edge("icu-ward",     "icu",     "ward",       flow.icu_to_ward),
    { id:"ward-discharge", source:"ward", target:"discharge", animated: flow.ward_to_discharge > 0,
      label: flow.ward_to_discharge > 0 ? `${flow.ward_to_discharge}` : "",
      labelStyle:{fill:"#22c55e",fontSize:10,fontFamily:"monospace"},
      labelBgStyle:{fill:"rgba(10,14,26,0.8)"},
      style:{stroke:"#22c55e",strokeWidth:flowWeight(flow.ward_to_discharge),opacity:0.6},
      markerEnd:{type:MarkerType.ArrowClosed,color:"#22c55e"} },
  ];
}

function HospitalGraph() {
  const { hospitalState } = useSimulationStore();
  const departments = hospitalState?.departments ?? {};
  const flow = hospitalState?.flow;

  const nodes: Node[] = useMemo(() =>
    Object.entries(NODE_POSITIONS).map(([key, pos]) => ({
      id: key, type: "department", position: pos,
      data: { dept: (departments as any)[key], key }, draggable: false,
    })), [departments]);

  const edges: Edge[] = useMemo(() => (!flow ? [] : buildEdges(flow)), [flow]);

  return (
    <ReactFlow nodes={nodes} edges={edges} nodeTypes={NODE_TYPES}
      fitView fitViewOptions={{ padding: 0.2 }}
      proOptions={{ hideAttribution: true }}
      className="bg-transparent" nodesDraggable={false}>
      <Background variant={BackgroundVariant.Dots} gap={30} size={1} color="rgba(59,130,246,0.08)" />
      <Controls className="bg-space-800 border border-blue-900/30" showInteractive={false} />
      <MiniMap
        style={{ background: "rgba(10,14,26,0.9)", border: "1px solid rgba(59,130,246,0.2)" }}
        nodeColor={(n) => { const d = (departments as any)[n.id]; if (!d) return "#1e293b"; return d.status === "critical" ? "#ff3b3b" : d.status === "warning" ? "#ffaa00" : "#00ff88"; }}
        maskColor="rgba(0,0,0,0.3)"
      />
    </ReactFlow>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function DigitalTwinPage() {
  const { hospitalState } = useSimulationStore();
  const flow = hospitalState?.flow;
  const totalFlow = flow
    ? Object.values(flow).reduce((sum: number, v: any) => sum + (typeof v === "number" ? v : 0), 0)
    : 0;

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-hidden">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <Network className="w-5 h-5 text-blue-400" />
            Live Digital Twin
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Hospital systems network • Real-time patient flow topology
          </p>
        </div>
        <div className="px-3 py-1.5 rounded text-[11px] font-mono"
          style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
          <span className="text-blue-400">↔</span>{" "}
          <span className="text-slate-500">ACTIVE FLOWS:</span>{" "}
          <span className="text-white font-bold">{totalFlow}</span>
        </div>
      </div>

      <div className="flex-1 rounded-xl overflow-hidden relative min-h-0"
        style={{ background: "rgba(6,10,20,0.95)", border: "1px solid rgba(59,130,246,0.1)" }}>
        <HospitalGraph />
        <div className="absolute bottom-4 left-4 flex items-center gap-5 px-4 py-2.5 rounded-lg"
          style={{ background: "rgba(10,14,26,0.85)", border: "1px solid rgba(59,130,246,0.15)", backdropFilter: "blur(8px)" }}>
          {[{ color: "#3b82f6", label: "Normal flow (0–2)" }, { color: "#ffaa00", label: "Elevated (3–4)" }, { color: "#ff3b3b", label: "High (5+)" }].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="w-5 h-0.5 rounded-full" style={{ background: item.color }} />
              <span className="text-[10px] text-slate-500 font-mono">{item.label}</span>
            </div>
          ))}
          <div className="ml-2 pl-3 text-[10px] text-slate-700 font-mono" style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
            numbers = patients in transit
          </div>
        </div>
      </div>
    </div>
  );
}
