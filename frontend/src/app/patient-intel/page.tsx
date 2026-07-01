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
  if (pct >= 80) return "text-crit-ink";
  if (pct >= 25) return "text-flag-ink";
  return "text-safe-ink";
}

function riskBarColor(pct: number): string {
  if (pct >= 80) return "bg-red-600";
  if (pct >= 25) return "bg-amber-600";
  return "bg-emerald-600";
}

function specialistStatusStyle(status: string): {
  status: ClinicalStatus;
  label: string;
} {
  if (status === "available") return { status: "safe", label: "AVAILABLE" };
  if (status === "in_surgery")
    return { status: "critical", label: "IN SURGERY" };
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
    <div className="flex flex-col h-full p-6 gap-6 overflow-hidden font-sans bg-clinical-canvas">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-ink flex items-center gap-2">
            <Users className="w-6 h-6 text-muted" aria-hidden="true" />
            Patient Intelligence
          </h1>
          <p className="text-sm text-muted mt-2">
            Tracked high-acuity patients · specialist-await status ·
            constraint-aware AI recommendations
          </p>
        </div>
        <div className="flex items-center gap-4">
          {highRisk > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-crit-soft border border-crit-line">
              <AlertTriangle
                className="w-4 h-4 text-crit-ink"
                aria-hidden="true"
              />
              <span className="text-sm font-medium text-crit-ink">
                {highRisk} HIGH RISK
              </span>
            </div>
          )}
          <button
            onClick={analyzeAll}
            disabled={analyzing || patients.length === 0}
            className={
              "flex items-center gap-2 min-h-11 px-4 rounded-lg text-sm font-medium border transition-colors disabled:opacity-60 " +
              (analyzed
                ? "bg-safe-soft border-safe-line text-safe-ink"
                : "bg-clinical-surface border-clinical-border text-ink hover:bg-elevated")
            }
          >
            {analyzing ? (
              <>
                <RefreshCw
                  className="w-4 h-4 animate-spin"
                  aria-hidden="true"
                />{" "}
                Analyzing...
              </>
            ) : analyzed ? (
              <>
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Analysis
                Complete
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" aria-hidden="true" /> Analyze All{" "}
                {patients.length}
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
              <TrackedCard
                key={p.patient_id}
                patient={p}
                analyzing={analyzing}
                analyzed={analyzed}
              />
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
    <div className="flex flex-col border border-clinical-border bg-clinical-surface rounded-lg p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="text-lg font-bold text-ink leading-tight">
            <PrivacyMask
              value={p.name}
              label="Patient name"
              fieldId={`patient-name-${p.patient_id}`}
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted mt-1">
            <span className="font-medium">MRN</span>
            <PrivacyMask
              value={p.patient_id}
              label="Patient MRN"
              fieldId={`patient-mrn-${p.patient_id}`}
            />
            <span>· Age {p.age}</span>
          </div>
        </div>
        <StatusBadge
          status={priorityStatus(p.priority)}
          label={PRIORITY_LABEL[p.priority] ?? "MODERATE"}
          className="flex-shrink-0"
        />
      </div>

      <div className="text-base font-semibold text-ink mb-4">
        {p.condition}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="border border-clinical-border bg-clinical-surface rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3 h-3 text-muted" aria-hidden="true" />
            <span className="text-xs text-muted font-medium uppercase">
              ED Wait
            </span>
          </div>
          <div
            className={
              "text-lg font-bold font-mono " +
              (p.over_target ? "text-crit-ink" : "text-ink")
            }
          >
            {p.ed_wait_min}m
          </div>
          <div
            className={
              "text-xs mt-1 " +
              (p.over_target ? "text-crit-ink" : "text-muted")
            }
          >
            {p.over_target
              ? `+${p.over_target_min}m over target`
              : `target ${p.target_window_min}m`}
          </div>
        </div>

        <div className="border border-clinical-border bg-clinical-surface rounded-lg p-4">
          <div className="text-xs text-muted font-medium uppercase mb-2">
            Risk
          </div>
          <div
            className={"text-lg font-bold font-mono " + riskColor(p.risk_pct)}
          >
            {p.risk_pct}%
          </div>
          <div className="mt-2 h-1 rounded-full bg-elevated overflow-hidden">
            <div
              className={"h-full rounded-full " + riskBarColor(p.risk_pct)}
              style={{ width: `${p.risk_pct}%` }}
            />
          </div>
        </div>

        <div className="border border-clinical-border bg-clinical-surface rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Stethoscope
              className="w-3 h-3 text-muted"
              aria-hidden="true"
            />
            <span className="text-xs text-muted font-medium uppercase">
              Awaiting
            </span>
          </div>
          <div className="text-sm font-bold font-mono text-ink leading-tight">
            {p.awaiting_specialty}
          </div>
          <div className="text-xs mt-1 text-muted truncate">
            {p.preferred_role}
          </div>
        </div>
      </div>

      {sp && (
        <div className="flex items-center justify-between border border-clinical-border bg-clinical-surface rounded-lg p-4 mb-4">
          <div className="min-w-0 flex-1">
            <div className="text-sm text-ink truncate">{sp.name}</div>
            <div className="text-xs text-muted truncate">
              {sp.current_assignment}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <StatusBadge
              status={specialistStatusStyle(sp.status).status}
              label={specialistStatusStyle(sp.status).label}
            />
            <span
              className={
                "text-sm font-bold font-mono " +
                (sp.available_in_min === 0
                  ? "text-safe-ink"
                  : "text-flag-ink")
              }
            >
              {sp.available_in_min === 0 ? "now" : `${sp.available_in_min}m`}
            </span>
          </div>
        </div>
      )}

      {analyzing ? (
        <div className="border border-clinical-border bg-clinical-surface rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw
              className="w-4 h-4 text-muted animate-spin flex-shrink-0"
              aria-hidden="true"
            />
            <span className="text-xs font-medium text-muted uppercase">
              Analyzing...
            </span>
          </div>
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-2 rounded bg-elevated"
                style={{ width: `${90 - i * 18}%` }}
              />
            ))}
          </div>
        </div>
      ) : analyzed ? (
        <div
          className={
            "border rounded-lg p-4 mb-4 " +
            (rec.blocked
              ? "bg-flag-soft border-flag-line"
              : "border-clinical-border bg-clinical-surface")
          }
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              {rec.blocked ? (
                <Ban
                  className="w-4 h-4 text-flag-ink flex-shrink-0"
                  aria-hidden="true"
                />
              ) : (
                <ShieldAlert
                  className="w-4 h-4 text-muted flex-shrink-0"
                  aria-hidden="true"
                />
              )}
              <span
                className={
                  "text-sm font-bold leading-tight truncate " +
                  (rec.blocked ? "text-flag-ink" : "text-ink")
                }
              >
                {rec.title}
              </span>
            </div>
            <span className="flex items-center gap-2 text-xs font-medium px-2 py-1 rounded text-safe-ink bg-safe-soft border border-safe-line flex-shrink-0">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> AI
              ANALYSIS
            </span>
          </div>
          <div className="space-y-2 mb-4">
            {rec.reasons.map((reason, i) => (
              <div key={i} className="flex items-start gap-2">
                <ArrowRight
                  className="w-3 h-3 text-muted flex-shrink-0 mt-1"
                  aria-hidden="true"
                />
                <span className="text-sm text-muted leading-relaxed">
                  {reason}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-safe-soft border border-safe-line">
              <ShieldAlert
                className="w-3 h-3 text-safe-ink"
                aria-hidden="true"
              />
              <span className="text-xs font-medium font-mono text-safe-ink">
                -{rec.deterioration_reduction}% risk
              </span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-clinical-surface border border-clinical-border">
              <TrendingUp
                className="w-3 h-3 text-muted"
                aria-hidden="true"
              />
              <span className="text-xs font-medium font-mono text-ink">
                +{rec.throughput_improvement}% flow
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-clinical-border bg-clinical-surface rounded-lg p-4 mb-4 flex items-center justify-center gap-2">
          <Zap className="w-4 h-4 text-muted" aria-hidden="true" />
          <span className="text-sm text-muted">
            Click Analyze All to generate AI care plan
          </span>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {p.pathway.map((step) => (
          <span
            key={step}
            className="text-xs px-2 py-1 rounded bg-elevated text-muted font-medium border border-clinical-border"
          >
            {step}
          </span>
        ))}
      </div>
    </div>
  );
}
