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
      <div className="text-xs font-mono w-8 text-right text-muted">
        {Math.round(value * 100)}%
      </div>
    </div>
  );

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div
        className="select-none overflow-hidden rounded-lg border border-clinical-border bg-clinical-surface"
        style={{ width: 200, borderLeft: `4px solid ${sColor}` }}
      >
        <div className="px-4 pt-4 pb-2 flex items-start justify-between border-b border-clinical-border">
          <div>
            <div className="text-sm font-semibold text-ink tracking-wide">
              {dept.display_name}
            </div>
            <div className="text-xs text-muted mt-1">
              {dept.current_patients}/{dept.capacity} beds
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-xs font-mono uppercase font-medium"
              style={{ color: sColor }}
            >
              {status}
            </span>
          </div>
        </div>

        <div className="px-4 py-2 space-y-2">
          {bar(dept.occupancy, "Beds")}
          {bar(dept.resource_utilization, "Resources")}
        </div>

        <div className="px-4 pb-2 border-t border-clinical-border pt-2 grid grid-cols-3 gap-2">
          {[
            ["Queue", String(dept.queue_length)],
            ["Wait", formatTime(dept.avg_wait_time)],
            ["Avail", String(dept.beds_available)],
          ].map(([label, val]) => (
            <div key={label}>
              <div className="text-xs text-muted mb-1">{label}</div>
              <div className="text-base font-bold font-mono text-ink">
                {val}
              </div>
            </div>
          ))}
        </div>

        {((dept as any).burnout_risk ||
          ((dept as any).boarding_count ?? 0) > 0) && (
          <div className="px-4 pb-2 flex gap-2 flex-wrap border-t border-clinical-border pt-2">
            {(dept as any).burnout_risk && (
              <span className="text-xs px-2 py-1 rounded font-medium bg-flag-soft text-flag-ink border border-flag-line">
                Burnout Risk
              </span>
            )}
            {((dept as any).boarding_count ?? 0) > 0 && (
              <span className="text-xs px-2 py-1 rounded font-medium bg-flag-soft text-flag-ink border border-flag-line">
                {(dept as any).boarding_count} Boarding
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
  return v >= 5 ? "#DC2626" : v >= 3 ? "#D97706" : "#475569";
}

function buildEdges(flow: PatientFlow): Edge[] {
  const edge = (
    id: string,
    src: string,
    tgt: string,
    val: number,
    labelColor = "#475569",
    dasharray?: string,
  ): Edge => ({
    id,
    source: src,
    target: tgt,
    label: val > 0 ? `${val}` : "",
    labelStyle: { fill: labelColor, fontSize: 12, fontFamily: "monospace" },
    labelBgStyle: { fill: "#FFFFFF" },
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
    edge("er-icu", "er", "icu", flow.er_to_icu, "#D97706", "5 3"),
    edge("er-ward", "er", "ward", flow.er_to_ward),
    edge("labs-imaging", "labs", "imaging", flow.labs_to_imaging),
    edge("imaging-icu", "imaging", "icu", flow.imaging_to_icu, "#D97706"),
    edge("imaging-ward", "imaging", "ward", flow.imaging_to_ward),
    edge("icu-ward", "icu", "ward", flow.icu_to_ward),
    {
      id: "ward-discharge",
      source: "ward",
      target: "discharge",
      label: flow.ward_to_discharge > 0 ? `${flow.ward_to_discharge}` : "",
      labelStyle: { fill: "#059669", fontSize: 12, fontFamily: "monospace" },
      labelBgStyle: { fill: "#FFFFFF" },
      style: {
        stroke: "#059669",
        strokeWidth: flowWeight(flow.ward_to_discharge),
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#059669" },
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
      <Background
        variant={BackgroundVariant.Dots}
        gap={32}
        size={1}
        color="#E2E8F0"
      />
      <Controls showInteractive={false} />
      <MiniMap
        nodeColor={(n) => {
          const d = (departments as any)[n.id];
          if (!d) return "#CBD5E1";
          return d.status === "critical"
            ? "#DC2626"
            : d.status === "warning"
              ? "#D97706"
              : "#059669";
        }}
      />
    </ReactFlow>
  );
}

export default function DigitalTwinPage() {
  const { hospitalState } = useSimulationStore();
  const flow = hospitalState?.flow;
  const totalFlow = flow
    ? Object.values(flow).reduce(
        (sum: number, v: any) => sum + (typeof v === "number" ? v : 0),
        0,
      )
    : 0;

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-hidden font-sans">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-ink tracking-wide flex items-center gap-2">
            <Network className="w-6 h-6 text-muted" />
            Live Digital Twin
          </h1>
          <p className="text-xs text-muted mt-1">
            Hospital systems network • Real-time patient flow topology
          </p>
        </div>
        <div className="px-4 py-2 rounded-lg text-sm border border-clinical-border bg-clinical-surface">
          <span className="text-muted">Active flows:</span>{" "}
          <span className="text-ink font-bold font-mono">
            {totalFlow}
          </span>
        </div>
      </div>

      <div className="flex-1 rounded-lg overflow-hidden relative min-h-0 border border-clinical-border bg-clinical-surface">
        <HospitalGraph />
        <div className="absolute bottom-4 left-4 flex items-center gap-6 px-4 py-2 rounded-lg border border-clinical-border bg-clinical-surface">
          {[
            { color: "#475569", label: "Normal flow (0–2)" },
            { color: "#D97706", label: "Elevated (3–4)" },
            { color: "#DC2626", label: "High (5+)" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className="w-5 h-1 rounded-full"
                style={{ background: item.color }}
              />
              <span className="text-xs text-muted">{item.label}</span>
            </div>
          ))}
          <div className="ml-2 pl-4 text-xs text-muted border-l border-clinical-border">
            numbers = patients in transit
          </div>
        </div>
      </div>
    </div>
  );
}
