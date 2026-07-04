// Mock data for PulseFlow AI - AI insights page.
// Frontend-only, mirrors the command center mock structure.

export const aiStats = {
  bottlenecks: 3,
  optimizations: 2,
  confidence: 91,
  timeSaved: "2.4h",
};

export const forecast = [
  { name: "Imaging", event: "peak in 40m", pct: 85, tone: "coral" },
  { name: "ICU", event: "capacity in 2h", pct: 68, tone: "amber" },
  { name: "Emergency", event: "stable", pct: 42, tone: "green" },
  { name: "Laboratory", event: "clearing", pct: 30, tone: "green" },
];

export const optimizer = {
  confidence: 91,
  actions: ["Move 2 doctors ER → ICU", "Reroute non-urgent scans to CT-2"],
  projected: "projected −32m avg wait",
};

export const narrative =
  "Imaging is the binding constraint, two scanners saturate in ~40 min as ER outflow peaks. Shifting two ER physicians to ICU and diverting non-urgent scans clears the queue before it cascades to boarding.";

export const feedMessages = [
  "Optimizer re-ran, new plan raises hospital score +6",
  "Imaging bottleneck predicted, 40m out",
  "Reallocation plan awaiting approval",
  "Forecast confidence up to 91%",
  "ICU capacity trend flagged for 2h window",
];
