// Mock data for PulseFlow AI - Hospital Command Center
// This drives the live-updating dashboard (frontend only for now).

export const initialState = {
  activePatients: 180,
  critical: 30,
  avgWait: 4, // hours
  icuUtil: 10, // %
  bedUtil: 34, // %
  throughput: 0.0, // /hr
  diversion: 23, // %
  costPerHr: 4900,
  sla: 10, // %
  hospitalScore: 26,
  scoreLabel: "critical",
  erQueue: 8,
  ambulances: 3,
};

export const floorPlan = [
  { name: "Emergency", cells: ["green", "green", "amber", "muted"] },
  { name: "Laboratory", cells: ["green", "muted"] },
  { name: "ICU", cells: ["orange", "amber", "green"] },
  { name: "General ward", cells: ["green", "green"] },
];

export const departments = [
  { name: "Emergency", value: 35, tone: "green" },
  { name: "Laboratory", value: 100, tone: "red" },
  { name: "Imaging", value: 71, tone: "amber" },
  { name: "ICU", value: 15, tone: "green" },
];

export const alertPatient = {
  type: "DETERIORATION",
  name: "M. Brown",
};

export const feedMessages = [
  "Hospital-wide avg wait time updated",
  "ICU utilization recalculated",
  "Ambulance #3 dispatched to ER",
  "Lab throughput at capacity",
  "Bed availability synced",
  "Deterioration alert: M. Brown",
];

export const clampTime = () => {
  // Returns a live-ish HH:MM string starting near 09:05
  const base = new Date();
  const h = String(9 + (Math.floor(base.getSeconds() / 30) % 1)).padStart(
    2,
    "0",
  );
  const m = String((5 + base.getSeconds()) % 60).padStart(2, "0");
  return `${h}:${m}`;
};
