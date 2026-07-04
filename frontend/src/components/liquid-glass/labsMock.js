// Mock data for PulseFlow AI - Labs page.
// Frontend-only, mirrors the command center mock structure.

export const labStats = {
  pending: 28,
  inProgress: 14,
  resultedToday: 312,
  avgTat: "42m",
};

export const analyzers = [
  { name: "Chemistry", detail: "18 in queue", pct: 92, tone: "coral" },
  { name: "Hematology", detail: "9 in queue", pct: 68, tone: "amber" },
  { name: "Coagulation", detail: "4 in queue", pct: 40, tone: "green" },
  { name: "Microbiology", detail: "2 in queue", pct: 25, tone: "green" },
];

export const statQueue = [
  {
    test: "Troponin",
    location: "ER-4",
    wait: "overdue 8m",
    tone: "coral",
    overdue: true,
  },
  { test: "Lactate", location: "ICU-2", wait: "5m", tone: "amber" },
  { test: "Blood gas", location: "ER-1", wait: "3m", tone: "amber" },
  { test: "CBC", location: "Ward W-C", wait: "2m", tone: "green" },
];

export const feedMessages = [
  "Troponin for ER-4 overdue 8m, escalated",
  "Chemistry analyzer at 92% capacity",
  "Reagent restock completed for Hematology",
  "312 results released today",
  "Microbiology cultures cleared",
];
