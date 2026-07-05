"use client";
import { useMemo, memo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  BackgroundVariant,
  Handle,
  Position,
  NodeProps,
  type Node,
  type Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import { Network } from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";
import { formatTime, statusColor } from "@/lib/utils";
import type { DepartmentState, DepartmentStatus, PatientFlow } from "@/types";

interface DeptNodeData {
  dept: DepartmentState;
  key: string;
}

const DepartmentNode = memo(({ data }: NodeProps<DeptNodeData>) => {
  const { dept } = data;
  if (!dept) return null;
  const status = dept.status as DepartmentStatus;
  const sColor = statusColor(status);

  const bar = (value: number, label: string) => (
    <div className="flex items-center gap-2">
      <div className="text-xs text-muted w-14 flex-shrink-0">{label}</div>
      <div className="flex-1 h-1 bg-elevated rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ background: sColor, width: `${Math.round(value * 100)}%` }}
        />
      </div>
      <div className="mono text-xs w-8 text-right text-muted">
        {Math.round(value * 100)}%
      </div>
    </div>
  );

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div
        className="select-none overflow-hidden rounded-lg border border-line"
        style={{ width: 200, borderLeft: `4px solid ${sColor}` }}
      >
        <div className="px-4 pt-4 pb-2 flex items-start justify-between border-b border-line">
          <div>
            <div className="text-sm font-medium text-ink tracking-wide">
              {dept.display_name}
            </div>
            <div className="text-xs text-muted mt-1">
              {dept.current_patients}/{dept.capacity} beds
            </div>
          </div>
          <span className="mono text-xs uppercase font-medium" style={{ color: sColor }}>
            {status}
          </span>
        </div>

        <div className="px-4 py-2 space-y-2">
          {bar(dept.occupancy, "Beds")}
          {bar(dept.resource_utilization, "Resources")}
        </div>

        <div className="px-4 pb-2 border-t border-line pt-2 grid grid-cols-3 gap-2">
          {[
            ["Queue", String(dept.queue_length)],
            ["Wait", formatTime(dept.avg_wait_time)],
            ["Avail", String(dept.beds_available)],
          ].map(([label, val]) => (
            <div key={label}>
              <div className="text-xs text-muted mb-1">{label}</div>
              <div className="mono text-base font-medium text-ink">{val}</div>
            </div>
          ))}
        </div>

        {((dept as any).burnout_risk || ((dept as any).boarding_count ?? 0) > 0) && (
          <div className="px-4 pb-2 flex gap-2 flex-wrap border-t border-line pt-2">
            {(dept as any).burnout_risk && (
              <span className="text-xs px-2 py-1 rounded font-medium text-status-flagged border border-line">
                Burnout risk
              </span>
            )}
            {((dept as any).boarding_count ?? 0) > 0 && (
              <span className="text-xs px-2 py-1 rounded font-medium text-status-flagged border border-line">
                {(dept as any).boarding_count} boarding
              </span>
            )}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </>
  );
});
DepartmentNode.displayName = "DepartmentNode";

const NODE_TYPES = { department: DepartmentNode };
const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  er: { x: 320, y: 0 },
  labs: { x: 50, y: 240 },
  imaging: { x: 590, y: 240 },
  icu: { x: 320, y: 480 },
  ward: { x: 590, y: 480 },
  discharge: { x: 320, y: 720 },
};

function flowWeight(v: number) {
  return Math.max(1, Math.min(5, 1 + v * 0.5));
}
function flowColor(v: number) {
  return v >= 5 ? "#e08462" : v >= 3 ? "#e8b563" : "#5b6b8c";
}

function buildEdges(flow: PatientFlow): Edge[] {
  const edge = (
    id: string,
    src: string,
    tgt: string,
    val: number,
    labelColor = "#5b6b8c",
    dasharray?: string,
  ): Edge => ({
    id,
    source: src,
    target: tgt,
    label: val > 0 ? `${val}` : "",
    labelStyle: { fill: labelColor, fontSize: 12, fontFamily: "JetBrains Mono, monospace" },
    labelBgStyle: { fill: "#0f1830" },
    style: {
      stroke: flowColor(val),
      strokeWidth: flowWeight(val),
      ...(dasharray ? { strokeDasharray: dasharray } : {}),
    },
    markerEnd: { type: MarkerType.ArrowClosed, color: flowColor(val) },
  });
  return [
    edge("er-labs", "er", "labs", flow.er_to_labs),
    edge("er-imaging", "er", "imaging", flow.er_to_imaging),
    edge("er-icu", "er", "icu", flow.er_to_icu, "#e8b563", "5 3"),
    edge("er-ward", "er", "ward", flow.er_to_ward),
    edge("labs-imaging", "labs", "imaging", flow.labs_to_imaging),
    edge("imaging-icu", "imaging", "icu", flow.imaging_to_icu, "#e8b563"),
    edge("imaging-ward", "imaging", "ward", flow.imaging_to_ward),
    edge("icu-ward", "icu", "ward", flow.icu_to_ward),
    {
      id: "ward-discharge",
      source: "ward",
      target: "discharge",
      label: flow.ward_to_discharge > 0 ? `${flow.ward_to_discharge}` : "",
      labelStyle: { fill: "#4ec98d", fontSize: 12, fontFamily: "JetBrains Mono, monospace" },
      labelBgStyle: { fill: "#0f1830" },
      style: { stroke: "#4ec98d", strokeWidth: flowWeight(flow.ward_to_discharge) },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#4ec98d" },
    },
  ];
}

function HospitalGraph() {
  const { hospitalState } = useSimulationStore();
  const departments = hospitalState?.departments ?? {};
  const flow = hospitalState?.flow;

  const nodes: Node[] = useMemo(
    () =>
      Object.entries(NODE_POSITIONS).map(([key, pos]) => ({
        id: key,
        type: "department",
        position: pos,
        data: { dept: (departments as any)[key], key },
        draggable: false,
      })),
    [departments],
  );

  const edges: Edge[] = useMemo(() => (!flow ? [] : buildEdges(flow)), [flow]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      fitView
      fitViewOptions={{ padding: 0.08 }}
      proOptions={{ hideAttribution: true }}
      nodesDraggable={false}
    >
      <Background variant={BackgroundVariant.Dots} gap={32} size={1} color="#26314f" />
      <Controls showInteractive={false} />
      <MiniMap
        nodeColor={(n) => {
          const d = (departments as any)[n.id];
          if (!d) return "#26314f";
          return d.status === "critical" ? "#e08462" : d.status === "warning" ? "#e8b563" : "#4ec98d";
        }}
      />
    </ReactFlow>
  );
}

export default function DigitalTwinPage() {
  const { hospitalState } = useSimulationStore();
  const flow = hospitalState?.flow;
  const totalFlow = flow
    ? Object.values(flow).reduce((sum: number, v: any) => sum + (typeof v === "number" ? v : 0), 0)
    : 0;

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-[18px] font-medium text-ink flex items-center gap-2">
            <Network className="w-5 h-5 text-muted" />
            Live digital twin
          </h1>
          <p className="text-xs text-muted mt-1">
            Hospital systems network — real-time patient flow topology
          </p>
        </div>
        <div className="px-4 py-2 rounded-lg text-sm border border-line">
          <span className="text-muted">Active flows:</span>{" "}
          <span className="mono text-ink font-medium">{totalFlow}</span>
        </div>
      </div>

      <div className="flex-1 rounded-lg overflow-hidden relative min-h-0 border border-line">
        <HospitalGraph />
        <div className="absolute bottom-4 left-4 flex items-center gap-6 px-4 py-2 rounded-lg border border-line bg-canvas">
          {[
            { color: "#5b6b8c", label: "Normal flow (0–2)" },
            { color: "#e8b563", label: "Elevated (3–4)" },
            { color: "#e08462", label: "High (5+)" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="w-5 h-1 rounded-full" style={{ background: item.color }} />
              <span className="text-xs text-muted">{item.label}</span>
            </div>
          ))}
          <div className="ml-2 pl-4 text-xs text-muted border-l border-line">
            numbers = patients in transit
          </div>
        </div>
      </div>
    </div>
  );
}