"use client";
import { useEffect, useState } from "react";
import { HelpCircle } from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";
import { useTourStore } from "@/components/tutorial/GuidedTour";
import { formatSimTime, cn } from "@/lib/utils";

const SESSION_SECONDS = 15 * 60;

function AutoLogoutTimer() {
  const [remaining, setRemaining] = useState(SESSION_SECONDS);

  useEffect(() => {
    const reset = () => setRemaining(SESSION_SECONDS);
    const events = ["mousedown", "keydown", "touchstart"];
    events.forEach((event) => window.addEventListener(event, reset));
    const interval = setInterval(() => {
      setRemaining((current) => Math.max(0, current - 1));
    }, 1000);
    return () => {
      events.forEach((event) => window.removeEventListener(event, reset));
      clearInterval(interval);
    };
  }, []);

  const minutes = Math.floor(remaining / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (remaining % 60).toString().padStart(2, "0");
  const expiringSoon = remaining <= 60;

  return (
    <span
      className={cn("mono", expiringSoon ? "text-status-critical" : "text-muted")}
      role="timer"
      aria-live="off"
    >
      {minutes}:{seconds}
    </span>
  );
}

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
