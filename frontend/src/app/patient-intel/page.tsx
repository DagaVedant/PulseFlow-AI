"use client";
import { useState, useCallback, useEffect } from "react";
import {
  Users,
  AlertTriangle,
  Clock,
  Zap,
  RefreshCw,
  Stethoscope,
  ArrowRight,
  ShieldAlert,
  TrendingUp,
  CheckCircle2,
  Ban,
} from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";
import { useDemoStore } from "@/store/demoStore";
import { PrivacyMask } from "@/components/ui/PrivacyMask";
import { StatusBadge, type ClinicalStatus } from "@/components/ui/StatusBadge";
import type { TrackedPatient } from "@/types";

const PRIORITY_LABEL: Record<string, string> = {
  critical: "CRITICAL",
  high: "HIGH",
  moderate: "MODERATE",
  low: "LOW",
};

function priorityStatus(priority: string): ClinicalStatus {
  if (priority === "critical") return "critical";
  if (priority === "low") return "safe";
  return "flagged";
}

function riskColor(pct: number): string {
  if (pct >= 80) return "text-status-critical";
  if (pct >= 25) return "text-status-flagged";
  return "text-status-safe";
}

function riskBarColor(pct: number): string {
  if (pct >= 80) return "bg-status-critical";
  if (pct >= 25) return "bg-status-flagged";
  return "bg-status-safe";
}

function specialistStatusStyle(status: string): { status: ClinicalStatus; label: string } {
  if (status === "available") return { status: "safe", label: "AVAILABLE" };
  if (status === "in_surgery") return { status: "critical", label: "IN SURGERY" };
  return { status: "flagged", label: "BUSY" };
}

