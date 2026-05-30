/* React Flow graph that wires department nodes together with flow edges. */
"use client";
import { useCallback, useMemo } from "react";
import ReactFlow, {
  Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  MarkerType, BackgroundVariant,
  type Node, type Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import { useSimulationStore } from "@/store/simulationStore";
import { DepartmentNode } from "./DepartmentNode";
import type { DepartmentState, PatientFlow } from "@/types";

const NODE_TYPES = { department: DepartmentNode };

const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  er:        { x: 200, y: 50 },
  labs:      { x: 50,  y: 250 },
  imaging:   { x: 350, y: 250 },
  icu:       { x: 200, y: 450 },
  ward:      { x: 550, y: 350 },
  discharge: { x: 550, y: 550 },
};

function flowWeight(value: number): number {
  return Math.max(1, Math.min(5, 1 + value * 0.5));
}

function flowColor(value: number): string {
  if (value >= 5) return "#ff3b3b";
  if (value >= 3) return "#ffaa00";
  return "#3b82f6";
}

function buildEdges(flow: PatientFlow): Edge[] {
  const edges: Edge[] = [
    {
      id: "er-labs",
      source: "er", target: "labs",
      animated: flow.er_to_labs > 0,
      label: flow.er_to_labs > 0 ? `${flow.er_to_labs}` : "",
      labelStyle: { fill: "#60a5fa", fontSize: 10, fontFamily: "monospace" },
      labelBgStyle: { fill: "rgba(10,14,26,0.8)" },
      style: {
        stroke: flowColor(flow.er_to_labs),
        strokeWidth: flowWeight(flow.er_to_labs),
        opacity: 0.7,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: flowColor(flow.er_to_labs) },
    },
    {
      id: "er-imaging",
      source: "er", target: "imaging",
      animated: flow.er_to_imaging > 0,
      label: flow.er_to_imaging > 0 ? `${flow.er_to_imaging}` : "",
      labelStyle: { fill: "#60a5fa", fontSize: 10, fontFamily: "monospace" },
      labelBgStyle: { fill: "rgba(10,14,26,0.8)" },
      style: {
        stroke: flowColor(flow.er_to_imaging),
        strokeWidth: flowWeight(flow.er_to_imaging),
        opacity: 0.7,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: flowColor(flow.er_to_imaging) },
    },
    {
      id: "er-icu",
      source: "er", target: "icu",
      animated: flow.er_to_icu > 0,
      label: flow.er_to_icu > 0 ? `${flow.er_to_icu}` : "",
      labelStyle: { fill: "#f59e0b", fontSize: 10, fontFamily: "monospace" },
      labelBgStyle: { fill: "rgba(10,14,26,0.8)" },
      style: {
        stroke: flowColor(flow.er_to_icu * 2),
        strokeWidth: flowWeight(flow.er_to_icu * 2),
        opacity: 0.7,
        strokeDasharray: "5 3",
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: flowColor(flow.er_to_icu * 2) },
    },
    {
      id: "er-ward",
      source: "er", target: "ward",
      animated: flow.er_to_ward > 0,
      label: flow.er_to_ward > 0 ? `${flow.er_to_ward}` : "",
      labelStyle: { fill: "#60a5fa", fontSize: 10, fontFamily: "monospace" },
      labelBgStyle: { fill: "rgba(10,14,26,0.8)" },
      style: {
        stroke: flowColor(flow.er_to_ward),
        strokeWidth: flowWeight(flow.er_to_ward),
        opacity: 0.6,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: flowColor(flow.er_to_ward) },
    },
    {
      id: "labs-imaging",
      source: "labs", target: "imaging",
      animated: flow.labs_to_imaging > 0,
      label: flow.labs_to_imaging > 0 ? `${flow.labs_to_imaging}` : "",
      labelStyle: { fill: "#60a5fa", fontSize: 10, fontFamily: "monospace" },
      labelBgStyle: { fill: "rgba(10,14,26,0.8)" },
      style: {
        stroke: flowColor(flow.labs_to_imaging),
        strokeWidth: flowWeight(flow.labs_to_imaging),
        opacity: 0.6,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: flowColor(flow.labs_to_imaging) },
    },
    {
      id: "imaging-icu",
      source: "imaging", target: "icu",
      animated: flow.imaging_to_icu > 0,
      label: flow.imaging_to_icu > 0 ? `${flow.imaging_to_icu}` : "",
      labelStyle: { fill: "#f59e0b", fontSize: 10, fontFamily: "monospace" },
      labelBgStyle: { fill: "rgba(10,14,26,0.8)" },
      style: {
        stroke: flowColor(flow.imaging_to_icu * 2),
        strokeWidth: flowWeight(flow.imaging_to_icu * 2),
        opacity: 0.7,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: flowColor(flow.imaging_to_icu * 2) },
    },
    {
      id: "imaging-ward",
      source: "imaging", target: "ward",
      animated: flow.imaging_to_ward > 0,
      label: flow.imaging_to_ward > 0 ? `${flow.imaging_to_ward}` : "",
      labelStyle: { fill: "#60a5fa", fontSize: 10, fontFamily: "monospace" },
      labelBgStyle: { fill: "rgba(10,14,26,0.8)" },
      style: {
        stroke: flowColor(flow.imaging_to_ward),
        strokeWidth: flowWeight(flow.imaging_to_ward),
        opacity: 0.6,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: flowColor(flow.imaging_to_ward) },
    },
    {
      id: "icu-ward",
      source: "icu", target: "ward",
      animated: flow.icu_to_ward > 0,
      label: flow.icu_to_ward > 0 ? `${flow.icu_to_ward}` : "",
      labelStyle: { fill: "#60a5fa", fontSize: 10, fontFamily: "monospace" },
      labelBgStyle: { fill: "rgba(10,14,26,0.8)" },
      style: {
        stroke: flowColor(flow.icu_to_ward),
        strokeWidth: flowWeight(flow.icu_to_ward),
        opacity: 0.6,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: flowColor(flow.icu_to_ward) },
    },
    {
      id: "ward-discharge",
      source: "ward", target: "discharge",
      animated: flow.ward_to_discharge > 0,
      label: flow.ward_to_discharge > 0 ? `${flow.ward_to_discharge}` : "",
      labelStyle: { fill: "#22c55e", fontSize: 10, fontFamily: "monospace" },
      labelBgStyle: { fill: "rgba(10,14,26,0.8)" },
      style: {
        stroke: "#22c55e",
        strokeWidth: flowWeight(flow.ward_to_discharge),
        opacity: 0.6,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#22c55e" },
    },
  ];
  return edges;
}

export function HospitalGraph() {
  const { hospitalState } = useSimulationStore();
  const departments = hospitalState?.departments ?? {};
  const flow = hospitalState?.flow;

  const nodes: Node[] = useMemo(() => {
    return Object.entries(NODE_POSITIONS).map(([key, pos]) => ({
      id: key,
      type: "department",
      position: pos,
      data: { dept: departments[key as keyof typeof departments], key },
      draggable: false,
    }));
  }, [departments]);

  const edges: Edge[] = useMemo(() => {
    if (!flow) return [];
    return buildEdges(flow);
  }, [flow]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      proOptions={{ hideAttribution: true }}
      className="bg-transparent"
      nodesDraggable={false}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={30}
        size={1}
        color="rgba(59,130,246,0.08)"
      />
      <Controls
        className="bg-space-800 border border-blue-900/30"
        showInteractive={false}
      />
      <MiniMap
        style={{
          background: "rgba(10,14,26,0.9)",
          border: "1px solid rgba(59,130,246,0.2)",
        }}
        nodeColor={(n) => {
          const dept = departments[n.id as keyof typeof departments];
          if (!dept) return "#1e293b";
          const s = dept.status;
          return s === "critical" ? "#ff3b3b" : s === "warning" ? "#ffaa00" : "#00ff88";
        }}
        maskColor="rgba(0,0,0,0.3)"
      />
    </ReactFlow>
  );
}
