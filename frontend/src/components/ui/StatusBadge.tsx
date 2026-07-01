import { CheckCircle2, AlertTriangle, OctagonAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ClinicalStatus = "safe" | "flagged" | "critical";

const STATUS_CONFIG: Record<
  ClinicalStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  safe: {
    label: "Stable",
    icon: CheckCircle2,
    className: "bg-safe-soft border-safe-line text-safe-ink",
  },
  flagged: {
    label: "Review",
    icon: AlertTriangle,
    className: "bg-flag-soft border-flag-line text-flag-ink",
  },
  critical: {
    label: "Critical",
    icon: OctagonAlert,
    className: "bg-crit-soft border-crit-line text-crit-ink",
  },
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
        "inline-flex items-center gap-2 border rounded px-2 py-1 text-xs font-bold uppercase tracking-wide",
        config.className,
        className,
      )}
    >
      <span className="sr-only">Status:</span>
      <Icon className="w-4 h-4" aria-hidden="true" />
      <span>{label ?? config.label}</span>
    </span>
  );
}