export default function PatientIntelPage() {
  const { hospitalState } = useSimulationStore();
  const patients = hospitalState?.care?.tracked_patients ?? [];

  const [analyzed, setAnalyzed] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    setAnalyzed(false);
    setAnalyzing(false);
  }, []);

  const analyzeAll = useCallback(async () => {
    if (patients.length === 0) return;
    setAnalyzing(true);
    await new Promise((r) => setTimeout(r, 1100));
    setAnalyzed(true);
    setAnalyzing(false);
  }, [patients.length]);

  const { pendingAction, clearAction } = useDemoStore();
  useEffect(() => {
    if (pendingAction === "analyze_patients" && patients.length > 0) {
      clearAction();
      analyzeAll();
    }
  }, [pendingAction]); // eslint-disable-line react-hooks/exhaustive-deps

  const highRisk = patients.filter((p) => p.risk_pct >= 80).length;

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-[18px] font-medium text-ink flex items-center gap-2">
            <Users className="w-5 h-5 text-muted" aria-hidden="true" />
            Patient intelligence
          </h1>
          <p className="text-sm text-muted mt-2">
            Tracked high-acuity patients · specialist-await status · constraint-aware AI recommendations
          </p>
        </div>
        <div className="flex items-center gap-4">
          {highRisk > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-status-critical" aria-hidden="true" />
              <span className="text-sm font-medium text-status-critical">{highRisk} HIGH RISK</span>
            </div>
          )}
          <button
            onClick={analyzeAll}
            disabled={analyzing || patients.length === 0}
            className={
              "flex items-center gap-2 min-h-11 px-4 rounded-lg text-sm font-medium border transition-colors disabled:opacity-60 " +
              (analyzed
                ? "border-status-safe text-status-safe"
                : "border-line text-ink hover:bg-elevated")
            }
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" /> Analyzing...
              </>
            ) : analyzed ? (
              <>
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Analysis complete
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" aria-hidden="true" /> Analyze all {patients.length}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {patients.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-muted text-sm">
            Loading patient data...
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6 items-start">
            {patients.map((p) => (
              <TrackedCard key={p.patient_id} patient={p} analyzing={analyzing} analyzed={analyzed} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TrackedCard({
  patient: p,
  analyzing,
  analyzed,
}: {
  patient: TrackedPatient;
  analyzing: boolean;
  analyzed: boolean;
}) {
  const sp = p.specialist;
  const rec = p.recommendation;

  return (
    <div className="flex flex-col border border-line rounded-lg p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="text-lg font-medium text-ink leading-tight">
            <PrivacyMask value={p.name} label="Patient name" fieldId={`patient-name-${p.patient_id}`} />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted mt-1">
            <span className="font-medium">MRN</span>
            <PrivacyMask value={p.patient_id} label="Patient MRN" fieldId={`patient-mrn-${p.patient_id}`} />
            <span>· Age {p.age}</span>
          </div>
        </div>
        <StatusBadge status={priorityStatus(p.priority)} label={PRIORITY_LABEL[p.priority] ?? "MODERATE"} className="flex-shrink-0" />
      </div>

      <div className="text-base font-medium text-ink mb-4">{p.condition}</div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="border border-line rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3 h-3 text-muted" aria-hidden="true" />
            <span className="text-xs text-muted font-medium uppercase">ED wait</span>
          </div>
          <div className={"mono text-lg font-medium " + (p.over_target ? "text-status-critical" : "text-ink")}>
            {p.ed_wait_min}m
          </div>
          <div className={"text-xs mt-1 " + (p.over_target ? "text-status-critical" : "text-muted")}>
            {p.over_target ? `+${p.over_target_min}m over target` : `target ${p.target_window_min}m`}
          </div>
        </div>

        <div className="border border-line rounded-lg p-4">
          <div className="text-xs text-muted font-medium uppercase mb-2">Risk</div>
          <div className={"mono text-lg font-medium " + riskColor(p.risk_pct)}>{p.risk_pct}%</div>
          <div className="mt-2 h-1 rounded-full bg-elevated overflow-hidden">
            <div className={"h-full rounded-full " + riskBarColor(p.risk_pct)} style={{ width: `${p.risk_pct}%` }} />
          </div>
        </div>

        <div className="border border-line rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Stethoscope className="w-3 h-3 text-muted" aria-hidden="true" />
            <span className="text-xs text-muted font-medium uppercase">Awaiting</span>
          </div>
          <div className="mono text-sm font-medium text-ink leading-tight">{p.awaiting_specialty}</div>
          <div className="text-xs mt-1 text-muted truncate">{p.preferred_role}</div>
        </div>
      </div>

      {sp && (
        <div className="flex items-center justify-between border border-line rounded-lg p-4 mb-4">
          <div className="min-w-0 flex-1">
            <div className="text-sm text-ink truncate">{sp.name}</div>
            <div className="text-xs text-muted truncate">{sp.current_assignment}</div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <StatusBadge status={specialistStatusStyle(sp.status).status} label={specialistStatusStyle(sp.status).label} />
            <span className={"text-sm font-medium mono " + (sp.available_in_min === 0 ? "text-status-safe" : "text-status-flagged")}>
              {sp.available_in_min === 0 ? "now" : `${sp.available_in_min}m`}
            </span>
          </div>
        </div>
      )}

      {analyzing ? (
        <div className="border border-line rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="w-4 h-4 text-muted animate-spin flex-shrink-0" aria-hidden="true" />
            <span className="text-xs font-medium text-muted uppercase">Analyzing...</span>
          </div>
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-2 rounded bg-elevated" style={{ width: `${90 - i * 18}%` }} />
            ))}
          </div>
        </div>
      ) : analyzed ? (
        <div className={"border rounded-lg p-4 mb-4 " + (rec.blocked ? "border-status-flagged" : "border-line")}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              {rec.blocked ? (
                <Ban className="w-4 h-4 text-status-flagged flex-shrink-0" aria-hidden="true" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-muted flex-shrink-0" aria-hidden="true" />
              )}
              <span className={"text-sm font-medium leading-tight truncate " + (rec.blocked ? "text-status-flagged" : "text-ink")}>
                {rec.title}
              </span>
            </div>
            <span className="flex items-center gap-2 text-xs font-medium text-status-safe flex-shrink-0">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> AI ANALYSIS
            </span>
          </div>
          <div className="space-y-2 mb-4">
            {rec.reasons.map((reason, i) => (
              <div key={i} className="flex items-start gap-2">
                <ArrowRight className="w-3 h-3 text-muted flex-shrink-0 mt-1" aria-hidden="true" />
                <span className="text-sm text-muted leading-relaxed">{reason}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-3 h-3 text-status-safe" aria-hidden="true" />
              <span className="mono text-xs font-medium text-status-safe">-{rec.deterioration_reduction}% risk</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-muted" aria-hidden="true" />
              <span className="mono text-xs font-medium text-ink">+{rec.throughput_improvement}% flow</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-line rounded-lg p-4 mb-4 flex items-center justify-center gap-2">
          <Zap className="w-4 h-4 text-muted" aria-hidden="true" />
          <span className="text-sm text-muted">Click Analyze All to generate AI care plan</span>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {p.pathway.map((step) => (
          <span key={step} className="text-xs px-2 py-1 rounded text-muted font-medium border border-line">
            {step}
          </span>
        ))}
      </div>
    </div>
  );
}