"use client";
import { useSimulationStore } from "@/store/simulationStore";
import { formatSimTime } from "@/lib/utils";
import { AutoLogoutTimer } from "@/components/layout/AutoLogoutTimer";

export function TopBar() {
  const { hospitalState } = useSimulationStore();
  const simTime = hospitalState?.sim_time ?? 0;

  return (
    <div className="flex items-center gap-3 text-[13px] text-muted">
      <span className="mono">{formatSimTime(simTime)}</span>
      <span>·</span>
      <AutoLogoutTimer />
    </div>
  );
}