// Mock data for PulseFlow AI - Patient Flow page.
// Frontend-only, mirrors the command center mock structure.

export const stations = [
  { name: "Triage", count: 12, load: 45, tone: "amber" },
  { name: "ER", count: 34, load: 85, tone: "red" },
  { name: "Imaging", count: 6, load: 71, tone: "coral", bottleneck: true },
  { name: "ICU · Ward", count: 20, load: 40, tone: "green" },
];

export const rates = ["8/hr", "5/hr", "3/hr", "4/hr"];

export const dischargeCount = 9;

export const flowStats = {
  avgTransit: "2h 40m",
  inTransit: 72,
  bottleneck: "Imaging",
};

export const waitByStage = [
  { label: "Triage → ER", value: "18m", pct: 35, tone: "amber" },
  { label: "ER → Imaging", value: "54m", pct: 92, tone: "coral" },
  { label: "Imaging → ICU", value: "31m", pct: 58, tone: "amber" },
  { label: "Ward → Discharge", value: "12m", pct: 22, tone: "green" },
];

export const stalled = {
  label: "Awaiting scan",
  name: "R. Chen",
  wait: "54m",
  moreOverSla: 3,
};

export const feedMessages = [
  "Imaging queue up 2, rerouting non-urgent to CT-2",
  "ER intake spike detected",
  "Ward discharge cleared 3 beds",
  "Transit time trending down",
  "Triage staffing rebalanced",
];
