/* Shift handoff report — auto-generated summary for outgoing charge nurse to hand to incoming shift. */
"use client";
import { useEffect } from "react";
import { useSimulationStore } from "@/store/simulationStore";
import { useDemoStore } from "@/store/demoStore";
import { formatTime, formatPercent, riskLabel } from "@/lib/utils";
import {
  ClipboardList,
  Printer,
  AlertTriangle,
  Users,
  Bed,
  Activity,
  Flame,
  Anchor,
} from "lucide-react";
import { StatusBadge, type ClinicalStatus } from "@/components/ui/StatusBadge";
import { PrivacyMask } from "@/components/ui/PrivacyMask";

/**
 * Returns the current real-world date and time formatted as a short human-readable string.
 * @returns A string like "Mon, Jun 3, 02:45 PM" using the en-US locale.
 * Called from: ShiftReportPage to display the report generation timestamp.
 */
function now() {
  return new Date().toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Maps a department status string to the dual-channel ClinicalStatus used by StatusBadge.
 * @param status - A department status: "healthy", "warning", or "critical".
 * @returns A ClinicalStatus: "safe", "flagged", or "critical".
 * Called from: ShiftReportPage department status rows.
 */
function toClinicalStatus(status: string): ClinicalStatus {
  if (status === "critical") return "critical";
  if (status === "warning") return "flagged";
  return "safe";
}

/**
 * Maps a patient risk score to the dual-channel ClinicalStatus used by StatusBadge.
 * @param score - A decimal from 0 to 1 representing the patient's risk level.
 * @returns A ClinicalStatus: "critical" for high risk, "flagged" for moderate, "safe" otherwise.
 * Called from: ShiftReportPage top-risk patient rows.
 */
function riskToClinicalStatus(score: number): ClinicalStatus {
  if (score >= 0.75) return "critical";
  if (score >= 0.5) return "flagged";
  return "safe";
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
    }
  }, [pendingAction]);
  const m = hospitalState?.metrics;
  const depts = hospitalState?.departments ?? {};
  const patients = hospitalState?.patients ?? [];

  const generatedAt = now();
  const generatedBy = "clinician";

  const totalActive = m?.active_patients ?? patients.length;
  const sev = m?.severity_counts ?? {
    critical: patients.filter((p) => p.severity === "critical").length,
    high: patients.filter((p) => p.severity === "high").length,
    medium: patients.filter((p) => p.severity === "medium").length,
    low: patients.filter((p) => p.severity === "low").length,
  };

  const boardingCount =
    m?.boarding_count ?? patients.filter((p) => p.boarding).length;
  const deterioratingCount =
    m?.deteriorating_count ??
    patients.filter((p) => p.deterioration_alert).length;
  const sepsisCount =
    m?.sepsis_count ?? patients.filter((p) => p.sepsis_risk).length;

  const boarding = patients.filter((p) => p.boarding);
  const topRisk = [...patients]
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 5);

  const priorities: string[] = [];
  if ((m?.diversion_risk ?? 0) > 0.75)
    priorities.push("DIVERSION RISK — notify EMS coordinator immediately");
  if (boardingCount > 2)
    priorities.push(
      `${boardingCount} boarding patients — expedite ICU/Ward bed assignments`,
    );
  if (deterioratingCount > 0)
    priorities.push(
      `${deterioratingCount} patients deteriorating in queue — escalate triage`,
    );
  if (sepsisCount > 0)
    priorities.push(
      `${sepsisCount} sepsis-risk patients — initiate bundle protocols`,
    );
  if ((m?.icu_utilization ?? 0) > 0.88)
    priorities.push("ICU near capacity — identify transfer candidates");
  if ((m?.sla_compliance ?? 1) < 0.7)
    priorities.push("SLA compliance below 70% — increase triage throughput");
  if (priorities.length === 0)
    priorities.push("No critical issues — maintain current staffing ratios");

  return (
    <div className="flex flex-col h-full overflow-auto p-6 gap-6 bg-clinical-canvas">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <ClipboardList className="w-8 h-8 text-slate-600" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Shift Handoff Report
            </h1>
            <p className="text-sm text-slate-600 mt-2">
              Saved at {generatedAt} by {generatedBy} · Auto-generated
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-slate-600 border border-clinical-border bg-clinical-surface hover:bg-slate-100 transition-colors min-h-11"
        >
          <Printer className="w-4 h-4" /> Print Report
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="flex flex-col gap-4 col-span-2">
          <Section
            title="Patient Census"
            icon={<Users className="w-4 h-4 text-slate-600" />}
          >
            <div className="grid grid-cols-5 gap-4">
              <StatBox
                label="Total Active"
                value={String(totalActive)}
                tone="neutral"
              />
              <StatBox
                label="Critical"
                value={String(sev.critical)}
                tone="critical"
              />
              <StatBox label="High" value={String(sev.high)} tone="flagged" />
              <StatBox
                label="Medium"
                value={String(sev.medium)}
                tone="flagged"
              />
              <StatBox label="Low" value={String(sev.low)} tone="safe" />
            </div>
            <div className="grid grid-cols-4 gap-4 mt-4">
              <StatBox
                label="Boarding"
                value={String(boardingCount)}
                tone="flagged"
              />
              <StatBox
                label="Deteriorating"
                value={String(deterioratingCount)}
                tone="critical"
              />
              <StatBox
                label="Sepsis Risk"
                value={String(sepsisCount)}
                tone="critical"
              />
              <StatBox
                label="SLA Compliant"
                value={m ? formatPercent(m.sla_compliance ?? 0) : "--"}
                tone={(m?.sla_compliance ?? 1) < 0.7 ? "critical" : "safe"}
              />
            </div>
          </Section>

          <Section
            title="Top 5 Highest-Risk Patients"
            icon={<AlertTriangle className="w-4 h-4 text-slate-600" />}
          >
            <div className="space-y-2">
              {topRisk.map((p) => (
                <div
                  key={p.patient_id}
                  className="flex items-center gap-4 p-4 rounded-lg border border-clinical-border bg-clinical-surface"
                >
                  <StatusBadge
                    status={riskToClinicalStatus(p.risk_score)}
                    label={riskLabel(p.risk_score)}
                    className="flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 flex items-center gap-2 flex-wrap">
                      <PrivacyMask
                        value={p.name}
                        label="Patient name"
                        fieldId={`toprisk-name-${p.patient_id}`}
                      />
                      {p.deterioration_alert && (
                        <span className="text-xs font-medium px-2 py-1 rounded border border-red-200 bg-red-50 text-red-700">
                          DETERIORATING
                        </span>
                      )}
                      {p.sepsis_risk && (
                        <span className="text-xs font-medium px-2 py-1 rounded border border-red-200 bg-red-50 text-red-700">
                          SEPSIS RISK
                        </span>
                      )}
                      {p.boarding && (
                        <span className="text-xs font-medium px-2 py-1 rounded border border-amber-200 bg-amber-50 text-amber-700">
                          BOARDING
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 mt-2">
                      Age {p.age} · {p.chief_complaint} ·{" "}
                      {p.state.replace(/_/g, " ")}
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 font-mono w-16 text-right">
                    Wait {formatTime(p.total_wait_time)}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {boarding.length > 0 && (
            <Section
              title={`Boarding Patients (${boarding.length})`}
              icon={<Anchor className="w-4 h-4 text-slate-600" />}
            >
              <div className="space-y-2">
                {boarding.map((p) => (
                  <div
                    key={p.patient_id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-amber-200 bg-amber-50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 flex items-center gap-2">
                        <PrivacyMask
                          value={p.name}
                          label="Patient name"
                          fieldId={`boarding-name-${p.patient_id}`}
                        />
                        <PrivacyMask
                          value={`#${p.patient_id}`}
                          label="Patient MRN"
                          fieldId={`boarding-mrn-${p.patient_id}`}
                        />
                      </div>
                      <div className="text-xs text-slate-600 mt-2">
                        {p.severity.toUpperCase()} · {p.chief_complaint}
                      </div>
                    </div>
                    <div className="text-xs font-medium text-amber-700">
                      Waiting {p.state.replace("waiting_", "").toUpperCase()}{" "}
                      bed
                    </div>
                    <div className="text-sm font-bold font-mono text-amber-700">
                      {formatTime(p.total_wait_time)}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Section
            title="Department Status"
            icon={<Bed className="w-4 h-4 text-slate-600" />}
          >
            {["er", "icu", "ward", "labs", "imaging"].map((key) => {
              const d = (depts as any)[key];
              if (!d) return null;
              return (
                <div
                  key={key}
                  className="flex items-center gap-4 py-2 border-b border-clinical-border last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900">
                      {d.display_name}
                    </div>
                    <div className="text-xs text-slate-600 font-mono">
                      {d.current_patients}/{d.capacity} beds · Q:
                      {d.queue_length}
                    </div>
                  </div>
                  <StatusBadge
                    status={toClinicalStatus(d.status)}
                    label={formatPercent(d.occupancy)}
                  />
                  {d.burnout_risk && (
                    <Flame className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </Section>

          <Section
            title="Key Metrics"
            icon={<Activity className="w-4 h-4 text-slate-600" />}
          >
            {m &&
              [
                [
                  "Avg Wait",
                  formatTime(m.avg_wait_time),
                  m.avg_wait_time > 120,
                ],
                [
                  "Bed Util",
                  formatPercent(m.bed_utilization),
                  m.bed_utilization > 0.9,
                ],
                [
                  "ICU Util",
                  formatPercent(m.icu_utilization),
                  m.icu_utilization > 0.9,
                ],
                ["Throughput", `${m.throughput_per_hour.toFixed(1)}/hr`, false],
                [
                  "Diversion",
                  `${((m.diversion_risk ?? 0) * 100).toFixed(0)}%`,
                  (m.diversion_risk ?? 0) > 0.75,
                ],
                [
                  "Cost/hr",
                  `$${(m.delay_cost_per_hour ?? 0).toLocaleString()}`,
                  false,
                ],
              ].map(([label, val, alert]) => (
                <div
                  key={label as string}
                  className="flex justify-between items-center py-2 border-b border-clinical-border last:border-0"
                >
                  <span className="text-xs text-slate-600 font-medium">
                    {label as string}
                  </span>
                  <span
                    className={
                      "text-sm font-bold font-mono " +
                      (alert ? "text-red-600" : "text-slate-900")
                    }
                  >
                    {val as string}
                  </span>
                </div>
              ))}
          </Section>

          <Section
            title="Incoming Shift Priorities"
            icon={<AlertTriangle className="w-4 h-4 text-slate-600" />}
          >
            <div className="space-y-2">
              {priorities.map((p, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-xs text-slate-900"
                >
                  <span className="text-slate-600 flex-shrink-0 mt-0.5 font-mono">
                    {i + 1}.
                  </span>
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
function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-clinical-border bg-clinical-surface rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-slate-600 uppercase tracking-wider">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

type StatTone = "neutral" | "safe" | "flagged" | "critical";

/**
 * Renders a compact centered stat box with a small uppercase label and a large bold value.
 * @param label - A short descriptive label shown above the value (e.g. "Critical", "Boarding").
 * @param value - The number or string to display prominently in the center of the box.
 * @param tone - A clinical tone controlling the value color and border tint.
 * @returns A styled stat tile for use in the Patient Census grid.
 * Called from: ShiftReportPage's Patient Census section.
 */
function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: StatTone;
}) {
  const toneClass = {
    neutral: "border-clinical-border text-slate-900",
    safe: "border-emerald-200 text-emerald-700",
    flagged: "border-amber-200 text-amber-700",
    critical: "border-red-200 text-red-700",
  }[tone];
  return (
    <div
      className={
        "rounded-lg p-4 text-center border bg-clinical-surface " + toneClass
      }
    >
      <div className="text-xs text-slate-600 font-medium uppercase mb-2">
        {label}
      </div>
      <div className="text-lg font-bold font-mono">{value}</div>
    </div>
  );
}
