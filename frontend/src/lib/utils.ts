/* Shared formatting and styling helpers: time, percentages, status colors, and class-name merging. */
import { clsx, type ClassValue } from "clsx";
import type { DepartmentStatus, Severity } from "@/types";

/**
 * Merges multiple class name values into a single string, filtering out falsy values.
 * @param inputs - Any number of class name values (strings, arrays, objects, etc.)
 * @returns A single merged class name string.
 * Called from: nearly every component in the codebase for conditional className logic.
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Formats a duration given in minutes into a human-readable string like "45m" or "1h 30m".
 * @param minutes - The total number of minutes to format.
 * @returns A string like "45m" (under 1 hour) or "1h 30m" (1 hour or more).
 * Called from: MetricCard, HospitalFloorPlan tooltip, digital-twin page, copilot page, shift-report page.
 */
export function formatTime(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Formats a simulation time in minutes into a clock string like "Day 2 14:30" or "09:05".
 * @param minutes - The total simulated minutes elapsed since the simulation started.
 * @returns A string showing the current simulated day and time, e.g. "Day 3 08:45".
 * Called from: shift-report and any component that needs to display the simulation clock.
 */
export function formatSimTime(minutes: number): string {
  const totalHours = Math.floor(minutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const mins = Math.floor(minutes % 60);
  if (days > 0) return `Day ${days + 1} ${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

/**
 * Converts a decimal fraction (0–1) into a percentage string like "75%" or "82.3%".
 * @param value - A decimal number between 0 and 1 representing the fraction.
 * @param decimals - How many decimal places to show in the result (default 0).
 * @returns A percentage string, e.g. "75%" or "82.3%".
 * Called from: MetricCard, department status panels, copilot page, sandbox page.
 */
export function formatPercent(value: number, decimals = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Returns the primary hex color for a given department status level.
 * @param status - A department status: "healthy", "warning", or "critical".
 * @returns A hex color string — green for healthy, amber for warning, red for critical, blue for unknown.
 * Called from: HospitalFloorPlan, DepartmentNode, shift-report, and anywhere a status dot or line is colored.
 */
export function statusColor(status: DepartmentStatus): string {
  return {
    healthy: "#10b981",
    warning: "#f59e0b",
    critical: "#ef4444",
  }[status] ?? "#3b82f6";
}

/**
 * Returns a semi-transparent background color string for a given department status level.
 * @param status - A department status: "healthy", "warning", or "critical".
 * @returns An rgba color string suitable for use as a CSS background.
 * Called from: components that need a tinted background matching the status level.
 */
export function statusBg(status: DepartmentStatus): string {
  return {
    healthy: "rgba(16,185,129,0.08)",
    warning: "rgba(245,158,11,0.08)",
    critical: "rgba(239,68,68,0.10)",
  }[status] ?? "rgba(59,130,246,0.08)";
}

/**
 * Returns a semi-transparent border color string for a given department status level.
 * @param status - A department status: "healthy", "warning", or "critical".
 * @returns An rgba color string suitable for use as a CSS border color.
 * Called from: components that need a tinted border matching the status level.
 */
export function statusBorder(status: DepartmentStatus): string {
  return {
    healthy: "rgba(16,185,129,0.3)",
    warning: "rgba(245,158,11,0.3)",
    critical: "rgba(239,68,68,0.35)",
  }[status] ?? "rgba(59,130,246,0.3)";
}

/**
 * Returns the primary hex color for a patient's severity level.
 * @param severity - A patient severity level: "low", "medium", "high", or "critical".
 * @returns A hex color string — green, yellow, amber, or red respectively.
 * Called from: patient dot rendering on the floor plan and patient list components.
 */
export function severityColor(severity: Severity): string {
  return {
    low: "#34d399",
    medium: "#fbbf24",
    high: "#f59e0b",
    critical: "#ef4444",
  }[severity] ?? "#6b7280";
}

/**
 * Returns a Tailwind CSS class string for a colored badge that represents a patient severity level.
 * @param severity - A patient severity level: "low", "medium", "high", or "critical".
 * @returns A Tailwind class string with background, text color, and border styling.
 * Called from: patient badge UI elements throughout the app.
 */
export function severityBadgeClass(severity: Severity): string {
  return {
    low: "bg-green-900/40 text-green-400 border border-green-800/50",
    medium: "bg-yellow-900/40 text-yellow-300 border border-yellow-700/50",
    high: "bg-amber-900/40 text-amber-400 border border-amber-700/50",
    critical: "bg-red-950/60 text-red-400 border border-red-700/60",
  }[severity] ?? "bg-gray-900/40 text-gray-400";
}

/**
 * Converts a department occupancy ratio (0–1) into a status level string.
 * @param occupancy - A decimal from 0 to 1 where 1 means 100% full (e.g. 0.95 = 95% occupied).
 * @returns "critical" if occupancy >= 92%, "warning" if >= 82%, or "healthy" otherwise.
 * Called from: CommandCenterPage department status bars and HospitalFloorPlan.
 */
export function occupancyToStatus(occupancy: number): DepartmentStatus {
  if (occupancy >= 0.92) return "critical";
  if (occupancy >= 0.82) return "warning";
  return "healthy";
}

/**
 * Converts a patient risk score (0–1) into a human-readable label string.
 * @param score - A decimal from 0 to 1 representing how at-risk a patient is (1 = highest risk).
 * @returns One of "CRITICAL", "HIGH", "MODERATE", or "LOW".
 * Called from: shift-report page and patient risk display components.
 */
export function riskLabel(score: number): string {
  if (score >= 0.75) return "CRITICAL";
  if (score >= 0.50) return "HIGH";
  if (score >= 0.25) return "MODERATE";
  return "LOW";
}

/**
 * Returns a hex color for a patient risk score, ranging from green (low) to red (critical).
 * @param score - A decimal from 0 to 1 representing the patient's risk level.
 * @returns A hex color string — red for >= 0.75, amber for >= 0.50, yellow for >= 0.25, green otherwise.
 * Called from: shift-report page and patient intelligence page.
 */
export function riskColor(score: number): string {
  if (score >= 0.75) return "#ef4444";
  if (score >= 0.50) return "#f59e0b";
  if (score >= 0.25) return "#fbbf24";
  return "#34d399";
}

/**
 * Returns a readable display name for a department key string.
 * @param key - A short department identifier like "er", "icu", "labs", etc.
 * @returns A full display name like "Emergency Dept" or "Intensive Care Unit".
 * Called from: components that need to show a human-friendly department name.
 */
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

/**
 * Clamps a number to the range 0–1, ensuring it never goes below 0 or above 1.
 * @param value - The numeric value to clamp.
 * @returns The value clamped between 0 and 1 inclusive.
 * Called from: any place that needs to guarantee a fraction stays within bounds.
 */
export function clampPercent(value: number): number {
  return Math.min(1, Math.max(0, value));
}
