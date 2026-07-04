// Mock data for PulseFlow AI - Clinical page.
// Frontend-only, mirrors the command center mock structure.

export const clinicalStats = {
  monitored: 180,
  highAcuity: 30,
  deteriorating: 12,
  sepsisRisk: 4,
};

export const watchList = [
  {
    name: "M. Brown",
    dept: "Emergency",
    risk: "0.87",
    tone: "coral",
    trend: "up",
    selected: true,
  },
  {
    name: "J. Diaz",
    dept: "Emergency",
    risk: "0.72",
    tone: "amber",
    trend: "up",
  },
  {
    name: "R. Chen",
    dept: "Imaging",
    risk: "0.64",
    tone: "amber",
    trend: "up",
  },
  { name: "L. Ortiz", dept: "ICU", risk: "0.58", tone: "muted", trend: "flat" },
  {
    name: "S. Park",
    dept: "General ward",
    risk: "0.31",
    tone: "green",
    trend: "down",
  },
];

export const patientDetail = {
  name: "M. Brown",
  meta: "Emergency · 67y · MRN ••••4821",
  risk: "0.87",
  vitals: [
    { label: "Heart rate", value: "118", unit: "bpm", tone: "coral" },
    { label: "Blood pressure", value: "90/58", unit: "", tone: "amber" },
    { label: "SpO2", value: "91", unit: "%", tone: "coral" },
    { label: "Temp", value: "38.9", unit: "°C", tone: "amber" },
  ],
  recommendation: "Escalate to ICU · start sepsis bundle",
};

export const feedMessages = [
  "M. Brown SpO2 dropped to 91%, care team notified",
  "New sepsis flag raised in ER",
  "R. Chen risk score rising, imaging pending",
  "L. Ortiz vitals stabilizing in ICU",
  "Ward discharge cleared for S. Park",
];
