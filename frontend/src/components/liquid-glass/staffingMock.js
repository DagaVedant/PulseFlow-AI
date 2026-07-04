// Mock data for PulseFlow AI - Staffing page.
// Frontend-only, mirrors the command center mock structure.

export const staffStats = {
  onShift: 48,
  doctors: 16,
  nurses: 32,
  coverage: 86,
  overtime: "7h",
  openShifts: 3,
  burnoutRisk: 4,
};

export const deptCoverage = [
  { name: "Emergency", staffed: 8, needed: 10, pct: 80, tone: "amber" },
  { name: "ICU", staffed: 6, needed: 6, pct: 100, tone: "green" },
  { name: "Imaging", staffed: 2, needed: 4, pct: 50, tone: "coral" },
  { name: "General ward", staffed: 7, needed: 8, pct: 88, tone: "green" },
  { name: "Laboratory", staffed: 4, needed: 5, pct: 80, tone: "amber" },
];

export const suggestion = {
  move: "2 nurses · ER → Imaging",
  impact: "clears Imaging bottleneck, +14% flow",
};

export const onCall = [
  {
    initials: "DK",
    name: "Dr. Kaur",
    role: "Cardiology",
    status: "green",
    color: "linear-gradient(135deg,#10b981,#059669)",
  },
  {
    initials: "MP",
    name: "Dr. Patel",
    role: "Radiology",
    status: "amber",
    color: "linear-gradient(135deg,#60a5fa,#2563eb)",
  },
  {
    initials: "SR",
    name: "Nurse Ramos",
    role: "ICU float",
    status: "green",
    color: "linear-gradient(135deg,#f472b6,#db2777)",
  },
];

export const feedMessages = [
  "Imaging understaffed 2, reallocation pending approval",
  "Overtime threshold reached for 4 staff",
  "ICU fully covered for next shift",
  "On-call radiologist paged",
  "Night shift roster confirmed",
];
