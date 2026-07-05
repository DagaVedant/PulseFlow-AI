import { CheckCircle2, AlertTriangle, OctagonAlert } from "lucide-react";
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