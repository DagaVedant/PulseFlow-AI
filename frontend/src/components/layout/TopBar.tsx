"use client";
import { useSimulationStore } from "@/store/simulationStore";
import { formatSimTime } from "@/lib/utils";
import { AutoLogoutTimer } from "@/components/layout/AutoLogoutTimer";

export function TopBar() {
  const { hospitalState } = useSimulationStore();
  const simTime = hospitalState?.sim_time ?? 0;
  const displayTime = Math.floor(simTime / 30) * 30;

  return (
    <div className="h-14 flex items-center justify-between gap-4 px-4 flex-shrink-0 bg-clinical-surface border-b border-clinical-border">
      <div className="flex items-center gap-2 border rounded px-3 py-1.5 border-clinical-border bg-clinical-canvas">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-600">
          Sim Time
        </span>
        <span className="text-sm font-mono tabular-nums font-semibold text-slate-900">
          {formatSimTime(displayTime)}
        </span>
      </div>
      <AutoLogoutTimer />
    </div>
  );
}
