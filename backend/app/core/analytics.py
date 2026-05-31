"""
PulseFlow AI — Analytics Engine
Consolidated module covering four domains:
  FORECASTING    — Holt-Winters time-series forecasting with uncertainty intervals
  OPTIMIZATION   — OR-Tools / SciPy staffing and resource allocation
  AI NARRATIVE   — Ollama-powered local LLM explanations (graceful fallback)
  CARE COORDINATION — Specialist roster, fixed bottlenecks, tracked patients
"""
from __future__ import annotations

import asyncio
import logging
import math
import random
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np
from scipy import optimize as scipy_optimize
from scipy.signal import savgol_filter
from scipy.stats import norm, poisson

logger = logging.getLogger(__name__)

try:
    from ortools.linear_solver import pywraplp
    ORTOOLS_AVAILABLE = True
except ImportError:
    ORTOOLS_AVAILABLE = False
    logger.warning("OR-Tools not available — using SciPy fallback for optimization")

try:
    import ollama as _ollama
    OLLAMA_AVAILABLE = True
except ImportError:
    OLLAMA_AVAILABLE = False
    logger.warning("ollama package not installed — using fallback text responses")

import time as _time

# ─────────────────────────────────────────────────────────────────────────────
# FORECASTING
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class ForecastResult:
    horizon_minutes: int
    department: str
    metric: str
    timestamps: List[float]
    values: List[float]
    lower_bound: List[float]
    upper_bound: List[float]
    trend: str
    severity: str
    predicted_peak: Optional[float]
    predicted_peak_time: Optional[float]
    confidence: float

    def to_dict(self) -> dict:
        """
        Converts this ForecastResult into a plain dictionary so it can be serialized to JSON and sent over the API.

        Parameters:
            None — operates on the fields of the dataclass instance itself.

        Returns:
            A dictionary with all forecast fields rounded to a reasonable number of decimal places, ready for JSON serialization.

        Called from:
            Anywhere a ForecastResult needs to be included in an HTTP or WebSocket response (e.g., the /copilot/forecast API route).
        """
        return {
            "horizon_minutes": self.horizon_minutes,
            "department": self.department,
            "metric": self.metric,
            "timestamps": [round(t, 1) for t in self.timestamps],
            "values": [round(v, 2) for v in self.values],
            "lower_bound": [round(v, 2) for v in self.lower_bound],
            "upper_bound": [round(v, 2) for v in self.upper_bound],
            "trend": self.trend,
            "severity": self.severity,
            "predicted_peak": round(self.predicted_peak, 2) if self.predicted_peak else None,
            "predicted_peak_time": round(self.predicted_peak_time, 1) if self.predicted_peak_time else None,
            "confidence": round(self.confidence, 3),
        }


class HospitalForecaster:
    """Multi-horizon forecasting using Holt-Winters exponential smoothing."""

    HORIZONS = {"1h": 60, "3h": 180, "6h": 360, "24h": 1440}

    def forecast_all(self, metrics_history: List[dict], sim_time: float) -> Dict[str, ForecastResult]:
        """
        Runs all four time-horizon forecasts (1 h, 3 h, 6 h, 24 h) for every key hospital metric and returns them in one dictionary.

        Parameters:
            metrics_history: A list of past metric snapshots, each a dict containing keys like "avg_wait_time", "icu_utilization", "bed_utilization", and "er_utilization". Must have at least 5 entries or an empty dict is returned.
            sim_time: The current simulation time in minutes, used as the starting timestamp for forecast points.

        Returns:
            A dictionary whose keys are strings like "wait_time_1h" or "icu_utilization_3h" and whose values are ForecastResult objects. Returns an empty dict if there is not enough history.

        Called from:
            The AI copilot service when a full forecast dashboard update is requested.
        """
        results = {}
        if len(metrics_history) < 5:
            return {}

        wait_times  = [h.get("avg_wait_time", 0)       for h in metrics_history]
        icu_utils   = [h.get("icu_utilization", 0)     for h in metrics_history]
        bed_utils   = [h.get("bed_utilization", 0)     for h in metrics_history]
        er_utils    = [h.get("er_utilization", 0)      for h in metrics_history]

        for label, horizon in self.HORIZONS.items():
            results[f"wait_time_{label}"] = self._forecast_series(
                wait_times, horizon, sim_time, "hospital", "avg_wait_time",
                threshold_warning=60, threshold_critical=90, unit="min",
            )
            results[f"icu_utilization_{label}"] = self._forecast_series(
                icu_utils, horizon, sim_time, "ICU", "utilization",
                threshold_warning=0.75, threshold_critical=0.90, value_cap=1.0,
            )
            results[f"bed_utilization_{label}"] = self._forecast_series(
                bed_utils, horizon, sim_time, "hospital", "bed_utilization",
                threshold_warning=0.80, threshold_critical=0.92, value_cap=1.0,
            )
            results[f"er_utilization_{label}"] = self._forecast_series(
                er_utils, horizon, sim_time, "ER", "utilization",
                threshold_warning=0.70, threshold_critical=0.85, value_cap=1.0,
            )
        return results

    def _forecast_series(
        self, values: List[float], horizon: int, sim_time: float,
        department: str, metric: str,
        threshold_warning: float = 0.75, threshold_critical: float = 0.90,
        value_cap: Optional[float] = None, unit: str = "",
    ) -> ForecastResult:
        # Applying Holt-Winters double exponential smoothing to the input time series        
        if not values:
            values = [0.0]
        if len(values) >= 5:
            try:
                smoothed = savgol_filter(values, min(len(values), 5), 2).tolist()
            except Exception:
                smoothed = values
        else:
            smoothed = values

        alpha, beta = 0.3, 0.1
        level = smoothed[0]
        trend = 0.0
        if len(smoothed) > 1:
            trend = (smoothed[-1] - smoothed[0]) / len(smoothed)
        for v in smoothed[1:]:
            new_level = alpha * v + (1 - alpha) * (level + trend)
            new_trend = beta * (new_level - level) + (1 - beta) * trend
            level, trend = new_level, new_trend

        forecast_steps = min(horizon, 1440)
        forecast = []
        for i in range(1, forecast_steps + 1):
            val = level + i * trend
            val = min(value_cap, max(0.0, val)) if value_cap is not None else max(0.0, val)
            forecast.append(val)

        residuals = [abs(s - v) for s, v in zip(smoothed, values)]
        sigma = np.std(residuals) if residuals else 0.02
        sigma = max(sigma, 0.01 * (max(values) - min(values) if len(values) > 1 else 0.1))

        lower, upper = [], []
        for i, v in enumerate(forecast):
            uncertainty = 1.645 * sigma * math.sqrt(1 + i * 0.05)
            lo = max(0.0, v - uncertainty)
            hi = min(value_cap, v + uncertainty) if value_cap else v + uncertainty
            lower.append(lo)
            upper.append(hi)

        if len(forecast) > 10:
            recent = forecast[:10]
            tv = (recent[-1] - recent[0]) / max(1, len(recent))
            threshold = 0.01 * (max(values) if values else 1)
            trend_str = "increasing" if tv > threshold else ("decreasing" if tv < -threshold else "stable")
        else:
            trend_str = "stable"

        peak_val = max(forecast) if forecast else 0
        severity = "critical" if peak_val >= threshold_critical else ("warning" if peak_val >= threshold_warning else "normal")
        peak_idx = forecast.index(peak_val) if forecast else 0

        return ForecastResult(
            horizon_minutes=horizon, department=department, metric=metric,
            timestamps=[sim_time + i for i in range(1, forecast_steps + 1)],
            values=forecast, lower_bound=lower, upper_bound=upper,
            trend=trend_str, severity=severity,
            predicted_peak=peak_val, predicted_peak_time=sim_time + peak_idx + 1,
            confidence=max(0.5, 0.90 - 0.15 * (horizon / 60) / 24),
        )

    def forecast_demand(self, history: List[dict], sim_time: float, horizon_minutes: int = 60) -> dict:
        """
        Estimates the expected patient arrival rate for each minute of the next N minutes, factoring in the current trend and a time-of-day adjustment.

        Parameters:
            history: A list of past simulation state snapshots, each containing an "active_patients" count. Needs at least 5 entries to produce a result.
            sim_time: The current simulation time in minutes, used to determine what hour of the day it is.
            horizon_minutes: How many minutes ahead to forecast (default 60, meaning one hour forward).

        Returns:
            A dictionary with keys: "horizon_minutes" (int), "arrival_rate_forecast" (list of per-minute arrival rates), "peak_hour_forecast" (the highest predicted rate), and "avg_forecast" (the mean predicted rate). Returns an empty dict if there is not enough history.

        Called from:
            The AI copilot service or sandbox API when demand forecasting is requested.
        """
        if len(history) < 5:
            return {}
        active = [h.get("active_patients", 0) for h in history]
        if len(active) > 1:
            delta = [active[i] - active[i-1] for i in range(1, len(active))]
            avg_arrival = max(0, sum(delta[-30:]) / max(1, len(delta[-30:])))
        else:
            avg_arrival = 8.0 / 60
        current_hour = (sim_time / 60) % 24
        forecast_values = []
        for i in range(horizon_minutes):
            hour = (current_hour + i / 60) % 24
            tod_factor = 1.0 + 0.4 * math.sin((hour - 6) * math.pi / 12)
            rate = max(0, avg_arrival * tod_factor * 60) + random.gauss(0, 0.5)
            forecast_values.append(max(0, rate))
        return {
            "horizon_minutes": horizon_minutes,
            "arrival_rate_forecast": [round(v, 2) for v in forecast_values],
            "peak_hour_forecast": round(max(forecast_values), 2),
            "avg_forecast": round(sum(forecast_values) / len(forecast_values), 2),
        }

    def generate_bottleneck_predictions(self, state: dict, history: List[dict]) -> List[dict]:
        """
        Scans every department in the current hospital state and identifies which ones are trending toward a capacity breach, returning up to five sorted predictions.

        Parameters:
            state: The current hospital state dictionary, which must contain a "departments" key mapping department keys to dicts with "occupancy" and "queue_length".
            history: A list of past state snapshots used to calculate occupancy trend over the last 10 readings.

        Returns:
            A list of up to 5 prediction dictionaries sorted by severity then confidence, each containing the department name, current occupancy, predicted breach value, estimated minutes until breach, and a severity label ("critical", "warning", or "info"). Returns an empty list if state or history are empty.

        Called from:
            The AI copilot service when generating a full analysis response for the frontend.
        """
        predictions = []
        if not state or not history:
            return predictions
        depts = state.get("departments", {})
        for dept_key, dept_data in depts.items():
            occ   = dept_data.get("occupancy", 0)
            queue = dept_data.get("queue_length", 0)
            display = dept_data.get("display_name", dept_key)
            hist_occ = [
                h.get("departments", {}).get(dept_key, {}).get("occupancy", 0)
                if isinstance(h.get("departments"), dict) else occ
                for h in history[-10:]
            ] or [occ]
            trend = (hist_occ[-1] - hist_occ[0]) / max(1, len(hist_occ))
            if occ > 0.65 or queue > 3:
                eta = max(5, int((0.95 - occ) / max(0.001, trend)))
                severity = "critical" if occ > 0.85 else ("warning" if occ > 0.70 else "info")
                predictions.append({
                    "department": display, "dept_key": dept_key, "metric": "occupancy",
                    "current_value": round(occ, 3), "threshold": 0.90,
                    "predicted_breach": round(min(1.0, occ + trend * 30), 3),
                    "eta_minutes": min(360, max(5, eta)),
                    "confidence": round(min(0.95, 0.60 + occ * 0.35), 3),
                    "severity": severity, "queue_length": queue,
                    "trend_direction": "increasing" if trend > 0 else "stable",
                })
        severity_order = {"critical": 0, "warning": 1, "info": 2}
        predictions.sort(key=lambda x: (severity_order.get(x["severity"], 2), -x["confidence"]))
        return predictions[:5]


