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

    setConnected: (connected) =>
      set((state) => {
        state.isConnected = connected;
        if (connected) state.connectionError = null;
      }),

    setConnectionError: (error) =>
      set((state) => {
        state.connectionError = error;
        state.isConnected = false;
      }),

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

    setSelectedDepartment: (dept) =>
      set((state) => {
        state.selectedDepartment = dept;
      }),

    setSelectedPatient: (id) =>
      set((state) => {
        state.selectedPatientId = id;
      }),

    setLatestOptimization: (result) =>
      set((state) => {
        state.latestOptimization = result;
      }),

    setCopilotAnalysis: (analysis) =>
      set((state) => {
        state.copilotAnalysis = analysis;
      }),

    setIsOptimizing: (v) =>
      set((state) => {
        state.isOptimizing = v;
      }),

    addMetricsSnapshot: (snap) =>
      set((state) => {
        state.metricsHistory = [
          ...state.metricsHistory.slice(-(MAX_HISTORY - 1)),
          snap,
        ];
      }),
  }))
);
