/* Shared TypeScript type definitions for hospital state, patients, departments, metrics, and events. */
export type Severity = "low" | "medium" | "high" | "critical";
export type PatientState =
  | "arriving" | "triage" | "waiting_er" | "in_er"
  | "waiting_labs" | "in_labs" | "waiting_imaging" | "in_imaging"
  | "waiting_icu" | "in_icu" | "waiting_ward" | "in_ward"
  | "waiting_discharge" | "discharged";

export type DepartmentKey = "er" | "labs" | "imaging" | "icu" | "ward" | "discharge";
export type DepartmentStatus = "healthy" | "warning" | "critical";
export type AlertSeverity = "info" | "warning" | "critical";

export interface PatientPathway {
  needs_labs: boolean;
  needs_imaging: boolean;
  needs_icu: boolean;
  needs_ward: boolean;
  imaging_type: "xray" | "ct" | "mri";
}

export interface Patient {
  patient_id: string;
  name: string;
  age: number;
  arrival_time: number;
  severity: Severity;
  state: PatientState;
  current_department: DepartmentKey | "registration" | "triage";
  chief_complaint: string;
  risk_score: number;
  total_wait_time: number;
  pathway: PatientPathway;
  timing: {
    triage_start?: number;
    er_start?: number;
    labs_start?: number;
    imaging_start?: number;
    icu_start?: number;
    ward_start?: number;
    discharge_time?: number;
  };
}

export interface DepartmentState {
  name: string;
  display_name: string;
  occupancy: number;
  queue_length: number;
  avg_wait_time: number;
  current_patients: number;
  capacity: number;
  beds_available: number;
  status: DepartmentStatus;
  patients_in: string[];
  patients_queued: string[];
  resource_utilization: number;
}

export interface HospitalMetrics {
  sim_time: number;
  avg_wait_time: number;
  active_patients: number;
  discharged_today: number;
  total_admitted: number;
  throughput_per_hour: number;
  bed_utilization: number;
  icu_utilization: number;
  er_utilization: number;
  ward_utilization: number;
  staff_utilization: number;
  critical_patients: number;
  mortality_risk_index: number;
  alerts_active: number;
}

export interface HospitalAlert {
  alert_id: string;
  severity: AlertSeverity;
  department: string;
  message: string;
  timestamp: number;
}

export interface PatientFlow {
  registration_to_er: number;
  er_to_labs: number;
  er_to_imaging: number;
  er_to_icu: number;
  er_to_ward: number;
  er_to_discharge: number;
  labs_to_imaging: number;
  labs_to_ward: number;
  imaging_to_icu: number;
  imaging_to_ward: number;
  icu_to_ward: number;
  ward_to_discharge: number;
}

export interface SimulationConfig {
  arrival_rate: number;
  flu_outbreak: boolean;
  ct_failure: boolean;
  mri_failure: boolean;
  lab_slowdown: boolean;
  mass_casualty: boolean;
  heatwave: boolean;
  covid_surge: boolean;
}

export interface HospitalState {
  type?: string;
  sim_time: number;
  real_timestamp: number;
  departments: Record<DepartmentKey, DepartmentState>;
  patients: Patient[];
  metrics: HospitalMetrics;
  alerts: HospitalAlert[];
  flow: PatientFlow;
  config: SimulationConfig;
}

export interface MetricsSnapshot {
  sim_time: number;
  avg_wait_time: number;
  active_patients: number;
  throughput_per_hour: number;
  bed_utilization: number;
  icu_utilization: number;
  er_utilization: number;
  staff_utilization: number;
  critical_patients: number;
}

export interface ForecastSeries {
  horizon_minutes: number;
  department: string;
  metric: string;
  timestamps: number[];
  values: number[];
  lower_bound: number[];
  upper_bound: number[];
  trend: "increasing" | "decreasing" | "stable";
  severity: "normal" | "warning" | "critical";
  predicted_peak: number | null;
  predicted_peak_time: number | null;
  confidence: number;
}

export interface BottleneckPrediction {
  department: string;
  dept_key: DepartmentKey;
  metric: string;
  current_value: number;
  threshold: number;
  predicted_breach: number;
  eta_minutes: number;
  confidence: number;
  severity: "info" | "warning" | "critical";
  queue_length: number;
  trend_direction: "increasing" | "stable";
}

export interface StaffingRecommendation {
  department: string;
  resource_type: string;
  current: number;
  recommended: number;
  delta: number;
  impact_score: number;
  reason: string;
  urgency: "low" | "medium" | "high" | "critical";
}

export interface OptimizationResult {
  objective_value: number;
  recommendations: StaffingRecommendation[];
  predicted_wait_reduction: number;
  predicted_throughput_increase: number;
  predicted_utilization_improvement: number;
  bottleneck_department: string;
  bottleneck_metric: string;
  bottleneck_severity: string;
  root_causes: string[];
  intervention_plan: string[];
  confidence: number;
  solver: string;
  ai_narrative?: {
    narrative: string;
    model: string;
    predicted_outcomes: {
      wait_reduction: number;
      throughput_increase: number;
      utilization_improvement: number;
    };
  };
}

export interface CopilotAnalysis {
  explanation: {
    explanation: string;
    model: string;
    generated: boolean;
    bottleneck_department: string;
    severity: string;
  };
  optimization: OptimizationResult;
  bottleneck_predictions: BottleneckPrediction[];
  forecast_summary: Record<string, ForecastSeries>;
}

export type EventType =
  | "flu_outbreak" | "ct_failure" | "mri_failure" | "lab_slowdown"
  | "mass_casualty" | "heatwave" | "covid_surge" | "staff_shortage"
  | "clear_event";

export interface SandboxConfig {
  arrival_rate: number;
  er_beds: number;
  er_doctors: number;
  er_nurses: number;
  lab_technicians: number;
  lab_analyzers: number;
  imaging_ct: number;
  imaging_mri: number;
  icu_beds: number;
  icu_doctors: number;
  icu_nurses: number;
  ward_beds: number;
  ward_doctors: number;
  ward_nurses: number;
  active_events: EventType[];
}

export interface ComparisonMetrics {
  baseline: Partial<HospitalMetrics>;
  optimized: Partial<HospitalMetrics>;
  improvements: Record<string, number>;
}
