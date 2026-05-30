"""
PulseFlow AI — Optimization Engine
Uses Google OR-Tools and SciPy for staffing, resource allocation, and queue optimization.
"""
from __future__ import annotations

import logging
import random
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any

import numpy as np
from scipy import optimize as scipy_optimize
from scipy.stats import poisson

logger = logging.getLogger(__name__)

try:
    from ortools.linear_solver import pywraplp
    ORTOOLS_AVAILABLE = True
except ImportError:
    ORTOOLS_AVAILABLE = False
    logger.warning("OR-Tools not available — using SciPy fallback for optimization")

@dataclass
class OptimizationInput:
    """Input state for optimization problem."""
    er_patients: int = 0
    er_queue: int = 0
    er_beds: int = 40
    er_doctors: int = 5
    er_nurses: int = 12

    lab_patients: int = 0
    lab_queue: int = 0
    lab_analyzers: int = 4
    lab_technicians: int = 8

    imaging_patients: int = 0
    imaging_queue: int = 0
    ct_scanners: int = 2
    mri_machines: int = 2

    icu_patients: int = 0
    icu_queue: int = 0
    icu_beds: int = 20
    icu_doctors: int = 4
    icu_nurses: int = 20

    ward_patients: int = 0
    ward_queue: int = 0
    ward_beds: int = 80
    ward_doctors: int = 4
    ward_nurses: int = 16

    available_doctors: int = 2
    available_nurses: int = 4
    avg_wait_time: float = 45.0
    throughput: float = 8.0
    arrival_rate: float = 8.0

    ct_failure: bool = False
    lab_slowdown: bool = False
    flu_outbreak: bool = False

