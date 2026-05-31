/* Shift handoff report — auto-generated summary for outgoing charge nurse to hand to incoming shift. */
"use client";
import { useEffect } from "react";
import { useSimulationStore } from "@/store/simulationStore";
import { useDemoStore } from "@/store/demoStore";
import { formatTime, formatPercent, statusColor, riskColor, riskLabel } from "@/lib/utils";
import { motion } from "framer-motion";
import { ClipboardList, Printer, AlertTriangle, Users, Bed, Activity, Flame, Anchor } from "lucide-react";

/**
 * Returns the current real-world date and time formatted as a short human-readable string.
 * @returns A string like "Mon, Jun 3, 02:45 PM" using the en-US locale.
 * Called from: ShiftReportPage to display the report generation timestamp.
 */
function now() {
  return new Date().toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/**
 * The Shift Handoff Report page, which auto-generates a summary for the outgoing charge nurse.
 * Shows patient census by severity, top-5 highest-risk patients, boarding patients,
 * department status, key metrics, and a prioritized action list for the incoming shift.
 * Includes a Print button and responds to the demo store "print_preview" action.
 * @returns A scrollable full-page report layout.
 * Called from: Next.js router at the /shift-report route.
 */
export default function ShiftReportPage() {
  const { hospitalState } = useSimulationStore();
  const { pendingAction, clearAction } = useDemoStore();

  useEffect(() => {
    if (pendingAction === "print_preview") {
      clearAction();
      window.print();
    }
  }, [pendingAction]);
  const m = hospitalState?.metrics;
  const depts = hospitalState?.departments ?? {};
  const patients = hospitalState?.patients ?? [];
  const alerts = hospitalState?.alerts ?? [];

  const totalActive = m?.active_patients ?? patients.length;
  const sev = m?.severity_counts ?? {
    critical: patients.filter(p => p.severity === "critical").length,
    high:     patients.filter(p => p.severity === "high").length,
    medium:   patients.filter(p => p.severity === "medium").length,
    low:      patients.filter(p => p.severity === "low").length,
  };

  const boardingCount      = m?.boarding_count ?? patients.filter(p => p.boarding).length;
  const deterioratingCount = m?.deteriorating_count ?? patients.filter(p => p.deterioration_alert).length;
  const sepsisCount        = m?.sepsis_count ?? patients.filter(p => p.sepsis_risk).length;

  const boarding = patients.filter(p => p.boarding);
  const topRisk = [...patients].sort((a, b) => b.risk_score - a.risk_score).slice(0, 5);

  const priorities: string[] = [];
  if ((m?.diversion_risk ?? 0) > 0.75) priorities.push("⚠ DIVERSION RISK — notify EMS coordinator immediately");
  if (boardingCount > 2)               priorities.push(`${boardingCount} boarding patients — expedite ICU/Ward bed assignments`);
  if (deterioratingCount > 0)          priorities.push(`${deterioratingCount} patients deteriorating in queue — escalate triage`);
  if (sepsisCount > 0)                 priorities.push(`${sepsisCount} sepsis-risk patients — initiate bundle protocols`);
  if ((m?.icu_utilization ?? 0) > 0.88) priorities.push("ICU near capacity — identify transfer candidates");
  if ((m?.sla_compliance ?? 1) < 0.70) priorities.push("SLA compliance below 70% — increase triage throughput");
  if (priorities.length === 0)         priorities.push("No critical issues — maintain current staffing ratios");

  return (
    <div className="flex flex-col h-full overflow-auto p-6 gap-5">

      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-7 h-7 text-blue-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Shift Handoff Report</h1>
            <p className="text-sm text-slate-500 font-mono mt-0.5">{now()} · Auto-generated</p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-mono text-slate-300"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <Printer className="w-4 h-4" /> Print Report
        </button>
      </div>

      <div className="grid grid-cols-3 gap-5">

        <div className="flex flex-col gap-4 col-span-2">

          <Section title="Patient Census" icon={<Users className="w-4 h-4 text-blue-400" />}>
            <div className="grid grid-cols-5 gap-3">
              <StatBox label="Total Active" value={String(totalActive)} color="#60a5fa" />
              <StatBox label="Critical"  value={String(sev.critical)} color="#ef4444" />
              <StatBox label="High"      value={String(sev.high)}     color="#f59e0b" />
              <StatBox label="Medium"    value={String(sev.medium)}   color="#fbbf24" />
              <StatBox label="Low"       value={String(sev.low)}      color="#10b981" />
            </div>
            <div className="grid grid-cols-4 gap-3 mt-3">
              <StatBox label="Boarding"      value={String(boardingCount)}       color="#f59e0b" />
              <StatBox label="Deteriorating" value={String(deterioratingCount)}  color="#ef4444" />
              <StatBox label="Sepsis Risk"   value={String(sepsisCount)}         color="#ef4444" />
              <StatBox label="SLA Compliant" value={m ? formatPercent(m.sla_compliance ?? 0) : "--"} color={(m?.sla_compliance ?? 1) < 0.7 ? "#ef4444" : "#10b981"} />
            </div>
          </Section>

          <Section title="Top 5 Highest-Risk Patients" icon={<AlertTriangle className="w-4 h-4 text-red-400" />}>
            <div className="space-y-2">
              {topRisk.map((p) => (
                <motion.div
                  key={p.patient_id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-4 p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: riskColor(p.risk_score), boxShadow: `0 0 6px ${riskColor(p.risk_score)}` }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white flex items-center gap-2">
                      {p.name}
                      {p.deterioration_alert && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-950/60 text-red-400 font-mono">DETERIORATING</span>}
                      {p.sepsis_risk && <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-950/60 text-orange-400 font-mono">SEPSIS RISK</span>}
                      {p.boarding && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 font-mono">BOARDING</span>}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      Age {p.age} · {p.chief_complaint} · {p.state.replace(/_/g, " ")}
                    </div>
                  </div>
                  <div className="text-sm font-bold font-mono" style={{ color: riskColor(p.risk_score) }}>
                    {riskLabel(p.risk_score)}
                  </div>
                  <div className="text-xs text-slate-500 font-mono w-16 text-right">
                    Wait {formatTime(p.total_wait_time)}
                  </div>
                </motion.div>
              ))}
            </div>
          </Section>

          {boarding.length > 0 && (
            <Section title={`Boarding Patients (${boarding.length})`} icon={<Anchor className="w-4 h-4 text-orange-400" />}>
              <div className="space-y-2">
                {boarding.map((p) => (
                  <div key={p.patient_id} className="flex items-center gap-4 p-3 rounded-xl"
                    style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.2)" }}>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white">{p.name} <span className="text-slate-500 font-normal text-xs">#{p.patient_id}</span></div>
                      <div className="text-xs text-slate-500 font-mono">{p.severity.toUpperCase()} · {p.chief_complaint}</div>
                    </div>
                    <div className="text-xs font-mono text-orange-400">
                      Waiting {p.state.replace("waiting_", "").toUpperCase()} bed
                    </div>
                    <div className="text-sm font-bold font-mono text-orange-300">
                      {formatTime(p.total_wait_time)}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        <div className="flex flex-col gap-4">

          <Section title="Department Status" icon={<Bed className="w-4 h-4 text-cyan-400" />}>
            {["er", "icu", "ward", "labs", "imaging"].map((key) => {
              const d = (depts as any)[key];
              if (!d) return null;
              const sc = statusColor(d.status);
              return (
                <div key={key} className="flex items-center gap-3 py-2 border-b border-slate-800/50 last:border-0">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sc }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-200">{d.display_name}</div>
                    <div className="text-[10px] text-slate-600 font-mono">
                      {d.current_patients}/{d.capacity} beds · Q:{d.queue_length}
                    </div>
                  </div>
                  <div className="text-xs font-bold font-mono" style={{ color: sc }}>
                    {formatPercent(d.occupancy)}
                  </div>
                  {d.burnout_risk && <Flame className="w-3 h-3 text-orange-400 flex-shrink-0" />}
                </div>
              );
            })}
          </Section>

          <Section title="Key Metrics" icon={<Activity className="w-4 h-4 text-blue-400" />}>
            {m && [
              ["Avg Wait",     formatTime(m.avg_wait_time),           m.avg_wait_time > 120 ? "#ef4444" : "#60a5fa"],
              ["Bed Util",     formatPercent(m.bed_utilization),       m.bed_utilization > 0.9 ? "#ef4444" : "#60a5fa"],
              ["ICU Util",     formatPercent(m.icu_utilization),       m.icu_utilization > 0.9 ? "#ef4444" : "#60a5fa"],
              ["Throughput",   `${m.throughput_per_hour.toFixed(1)}/hr`, "#60a5fa"],
              ["Diversion",    `${((m.diversion_risk ?? 0) * 100).toFixed(0)}%`, (m.diversion_risk ?? 0) > 0.75 ? "#ef4444" : "#10b981"],
              ["Cost/hr",      `$${(m.delay_cost_per_hour ?? 0).toLocaleString()}`, "#f59e0b"],
            ].map(([label, val, color]) => (
              <div key={label as string} className="flex justify-between items-center py-1.5 border-b border-slate-800/40 last:border-0">
                <span className="text-xs text-slate-500 font-mono">{label as string}</span>
                <span className="text-sm font-bold font-mono" style={{ color: color as string }}>{val as string}</span>
              </div>
            ))}
          </Section>

          <Section title="Incoming Shift Priorities" icon={<AlertTriangle className="w-4 h-4 text-yellow-400" />}>
            <div className="space-y-2">
              {priorities.map((p, i) => (
                <div key={i} className="flex items-start gap-2 text-xs font-mono text-slate-300">
                  <span className="text-blue-400 flex-shrink-0 mt-0.5">{i + 1}.</span>
                  <span className="leading-relaxed">{p}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders a labeled card section with an icon, a title, and arbitrary child content.
 * Used throughout the shift report to visually group related information.
 * @param title - The heading text displayed next to the icon at the top of the section.
 * @param icon - A React node (typically a Lucide icon) displayed to the left of the title.
 * @param children - The content to render inside the section card.
 * @returns A styled rounded card wrapping the title row and children.
 * Called from: ShiftReportPage for every labeled section (Patient Census, Department Status, etc.).
 */
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "rgba(10,14,26,0.8)", border: "1px solid rgba(59,130,246,0.1)" }}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
      </div>
      {children}
    </div>
  );
}

/**
 * Renders a compact centered stat box with a small uppercase label and a large bold value.
 * @param label - A short descriptive label shown above the value (e.g. "Critical", "Boarding").
 * @param value - The number or string to display prominently in the center of the box.
 * @param color - A hex color string applied to both the border and the value text.
 * @returns A styled stat tile for use in the Patient Census grid.
 * Called from: ShiftReportPage's Patient Census section.
 */
function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${color}25` }}>
      <div className="text-[9px] text-slate-600 font-mono uppercase mb-1">{label}</div>
      <div className="text-xl font-bold font-mono" style={{ color }}>{value}</div>
    </div>
  );
}
