"use client";
import { useMemo, useState, useEffect } from "react";
import { useSimulationStore } from "@/store/simulationStore";
import { departmentLabel, cn } from "@/lib/utils";
import { useTypewriter } from "@/hooks/useTypewriter";

function buildDepartmentRows(departments) {
  if (!departments) return [];
  return ["er", "icu", "imaging", "ward", "labs"]
    .filter((k) => departments[k])
    .map((k) => {
      const d = departments[k];
      return {
        key: k,
        name: departmentLabel(k),
        occupied: d.capacity - d.beds_available,
        capacity: d.capacity,
        status: d.status,
      };
    });
}

export default function CommandCenterPage() {
  const { hospitalState } = useSimulationStore();
  const metrics = hospitalState?.metrics;
  const simTime = hospitalState?.sim_time ?? 0;

  const departmentRows = useMemo(
    () => buildDepartmentRows(hospitalState?.departments),
    [hospitalState?.departments],
  );

  const sortedAlerts = useMemo(() => {
    const alerts = hospitalState?.alerts ?? [];
    return [...alerts].reverse().slice(0, 4);
  }, [hospitalState?.alerts]);

  const topAlertMessage =
    sortedAlerts[0]?.message ?? "Waiting for live hospital data...";
  const { displayed: topAlertText, done: topAlertDone } = useTypewriter(
    topAlertMessage,
    22,
  );

  const bedOccupancy = metrics ? Math.round(metrics.bed_utilization * 100) : 0;
  const erWaitMinutes = metrics ? Math.round(metrics.avg_wait_time) : 0;
  const staffOnDuty = metrics ? Math.round(metrics.staff_utilization * 100) : 0;
  const activeAlerts = hospitalState?.alerts?.length ?? 0;

  return (
    <div>
      <div data-tour="cc-metrics" className="grid grid-cols-4 gap-6 mb-10">
        <div>
          <div className="text-[12px] uppercase tracking-wide text-muted mb-2">
            Bed occupancy
          </div>
          <div className="mono text-[26px] font-medium">{bedOccupancy}%</div>
        </div>
        <div>
          <div className="text-[12px] uppercase tracking-wide text-muted mb-2">
            ER wait
          </div>
          <div className="mono text-[26px] font-medium">
            {erWaitMinutes}{" "}
            <span className="text-[14px] text-muted">min</span>
          </div>
        </div>
        <div>
          <div className="text-[12px] uppercase tracking-wide text-muted mb-2">
            Staff on duty
          </div>
          <div className="mono text-[26px] font-medium">{staffOnDuty}%</div>
        </div>
        <div>
          <div className="text-[12px] uppercase tracking-wide text-muted mb-2">
            Active alerts
          </div>
          <div className="mono text-[26px] font-medium">{activeAlerts}</div>
        </div>
      </div>

      <h2 className="text-[14px] font-medium mb-3">Departments</h2>
      <div data-tour="cc-departments" className="mb-10">
        {departmentRows.map((d) => (
          <div
            key={d.key}
            className="flex items-center justify-between py-3 border-b border-line text-[14px]"
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full inline-block",
                  d.status === "critical"
                    ? "bg-status-critical"
                    : d.status === "warning"
                      ? "bg-status-flagged"
                      : "bg-faint",
                )}
              />
              {d.name}
            </div>
            <span className="mono text-muted">
              {d.occupied} / {d.capacity}
            </span>
          </div>
        ))}
        {departmentRows.length === 0 && (
          <div className="text-[13px] text-muted py-3">
            Waiting for department data...
          </div>
        )}
      </div>

      <h2 className="text-[14px] font-medium mb-3">Alerts</h2>
      <div data-tour="cc-alerts">
        {sortedAlerts.length === 0 ? (
          <div className="flex items-center gap-2 py-2.5 pl-3 border-l-2 border-ink text-[14px]">
            <span>{topAlertText}</span>
            {!topAlertDone && (
              <span className="inline-block h-[13px] w-[2px] bg-ink animate-pulse align-middle" />
            )}
          </div>
        ) : (
          sortedAlerts.map((alert, i) => {
            const minutesAgo = Math.max(0, Math.round(simTime - alert.timestamp));
            const isTop = i === 0;
            return (
              <div
                key={alert.alert_id}
                className={cn(
                  "flex items-center justify-between gap-4 py-2.5 pl-3 border-l-2",
                  isTop ? "border-ink" : "border-line",
                  i < sortedAlerts.length - 1 && "border-b border-line",
                )}
              >
                <span className={cn("text-[14px]", isTop ? "text-ink" : "text-muted")}>
                  {isTop ? topAlertText : alert.message}
                  {isTop && !topAlertDone && (
                    <span className="ml-[1px] inline-block h-[13px] w-[2px] bg-ink animate-pulse align-middle" />
                  )}
                </span>
                <span className="mono text-[13px] text-muted whitespace-nowrap">
                  {minutesAgo} min ago
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}