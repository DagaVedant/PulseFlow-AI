"use client";
import { OctagonAlert } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { GuidedTour } from "@/components/tutorial/GuidedTour";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useSimulationStore } from "@/store/simulationStore";

function CriticalAlertBanner() {
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

export function AppShell({ children }: { children: React.ReactNode }) {
  useWebSocket();
  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
      <div className="flex items-center justify-between border-b border-line px-8 py-5">
        <Sidebar />
        <TopBar />
      </div>
      <CriticalAlertBanner />
      <main className="flex-1 overflow-auto px-8 py-8">{children}</main>
      <GuidedTour />
    </div>
  );
}
