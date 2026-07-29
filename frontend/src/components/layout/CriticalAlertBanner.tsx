"use client";
import { OctagonAlert } from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";

export function CriticalAlertBanner() {
  const { criticalAlerts } = useSimulationStore();
  if (criticalAlerts.length === 0) return null;

  const latest = criticalAlerts[criticalAlerts.length - 1];

  return (
    <div
      role="alert"
      className="flex items-center gap-3 flex-shrink-0 border-b border-line px-8 py-2"
    >
      <OctagonAlert
        className="w-4 h-4 text-status-critical flex-shrink-0"
        aria-hidden="true"
      />
      <span className="text-[11px] font-medium uppercase tracking-wide text-status-critical">
        {criticalAlerts.length} Critical{" "}
        {criticalAlerts.length === 1 ? "Alert" : "Alerts"}
      </span>
      <span className="text-[13px] text-muted truncate">
        {latest.department.toUpperCase()}: {latest.message}
      </span>
    </div>
  );
}