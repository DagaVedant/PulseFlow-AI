/* Digital Twin page: a React Flow network of departments annotated with flow rates. */
"use client";
import { useSimulationStore } from "@/store/simulationStore";
import { HospitalGraph } from "@/components/digital-twin/HospitalGraph";
import { Network } from "lucide-react";

export default function DigitalTwinPage() {
  const { hospitalState } = useSimulationStore();
  const flow = hospitalState?.flow;

  const totalFlow = flow
    ? Object.values(flow).reduce((sum: number, v: any) => sum + (typeof v === "number" ? v : 0), 0)
    : 0;

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-hidden">
      {}
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
        <div
          className="px-3 py-1.5 rounded text-[11px] font-mono"
          style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}
        >
          <span className="text-blue-400">↔</span>{" "}
          <span className="text-slate-500">ACTIVE FLOWS:</span>{" "}
          <span className="text-white font-bold">{totalFlow}</span>
        </div>
      </div>

      {}
      <div
        className="flex-1 rounded-xl overflow-hidden relative min-h-0"
        style={{
          background: "rgba(6,10,20,0.95)",
          border: "1px solid rgba(59,130,246,0.1)",
        }}
      >
        <HospitalGraph />

        {}
        <div
          className="absolute bottom-4 left-4 flex items-center gap-5 px-4 py-2.5 rounded-lg"
          style={{
            background: "rgba(10,14,26,0.85)",
            border: "1px solid rgba(59,130,246,0.15)",
            backdropFilter: "blur(8px)",
          }}
        >
          {[
            { color: "#3b82f6", label: "Normal flow (0–2)" },
            { color: "#ffaa00", label: "Elevated (3–4)" },
            { color: "#ff3b3b", label: "High (5+)" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="w-5 h-0.5 rounded-full" style={{ background: item.color }} />
              <span className="text-[10px] text-slate-500 font-mono">{item.label}</span>
            </div>
          ))}
          <div
            className="ml-2 pl-3 text-[10px] text-slate-700 font-mono"
            style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}
          >
            numbers = patients in transit
          </div>
        </div>
      </div>
    </div>
  );
}