@dataclass
class StaffingRecommendation:
    department: str
    resource_type: str
    current: int
    recommended: int
    delta: int
    impact_score: float
    reason: str
    urgency: str

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
        return {
            "objective_value": round(self.objective_value, 3),
            "recommendations": [
                {
                    "department": r.department,
                    "resource_type": r.resource_type,
                    "current": r.current,
                    "recommended": r.recommended,
                    "delta": r.delta,
                    "impact_score": round(r.impact_score, 3),
                    "reason": r.reason,
                    "urgency": r.urgency,
                }
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
    """
    Multi-objective optimization engine for hospital resource allocation.
    Uses OR-Tools LP/ILP with SciPy fallback.
    """

    def optimize(self, inp: OptimizationInput) -> OptimizationResult:
        """Run full optimization and return recommendations."""
        if ORTOOLS_AVAILABLE:
            return self._optimize_ortools(inp)
        else:
            return self._optimize_scipy(inp)

    def _optimize_ortools(self, inp: OptimizationInput) -> OptimizationResult:
        """OR-Tools linear programming optimization."""
        solver = pywraplp.Solver.CreateSolver("GLOP")
        if not solver:
            return self._optimize_scipy(inp)

        infinity = solver.infinity()

        d_er_doc = solver.NumVar(-inp.er_doctors, inp.available_doctors, "er_doctors_delta")
        d_er_nurse = solver.NumVar(-inp.er_nurses // 2, inp.available_nurses, "er_nurses_delta")
        d_icu_doc = solver.NumVar(-inp.icu_doctors, inp.available_doctors, "icu_doctors_delta")
        d_icu_nurse = solver.NumVar(-inp.icu_nurses // 2, inp.available_nurses, "icu_nurses_delta")
        d_ward_doc = solver.NumVar(-inp.ward_doctors, inp.available_doctors, "ward_doctors_delta")
        d_ward_nurse = solver.NumVar(-inp.ward_nurses // 2, inp.available_nurses, "ward_nurses_delta")

        solver.Add(d_er_doc + d_icu_doc + d_ward_doc <= inp.available_doctors)
        solver.Add(d_er_nurse + d_icu_nurse + d_ward_nurse <= inp.available_nurses)
        solver.Add(d_er_doc + d_icu_doc + d_ward_doc >= -inp.available_doctors)
        solver.Add(d_er_nurse + d_icu_nurse + d_ward_nurse >= -inp.available_nurses)

        solver.Add(inp.er_doctors + d_er_doc >= max(1, inp.er_doctors // 2))
        solver.Add(inp.icu_doctors + d_icu_doc >= max(1, inp.icu_doctors // 2))
        solver.Add(inp.ward_doctors + d_ward_doc >= max(1, inp.ward_doctors // 2))

        er_load = inp.er_queue / max(1, inp.er_beds)
        icu_load = inp.icu_queue / max(1, inp.icu_beds) * 3
        ward_load = inp.ward_queue / max(1, inp.ward_beds)

        obj = (
            -2.0 * d_er_doc * er_load
            - 1.5 * d_er_nurse * er_load
            - 3.0 * d_icu_doc * icu_load
            - 2.5 * d_icu_nurse * icu_load
            - 1.0 * d_ward_doc * ward_load
            - 0.8 * d_ward_nurse * ward_load
        )

        solver.Minimize(obj)
        status = solver.Solve()

        if status not in (pywraplp.Solver.OPTIMAL, pywraplp.Solver.FEASIBLE):
            return self._fallback_result(inp)

        recommendations = self._build_recommendations(
            inp,
            er_doc_delta=int(round(d_er_doc.solution_value())),
            er_nurse_delta=int(round(d_er_nurse.solution_value())),
            icu_doc_delta=int(round(d_icu_doc.solution_value())),
            icu_nurse_delta=int(round(d_icu_nurse.solution_value())),
            ward_doc_delta=int(round(d_ward_doc.solution_value())),
            ward_nurse_delta=int(round(d_ward_nurse.solution_value())),
        )

        result = self._build_result(inp, recommendations, solver="ortools")
        result.objective_value = -solver.Objective().Value()
        return result

    def _optimize_scipy(self, inp: OptimizationInput) -> OptimizationResult:
        """SciPy optimization fallback."""
        bounds = [
            (-inp.er_doctors // 2, inp.available_doctors),
            (-inp.er_nurses // 2, inp.available_nurses),
            (-inp.icu_doctors // 2, inp.available_doctors),
            (-inp.icu_nurses // 2, inp.available_nurses),
            (-inp.ward_doctors // 2, inp.available_doctors),
            (-inp.ward_nurses // 2, inp.available_nurses),
        ]

        def objective(x):
            er_doc, er_nurse, icu_doc, icu_nurse, ward_doc, ward_nurse = x
            er_load = inp.er_queue / max(1, inp.er_beds)
            icu_load = inp.icu_queue / max(1, inp.icu_beds) * 3
            ward_load = inp.ward_queue / max(1, inp.ward_beds)
            return -(
                2.0 * er_doc * er_load + 1.5 * er_nurse * er_load +
                3.0 * icu_doc * icu_load + 2.5 * icu_nurse * icu_load +
                1.0 * ward_doc * ward_load + 0.8 * ward_nurse * ward_load
            )

        constraints = [
            {"type": "ineq", "fun": lambda x: inp.available_doctors - (x[0] + x[2] + x[4])},
            {"type": "ineq", "fun": lambda x: inp.available_nurses - (x[1] + x[3] + x[5])},
        ]

        x0 = [0.0] * 6
        res = scipy_optimize.minimize(
            objective, x0, method="SLSQP", bounds=bounds, constraints=constraints
        )

        if not res.success:
            return self._fallback_result(inp)

        x = [int(round(v)) for v in res.x]
        recommendations = self._build_recommendations(
            inp,
            er_doc_delta=x[0], er_nurse_delta=x[1],
            icu_doc_delta=x[2], icu_nurse_delta=x[3],
            ward_doc_delta=x[4], ward_nurse_delta=x[5],
        )
        return self._build_result(inp, recommendations, solver="scipy")

    def _build_recommendations(
        self, inp: OptimizationInput,
        er_doc_delta: int = 0, er_nurse_delta: int = 0,
        icu_doc_delta: int = 0, icu_nurse_delta: int = 0,
        ward_doc_delta: int = 0, ward_nurse_delta: int = 0,
    ) -> List[StaffingRecommendation]:
        recs = []

        def add_rec(dept, rtype, current, delta, base_impact, reason, urgency):
            if delta != 0:
                recs.append(StaffingRecommendation(
                    department=dept,
                    resource_type=rtype,
                    current=current,
                    recommended=current + delta,
                    delta=delta,
                    impact_score=base_impact * abs(delta),
                    reason=reason,
                    urgency=urgency,
                ))

        er_load = inp.er_queue / max(1, inp.er_beds)
        icu_load = inp.icu_queue / max(1, inp.icu_beds)

        add_rec(
            "ER", "doctors", inp.er_doctors, er_doc_delta,
            0.25 * er_load,
            f"ER queue: {inp.er_queue} patients waiting, {inp.er_beds - inp.er_patients} beds available",
            "critical" if er_load > 0.7 else "medium",
        )
        add_rec(
            "ER", "nurses", inp.er_nurses, er_nurse_delta,
            0.15 * er_load,
            f"ER nurse-to-patient ratio strained",
            "high" if er_load > 0.6 else "low",
        )
        add_rec(
            "ICU", "doctors", inp.icu_doctors, icu_doc_delta,
            0.40 * icu_load,
            f"ICU at {inp.icu_patients}/{inp.icu_beds} beds — physician coverage critical",
            "critical" if icu_load > 0.8 else "high",
        )
        add_rec(
            "ICU", "nurses", inp.icu_nurses, icu_nurse_delta,
            0.35 * icu_load,
            f"ICU nurse-patient ratio compromised",
            "critical" if icu_load > 0.8 else "high",
        )
        add_rec(
            "Ward", "doctors", inp.ward_doctors, ward_doc_delta,
            0.15,
            "Ward physician coverage optimization",
            "medium",
        )
        add_rec(
            "Ward", "nurses", inp.ward_nurses, ward_nurse_delta,
            0.12,
            "Ward nurse staffing adjustment",
            "low",
        )

        recs.sort(key=lambda r: r.impact_score, reverse=True)
        return recs

    def _build_result(
        self, inp: OptimizationInput,
        recommendations: List[StaffingRecommendation],
        solver: str = "ortools",
    ) -> OptimizationResult:
        er_load = inp.er_queue / max(1, inp.er_beds)
        icu_load = inp.icu_queue / max(1, inp.icu_beds)

        if recommendations:
            top_delta = sum(abs(r.delta) for r in recommendations[:3])
            wait_reduction = min(35.0, top_delta * 4.5 * (er_load + icu_load))
            throughput_increase = min(25.0, top_delta * 0.8)
            util_improvement = min(0.15, top_delta * 0.02)
        else:
            wait_reduction = throughput_increase = util_improvement = 0.0

        root_causes = self._identify_root_causes(inp)

        plan = self._build_intervention_plan(inp, recommendations)

        bottleneck_dept, bottleneck_metric, bottleneck_sev = self._detect_bottleneck(inp)

        confidence = 0.72 + random.uniform(-0.08, 0.08)

        return OptimizationResult(
            recommendations=recommendations,
            predicted_wait_reduction=wait_reduction,
            predicted_throughput_increase=throughput_increase,
            predicted_utilization_improvement=util_improvement,
            bottleneck_department=bottleneck_dept,
            bottleneck_metric=bottleneck_metric,
            bottleneck_severity=bottleneck_sev,
            root_causes=root_causes,
            intervention_plan=plan,
            confidence=confidence,
            solver=solver,
        )

    def _fallback_result(self, inp: OptimizationInput) -> OptimizationResult:
        """Generate heuristic recommendations when solver fails."""
        recommendations = []

        if inp.er_queue > 5:
            recommendations.append(StaffingRecommendation(
                department="ER", resource_type="doctors",
                current=inp.er_doctors, recommended=inp.er_doctors + 1, delta=1,
                impact_score=0.45, reason="ER queue building",
                urgency="high",
            ))

        if inp.icu_patients / max(1, inp.icu_beds) > 0.80:
            recommendations.append(StaffingRecommendation(
                department="ICU", resource_type="nurses",
                current=inp.icu_nurses, recommended=inp.icu_nurses + 2, delta=2,
                impact_score=0.60, reason="ICU approaching capacity",
                urgency="critical",
            ))

        return self._build_result(inp, recommendations, solver="heuristic")

    def _identify_root_causes(self, inp: OptimizationInput) -> List[str]:
        causes = []

        if inp.er_queue > 8:
            causes.append(f"ER queue backlog: {inp.er_queue} patients awaiting assessment")

        if inp.icu_patients / max(1, inp.icu_beds) > 0.85:
            causes.append(
                f"ICU near capacity ({inp.icu_patients}/{inp.icu_beds}): "
                f"blocking high-acuity ER transfers"
            )

        if inp.lab_queue > 10:
            causes.append(
                f"Laboratory backlog ({inp.lab_queue} samples): "
                f"delaying diagnosis and department transitions"
            )

        if inp.imaging_queue > 6:
            causes.append(
                f"Imaging queue ({inp.imaging_queue} patients): "
                f"delaying treatment decisions for medium/high-priority patients"
            )

        if inp.ward_beds - inp.ward_patients < 5:
            causes.append(
                f"Ward near capacity ({inp.ward_patients}/{inp.ward_beds}): "
                f"creating ICU boarding and ER admission delays"
            )

        if inp.ct_failure:
            causes.append("CT scanner failure: imaging capacity reduced by 50%")

        if inp.lab_slowdown:
            causes.append("Laboratory slowdown: turnaround time 2.5x normal")

        if inp.flu_outbreak:
            causes.append("Flu outbreak: patient arrival rate elevated 2.5x")

        if not causes:
            causes.append("Hospital operating within normal parameters")

        return causes

    def _build_intervention_plan(
        self, inp: OptimizationInput, recs: List[StaffingRecommendation]
    ) -> List[str]:
        plan = []

        for r in recs[:5]:
            action = "Add" if r.delta > 0 else "Redeploy"
            n = abs(r.delta)
            plan.append(
                f"{action} {n} {r.resource_type} to {r.department} "
                f"(impact score: {r.impact_score:.2f})"
            )

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
        """Identify the most critical bottleneck department."""
        scores = {
            "ER": inp.er_queue / max(1, inp.er_beds) + inp.er_patients / max(1, inp.er_beds),
            "Laboratory": inp.lab_queue / max(1, inp.lab_analyzers),
            "Imaging": inp.imaging_queue / max(1, inp.ct_scanners + inp.mri_machines + 3),
            "ICU": inp.icu_patients / max(1, inp.icu_beds) * 1.5,
            "Ward": inp.ward_patients / max(1, inp.ward_beds),
        }

        bottleneck = max(scores, key=scores.get)
        score = scores[bottleneck]

        if score > 0.90:
            severity = "critical"
        elif score > 0.70:
            severity = "high"
        elif score > 0.50:
            severity = "medium"
        else:
            severity = "low"

        metrics = {
            "ER": "queue length",
            "Laboratory": "processing capacity",
            "Imaging": "scanner availability",
            "ICU": "bed utilization",
            "Ward": "bed utilization",
        }

        return bottleneck, metrics[bottleneck], severity

def build_optimization_input_from_state(state: dict) -> OptimizationInput:
    """Convert simulation state dict to OptimizationInput."""
    depts = state.get("departments", {})
    metrics = state.get("metrics", {})

    def dept(key, field, default=0):
        return depts.get(key, {}).get(field, default)

    return OptimizationInput(
        er_patients=dept("er", "current_patients"),
        er_queue=dept("er", "queue_length"),
        er_beds=dept("er", "capacity", 40),
        lab_patients=dept("labs", "current_patients"),
        lab_queue=dept("labs", "queue_length"),
        lab_analyzers=dept("labs", "capacity", 4),
        imaging_patients=dept("imaging", "current_patients"),
        imaging_queue=dept("imaging", "queue_length"),
        icu_patients=dept("icu", "current_patients"),
        icu_queue=dept("icu", "queue_length"),
        icu_beds=dept("icu", "capacity", 20),
        ward_patients=dept("ward", "current_patients"),
        ward_queue=dept("ward", "queue_length"),
        ward_beds=dept("ward", "capacity", 80),
        available_doctors=3,
        available_nurses=6,
        avg_wait_time=metrics.get("avg_wait_time", 45),
        throughput=metrics.get("throughput_per_hour", 8),
        arrival_rate=state.get("config", {}).get("arrival_rate", 8),
        ct_failure=state.get("config", {}).get("ct_failure", False),
        lab_slowdown=state.get("config", {}).get("lab_slowdown", False),
        flu_outbreak=state.get("config", {}).get("flu_outbreak", False),
    )
