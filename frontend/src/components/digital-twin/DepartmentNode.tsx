/* Custom React Flow node visualizing a single department's status and metrics. */
"use client";
import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { motion } from "framer-motion";
import { formatPercent, formatTime, statusColor } from "@/lib/utils";
import type { DepartmentState, DepartmentStatus } from "@/types";

interface DeptNodeData {
  dept: DepartmentState;
  key: string;
}

const STATUS_GLOW: Record<DepartmentStatus, string> = {
  healthy: "0 0 25px rgba(0,255,136,0.25)",
  warning: "0 0 25px rgba(255,170,0,0.25)",
  critical: "0 0 30px rgba(255,59,59,0.35)",
};

export const DepartmentNode = memo(({ data }: NodeProps<DeptNodeData>) => {
  const { dept } = data;
  if (!dept) return null;

  const status = dept.status as DepartmentStatus;
  const sColor = statusColor(status);

  const utilizationBar = (value: number, label: string) => (
    <div className="flex items-center gap-1.5">
      <div className="text-[8px] text-slate-600 font-mono w-12 flex-shrink-0">{label}</div>
      <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: sColor, opacity: 0.7 }}
          animate={{ width: `${Math.round(value * 100)}%` }}
          transition={{ duration: 2.5 }}
        />
      </div>
      <div className="text-[8px] font-mono w-7 text-right" style={{ color: sColor }}>
        {Math.round(value * 100)}%
      </div>
    </div>
  );

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="rounded-xl overflow-hidden select-none"
        style={{
          width: 210,
          background: "rgba(10,14,26,0.95)",
          border: `1.5px solid ${sColor}40`,
          boxShadow: STATUS_GLOW[status],
        }}
      >
        {}
        <div
          className="px-3 py-2 flex items-center justify-between"
          style={{ background: `${sColor}12`, borderBottom: `1px solid ${sColor}20` }}
        >
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider" style={{ color: sColor }}>
              {dept.display_name}
            </div>
            <div className="text-[8px] text-slate-600 font-mono">
              {dept.current_patients}/{dept.capacity} beds
            </div>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{
                background: sColor,
                boxShadow: `0 0 6px ${sColor}`,
                animation: status === "critical" ? "pulse-critical 1.5s infinite" : undefined,
              }}
            />
            <div className="text-[7px] text-slate-700 font-mono uppercase">{status}</div>
          </div>
        </div>

        {}
        <div className="px-3 py-2 space-y-1.5">
          {utilizationBar(dept.occupancy, "Beds")}
          {utilizationBar(dept.resource_utilization, "Resources")}

          <div className="flex justify-between pt-1 border-t border-slate-800/50">
            <div className="text-center">
              <div className="text-[8px] text-slate-600 font-mono">Queue</div>
              <div className="text-sm font-bold font-mono" style={{ color: sColor }}>
                {dept.queue_length}
              </div>
            </div>
            <div className="text-center">
              <div className="text-[8px] text-slate-600 font-mono">Wait</div>
              <div className="text-sm font-bold font-mono text-slate-300">
                {formatTime(dept.avg_wait_time)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-[8px] text-slate-600 font-mono">Avail</div>
              <div className="text-sm font-bold font-mono text-slate-400">
                {dept.beds_available}
              </div>
            </div>
          </div>
        </div>

        {}
        <div className="h-1 bg-slate-900/50 overflow-hidden">
          <motion.div
            className="h-full"
            style={{ background: sColor, opacity: 0.5 }}
            animate={{ width: `${Math.round(dept.occupancy * 100)}%` }}
            transition={{ duration: 2.5 }}
          />
        </div>
      </motion.div>

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </>
  );
});

DepartmentNode.displayName = "DepartmentNode";
