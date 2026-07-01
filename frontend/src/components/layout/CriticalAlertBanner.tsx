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
      className="flex items-center gap-3 flex-shrink-0 border-b border-crit-line bg-crit-soft px-4 py-2"
    >
      <OctagonAlert
        className="w-5 h-5 text-crit-ink flex-shrink-0"
        aria-hidden="true"
      />
      <span className="text-xs font-bold uppercase tracking-wide text-crit-ink">
        {criticalAlerts.length} Critical{" "}
        {criticalAlerts.length === 1 ? "Alert" : "Alerts"}
      </span>
      <span className="text-sm text-crit-ink truncate">
        {latest.department.toUpperCase()} — {latest.message}
      </span>
    </div>
  );
}