/* Top bar showing the simulated clock. */
"use client";
import { useSimulationStore } from "@/store/simulationStore";
import { formatSimTime } from "@/lib/utils";

export function TopBar() {
  const { hospitalState } = useSimulationStore();
  const simTime = hospitalState?.sim_time ?? 0;
  const displayTime = Math.floor(simTime / 30) * 30;

  return (
    <div
      className="h-14 flex items-center px-5 flex-shrink-0"
      style={{
        background: "rgba(8,12,24,0.95)",
        borderBottom: "1px solid rgba(12,200,212,0.08)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        className="text-sm font-mono px-3 py-1.5 rounded"
        style={{
          background: "rgba(12,200,212,0.05)",
          border: "1px solid rgba(12,200,212,0.15)",
          color: "#0CC8D4",
          letterSpacing: "0.08em",
        }}
      >
        <span className="mr-2 text-xs uppercase" style={{ color: "#475569" }}>Sim Time</span>
        {formatSimTime(displayTime)}
      </div>
    </div>
  );
}
