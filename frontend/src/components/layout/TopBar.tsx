"use client";
import { useSimulationStore } from "@/store/simulationStore";
import { formatSimTime } from "@/lib/utils";
import { AutoLogoutTimer } from "@/components/layout/AutoLogoutTimer";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function TopBar() {
  const { hospitalState } = useSimulationStore();
  const simTime = hospitalState?.sim_time ?? 0;
  const displayTime = Math.floor(simTime / 30) * 30;

  return (
    <div className="h-16 flex items-center justify-end gap-3 px-5 flex-shrink-0 bg-transparent">
      <div className="flex items-center gap-2 bg-[rgba(255,255,255,0.5)] dark:bg-[rgba(42,40,34,0.5)] backdrop-blur-xl rounded-2xl px-3.5 py-2">
        <span className="text-xs text-muted">Sim</span>
        <span className="text-sm font-mono tabular-nums font-semibold text-ink">
          {formatSimTime(displayTime)}
        </span>
      </div>
      <ThemeToggle />
      <AutoLogoutTimer />
    </div>
  );
}
