"use client";
import { useState } from "react";
import { CheckCircle2, AlertTriangle, OctagonAlert, Eye, EyeOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ClinicalStatus = "safe" | "flagged" | "critical";

const STATUS_CONFIG: Record<
  ClinicalStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  safe: { label: "Stable", icon: CheckCircle2, className: "text-status-safe" },
  flagged: { label: "Review", icon: AlertTriangle, className: "text-status-flagged" },
  critical: { label: "Critical", icon: OctagonAlert, className: "text-status-critical" },
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: ClinicalStatus;
  label?: string;
  className?: string;
}) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "mono inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide",
        config.className,
        className,
      )}
    >
      <span className="sr-only">Status:</span>
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      <span>{label ?? config.label}</span>
    </span>
  );
}

export function PrivacyMask({
  value,
  label,
  fieldId,
  className,
}: {
  value: string;
  label: string;
  fieldId: string;
  className?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span className={className}>
      <label htmlFor={fieldId} className="sr-only">
        {label}
      </label>
      <span className="inline-flex items-center gap-2">
        <span id={fieldId} className="mono text-ink" aria-live="polite">
          {revealed
            ? value
            : "•".repeat(Math.max(4, Math.min(value.length, 12)))}
        </span>
        <button
          type="button"
          onClick={() => setRevealed((current) => !current)}
          aria-pressed={revealed}
          aria-label={revealed ? `Hide ${label}` : `Reveal ${label}`}
          className="inline-flex items-center justify-center w-8 h-8 rounded text-muted hover:text-ink hover:bg-elevated"
        >
          {revealed ? (
            <EyeOff className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Eye className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </span>
    </span>
  );
}
