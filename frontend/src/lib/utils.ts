import { clsx, type ClassValue } from "clsx";
import type { DepartmentStatus, Severity } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatTime(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatSimTime(minutes: number): string {
  const totalHours = Math.floor(minutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const mins = Math.floor(minutes % 60);
  if (days > 0)
    return `Day ${days + 1} ${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

export function formatPercent(value: number, decimals = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function statusColor(status: DepartmentStatus): string {
  return (
    {
      healthy: "#059669",
      warning: "#D97706",
      critical: "#DC2626",
    }[status] ?? "#475569"
  );
}

export function statusBg(status: DepartmentStatus): string {
  return (
    {
      healthy: "#ECFDF5",
      warning: "#FFFBEB",
      critical: "#FEF2F2",
    }[status] ?? "#F1F5F9"
  );
}

export function statusBorder(status: DepartmentStatus): string {
  return (
    {
      healthy: "#A7F3D0",
      warning: "#FDE68A",
      critical: "#FECACA",
    }[status] ?? "#CBD5E1"
  );
}

export function severityColor(severity: Severity): string {
  return (
    {
      low: "#059669",
      medium: "#D97706",
      high: "#EA580C",
      critical: "#DC2626",
    }[severity] ?? "#475569"
  );
}

export function severityBadgeClass(severity: Severity): string {
  return (
    {
      low: "bg-safe-soft text-safe-ink border border-safe-line",
      medium: "bg-flag-soft text-flag-ink border border-flag-line",
      high: "bg-flag-soft text-flag-ink border border-flag-line",
      critical: "bg-crit-soft text-crit-ink border border-crit-line",
    }[severity] ?? "bg-elevated text-ink border border-line"
  );
}

export function occupancyToStatus(occupancy: number): DepartmentStatus {
  if (occupancy >= 0.92) return "critical";
  if (occupancy >= 0.82) return "warning";
  return "healthy";
}

export function riskLabel(score: number): string {
  if (score >= 0.75) return "CRITICAL";
  if (score >= 0.5) return "HIGH";
  if (score >= 0.25) return "MODERATE";
  return "LOW";
}

export function riskColor(score: number): string {
  if (score >= 0.75) return "#DC2626";
  if (score >= 0.5) return "#D97706";
  if (score >= 0.25) return "#CA8A04";
  return "#059669";
}

export function departmentLabel(key: string): string {
  const labels: Record<string, string> = {
    er: "Emergency Dept",
    labs: "Laboratory",
    imaging: "Imaging",
    icu: "ICU",
    ward: "General Ward",
    discharge: "Discharge",
    registration: "Registration",
    triage: "Triage",
  };
  return labels[key] ?? key.toUpperCase();
}

export function clampPercent(value: number): number {
  return Math.min(1, Math.max(0, value));
}
