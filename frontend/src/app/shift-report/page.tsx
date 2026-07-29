"use client";
import { useEffect } from "react";
import { useSimulationStore } from "@/store/simulationStore";
import { useDemoStore } from "@/store/demoStore";
import { formatTime, formatPercent, riskLabel } from "@/lib/utils";
import { ClipboardList, Printer, AlertTriangle, Users, Bed, Activity, Flame, Anchor } from "lucide-react";
import { StatusBadge, type ClinicalStatus } from "@/components/ui/StatusBadge";
import { PrivacyMask } from "@/components/ui/PrivacyMask";

function now() {
  return new Date().toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toClinicalStatus(status: string): ClinicalStatus {
  if (status === "critical") return "critical";
  if (status === "warning") return "flagged";
  return "safe";
}

function riskToClinicalStatus(score: number): ClinicalStatus {
  if (score >= 0.75) return "critical";
  if (score >= 0.5) return "flagged";
  return "safe";
}

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

  const boardingCount = m?.boarding_count ?? patients.filter((p) => p.boarding).length;
  const deterioratingCount = m?.deteriorating_count ?? patients.filter((p) => p.deterioration_alert).length;
  const sepsisCount = m?.sepsis_count ?? patients.filter((p) => p.sepsis_risk).length;

  const boarding = patients.filter((p) => p.boarding);
  const topRisk = [...patients].sort((a, b) => b.risk_score - a.risk_score).slice(0, 5);

  const priorities: string[] = [];
  if ((m?.diversion_risk ?? 0) > 0.75) priorities.push("DIVERSION RISK — notify EMS coordinator immediately");
  if (boardingCount > 2) priorities.push(`${boardingCount} boarding patients — expedite ICU/Ward bed assignments`);
  if (deterioratingCount > 0) priorities.push(`${deterioratingCount} patients deteriorating in queue — escalate triage`);
  if (sepsisCount > 0) priorities.push(`${sepsisCount} sepsis-risk patients — initiate bundle protocols`);
  if ((m?.icu_utilization ?? 0) > 0.88) priorities.push("ICU near capacity — identify transfer candidates");
  if ((m?.sla_compliance ?? 1) < 0.7) priorities.push("SLA compliance below 70% — increase triage throughput");
  if (priorities.length === 0) priorities.push("No critical issues — maintain current staffing ratios");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <ClipboardList className="w-6 h-6 text-muted" />
          <div>
            <h1 className="text-[18px] font-medium text-ink">Shift handoff report</h1>
            <p className="text-sm text-muted mt-2">
              Saved at {generatedAt} by {generatedBy} · Auto-generated
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-muted border border-line hover:bg-elevated transition-colors min-h-11"
        >
          <Printer className="w-4 h-4" /> Print report
        </button>
      </div>

      <div data-tour="sr-report" className="grid grid-cols-3 gap-6">
        <div className="flex flex-col gap-4 col-span-2">
          <Section title="Patient census" icon={<Users className="w-4 h-4 text-muted" />}>
            <div className="grid grid-cols-5 gap-4">
              <StatBox label="Total active" value={String(totalActive)} tone="neutral" />
              <StatBox label="Critical" value={String(sev.critical)} tone="critical" />
              <StatBox label="High" value={String(sev.high)} tone="flagged" />
              <StatBox label="Medium" value={String(sev.medium)} tone="flagged" />
              <StatBox label="Low" value={String(sev.low)} tone="safe" />
            </div>
            <div className="grid grid-cols-4 gap-4 mt-4">
              <StatBox label="Boarding" value={String(boardingCount)} tone="flagged" />
              <StatBox label="Deteriorating" value={String(deterioratingCount)} tone="critical" />
              <StatBox label="Sepsis risk" value={String(sepsisCount)} tone="critical" />
              <StatBox
                label="SLA compliant"
                value={m ? formatPercent(m.sla_compliance ?? 0) : "--"}
                tone={(m?.sla_compliance ?? 1) < 0.7 ? "critical" : "safe"}
              />
            </div>
          </Section>

          <Section title="Top 5 highest-risk patients" icon={<AlertTriangle className="w-4 h-4 text-muted" />}>
            <div className="space-y-2">
              {topRisk.map((p) => (
                <div key={p.patient_id} className="flex items-center gap-4 p-4 rounded-lg border border-line">
                  <StatusBadge status={riskToClinicalStatus(p.risk_score)} label={riskLabel(p.risk_score)} className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink flex items-center gap-2 flex-wrap">
                      <PrivacyMask value={p.name} label="Patient name" fieldId={`toprisk-name-${p.patient_id}`} />
                      {p.deterioration_alert && <span className="text-xs font-medium text-status-critical">DETERIORATING</span>}
                      {p.sepsis_risk && <span className="text-xs font-medium text-status-critical">SEPSIS RISK</span>}
                      {p.boarding && <span className="text-xs font-medium text-status-flagged">BOARDING</span>}
                    </div>
                    <div className="text-xs text-muted mt-2">
                      Age {p.age} · {p.chief_complaint} · {p.state.replace(/_/g, " ")}
                    </div>
                  </div>
                  <div className="mono text-xs text-muted w-16 text-right">Wait {formatTime(p.total_wait_time)}</div>
                </div>
              ))}
            </div>
          </Section>

          {boarding.length > 0 && (
            <Section title={`Boarding patients (${boarding.length})`} icon={<Anchor className="w-4 h-4 text-muted" />}>
              <div className="space-y-2">
                {boarding.map((p) => (
                  <div key={p.patient_id} className="flex items-center gap-4 p-4 rounded-lg border border-status-flagged">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink flex items-center gap-2">
                        <PrivacyMask value={p.name} label="Patient name" fieldId={`boarding-name-${p.patient_id}`} />
                        <PrivacyMask value={`#${p.patient_id}`} label="Patient MRN" fieldId={`boarding-mrn-${p.patient_id}`} />
                      </div>
                      <div className="text-xs text-muted mt-2">{p.severity.toUpperCase()} · {p.chief_complaint}</div>
                    </div>
                    <div className="text-xs font-medium text-status-flagged">
                      Waiting {p.state.replace("waiting_", "").toUpperCase()} bed
                    </div>
                    <div className="mono text-sm font-medium text-status-flagged">{formatTime(p.total_wait_time)}</div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Section title="Department status" icon={<Bed className="w-4 h-4 text-muted" />}>
            {["er", "icu", "ward", "labs", "imaging"].map((key) => {
              const d = (depts as any)[key];
              if (!d) return null;
              return (
                <div key={key} className="flex items-center gap-4 py-2 border-b border-line last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink">{d.display_name}</div>
                    <div className="mono text-xs text-muted">
                      {d.current_patients}/{d.capacity} beds · Q:{d.queue_length}
                    </div>
                  </div>
                  <StatusBadge status={toClinicalStatus(d.status)} label={formatPercent(d.occupancy)} />
                  {d.burnout_risk && <Flame className="w-4 h-4 text-status-flagged flex-shrink-0" />}
                </div>
              );
            })}
          </Section>

          <Section title="Key metrics" icon={<Activity className="w-4 h-4 text-muted" />}>
            {m &&
              [
                ["Avg wait", formatTime(m.avg_wait_time), m.avg_wait_time > 120],
                ["Bed util", formatPercent(m.bed_utilization), m.bed_utilization > 0.9],
                ["ICU util", formatPercent(m.icu_utilization), m.icu_utilization > 0.9],
                ["Throughput", `${m.throughput_per_hour.toFixed(1)}/hr`, false],
                ["Diversion", `${((m.diversion_risk ?? 0) * 100).toFixed(0)}%`, (m.diversion_risk ?? 0) > 0.75],
                ["Cost/hr", `$${(m.delay_cost_per_hour ?? 0).toLocaleString()}`, false],
              ].map(([label, val, alert]) => (
                <div key={label as string} className="flex justify-between items-center py-2 border-b border-line last:border-0">
                  <span className="text-xs text-muted font-medium">{label as string}</span>
                  <span className={"mono text-sm font-medium " + (alert ? "text-status-critical" : "text-ink")}>{val as string}</span>
                </div>
              ))}
          </Section>

          <Section title="Incoming shift priorities" icon={<AlertTriangle className="w-4 h-4 text-muted" />}>
            <div className="space-y-2">
              {priorities.map((p, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-ink">
                  <span className="mono text-muted flex-shrink-0 mt-0.5">{i + 1}.</span>
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

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border border-line rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-muted uppercase tracking-wider">{title}</span>
      </div>
      {children}
    </div>
  );
}

type StatTone = "neutral" | "safe" | "flagged" | "critical";

function StatBox({ label, value, tone }: { label: string; value: string; tone: StatTone }) {
  const toneClass = {
    neutral: "border-line text-ink",
    safe: "border-status-safe text-status-safe",
    flagged: "border-status-flagged text-status-flagged",
    critical: "border-status-critical text-status-critical",
  }[tone];
  return (
    <div className={"rounded-lg p-4 text-center border " + toneClass}>
      <div className="text-xs text-muted font-medium uppercase mb-2">{label}</div>
      <div className="mono text-lg font-medium">{value}</div>
    </div>
  );
}