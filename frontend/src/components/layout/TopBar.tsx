"use client";
import { HelpCircle } from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";
import { useTourStore } from "@/store/tourStore";
import { formatSimTime } from "@/lib/utils";
import { AutoLogoutTimer } from "@/components/layout/AutoLogoutTimer";

export function TopBar() {
  const { hospitalState } = useSimulationStore();
  const simTime = hospitalState?.sim_time ?? 0;

  return (
    <div className="flex items-center gap-3 text-[13px] text-muted flex-shrink-0 whitespace-nowrap">
      <button
        type="button"
        onClick={() => useTourStore.getState().start()}
        aria-label="Take the tour"
        title="Take the tour"
        className="text-muted hover:text-ink transition-colors"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      <span>·</span>
      <span className="mono">{formatSimTime(simTime)}</span>
      <span>·</span>
      <AutoLogoutTimer />
    </div>
  );
}