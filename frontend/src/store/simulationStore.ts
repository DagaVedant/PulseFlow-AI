/* Zustand store holding live hospital state, connection status, and the latest optimization result. */
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  HospitalState,
  Patient,
  HospitalAlert,
  MetricsSnapshot,
  DepartmentKey,
  OptimizationResult,
  CopilotAnalysis,
} from "@/types";

interface SimulationStore {

  isConnected: boolean;
  connectionError: string | null;
  lastUpdate: number;

  hospitalState: HospitalState | null;
  metricsHistory: MetricsSnapshot[];

  criticalAlerts: HospitalAlert[];
  highRiskPatients: Patient[];

  latestOptimization: OptimizationResult | null;
  copilotAnalysis: CopilotAnalysis | null;
  isOptimizing: boolean;

  selectedDepartment: DepartmentKey | null;
  selectedPatientId: string | null;

  setConnected: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;
  updateHospitalState: (state: HospitalState) => void;
  setSelectedDepartment: (dept: DepartmentKey | null) => void;
  setSelectedPatient: (id: string | null) => void;
  setLatestOptimization: (result: OptimizationResult) => void;
  setCopilotAnalysis: (analysis: CopilotAnalysis) => void;
  setIsOptimizing: (v: boolean) => void;
  addMetricsSnapshot: (snap: MetricsSnapshot) => void;
}

const MAX_HISTORY = 720;

/**
 * The global Zustand store that holds all live hospital simulation state and UI state.
 * Provides connection status, the latest hospital state broadcast, metrics history, alerts,
 * high-risk patients, optimization results, and selected department/patient IDs.
 * @returns The full SimulationStore object with state fields and action methods.
 * Called from: virtually every page and component in the app via useSimulationStore().
 */
export const useSimulationStore = create<SimulationStore>()(
  immer((set, get) => ({
    isConnected: false,
    connectionError: null,
    lastUpdate: 0,
    hospitalState: null,
    metricsHistory: [],
    criticalAlerts: [],
    highRiskPatients: [],
    latestOptimization: null,
    copilotAnalysis: null,
    isOptimizing: false,
    selectedDepartment: null,
    selectedPatientId: null,

    /**
     * Updates the WebSocket connection status in the store.
     * @param connected - true if the WebSocket is open and connected, false otherwise.
     * Called from: useWebSocket's ws.onopen and ws.onclose handlers.
     */
    setConnected: (connected) =>
      set((state) => {
        state.isConnected = connected;
        if (connected) state.connectionError = null;
      }),

    /**
     * Records a connection error message and marks the store as disconnected.
     * @param error - A human-readable error string to display, or null to clear the error.
     * Called from: useWebSocket's ws.onerror and reconnect-failure logic.
     */
    setConnectionError: (error) =>
      set((state) => {
        state.connectionError = error;
        state.isConnected = false;
      }),

    /**
     * Replaces the entire hospital state with a new snapshot received from the WebSocket.
     * Also derives and stores criticalAlerts, highRiskPatients, and a new MetricsSnapshot for history.
     * @param newState - The complete HospitalState object broadcast by the backend.
     * Called from: useWebSocket's ws.onmessage handler when data.type === "hospital_state".
     */
    updateHospitalState: (newState) =>
      set((state) => {
        state.hospitalState = newState;
        state.lastUpdate = Date.now();

        state.criticalAlerts = (newState.alerts || []).filter(
          (a) => a.severity === "critical"
        );

        state.highRiskPatients = (newState.patients || [])
          .filter((p) => p.risk_score > 0.65)
          .sort((a, b) => b.risk_score - a.risk_score)
          .slice(0, 10);

        if (newState.metrics) {
          const snap: MetricsSnapshot = {
            sim_time: newState.sim_time,
            avg_wait_time: newState.metrics.avg_wait_time,
            active_patients: newState.metrics.active_patients,
            throughput_per_hour: newState.metrics.throughput_per_hour,
            bed_utilization: newState.metrics.bed_utilization,
            icu_utilization: newState.metrics.icu_utilization,
            er_utilization: newState.metrics.er_utilization,
            staff_utilization: newState.metrics.staff_utilization,
            critical_patients: newState.metrics.critical_patients,
          };

          state.metricsHistory = [
            ...state.metricsHistory.slice(-(MAX_HISTORY - 1)),
            snap,
          ];
        }
      }),

    /**
     * Sets the currently selected department key so that detail panels can highlight it.
     * @param dept - A DepartmentKey like "er" or "icu", or null to deselect.
     * Called from: components that allow the user to click on a department.
     */
    setSelectedDepartment: (dept) =>
      set((state) => {
        state.selectedDepartment = dept;
      }),

    /**
     * Sets the currently selected patient ID so that detail panels can highlight that patient.
     * @param id - The patient_id string to select, or null to deselect.
     * Called from: components that allow the user to click on an individual patient.
     */
    setSelectedPatient: (id) =>
      set((state) => {
        state.selectedPatientId = id;
      }),

    /**
     * Stores the most recent optimization result from the backend or WebSocket.
     * @param result - The OptimizationResult object to save.
     * Called from: useWebSocket (on optimization_result message) and CopilotPage (on REST API response).
     */
    setLatestOptimization: (result) =>
      set((state) => {
        state.latestOptimization = result;
      }),

    /**
     * Stores the latest full AI Copilot analysis result.
     * @param analysis - The CopilotAnalysis object returned from the /ai/analysis endpoint.
     * Called from: CopilotPage after a successful analysis request.
     */
    setCopilotAnalysis: (analysis) =>
      set((state) => {
        state.copilotAnalysis = analysis;
      }),

    /**
     * Sets the isOptimizing flag to show or hide loading states during an optimization request.
     * @param v - true while an optimization request is in flight, false when it completes.
     * Called from: useSimulation's runOptimization function.
     */
    setIsOptimizing: (v) =>
      set((state) => {
        state.isOptimizing = v;
      }),

    /**
     * Appends a single MetricsSnapshot to the rolling history buffer, keeping at most MAX_HISTORY entries.
     * @param snap - The MetricsSnapshot to add to the end of the history array.
     * Called from: any component that wants to manually add a snapshot outside of updateHospitalState.
     */
    addMetricsSnapshot: (snap) =>
      set((state) => {
        state.metricsHistory = [
          ...state.metricsHistory.slice(-(MAX_HISTORY - 1)),
          snap,
        ];
      }),
  }))
);
