import { clsx, type ClassValue } from "clsx";

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

export function riskLabel(score: number): string {
  if (score >= 0.75) return "CRITICAL";
  if (score >= 0.5) return "HIGH";
  if (score >= 0.25) return "MODERATE";
  return "LOW";
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
