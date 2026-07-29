export interface TourStep {
  route: string;
  target: string | null;
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    route: "/command-center",
    target: null,
    title: "Welcome to PulseFlow AI",
    body: "A live hospital operating system for a charge nurse or bed manager. Patients move between departments in real time, and an AI copilot recommends staffing changes when things get tight. This walkthrough takes about a minute.",
  },
  {
    route: "/command-center",
    target: "cc-metrics",
    title: "Live hospital vitals",
    body: "Bed occupancy, ICU load, and the other top-line numbers update in real time over WebSocket as the simulated hospital runs, nothing on this page is static.",
  },
  {
    route: "/command-center",
    target: "cc-departments",
    title: "Department load",
    body: "Every department's current load and status at a glance, so you can see which one is closest to capacity before it becomes a problem.",
  },
  {
    route: "/command-center",
    target: "cc-alerts",
    title: "Alerts feed",
    body: "Anything that needs attention (a department going critical, a patient deteriorating) surfaces here first.",
  },
  {
    route: "/patient-intel",
    target: "pi-list",
    title: "Patient watchlist",
    body: "Instead of a 270-row table nobody would actually read, this surfaces a handful of patients spanning the risk spectrum, the ones worth a second look right now.",
  },
  {
    route: "/patient-intel",
    target: "pi-analyze",
    title: "AI care recommendations",
    body: "Runs each patient through a local LLM for a plain-English read on risk and next steps, computed live against current sim state, not canned.",
  },
  {
    route: "/operations",
    target: "ops-stats",
    title: "Specialist availability",
    body: "How many specialists are free right now versus on a case. This is one of the hard constraints the optimizer has to work within.",
  },
  {
    route: "/operations",
    target: "ops-specialists",
    title: "Operational constraints",
    body: "Take specialists offline or add scheduling constraints here, and the copilot's next recommendation has to respect them, it can't just wish the problem away.",
  },
  {
    route: "/copilot",
    target: "cp-radar",
    title: "System health radar",
    body: "A snapshot of where the hospital is under strain across departments. This is the signal the optimizer is reacting to.",
  },
  {
    route: "/copilot",
    target: "cp-run",
    title: "Run the optimizer",
    body: "Solves staff reallocation with OR-Tools linear programming under real constraints (safe minimum coverage, staffing budget, ICU pressure weighted 3x), then an LLM explains the result in plain English. If the LLM is unavailable, you still get the same underlying decision with fallback text.",
  },
  {
    route: "/sandbox",
    target: "sb-controls",
    title: "Stress-test the hospital",
    body: "Stack crisis events (a flu outbreak, a CT scanner failure) and see how the simulation and the optimizer respond in combination, not just in isolation.",
  },
  {
    route: "/shift-report",
    target: "sr-report",
    title: "Auto-generated handoff report",
    body: "A shift-change summary generated straight from live sim state (census, risk, priorities), the kind of report a charge nurse would actually hand off.",
  },
  {
    route: "/shift-report",
    target: null,
    title: "That's the tour",
    body: "Explore on your own from here, or replay this walkthrough any time from the help icon in the top bar.",
  },
];