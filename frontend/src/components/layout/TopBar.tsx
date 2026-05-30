/* Top bar showing the simulated clock and the connection status. */
"use client";
import { useSimulationStore } from "@/store/simulationStore";
import { formatSimTime } from "@/lib/utils";

export function TopBar() {
  const { hospitalState, isConnected } = useSimulationStore();
  const simTime = hospitalState?.sim_time ?? 0;
  const displayTime = Math.floor(simTime / 30) * 30;

  return (
    <div
      className="h-14 flex items-center px-5 flex-shrink-0"
      style={{
        background: "rgba(10,14,26,0.95)",
        borderBottom: "1px solid rgba(59,130,246,0.12)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center gap-3">
        {}
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{
            background: isConnected ? "#34d399" : "#ff3b3b",
            boxShadow: isConnected ? "0 0 6px rgba(52,211,153,0.9)" : "none",
          }}
        />

        {}
        <div
          className="text-sm font-mono px-3 py-1.5 rounded"
          style={{
            background: "rgba(59,130,246,0.08)",
            border: "1px solid rgba(59,130,246,0.2)",
            color: "#60a5fa",
            letterSpacing: "0.08em",
          }}
        >
          <span className="text-blue-700 mr-2 text-xs uppercase">Sim Time</span>
          {formatSimTime(displayTime)}
        </div>

        {!isConnected && (
          <span className="text-xs font-mono text-red-400">
            Connecting to simulation...
          </span>
        )}
      </div>
    </div>
  );
}
