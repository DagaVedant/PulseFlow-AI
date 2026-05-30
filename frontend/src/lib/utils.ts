/* Shared formatting and styling helpers: time, percentages, status colors, and class-name merging. */
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
  if (days > 0) return `Day ${days + 1} ${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

export function formatPercent(value: number, decimals = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function statusColor(status: DepartmentStatus): string {
  return {
    healthy: "#00ff88",
    warning: "#ffaa00",
    critical: "#ff3b3b",
  }[status] ?? "#3b82f6";
}

export function statusBg(status: DepartmentStatus): string {
  return {
    healthy: "rgba(0,255,136,0.08)",
    warning: "rgba(255,170,0,0.08)",
    critical: "rgba(255,59,59,0.12)",
  }[status] ?? "rgba(59,130,246,0.08)";
}

export function statusBorder(status: DepartmentStatus): string {
  return {
    healthy: "rgba(0,255,136,0.3)",
    warning: "rgba(255,170,0,0.3)",
    critical: "rgba(255,59,59,0.4)",
  }[status] ?? "rgba(59,130,246,0.3)";
}

export function severityColor(severity: Severity): string {
  return {
    low: "#22c55e",
    medium: "#f59e0b",
    high: "#ef4444",
    critical: "#dc2626",
  }[severity] ?? "#6b7280";
}

export function severityBadgeClass(severity: Severity): string {
  return {
    low: "bg-green-900/40 text-green-400 border border-green-800/50",
    medium: "bg-yellow-900/40 text-yellow-400 border border-yellow-800/50",
    high: "bg-red-900/40 text-red-400 border border-red-800/50",
    critical: "bg-red-950/60 text-red-300 border border-red-700/60",
  }[severity] ?? "bg-gray-900/40 text-gray-400";
}

export function occupancyToStatus(occupancy: number): DepartmentStatus {
  if (occupancy >= 0.92) return "critical";
  if (occupancy >= 0.82) return "warning";
  return "healthy";
}

export function riskLabel(score: number): string {
  if (score >= 0.75) return "CRITICAL";
  if (score >= 0.50) return "HIGH";
  if (score >= 0.25) return "MODERATE";
  return "LOW";
}

export function riskColor(score: number): string {
  if (score >= 0.75) return "#dc2626";
  if (score >= 0.50) return "#ef4444";
  if (score >= 0.25) return "#f59e0b";
  return "#22c55e";
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