# ─────────────────────────────────────────────────────────────────────────────
# OPTIMIZATION
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class OptimizationInput:
    er_patients: int = 0;  er_queue: int = 0;   er_beds: int = 40
    er_doctors: int = 5;   er_nurses: int = 12
    lab_patients: int = 0; lab_queue: int = 0;  lab_analyzers: int = 4
    lab_technicians: int = 8
    imaging_patients: int = 0; imaging_queue: int = 0
    ct_scanners: int = 2;  mri_machines: int = 2
    icu_patients: int = 0; icu_queue: int = 0;  icu_beds: int = 20
    icu_doctors: int = 4;  icu_nurses: int = 20
    ward_patients: int = 0; ward_queue: int = 0; ward_beds: int = 80
    ward_doctors: int = 4;  ward_nurses: int = 16
    available_doctors: int = 2; available_nurses: int = 4
    avg_wait_time: float = 45.0; throughput: float = 8.0; arrival_rate: float = 8.0
    ct_failure: bool = False; lab_slowdown: bool = False; flu_outbreak: bool = False


@dataclass
class StaffingRecommendation:
    department: str; resource_type: str
    current: int; recommended: int; delta: int
    impact_score: float; reason: str; urgency: str


@dataclass
class OptimizationResult:
    objective_value: float = 0.0
    recommendations: List[StaffingRecommendation] = field(default_factory=list)
    predicted_wait_reduction: float = 0.0
    predicted_throughput_increase: float = 0.0
    predicted_utilization_improvement: float = 0.0
    bottleneck_department: str = ""
    bottleneck_metric: str = ""
    bottleneck_severity: str = ""
    root_causes: List[str] = field(default_factory=list)
    intervention_plan: List[str] = field(default_factory=list)
    confidence: float = 0.0
    solver: str = "ortools"

    def to_dict(self) -> dict:
        """
        Converts this OptimizationResult into a plain dictionary suitable for JSON serialization and sending over the API.

        Parameters:
            None — operates on the fields of the dataclass instance itself.

        Returns:
            A dictionary containing the objective value, a list of recommendation dicts, predicted metric improvements, bottleneck info, root causes, intervention plan, confidence, and solver name.

        Called from:
            The copilot API route after calling HospitalOptimizer.optimize, to serialize the result into the HTTP response.
        """
        return {
            "objective_value": round(self.objective_value, 3),
            "recommendations": [
                {"department": r.department, "resource_type": r.resource_type,
                 "current": r.current, "recommended": r.recommended, "delta": r.delta,
                 "impact_score": round(r.impact_score, 3), "reason": r.reason, "urgency": r.urgency}
                for r in self.recommendations
            ],
            "predicted_wait_reduction": round(self.predicted_wait_reduction, 1),
            "predicted_throughput_increase": round(self.predicted_throughput_increase, 1),
            "predicted_utilization_improvement": round(self.predicted_utilization_improvement, 3),
            "bottleneck_department": self.bottleneck_department,
            "bottleneck_metric": self.bottleneck_metric,
            "bottleneck_severity": self.bottleneck_severity,
            "root_causes": self.root_causes,
            "intervention_plan": self.intervention_plan,
            "confidence": round(self.confidence, 3),
            "solver": self.solver,
        }


