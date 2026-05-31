/* REST API client for the backend, covering simulation control, hospital data, AI copilot, and care coordination. */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

async function fetchJSON<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export const api = {
  // ── Simulation control ──────────────────────────────────────────────────
  getState:         () => fetchJSON<any>("/simulation/state"),
  getMetricsHistory:(minutes = 60) => fetchJSON<any>(`/simulation/metrics/history?minutes=${minutes}`),
  triggerEvent:     (eventType: string, params?: object) =>
    fetchJSON<any>("/simulation/events/trigger", {
      method: "POST",
      body: JSON.stringify({ event_type: eventType, params: params || {} }),
    }),
  updateConfig: (config: object) =>
    fetchJSON<any>("/simulation/config/update", {
      method: "POST",
      body: JSON.stringify(config),
    }),
  getForecast:      (horizon = 60) => fetchJSON<any>(`/simulation/forecast?horizon_minutes=${horizon}`),
  resetSimulation:  () => fetchJSON<any>("/simulation/reset", { method: "POST" }),

  // ── Hospital data (patients + departments) ──────────────────────────────
  getPatients: (dept?: string, severity?: string) => {
    const params = new URLSearchParams();
    if (dept)     params.set("department", dept);
    if (severity) params.set("severity", severity);
    return fetchJSON<any>(`/hospital/patients?${params}`);
  },
  getPatient:        (id: string) => fetchJSON<any>(`/hospital/patients/${id}`),
  getPatientSummary: (id: string) => fetchJSON<any>(`/hospital/patients/${id}/summary`),
  getPatientStats:   ()           => fetchJSON<any>("/hospital/patients/stats"),
  getDepartments:    ()           => fetchJSON<any>("/hospital/departments"),
  getDepartment:     (id: string) => fetchJSON<any>(`/hospital/departments/${id}`),

  // ── AI copilot ───────────────────────────────────────────────────────────
  getCopilotAnalysis:      () => fetchJSON<any>("/ai/analysis"),
  runOptimization:         () => fetchJSON<any>("/ai/optimize"),
  getShiftReport:          () => fetchJSON<any>("/ai/shift-report"),
  getBottleneckPredictions:() => fetchJSON<any>("/ai/forecast/bottlenecks"),

  // ── Care coordination ────────────────────────────────────────────────────
  getCareState:           ()           => fetchJSON<any>("/ai/care/state"),
  getCareRecommendations: ()           => fetchJSON<any>("/ai/care/recommendations"),
  getSpecialists:         ()           => fetchJSON<any>("/ai/care/specialists"),
  getFixedBottlenecks:    ()           => fetchJSON<any>("/ai/care/bottlenecks"),
  addFixedBottleneck:     (bottleneck: object) =>
    fetchJSON<any>("/ai/care/bottlenecks", {
      method: "POST",
      body: JSON.stringify(bottleneck),
    }),
  removeFixedBottleneck: (id: string) =>
    fetchJSON<any>(`/ai/care/bottlenecks/${id}`, { method: "DELETE" }),
  getTrackedPatientSummary: (id: string) =>
    fetchJSON<any>(`/ai/care/patients/${id}/summary`),
};