class HospitalOptimizer:
    """Multi-objective staffing optimizer: OR-Tools LP primary, SciPy SLSQP fallback."""

    def optimize(self, inp: OptimizationInput) -> OptimizationResult:
        """
        Runs the staffing optimizer, choosing OR-Tools LP if it is installed or falling back to SciPy SLSQP otherwise.

        Parameters:
            inp: An OptimizationInput dataclass containing the current patient counts, queue lengths, bed capacities, staff counts, and active event flags for every department.

        Returns:
            An OptimizationResult dataclass with staffing recommendations, predicted metric improvements, identified bottleneck, root causes, and intervention plan.

        Called from:
            The copilot API endpoint /api/v1/copilot/optimize, and indirectly from build_optimization_input_from_state.
        """
        return self._optimize_ortools(inp) if ORTOOLS_AVAILABLE else self._optimize_scipy(inp)

    def _optimize_ortools(self, inp: OptimizationInput) -> OptimizationResult:
        """
        Solves the staffing allocation problem using Google OR-Tools linear programming (GLOP solver), minimizing wait-time-weighted staff deltas subject to budget and minimum-coverage constraints.

        Parameters:
            inp: An OptimizationInput dataclass with current staffing levels, patient loads, and available floating staff for ER, ICU, and Ward departments.

        Returns:
            An OptimizationResult with the LP-optimal staffing deltas translated into human-readable recommendations. Falls back to _optimize_scipy if OR-Tools cannot create a solver, or to _fallback_result if no feasible solution is found.

        Called from:
            optimize, when ORTOOLS_AVAILABLE is True.
        """
        solver = pywraplp.Solver.CreateSolver("GLOP")
        if not solver:
            return self._optimize_scipy(inp)

        d_er_doc   = solver.NumVar(-inp.er_doctors,   inp.available_doctors, "er_doc")
        d_er_nurse = solver.NumVar(-inp.er_nurses//2, inp.available_nurses,  "er_nurse")
        d_icu_doc  = solver.NumVar(-inp.icu_doctors,  inp.available_doctors, "icu_doc")
        d_icu_nrs  = solver.NumVar(-inp.icu_nurses//2,inp.available_nurses,  "icu_nurse")
        d_wd_doc   = solver.NumVar(-inp.ward_doctors, inp.available_doctors, "wd_doc")
        d_wd_nurse = solver.NumVar(-inp.ward_nurses//2,inp.available_nurses, "wd_nurse")

        solver.Add(d_er_doc + d_icu_doc + d_wd_doc <= inp.available_doctors)
        solver.Add(d_er_nurse + d_icu_nrs + d_wd_nurse <= inp.available_nurses)
        solver.Add(d_er_doc + d_icu_doc + d_wd_doc >= -inp.available_doctors)
        solver.Add(d_er_nurse + d_icu_nrs + d_wd_nurse >= -inp.available_nurses)
        solver.Add(inp.er_doctors  + d_er_doc  >= max(1, inp.er_doctors//2))
        solver.Add(inp.icu_doctors + d_icu_doc >= max(1, inp.icu_doctors//2))
        solver.Add(inp.ward_doctors+ d_wd_doc  >= max(1, inp.ward_doctors//2))

        er_l  = inp.er_queue  / max(1, inp.er_beds)
        icu_l = inp.icu_queue / max(1, inp.icu_beds) * 3
        wd_l  = inp.ward_queue/ max(1, inp.ward_beds)
        solver.Minimize(-(2.0*d_er_doc*er_l + 1.5*d_er_nurse*er_l +
                          3.0*d_icu_doc*icu_l + 2.5*d_icu_nrs*icu_l +
                          1.0*d_wd_doc*wd_l  + 0.8*d_wd_nurse*wd_l))

        status = solver.Solve()
        if status not in (pywraplp.Solver.OPTIMAL, pywraplp.Solver.FEASIBLE):
            return self._fallback_result(inp)

        recs = self._build_recommendations(
            inp,
            er_doc_delta=int(round(d_er_doc.solution_value())),
            er_nurse_delta=int(round(d_er_nurse.solution_value())),
            icu_doc_delta=int(round(d_icu_doc.solution_value())),
            icu_nurse_delta=int(round(d_icu_nrs.solution_value())),
            ward_doc_delta=int(round(d_wd_doc.solution_value())),
            ward_nurse_delta=int(round(d_wd_nurse.solution_value())),
        )
        result = self._build_result(inp, recs, solver="ortools")
        result.objective_value = -solver.Objective().Value()
        return result

    def _optimize_scipy(self, inp: OptimizationInput) -> OptimizationResult:
        """
        Solves the same staffing allocation problem as _optimize_ortools but uses SciPy's SLSQP (Sequential Least Squares Programming) solver instead, which works without the OR-Tools dependency.

        Parameters:
            inp: An OptimizationInput dataclass with current staffing levels, patient loads, and available floating staff.

        Returns:
            An OptimizationResult with SciPy-optimal staffing recommendations. Falls back to _fallback_result if the optimizer fails to converge.

        Called from:
            optimize when ORTOOLS_AVAILABLE is False, or from _optimize_ortools if OR-Tools cannot initialize a solver.
        """
        bounds = [
            (-inp.er_doctors//2,  inp.available_doctors),
            (-inp.er_nurses//2,   inp.available_nurses),
            (-inp.icu_doctors//2, inp.available_doctors),
            (-inp.icu_nurses//2,  inp.available_nurses),
            (-inp.ward_doctors//2,inp.available_doctors),
            (-inp.ward_nurses//2, inp.available_nurses),
        ]
        def objective(x):
            """
            Computes the negated weighted load-reduction score for a given staffing delta vector, which SciPy minimizes (minimizing a negative value maximizes the positive score).

            Parameters:
                x: A list of six floats representing the staffing deltas in order: ER doctors, ER nurses, ICU doctors, ICU nurses, Ward doctors, Ward nurses.

            Returns:
                A negative float; the more negative, the better the proposed reallocation is at reducing load across departments.
            """
            er, en, id_, in_, wd, wn = x
            er_l  = inp.er_queue  / max(1, inp.er_beds)
            icu_l = inp.icu_queue / max(1, inp.icu_beds) * 3
            wd_l  = inp.ward_queue/ max(1, inp.ward_beds)
            return -(2.0*er*er_l + 1.5*en*er_l + 3.0*id_*icu_l +
                     2.5*in_*icu_l + 1.0*wd*wd_l + 0.8*wn*wd_l)
        constraints = [
            {"type": "ineq", "fun": lambda x: inp.available_doctors - (x[0]+x[2]+x[4])},
            {"type": "ineq", "fun": lambda x: inp.available_nurses  - (x[1]+x[3]+x[5])},
        ]
        res = scipy_optimize.minimize(objective, [0.0]*6, method="SLSQP",
                                      bounds=bounds, constraints=constraints)
        if not res.success:
            return self._fallback_result(inp)
        x = [int(round(v)) for v in res.x]
        recs = self._build_recommendations(inp, *x)
        return self._build_result(inp, recs, solver="scipy")

    def _build_recommendations(
        self, inp: OptimizationInput,
        er_doc_delta=0, er_nurse_delta=0,
        icu_doc_delta=0, icu_nurse_delta=0,
        ward_doc_delta=0, ward_nurse_delta=0,
    ) -> List[StaffingRecommendation]:
        """
        Converts raw staffing delta values (how many doctors/nurses to add or remove per department) into a sorted list of StaffingRecommendation objects with human-readable reasons and urgency levels.

        Parameters:
            inp: The OptimizationInput dataclass, used to read current staffing levels and load factors for each department.
            er_doc_delta: How many doctors to add (positive) or remove (negative) in the ER.
            er_nurse_delta: How many nurses to add or remove in the ER.
            icu_doc_delta: How many doctors to add or remove in the ICU.
            icu_nurse_delta: How many nurses to add or remove in the ICU.
            ward_doc_delta: How many doctors to add or remove in the Ward.
            ward_nurse_delta: How many nurses to add or remove in the Ward.

        Returns:
            A list of StaffingRecommendation objects sorted by impact score descending, with only non-zero deltas included.

        Called from:
            _optimize_ortools and _optimize_scipy after the solver has produced delta values.
        """
        recs = []
        er_l  = inp.er_queue  / max(1, inp.er_beds)
        icu_l = inp.icu_queue / max(1, inp.icu_beds)
        def add(dept, rtype, cur, delta, base_impact, reason, urgency):
            """
            Helper that appends a single StaffingRecommendation to the recs list, but only when the delta is non-zero.

            Parameters:
                dept: The department name (e.g., "ER", "ICU").
                rtype: The resource type string (e.g., "doctors", "nurses").
                cur: The current number of that resource in the department.
                delta: The recommended change (positive = add, negative = remove).
                base_impact: A weight representing how much this change improves outcomes per unit of delta.
                reason: A plain-English sentence explaining why this change is needed.
                urgency: A string label like "critical", "high", "medium", or "low".

            Returns:
                None — appends directly to the enclosing recs list.
            """
            if delta:
                recs.append(StaffingRecommendation(dept, rtype, cur, cur+delta, delta,
                                                   base_impact*abs(delta), reason, urgency))
        add("ER",  "doctors", inp.er_doctors,  er_doc_delta,   0.25*er_l,
            f"ER queue: {inp.er_queue} waiting, {inp.er_beds-inp.er_patients} beds free",
            "critical" if er_l > 0.7 else "medium")
        add("ER",  "nurses",  inp.er_nurses,   er_nurse_delta, 0.15*er_l,
            "ER nurse-to-patient ratio strained", "high" if er_l > 0.6 else "low")
        add("ICU", "doctors", inp.icu_doctors, icu_doc_delta,  0.40*icu_l,
            f"ICU at {inp.icu_patients}/{inp.icu_beds} beds",
            "critical" if icu_l > 0.8 else "high")
        add("ICU", "nurses",  inp.icu_nurses,  icu_nurse_delta,0.35*icu_l,
            "ICU nurse-patient ratio compromised", "critical" if icu_l > 0.8 else "high")
        add("Ward","doctors", inp.ward_doctors,ward_doc_delta, 0.15,
            "Ward physician coverage optimization", "medium")
        add("Ward","nurses",  inp.ward_nurses, ward_nurse_delta,0.12,
            "Ward nurse staffing adjustment", "low")
        recs.sort(key=lambda r: r.impact_score, reverse=True)
        return recs

    def _build_result(self, inp: OptimizationInput,
                      recommendations: List[StaffingRecommendation],
                      solver: str = "ortools") -> OptimizationResult:
        """
        Assembles the final OptimizationResult by estimating predicted metric improvements from the given recommendations and then detecting the current bottleneck and its root causes.

        Parameters:
            inp: The OptimizationInput dataclass containing current patient and resource counts.
            recommendations: The list of StaffingRecommendation objects produced by _build_recommendations.
            solver: A string label identifying which solver produced these results (e.g., "ortools", "scipy", "heuristic").

        Returns:
            A fully populated OptimizationResult dataclass with predicted wait reduction, throughput increase, utilization improvement, bottleneck info, root causes, and an intervention plan.

        Called from:
            _optimize_ortools, _optimize_scipy, and _fallback_result.
        """
        er_l  = inp.er_queue  / max(1, inp.er_beds)
        icu_l = inp.icu_queue / max(1, inp.icu_beds)
        if recommendations:
            top = sum(abs(r.delta) for r in recommendations[:3])
            wait_red  = min(35.0, top * 4.5 * (er_l + icu_l))
            thru_inc  = min(25.0, top * 0.8)
            util_imp  = min(0.15, top * 0.02)
        else:
            wait_red = thru_inc = util_imp = 0.0
        dept, metric, sev = self._detect_bottleneck(inp)
        return OptimizationResult(
            recommendations=recommendations,
            predicted_wait_reduction=wait_red,
            predicted_throughput_increase=thru_inc,
            predicted_utilization_improvement=util_imp,
            bottleneck_department=dept, bottleneck_metric=metric, bottleneck_severity=sev,
            root_causes=self._identify_root_causes(inp),
            intervention_plan=self._build_intervention_plan(inp, recommendations),
            confidence=0.72 + random.uniform(-0.08, 0.08), solver=solver,
        )

    def _fallback_result(self, inp: OptimizationInput) -> OptimizationResult:
        """
        Produces a simple rule-based optimization result when neither OR-Tools nor SciPy can find a solution, using hardcoded heuristics based on queue length and ICU capacity.

        Parameters:
            inp: The OptimizationInput dataclass with current patient and resource counts.

        Returns:
            An OptimizationResult built from heuristic recommendations (e.g., add a doctor when the ER queue is over 5, add ICU nurses when ICU is over 80% full).

        Called from:
            _optimize_ortools and _optimize_scipy when their respective solvers fail.
        """
        recs = []
        if inp.er_queue > 5:
            recs.append(StaffingRecommendation("ER","doctors",inp.er_doctors,inp.er_doctors+1,1,0.45,"ER queue building","high"))
        if inp.icu_patients / max(1, inp.icu_beds) > 0.80:
            recs.append(StaffingRecommendation("ICU","nurses",inp.icu_nurses,inp.icu_nurses+2,2,0.60,"ICU near capacity","critical"))
        return self._build_result(inp, recs, solver="heuristic")

    def _identify_root_causes(self, inp: OptimizationInput) -> List[str]:
        """
        Inspects the current hospital state and returns a list of plain-English sentences describing every condition that is contributing to patient flow problems.

        Parameters:
            inp: The OptimizationInput dataclass containing queue lengths, occupancy values, and active event flags (ct_failure, lab_slowdown, flu_outbreak).

        Returns:
            A list of strings, each describing one root cause (e.g., "ER queue backlog: 12 patients awaiting assessment"). Returns a list with a single "normal" message if nothing concerning is detected.

        Called from:
            _build_result, which includes root causes in every OptimizationResult.
        """
        causes = []
        if inp.er_queue > 8:
            causes.append(f"ER queue backlog: {inp.er_queue} patients awaiting assessment")
        if inp.icu_patients / max(1, inp.icu_beds) > 0.85:
            causes.append(f"ICU near capacity ({inp.icu_patients}/{inp.icu_beds}): blocking high-acuity ER transfers")
        if inp.lab_queue > 10:
            causes.append(f"Laboratory backlog ({inp.lab_queue} samples): delaying diagnosis")
        if inp.imaging_queue > 6:
            causes.append(f"Imaging queue ({inp.imaging_queue} patients): delaying treatment decisions")
        if inp.ward_beds - inp.ward_patients < 5:
            causes.append(f"Ward near capacity ({inp.ward_patients}/{inp.ward_beds}): creating ICU boarding")
        if inp.ct_failure:
            causes.append("CT scanner failure: imaging capacity reduced by 50%")
        if inp.lab_slowdown:
            causes.append("Laboratory slowdown: turnaround time 2.5x normal")
        if inp.flu_outbreak:
            causes.append("Flu outbreak: patient arrival rate elevated 2.5x")
        return causes or ["Hospital operating within normal parameters"]

    def _build_intervention_plan(self, inp: OptimizationInput, recs: List[StaffingRecommendation]) -> List[str]:
        """
        Converts the top staffing recommendations and current hospital conditions into an ordered list of plain-English action steps for the shift manager to execute.

        Parameters:
            inp: The OptimizationInput dataclass, checked for high queue or capacity thresholds that trigger additional steps (e.g., STAT lab protocol, scan prioritization, overflow ward).
            recs: The list of StaffingRecommendation objects; the first five are translated into action sentences.

        Returns:
            A list of action strings sorted by most impactful recommendation first, with extra steps appended for lab backlogs, imaging queues, ICU pressure, and flu outbreaks.

        Called from:
            _build_result, which includes this plan in every OptimizationResult.
        """
        plan = []
        for r in recs[:5]:
            plan.append(f"{'Add' if r.delta>0 else 'Redeploy'} {abs(r.delta)} {r.resource_type} to {r.department} (impact: {r.impact_score:.2f})")
        if inp.lab_queue > 8:
            plan.append("Activate STAT processing protocol for critical lab samples")
        if inp.imaging_queue > 5:
            plan.append("Implement scan prioritization: critical cases jump queue")
        if inp.icu_patients / max(1, inp.icu_beds) > 0.85:
            plan.append("Initiate early discharge review for ICU step-down candidates")
        if inp.ward_beds - inp.ward_patients < 10:
            plan.append("Activate overflow ward capacity (estimated +15 beds)")
        if inp.flu_outbreak:
            plan.append("Deploy surge protocol: open secondary triage area")
            plan.append("Contact off-duty staff for voluntary overtime")
        return plan

    def _detect_bottleneck(self, inp: OptimizationInput):
        """
        Scores each department by its effective load (queue length divided by capacity, weighted for criticality) and identifies the one that is most overloaded.

        Parameters:
            inp: The OptimizationInput dataclass containing patient counts, queue lengths, and capacities for ER, Laboratory, Imaging, ICU, and Ward.

        Returns:
            A tuple of three values: (bottleneck_department, bottleneck_metric, severity_label). The severity label is one of "critical", "high", "medium", or "low".

        Called from:
            _build_result, which records the bottleneck in every OptimizationResult.
        """
        scores = {
            "ER":        inp.er_queue   / max(1, inp.er_beds)   + inp.er_patients  / max(1, inp.er_beds),
            "Laboratory":inp.lab_queue  / max(1, inp.lab_analyzers),
            "Imaging":   inp.imaging_queue / max(1, inp.ct_scanners + inp.mri_machines + 3),
            "ICU":       inp.icu_patients  / max(1, inp.icu_beds)  * 1.5,
            "Ward":      inp.ward_patients / max(1, inp.ward_beds),
        }
        bottleneck = max(scores, key=scores.get)
        score = scores[bottleneck]
        severity = "critical" if score > 0.90 else ("high" if score > 0.70 else ("medium" if score > 0.50 else "low"))
        metrics = {"ER":"queue length","Laboratory":"processing capacity",
                   "Imaging":"scanner availability","ICU":"bed utilization","Ward":"bed utilization"}
        return bottleneck, metrics[bottleneck], severity


def build_optimization_input_from_state(state: dict) -> OptimizationInput:
    """
    Reads the live hospital state dictionary (as broadcast by the simulation engine) and maps it into the flat OptimizationInput dataclass that the optimizer expects.

    Parameters:
        state: The hospital state dict from the simulation WebSocket broadcast. Must contain "departments" (a dict keyed by department slug), "metrics" (a dict with avg_wait_time and throughput_per_hour), and "config" (a dict with arrival_rate and event flags).

    Returns:
        A populated OptimizationInput dataclass with patient counts, queue lengths, bed capacities, staffing defaults, and active event flags ready to pass directly to HospitalOptimizer.optimize.

    Called from:
        The copilot API service when handling an on-demand optimization request triggered by the frontend.
    """
    depts   = state.get("departments", {})
    metrics = state.get("metrics", {})
    def dept(key, f, default=0):
        """
        Safely retrieves a single field from a specific department dict, returning a default value when the department or field is missing.

        Parameters:
            key: The department slug string (e.g., "er", "icu", "labs").
            f: The field name to look up within that department's dict (e.g., "current_patients", "queue_length").
            default: The value to return when the key or field is not found (default 0).

        Returns:
            The field value from the department dict, or the default if absent.
        """
        return depts.get(key, {}).get(f, default)
    return OptimizationInput(
        er_patients=dept("er","current_patients"),  er_queue=dept("er","queue_length"),
        er_beds=dept("er","capacity",40),
        lab_patients=dept("labs","current_patients"), lab_queue=dept("labs","queue_length"),
        lab_analyzers=dept("labs","capacity",4),
        imaging_patients=dept("imaging","current_patients"), imaging_queue=dept("imaging","queue_length"),
        icu_patients=dept("icu","current_patients"), icu_queue=dept("icu","queue_length"),
        icu_beds=dept("icu","capacity",20),
        ward_patients=dept("ward","current_patients"), ward_queue=dept("ward","queue_length"),
        ward_beds=dept("ward","capacity",80),
        available_doctors=3, available_nurses=6,
        avg_wait_time=metrics.get("avg_wait_time",45),
        throughput=metrics.get("throughput_per_hour",8),
        arrival_rate=state.get("config",{}).get("arrival_rate",8),
        ct_failure=state.get("config",{}).get("ct_failure",False),
        lab_slowdown=state.get("config",{}).get("lab_slowdown",False),
        flu_outbreak=state.get("config",{}).get("flu_outbreak",False),
    )


# ─────────────────────────────────────────────────────────────────────────────
# AI NARRATIVE
# ─────────────────────────────────────────────────────────────────────────────

_AI_SYSTEM_PROMPT = """You are the AI Operations Copilot for PulseFlow AI, a hospital management platform.

Respond with plain prose only. No markdown, no asterisks, no bold, no headers, no bullet points, no labels like "Current State:" or "Root Cause:". Just clean sentences.

Always be concise, specific (use real numbers), and actionable. Do NOT make clinical diagnoses."""

_ollama_cache: dict = {"ok": False, "ts": 0.0}
_OLLAMA_TTL = 20.0


def _is_ollama_running(base_url: str) -> bool:
    """
    Checks whether a locally running Ollama server is reachable at the given URL, caching the result for 20 seconds to avoid hammering the endpoint.

    Parameters:
        base_url: The base URL of the Ollama server (e.g., "http://localhost:11434").

    Returns:
        True if the Ollama /api/tags endpoint responds with HTTP 200, False otherwise.

    Called from:
        AICopilot._available, which calls this before every LLM request.
    """
    now = _time.monotonic()
    if now - _ollama_cache["ts"] < _OLLAMA_TTL:
        return _ollama_cache["ok"]
    try:
        import httpx
        r = httpx.get(f"{base_url}/api/tags", timeout=1.0)
        result = r.status_code == 200
    except Exception:
        result = False
    _ollama_cache["ok"] = result
    _ollama_cache["ts"] = now
    return result


def _ollama_chat(model: str, base_url: str, messages: list, max_tokens: int = 180) -> str:
    """
    Sends a chat request to the Ollama server and returns the assistant's reply as a plain string.

    Parameters:
        model: The Ollama model name to use (e.g., "llama3.2").
        base_url: The base URL of the Ollama server (e.g., "http://localhost:11434").
        messages: A list of message dicts in the format [{"role": "system"/"user"/"assistant", "content": "..."}].
        max_tokens: The maximum number of tokens to generate in the response (default 180).

    Returns:
        The text content of the model's reply as a string.

    Called from:
        AICopilot._call, which wraps this in asyncio.to_thread so it does not block the async event loop.
    """
    client = _ollama.Client(host=base_url)
    response = client.chat(model=model, messages=messages,
                           options={"num_predict": max_tokens, "temperature": 0.3})
    return response["message"]["content"]


class AICopilot:
    """Ollama-powered local LLM copilot. Falls back to deterministic text if Ollama is unavailable."""

    def __init__(self, base_url: str = "http://localhost:11434", model: str = "llama3.2"):
        """
        Initializes the AICopilot with the address of the local Ollama server and the model name to use for generation.

        Parameters:
            base_url: The base URL where the Ollama server is listening (default "http://localhost:11434").
            model: The name of the Ollama model to load for chat completions (default "llama3.2").

        Returns:
            None — standard __init__ constructor.
        """
        self.base_url = base_url
        self.model = model

    def _available(self) -> bool:
        """
        Returns True if the ollama Python package is installed and the local Ollama server is currently responding, meaning AI-generated text is possible.

        Parameters:
            None.

        Returns:
            True when both the package is importable and the server is reachable; False otherwise.

        Called from:
            _call, before every LLM request, to decide whether to attempt generation or skip to a fallback.
        """
        return OLLAMA_AVAILABLE and _is_ollama_running(self.base_url)

    def _msgs(self, user_prompt: str) -> list:
        """
        Wraps a user prompt into the two-message list format that the Ollama chat API expects, prepending the system prompt that instructs the model to respond in plain prose only.

        Parameters:
            user_prompt: The user-facing text describing the hospital situation or question to answer.

        Returns:
            A list with two dicts: a system message containing the shared AI instructions, followed by the user message.

        Called from:
            _call, which passes the result directly to _ollama_chat.
        """
        return [{"role": "system", "content": _AI_SYSTEM_PROMPT},
                {"role": "user",   "content": user_prompt}]

    async def _call(self, prompt: str, max_tokens: int = 180) -> Optional[str]:
        """
        Sends a prompt to the local Ollama model asynchronously, with a 5-second timeout, and returns the generated text or None if unavailable or timed out.

        Parameters:
            prompt: The text prompt to send to the LLM (already formatted by the caller).
            max_tokens: The maximum number of tokens the model should generate (default 180).

        Returns:
            The LLM's plain-text response as a string, or None if Ollama is unavailable, the call times out, or any exception occurs.

        Called from:
            explain_bottleneck, generate_patient_summary, generate_intervention_narrative, and generate_shift_report.
        """
        if not self._available():
            return None
        try:
            return await asyncio.wait_for(
                asyncio.to_thread(_ollama_chat, self.model, self.base_url,
                                  self._msgs(prompt), max_tokens), timeout=5.0)
        except Exception as exc:
            logger.warning(f"Ollama call failed: {type(exc).__name__}")
            return None

    async def explain_bottleneck(self, state: dict, opt: dict) -> dict:
        """
        Generates a 3-4 sentence plain-English explanation of the current hospital bottleneck — its root cause, consequence, and the best intervention — using the LLM if available or a deterministic fallback otherwise.

        Parameters:
            state: The current hospital state dict from the simulation, containing "departments" and "metrics".
            opt: The optimization result dict (as produced by OptimizationResult.to_dict) containing "bottleneck_department", "bottleneck_severity", "root_causes", "predicted_wait_reduction", and "intervention_plan".

        Returns:
            A dictionary with keys "explanation" (the narrative text), "model" (the model name or "fallback"), "generated" (True if LLM-produced), "bottleneck_department", and "severity".

        Called from:
            The copilot API route when the frontend requests a bottleneck analysis.
        """
        context = self._build_bottleneck_context(state, opt)
        prompt = (
            f"Hospital state:\n{context}\n\n"
            f"Bottleneck: {opt.get('bottleneck_department','unknown')} | "
            f"Severity: {opt.get('bottleneck_severity','unknown')} | "
            f"Root causes: {', '.join(opt.get('root_causes',[])[:3])} | "
            f"Wait reduction: {opt.get('predicted_wait_reduction',0):.0f} min\n\n"
            "3-4 plain sentences: problem, root cause, consequence, best intervention."
        )
        text = await self._call(prompt, 150)
        if text:
            return {"explanation": text, "model": self.model, "generated": True,
                    "bottleneck_department": opt.get("bottleneck_department",""),
                    "severity": opt.get("bottleneck_severity","")}
        return self._fallback_bottleneck_explanation(state, opt, context)

    async def generate_patient_summary(self, patient: dict) -> str:
        """
        Produces a two-sentence plain-English summary of a single patient's clinical situation, covering where they are, what they need, their risk level, and urgency.

        Parameters:
            patient: A dict describing one patient, expected to contain keys like "age", "severity", "chief_complaint", "current_department", "state", "risk_score", and "total_wait_time".

        Returns:
            A short string (2 sentences) describing the patient. If the LLM is unavailable, returns a deterministic fallback string instead.

        Called from:
            The Patient Intelligence page API or copilot when summarizing an individual patient.
        """
        prompt = (
            f"Patient: Age {patient.get('age','?')}, {patient.get('severity','?').upper()}, "
            f"{patient.get('chief_complaint','?')}. "
            f"Dept: {patient.get('current_department','?')}, State: {patient.get('state','?')}, "
            f"Risk: {patient.get('risk_score',0):.2f}, Wait: {patient.get('total_wait_time',0):.0f}m. "
            "2 plain sentences: where/what they need; risk and urgency."
        )
        return await self._call(prompt, 80) or self._fallback_patient_summary(patient)

    async def generate_intervention_narrative(self, opt: dict, state: dict) -> dict:
        """
        Writes a 3-4 sentence narrative describing the planned staff reallocation, the actions being taken, and the expected outcome improvements.

        Parameters:
            opt: The optimization result dict (from OptimizationResult.to_dict) with "recommendations", "intervention_plan", "predicted_wait_reduction", "predicted_throughput_increase", and "predicted_utilization_improvement".
            state: The current hospital state dict (used only if the LLM call fails and the fallback needs context).

        Returns:
            A dict with keys "narrative" (the prose), "recommendations" (list), "intervention_plan" (list), "predicted_outcomes" (nested dict of metric improvements), and "model" (LLM name or "fallback").

        Called from:
            The copilot API route when the frontend requests an intervention plan narrative.
        """
        recs  = opt.get("recommendations", [])
        plan  = opt.get("intervention_plan", [])
        recs_text = "\n".join([f"- {r['resource_type']} in {r['department']}: {'+' if r['delta']>0 else ''}{r['delta']}" for r in recs[:5]])
        plan_text = "\n".join([f"- {s}" for s in plan[:6]])
        prompt = (
            f"Staff reallocation:\n{recs_text}\n\nPlan:\n{plan_text}\n\n"
            f"Predicted: -{opt.get('predicted_wait_reduction',0):.0f}m wait, "
            f"+{opt.get('predicted_throughput_increase',0):.0f}% throughput, "
            f"+{opt.get('predicted_utilization_improvement',0)*100:.0f}% utilization.\n\n"
            "3-4 plain prose sentences: situation, actions, expected impact."
        )
        narrative = await self._call(prompt, 150)
        if narrative:
            return {"narrative": narrative, "recommendations": recs, "intervention_plan": plan,
                    "predicted_outcomes": {
                        "wait_reduction": opt.get("predicted_wait_reduction",0),
                        "throughput_increase": opt.get("predicted_throughput_increase",0),
                        "utilization_improvement": opt.get("predicted_utilization_improvement",0),
                    }, "model": self.model}
        return self._fallback_intervention_narrative(opt)

    async def generate_shift_report(self, state: dict, history: List[dict]) -> str:
        """
        Generates a 4-5 sentence end-of-shift summary covering current hospital status, any active incidents, department pressure points, and priority focus for the incoming shift.

        Parameters:
            state: The current hospital state dict containing "metrics" (active_patients, avg_wait_time, bed_utilization, icu_utilization, critical_patients) and "alerts" (list of active alert dicts).
            history: A list of past state snapshots used by the fallback function to add context (currently unused by the LLM path).

        Returns:
            A plain-text string (4-5 sentences). If the LLM is unavailable, returns a deterministic fallback string instead.

        Called from:
            The copilot API route when the frontend requests a shift handover report.
        """
        m = state.get("metrics", {})
        alerts = state.get("alerts", [])
        prompt = (
            f"Status: {m.get('active_patients',0)} patients, {m.get('avg_wait_time',0):.0f}m avg wait, "
            f"beds {m.get('bed_utilization',0)*100:.0f}%, ICU {m.get('icu_utilization',0)*100:.0f}%, "
            f"critical {m.get('critical_patients',0)}, alerts: {'; '.join(a.get('message','') for a in alerts[:3]) or 'none'}. "
            "4-5 plain prose sentences: status, incidents, department pressures, incoming shift focus."
        )
        return await self._call(prompt, 180) or self._fallback_shift_report(state, history)

    # ---- Deterministic fallbacks ----

    def _build_bottleneck_context(self, state: dict, opt: dict) -> str:
        """
        Formats the current hospital state into a compact multi-line text block that can be pasted into an LLM prompt as context.

        Parameters:
            state: The hospital state dict with "departments" and "metrics".
            opt: The optimization result dict (used by the caller but not directly read here; included for signature consistency).

        Returns:
            A newline-separated string listing total active patients, average wait time, and each department's current/capacity/queue counts.

        Called from:
            explain_bottleneck, which passes this context string into both the LLM prompt and the fallback response.
        """
        depts = state.get("departments", {})
        m     = state.get("metrics", {})
        lines = [f"Active: {m.get('active_patients',0)} | Avg wait: {m.get('avg_wait_time',0):.0f}m"]
        for key, d in depts.items():
            lines.append(f"{d.get('display_name',key)}: {d.get('current_patients',0)}/{d.get('capacity',0)} beds, Q:{d.get('queue_length',0)}")
        return "\n".join(lines)

    def _fallback_bottleneck_explanation(self, state: dict, opt: dict, context: str) -> dict:
        """
        Generates a deterministic bottleneck explanation using real numbers from the hospital state when the LLM is unavailable.

        Parameters:
            state: The current hospital state dict containing "metrics" and "departments".
            opt: The optimization result dict with "bottleneck_department", "bottleneck_severity", "root_causes", "predicted_wait_reduction", and "intervention_plan".
            context: The pre-formatted context string produced by _build_bottleneck_context (included for completeness but not directly used in the output text).

        Returns:
            A dict with the same shape as explain_bottleneck's return value: "explanation" (string), "model" ("fallback"), "generated" (False), "bottleneck_department", and "severity".

        Called from:
            explain_bottleneck when _call returns None.
        """
        dept = opt.get("bottleneck_department","ER")
        sev  = opt.get("bottleneck_severity","warning")
        wait_red = opt.get("predicted_wait_reduction",0)
        m  = state.get("metrics",{})
        er = state.get("departments",{}).get("er",{})
        icu= state.get("departments",{}).get("icu",{})
        explanation = (
            f"With {m.get('active_patients',0)} active patients and {m.get('avg_wait_time',0):.0f}m avg wait, "
            f"{dept} is the critical bottleneck — {er.get('occupancy',0)*100:.0f}% occupancy, {er.get('queue_length',0)} queued. "
            f"{opt.get('root_causes',['Unknown cause'])[0]}. ICU at {icu.get('occupancy',0)*100:.0f}% with "
            f"{m.get('critical_patients',0)} critical cases. "
            f"Primary action: {opt.get('intervention_plan',['Reallocate staff'])[0]}. "
            f"Projected wait reduction: {wait_red:.0f} minutes."
        )
        return {"explanation": explanation, "model": "fallback", "generated": False,
                "bottleneck_department": dept, "severity": sev}

    def _fallback_patient_summary(self, patient: dict) -> str:
        """
        Builds a simple two-sentence patient summary using only the fields already present in the patient dict, without calling any external service.

        Parameters:
            patient: A dict describing one patient with keys such as "name", "age", "severity", "chief_complaint", "current_department", "total_wait_time", and "risk_score".

        Returns:
            A two-sentence plain-text string: first sentence covers identity and location; second sentence covers wait time, risk score, and a care urgency label.

        Called from:
            generate_patient_summary when _call returns None.
        """
        name = patient.get("name","Patient")
        sev  = patient.get("severity","low")
        dept = patient.get("current_department","er").replace("_"," ").upper()
        wait = patient.get("total_wait_time",0)
        risk = patient.get("risk_score",0)
        urgency = "Immediate escalation recommended" if risk>0.7 else ("Close monitoring required" if risk>0.4 else "Stable — routine care pathway")
        return (f"{name}, {patient.get('age','?')}, {sev.upper()} — {patient.get('chief_complaint','?')}. "
                f"In {dept}, waited {wait:.0f}m, risk {risk:.2f}. {urgency}.")

    def _fallback_intervention_narrative(self, opt: dict) -> dict:
        """
        Produces a deterministic intervention narrative from the optimization result dict when the LLM is not available.

        Parameters:
            opt: The optimization result dict with "bottleneck_department", "recommendations", "predicted_wait_reduction", "predicted_throughput_increase", "predicted_utilization_improvement", and "intervention_plan".

        Returns:
            A dict with the same shape as generate_intervention_narrative's return value: "narrative" (string), "recommendations" (list), "intervention_plan" (list), "predicted_outcomes" (nested dict), and "model" ("fallback").

        Called from:
            generate_intervention_narrative when _call returns None.
        """
        recs = opt.get("recommendations",[])
        dept = opt.get("bottleneck_department","ER")
        primary = next((r for r in recs if r.get("urgency") in ("critical","high")), recs[0] if recs else None)
        action = (f"Move {abs(primary['delta'])} {primary['resource_type']} to {primary['department']}"
                  if primary else "redistribute staff to match patient load")
        narrative = (
            f"OR-Tools flagged {dept} as the highest-priority intervention point. "
            f"Primary action: {action}. "
            f"Across {len(recs)} changes, the model projects -{opt.get('predicted_wait_reduction',0):.0f}m wait, "
            f"+{opt.get('predicted_throughput_increase',0):.0f}% throughput, "
            f"+{opt.get('predicted_utilization_improvement',0)*100:.0f}% utilization."
        )
        return {"narrative": narrative, "recommendations": recs,
                "intervention_plan": opt.get("intervention_plan",[]),
                "predicted_outcomes": {
                    "wait_reduction": opt.get("predicted_wait_reduction",0),
                    "throughput_increase": opt.get("predicted_throughput_increase",0),
                    "utilization_improvement": opt.get("predicted_utilization_improvement",0),
                }, "model": "fallback"}

    def _fallback_shift_report(self, state: dict, history: List[dict]) -> str:
        """
        Generates a deterministic shift handover report using real metric values from the hospital state when the LLM is unavailable.

        Parameters:
            state: The current hospital state dict with "metrics", "departments", and "alerts".
            history: A list of past state snapshots. Currently not read in the fallback logic but included to match the async method's signature.

        Returns:
            A 5-sentence plain-text string covering overall hospital status, ER queue, bed and ICU utilization, active alert count, and priority for the incoming shift.

        Called from:
            generate_shift_report when _call returns None.
        """
        m  = state.get("metrics",{})
        er = state.get("departments",{}).get("er",{})
        alerts = state.get("alerts",[])
        bed_util = m.get("bed_utilization",0)
        status = "critical" if bed_util > 0.90 else ("elevated" if bed_util > 0.75 else "stable")
        icu_util = m.get("icu_utilization",0)
        er_queue = er.get("queue_length",0)
        priority = (
            "ICU capacity is the immediate concern" if icu_util > 0.85 else
            f"ER queue of {er_queue} requires additional triage staff" if er_queue > 10 else
            "maintain current staffing ratios"
        )
        alert_count = len([a for a in alerts if not a.get("resolved",False)])
        return (
            f"Hospital is {status} with {m.get('active_patients',0)} active patients. "
            f"Avg wait {m.get('avg_wait_time',0):.0f}m, {er_queue} queued in ER. "
            f"Beds {bed_util*100:.0f}%, ICU {icu_util*100:.0f}%, {m.get('critical_patients',0)} critical. "
            f"{'Warning: '+str(alert_count)+' unresolved alerts.' if alert_count else 'No critical alerts.'} "
            f"Incoming shift: {priority}."
        )


# ─────────────────────────────────────────────────────────────────────────────
# CARE COORDINATION
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class Specialist:
    specialist_id: str; name: str; specialty: str; role: str
    avg_consult_min: int; patient_load: int; queue_length: int; busy_min: int
    current_assignment: str = ""

    def _available_in(self, now: float) -> int:
        """
        Estimates how many minutes until this specialist becomes available, using a deterministic phase calculation based on their busy time and consult cycle.

        Parameters:
            now: The current simulation time in minutes, used to determine where in the specialist's work cycle they currently are.

        Returns:
            An integer number of minutes until available. Returns 0 immediately if the specialist is not currently busy.

        Called from:
            to_dict (via avail) and _find_specialist / _patient_dict inside CareCoordinator.
        """
        if self.busy_min <= 0:
            return 0
        cycle = 30 + self.avg_consult_min
        seed  = int(self.specialist_id, 16) % cycle
        phase = (now + seed) % cycle
        busy_window = min(self.busy_min, cycle - 1)
        return round(busy_window - phase) if phase < busy_window else 0

    def to_dict(self, now: float) -> dict:
        """
        Converts this Specialist dataclass into a plain dictionary with a computed availability status and current assignment label, suitable for sending over the API.

        Parameters:
            now: The current simulation time in minutes, used to calculate how many minutes until this specialist is available.

        Returns:
            A dictionary with all specialist fields plus "available_in_min" (int) and "status" (one of "available", "in_surgery", or "busy"). The current_assignment field shows "Available for consult" when they are free.

        Called from:
            CareCoordinator._specialist_dict, which may further overwrite fields based on active bottleneck constraints.
        """
        avail = self._available_in(now)
        status = "available" if avail == 0 else (
            "in_surgery" if ("Surgery" in self.current_assignment or "OR" in self.current_assignment) else "busy"
        )
        return {
            "specialist_id": self.specialist_id, "name": self.name,
            "specialty": self.specialty, "role": self.role,
            "avg_consult_min": self.avg_consult_min,
            "patient_load": self.patient_load, "queue_length": self.queue_length,
            "available_in_min": avail, "status": status,
            "current_assignment": self.current_assignment if avail > 0 else "Available for consult",
        }


@dataclass
class FixedBottleneck:
    bottleneck_id: str; resource_name: str; resource_type: str
    status: str; priority: str; notes: str = ""
    start_label: str = ""; release_label: str = ""
    release_at: Optional[float] = None; created_at: float = 0.0

    def to_dict(self, now: float) -> dict:
        """
        Converts this FixedBottleneck dataclass into a plain dictionary, computing how many minutes remain until the constraint is released.

        Parameters:
            now: The current simulation time in minutes, used to calculate the remaining time before this bottleneck resolves.

        Returns:
            A dictionary with all bottleneck fields plus "release_in_min" (int or None if no release time is set) and "active" (True while the resource is still unavailable).

        Called from:
            CareCoordinator.get_state and CareCoordinator._matching_bottleneck.
        """
        release_in = max(0, round(self.release_at - now)) if self.release_at is not None else None
        return {
            "bottleneck_id": self.bottleneck_id, "resource_name": self.resource_name,
            "resource_type": self.resource_type, "status": self.status,
            "priority": self.priority, "notes": self.notes,
            "start_label": self.start_label, "release_label": self.release_label,
            "release_in_min": release_in, "active": release_in is None or release_in > 0,
        }


@dataclass
class TrackedPatient:
    patient_id: str; name: str; age: int; condition: str
    severity: str; priority: str; awaiting_specialty: str; preferred_role: str
    ed_wait_base: float; target_window_min: int; base_risk: float
    pathway: List[str] = field(default_factory=list); created_at: float = 0.0

    def wait_min(self, now: float) -> float:
        """
        Calculates this tracked patient's current total wait time in minutes, combining their pre-existing ER wait baseline with up to 12 additional minutes of elapsed simulation time.

        Parameters:
            now: The current simulation time in minutes.

        Returns:
            A float representing the total minutes this patient has been waiting.

        Called from:
            CareCoordinator._patient_dict.
        """
        return self.ed_wait_base + min(12.0, max(0.0, now - self.created_at))

    def risk(self, now: float) -> float:
        """
        Computes this tracked patient's current clinical risk score, starting from their base risk and slowly increasing as elapsed time approaches or exceeds the care target window.

        Parameters:
            now: The current simulation time in minutes.

        Returns:
            A float between 0.0 and 0.99 representing the patient's current risk, where higher values indicate greater urgency.

        Called from:
            CareCoordinator._patient_dict.
        """
        elapsed = min(30.0, max(0.0, now - self.created_at))
        return min(0.99, self.base_risk + min(0.02, (elapsed / max(1, self.target_window_min)) * 0.02))


PREFERRED_ROLES = {
    "Neurology":        ["Stroke Specialist", "Neurocritical Care Physician"],
    "Cardiology":       ["Heart Failure Specialist", "Interventional Cardiologist", "Electrophysiologist"],
    "Pulmonology":      ["Pulmonary Specialist", "Critical Care Specialist"],
    "Orthopedics":      ["Trauma Surgeon", "Joint Replacement Specialist"],
    "Oncology":         ["Medical Oncologist", "Radiation Oncologist"],
    "Gastroenterology": ["GI Specialist"],
    "Emergency Medicine":["Attending Physician", "Trauma Physician"],
}


class CareCoordinator:
    """Specialist roster, fixed bottlenecks, tracked patients, and constraint-aware recommendations."""

    def __init__(self):
        """
        Initializes an empty CareCoordinator with no specialists, no bottlenecks, and no tracked patients; the data is lazily seeded on the first call to get_state.

        Parameters:
            None.

        Returns:
            None — standard __init__ constructor.
        """
        self.specialists: List[Specialist] = []
        self.bottlenecks: Dict[str, FixedBottleneck] = {}
        self.tracked: List[TrackedPatient] = []
        self._seed_done = False

    def _seed(self, now: float = 0.0):
        """
        Populates the coordinator with a realistic set of 19 named specialists, 3 pre-existing bottleneck constraints, and 4 tracked demo patients so the UI has meaningful data from the first request.

        Parameters:
            now: The current simulation time in minutes, used to set created_at and release_at timestamps correctly relative to the simulation clock.

        Returns:
            None — mutates self.specialists, self.bottlenecks, and self.tracked in place.

        Called from:
            _ensure_seeded, which calls this exactly once per CareCoordinator instance.
        """
        s   = lambda *a, **k: self.specialists.append(Specialist(*a, **k))
        sid = lambda: uuid.uuid4().hex[:6].upper()
        s(sid(), "Dr. Alan Reyes",    "Cardiology",        "Interventional Cardiologist",   35, 4, 2, 28, "Cath Lab — STEMI")
        s(sid(), "Dr. Nina Patel",    "Cardiology",        "Electrophysiologist",            30, 2, 1,  0)
        s(sid(), "Dr. Omar Haddad",   "Cardiology",        "Heart Failure Specialist",       25, 5, 3, 18, "Inpatient rounds")
        s(sid(), "Dr. Grace Liu",     "Neurology",         "Stroke Specialist",              20, 3, 2, 12, "Reading CT angiography")
        s(sid(), "Dr. Peter Novak",   "Neurology",         "Neurocritical Care Physician",   30, 4, 1, 40, "ICU consult")
        s(sid(), "Dr. Sara Kim",      "Pulmonology",       "Pulmonary Specialist",           25, 3, 1,  0)
        s(sid(), "Dr. Luis Mendez",   "Pulmonology",       "Critical Care Specialist",       30, 5, 2, 22, "ICU ventilator management")
        s(sid(), "Dr. Emma Wright",   "Orthopedics",       "Trauma Surgeon",                 40, 2, 1,  8)
        s(sid(), "Dr. Raj Sharma",    "Orthopedics",       "Joint Replacement Specialist",   45, 1, 0,  0)
        s(sid(), "Dr. Chen Wei",      "Oncology",          "Medical Oncologist",             30, 3, 2, 35, "Chemotherapy planning")
        s(sid(), "Dr. Maria Costa",   "Oncology",          "Radiation Oncologist",           35, 2, 1, 50, "Treatment planning")
        s(sid(), "Dr. John Park",     "Gastroenterology",  "GI Specialist",                  30, 2, 1, 15)
        s(sid(), "Dr. Aisha Bello",   "Emergency Medicine","Attending Physician",            15, 8, 4,  0)
        s(sid(), "Dr. Tom Fischer",   "Emergency Medicine","Trauma Physician",               20, 6, 3,  5, "Trauma bay")
        s(sid(), "R. Daniels, RT",    "Shared",            "Respiratory Therapist",          20, 6, 2,  0)
        s(sid(), "M. Okafor, PT",     "Shared",            "Physical Therapist",             25, 4, 1, 18)
        s(sid(), "K. Schmidt, PharmD","Shared",            "Pharmacist",                     10, 9, 3,  0)
        s(sid(), "L. Tran, RN",       "Shared",            "Case Manager",                   20, 7, 2,  8)
        s(sid(), "P. Adeyemi, MSW",   "Shared",            "Social Worker",                  30, 5, 1, 25)

        for data in [
            {"resource_name":"Dr. Sarah Chen","resource_type":"Specialist","status":"In CABG Surgery",
             "priority":"high","notes":"Cardiac surgeon — cannot be interrupted","release_label":"2:45 PM","release_in_min":75},
            {"resource_name":"MRI Suite 2","resource_type":"Equipment","status":"Scheduled maintenance",
             "priority":"medium","notes":"Coil calibration — imaging routed to Suite 1","release_label":"1:30 PM","release_in_min":40},
            {"resource_name":"Dr. Omar Haddad","resource_type":"Specialist","status":"Covering Cardiac ICU emergency",
             "priority":"high","notes":"Heart failure specialist pulled to ICU","release_label":"3:10 PM","release_in_min":100},
        ]:
            self.add_bottleneck(data, now=now)

        self.tracked = [
            TrackedPatient("EXEC-1001","James Wilson",67,"Acute Stroke","critical","critical","Neurology","Stroke Specialist",52,25,0.93,["CT Angiography","Neuro ICU","tPA Window"],created_at=now),
            TrackedPatient("EXEC-1002","Maria Rodriguez",74,"Heart Failure Exacerbation","high","high","Cardiology","Heart Failure Specialist",94,60,0.87,["Labs","Echocardiogram","Telemetry","Ward"],created_at=now),
            TrackedPatient("EXEC-1003","Kevin Thompson",46,"Pneumonia","medium","moderate","Pulmonology","Pulmonary Specialist",37,120,0.43,["Chest X-Ray","Labs","Ward"],created_at=now),
            TrackedPatient("EXEC-1004","Emily Carter",28,"Minor Fracture","low","low","Orthopedics","Trauma Surgeon",18,180,0.12,["X-Ray","Casting","Discharge"],created_at=now),
        ]

    def _ensure_seeded(self, now: float):
        """
        Calls _seed exactly once for the lifetime of this CareCoordinator instance, guarded by a flag so repeated calls are free.

        Parameters:
            now: The current simulation time in minutes, passed through to _seed for timestamp accuracy.

        Returns:
            None.

        Called from:
            get_state, which must ensure data is seeded before responding to any request.
        """
        if not self._seed_done:
            self._seed_done = True
            self._seed(now)

    def add_bottleneck(self, data: dict, now: float = 0.0) -> dict:
        """
        Creates a new FixedBottleneck from the provided data dict, registers it in the internal bottlenecks store, and returns its serialized representation.

        Parameters:
            data: A dictionary describing the bottleneck. Recognized keys are "bottleneck_id" (auto-generated if absent), "resource_name", "resource_type", "status", "priority", "notes", "start_label", "release_label", and "release_in_min" (minutes from now until the constraint lifts).
            now: The current simulation time in minutes, used to calculate the absolute release_at timestamp.

        Returns:
            A dictionary (via FixedBottleneck.to_dict) representing the newly created bottleneck, including the generated ID and computed release_in_min.

        Called from:
            _seed (for pre-seeding demo bottlenecks) and the care coordination API route when a user manually registers a new constraint.
        """
        bid = data.get("bottleneck_id") or f"BN-{uuid.uuid4().hex[:5].upper()}"
        release_in = data.get("release_in_min")
        release_at = (now + float(release_in)) if release_in not in (None, "") else None
        bn = FixedBottleneck(
            bottleneck_id=bid, resource_name=data.get("resource_name","Unnamed"),
            resource_type=data.get("resource_type","Equipment"),
            status=data.get("status","Unavailable"), priority=data.get("priority","medium"),
            notes=data.get("notes",""), start_label=data.get("start_label",""),
            release_label=data.get("release_label",""), release_at=release_at, created_at=now,
        )
        self.bottlenecks[bid] = bn
        return bn.to_dict(now)

    def remove_bottleneck(self, bottleneck_id: str) -> bool:
        """
        Removes a bottleneck from the internal store by its ID.

        Parameters:
            bottleneck_id: The unique string ID of the bottleneck to remove (e.g., "BN-A3F21").

        Returns:
            True if a bottleneck with that ID existed and was removed; False if no matching ID was found.

        Called from:
            The care coordination API route when a user resolves or deletes a constraint.
        """
        return self.bottlenecks.pop(bottleneck_id, None) is not None

    def get_patient(self, patient_id: str, now: float) -> Optional[dict]:
        """
        Looks up a single tracked patient by their ID and returns their full enriched dictionary, or None if not found.

        Parameters:
            patient_id: The unique string ID of the patient to find (e.g., "EXEC-1001").
            now: The current simulation time in minutes, used to compute dynamic fields like current wait time and risk score.

        Returns:
            A patient dictionary (via _patient_dict) with all fields including specialist assignment and recommendation, or None if the ID does not match any tracked patient.

        Called from:
            The care coordination API route when fetching details for one specific patient.
        """
        for tp in self.tracked:
            if tp.patient_id == patient_id:
                return self._patient_dict(tp, now)
        return None

    def get_state(self, now: float) -> dict:
        """
        Returns a complete snapshot of the care coordination layer — all specialists, active bottlenecks, and tracked patients — with all time-dependent fields computed for the current moment.

        Parameters:
            now: The current simulation time in minutes, passed through to all child serialization methods that need to compute availability, wait times, and risk scores.

        Returns:
            A dictionary with three keys: "specialists" (list of specialist dicts), "bottlenecks" (list of bottleneck dicts), and "tracked_patients" (list of patient dicts). Seeds demo data on first call.

        Called from:
            The care coordination API route when the frontend loads the Care Coordination page or polls for updates.
        """
        self._ensure_seeded(now)
        return {
            "specialists": [self._specialist_dict(sp, now) for sp in self.specialists],
            "bottlenecks": [bn.to_dict(now) for bn in self.bottlenecks.values()],
            "tracked_patients": [self._patient_dict(tp, now) for tp in self.tracked],
        }

    def get_recommendations(self, now: float) -> List[dict]:
        """
        Builds a priority-sorted list of care recommendations, one per tracked patient, combining each patient's current risk and wait data with the recommendation produced by _build_recommendation.

        Parameters:
            now: The current simulation time in minutes, used to compute up-to-date wait times and risk scores for each patient.

        Returns:
            A list of recommendation dicts sorted by patient priority (critical first), each containing patient identity fields, risk percentage, wait time, and the full recommendation dict.

        Called from:
            The care coordination API route when the frontend requests the recommendations panel.
        """
        order = {"critical":0,"high":1,"moderate":2,"low":3}
        recs = []
        for tp in self.tracked:
            pd = self._patient_dict(tp, now)
            recs.append({"patient_id":tp.patient_id,"patient_name":tp.name,
                         "condition":tp.condition,"priority":tp.priority,
                         "risk_pct":pd["risk_pct"],"ed_wait_min":pd["ed_wait_min"],
                         **pd["recommendation"]})
        recs.sort(key=lambda r: order.get(r["priority"],9))
        return recs

    def _find_specialist(self, specialty: str, preferred_role: str, now: float) -> Optional[Specialist]:
        """
        Finds the best available specialist for a given specialty, preferring the exact role requested and then sorting by soonest available.

        Parameters:
            specialty: The medical specialty to match (e.g., "Neurology", "Cardiology").
            preferred_role: The ideal role within that specialty (e.g., "Stroke Specialist").
            now: The current simulation time in minutes, used to evaluate how soon each candidate becomes available.

        Returns:
            The Specialist object that is expected to be available soonest, preferring the exact role if any match. Returns None if no specialist with the given specialty is on the roster.

        Called from:
            _patient_dict, which needs the best specialist match to generate the patient's recommendation.
        """
        pool = [sp for sp in self.specialists if sp.specialty == specialty]
        if not pool:
            return None
        ranked = PREFERRED_ROLES.get(specialty, [])
        preferred = [sp for sp in pool if sp.role == preferred_role]
        if preferred:
            preferred.sort(key=lambda sp: sp._available_in(now))
            return preferred[0]
        pool.sort(key=lambda sp: (sp._available_in(now), ranked.index(sp.role) if sp.role in ranked else len(ranked)))
        return pool[0]

    def _matching_bottleneck(self, name: str, now: float) -> Optional[FixedBottleneck]:
        """
        Checks the active bottleneck list for any specialist or doctor constraint whose resource name partially matches the given name string.

        Parameters:
            name: The full or partial name of the person or resource to check (e.g., "Dr. Sarah Chen").
            now: The current simulation time in minutes, used to determine whether each bottleneck is still active.

        Returns:
            The first active FixedBottleneck whose resource name contains or is contained by the given name (case-insensitive), or None if no match is found.

        Called from:
            _specialist_dict (to overlay bottleneck status on a specialist) and _blocking_bottleneck (to check a specific specialist).
        """
        low = name.lower()
        for bn in self.bottlenecks.values():
            if bn.resource_type not in ("Specialist","Doctor","Nurse"):
                continue
            if not bn.to_dict(now)["active"]:
                continue
            rn = bn.resource_name.lower()
            if rn in low or low in rn:
                return bn
        return None

    def _blocking_bottleneck(self, specialist: Optional[Specialist], now: float) -> Optional[FixedBottleneck]:
        """
        Returns the active bottleneck that is blocking the given specialist, or None if the specialist is unblocked or not provided.

        Parameters:
            specialist: The Specialist to check, or None. If None, this method always returns None.
            now: The current simulation time in minutes, forwarded to _matching_bottleneck for active-status filtering.

        Returns:
            A FixedBottleneck if one is actively blocking this specialist's availability, otherwise None.

        Called from:
            _patient_dict, which needs to know whether the assigned specialist is constrained before building the recommendation.
        """
        return self._matching_bottleneck(specialist.name, now) if specialist else None

    def _specialist_dict(self, sp: Specialist, now: float) -> dict:
        """
        Produces the serialized dictionary for a specialist, overlaying any active bottleneck constraint on top of the specialist's own availability fields.

        Parameters:
            sp: The Specialist dataclass instance to serialize.
            now: The current simulation time in minutes, passed to both Specialist.to_dict and the bottleneck lookup.

        Returns:
            A dictionary based on Specialist.to_dict but with "available_in_min", "status", and "current_assignment" overwritten when an active bottleneck is constraining this specialist. Also adds a "constrained" boolean key.

        Called from:
            get_state (for the specialists list) and _patient_dict (for the "specialist" field on each patient).
        """
        d  = sp.to_dict(now)
        bn = self._matching_bottleneck(sp.name, now)
        if bn:
            bd = bn.to_dict(now)
            d["available_in_min"] = bd["release_in_min"] if bd["release_in_min"] is not None else 999
            d["status"] = "in_surgery" if ("surg" in bn.status.lower() or " or" in bn.status.lower()) else "busy"
            d["current_assignment"] = bn.status
            d["constrained"] = True
        else:
            d["constrained"] = False
        return d

    def _patient_dict(self, tp: TrackedPatient, now: float) -> dict:
        """
        Builds the full enriched dictionary for a tracked patient, computing current wait time, risk score, specialist assignment, and a care recommendation in one pass.

        Parameters:
            tp: The TrackedPatient dataclass instance to serialize.
            now: The current simulation time in minutes, used for all dynamic calculations (wait, risk, specialist availability).

        Returns:
            A dictionary with all patient identity fields, computed "ed_wait_min", "total_wait_time", "risk_score", "risk_pct", an "over_target" flag, the assigned "specialist" dict (or None), and a "recommendation" dict from _build_recommendation.

        Called from:
            get_state, get_patient, and get_recommendations.
        """
        wait  = tp.wait_min(now)
        risk  = tp.risk(now)
        sp    = self._find_specialist(tp.awaiting_specialty, tp.preferred_role, now)
        blocker = self._blocking_bottleneck(sp, now)
        return {
            "patient_id": tp.patient_id, "name": tp.name, "age": tp.age,
            "condition": tp.condition, "chief_complaint": tp.condition,
            "severity": tp.severity, "priority": tp.priority,
            "awaiting_specialty": tp.awaiting_specialty, "preferred_role": tp.preferred_role,
            "ed_wait_min": round(wait), "total_wait_time": round(wait),
            "target_window_min": tp.target_window_min,
            "over_target": wait > tp.target_window_min,
            "over_target_min": max(0, round(wait - tp.target_window_min)),
            "risk_score": round(risk, 2), "risk_pct": round(risk * 100),
            "pathway": tp.pathway,
            "specialist": self._specialist_dict(sp, now) if sp else None,
            "recommendation": self._build_recommendation(tp, sp, blocker, wait, risk, now),
        }

    def _build_recommendation(self, tp, sp, blocker, wait, risk, now) -> dict:
        """
        Constructs the care recommendation dict for one tracked patient, explaining whether they are on time or overdue, who their assigned specialist is, whether that specialist is blocked, and what the alternative or direct action should be.

        Parameters:
            tp: The TrackedPatient dataclass being evaluated.
            sp: The best-matched Specialist for this patient, or None if no match exists on the roster.
            blocker: The FixedBottleneck currently constraining sp, or None if sp is unblocked.
            wait: The patient's current wait time in minutes (already computed by wait_min).
            risk: The patient's current risk score between 0.0 and 0.99 (already computed by risk).
            now: The current simulation time in minutes, used for specialist ETA and alternative specialist lookups.

        Returns:
            A dictionary with keys: "title" (action heading), "reasons" (list of plain-English sentences), "deterioration_reduction" (int percentage), "throughput_improvement" (int percentage), "blocked" (bool), "alternative" (alternative specialist name or None), and "urgency" (the patient's priority string).

        Called from:
            _patient_dict, which embeds this dict as the "recommendation" field.
        """
        reasons: List[str] = []
        if wait > tp.target_window_min:
            reasons.append(f"{tp.condition} exceeds {tp.target_window_min}-min target (waited {round(wait)}m)")
        else:
            reasons.append(f"{tp.condition} within {tp.target_window_min}-min target ({round(wait)}m elapsed)")
        alternative = None
        if sp:
            eta = sp.to_dict(now)["available_in_min"]
            if blocker:
                bd    = blocker.to_dict(now)
                until = bd["release_label"] or (f"{bd['release_in_min']}m" if bd["release_in_min"] is not None else "later")
                alt   = self._find_alternative(tp, sp, now)
                alternative = alt.name if alt else None
                reasons.append(f"{blocker.resource_name} is a fixed constraint until {until}")
                if alt:
                    alt_eta = alt.to_dict(now)["available_in_min"]
                    reasons.append(f"Reroute to {alt.role} {alt.name} — " +
                                   ("available now" if alt_eta == 0 else f"available in {alt_eta}m"))
            else:
                reasons.append(f"{sp.role} {sp.name} is " + ("available now" if eta == 0 else f"available in {eta}m"))
        else:
            reasons.append(f"No {tp.awaiting_specialty} specialist on roster")
        deterioration = round(risk * 19)
        throughput    = {"critical":9,"high":7,"moderate":4,"low":2}.get(tp.priority, 4)
        reasons.append(f"Expected deterioration risk reduction: {deterioration}%")
        reasons.append(f"Predicted ED throughput improvement: {throughput}%")
        return {"title": f"Prioritize {tp.awaiting_specialty} Consult for {tp.name}",
                "reasons": reasons, "deterioration_reduction": deterioration,
                "throughput_improvement": throughput,
                "blocked": blocker is not None, "alternative": alternative, "urgency": tp.priority}

    def _find_alternative(self, tp, blocked_sp, now) -> Optional[Specialist]:
        """
        Finds the next best specialist of the same specialty as the patient's preferred one, excluding the currently blocked specialist and any other specialist who is also constrained by a bottleneck.

        Parameters:
            tp: The TrackedPatient whose specialty and preference should be used to filter candidates.
            blocked_sp: The Specialist who is already determined to be unavailable (excluded from results).
            now: The current simulation time in minutes, used to evaluate bottleneck status and sort by availability.

        Returns:
            The unblocked specialist of the same specialty who can become available soonest, or None if no suitable alternative exists.

        Called from:
            _build_recommendation, when the primary specialist is blocked and an alternative needs to be suggested.
        """
        pool = [sp for sp in self.specialists
                if sp.specialty == tp.awaiting_specialty
                and sp.specialist_id != blocked_sp.specialist_id
                and not self._blocking_bottleneck(sp, now)]
        if not pool:
            return None
        pool.sort(key=lambda sp: sp._available_in(now))
        return pool[0]
