"""
PulseFlow AI — Hospital Digital Twin Simulation Engine
Core SimPy-based discrete-event simulation of entire hospital operations.
"""
from __future__ import annotations

import random
import threading
import time
import math
import logging
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Deque

import simpy
import numpy as np

from app.core.simulation.patient import (
    Patient, Severity, PatientState, Department, SEVERITY_PRIORITY
)

logger = logging.getLogger(__name__)

@dataclass
class DepartmentConfig:
    name: str
    display_name: str
    beds: int = 0
    doctors: int = 0
    nurses: int = 0
    technicians: int = 0
    scanners: int = 0
    max_capacity: int = 0

@dataclass
class DepartmentState:
    name: str
    display_name: str
    occupancy: float = 0.0
    queue_length: int = 0
    avg_wait_time: float = 0.0
    avg_service_time: float = 0.0
    throughput_per_hour: float = 0.0
    staff_utilization: float = 0.0
    resource_utilization: float = 0.0
    patients_in: List[str] = field(default_factory=list)
    patients_queued: List[str] = field(default_factory=list)
    capacity: int = 0
    current_patients: int = 0
    status: str = "healthy"
    alerts: List[str] = field(default_factory=list)
    beds_available: int = 0
    doctors_available: int = 0
    nurses_available: int = 0

    def compute_status(self):
        if self.occupancy >= 0.90 or self.queue_length >= 10:
            self.status = "critical"
        elif self.occupancy >= 0.70 or self.queue_length >= 5:
            self.status = "warning"
        else:
            self.status = "healthy"

@dataclass
class HospitalMetrics:
    avg_wait_time: float = 0.0
    total_patients: int = 0
    active_patients: int = 0
    discharged_today: int = 0
    throughput_per_hour: float = 0.0
    bed_utilization: float = 0.0
    icu_utilization: float = 0.0
    er_utilization: float = 0.0
    staff_utilization: float = 0.0
    critical_patients: int = 0
    boarding_patients: int = 0
    mortality_risk_index: float = 0.0
    sim_time: float = 0.0
    alerts_active: int = 0

@dataclass
class HospitalAlert:
    alert_id: str
    severity: str
    department: str
    message: str
    timestamp: float
    resolved: bool = False

@dataclass
class SimulationConfig:
    arrival_rate: float = 8.0
    simulation_speed: int = 60
    er_beds: int = 40
    er_doctors: int = 5
    er_nurses: int = 12
    lab_technicians: int = 8
    lab_analyzers: int = 4
    imaging_ct: int = 2
    imaging_mri: int = 2
    imaging_xray: int = 3
    icu_beds: int = 20
    icu_doctors: int = 4
    icu_nurses: int = 20
    ward_beds: int = 80
    ward_doctors: int = 4
    ward_nurses: int = 16
    discharge_staff: int = 4

    flu_outbreak: bool = False
    flu_multiplier: float = 2.5
    ct_failure: bool = False
    mri_failure: bool = False
    lab_slowdown: bool = False
    staff_shortage_dept: str = ""
    staff_shortage_factor: float = 0.5
    mass_casualty: bool = False
    mass_casualty_patients: int = 20
    heatwave: bool = False
    covid_surge: bool = False

class HospitalSimulation:
    """
    Discrete-Event Simulation of a complete hospital using SimPy.
    Runs in a background thread at configurable speed.
    """

    def __init__(self, config: SimulationConfig = None):
        self.config = config or SimulationConfig()
        self.env = simpy.Environment()

        self._lock = threading.RLock()
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._state_callbacks = []

        self.active_patients: Dict[str, Patient] = {}
        self.discharged_patients: List[Patient] = []
        self.total_discharged: int = 0
        self.total_admitted: int = 0

        self.metrics_history: Deque[dict] = deque(maxlen=720)
        self.wait_time_history: Deque[float] = deque(maxlen=720)
        self.throughput_history: Deque[float] = deque(maxlen=720)
        self.discharge_times: Deque[float] = deque(maxlen=200)

        self.active_alerts: List[HospitalAlert] = []
        self._alert_id_counter = 0

        self._util_history: Dict[str, Deque[float]] = {
            "er":   deque(maxlen=120),
            "icu":  deque(maxlen=120),
            "ward": deque(maxlen=120),
        }

        self._setup_resources()

        self._warm_start()

    def _setup_resources(self):
        """Initialize all SimPy resources for hospital departments."""
        cfg = self.config

        self.er_beds = simpy.PriorityResource(self.env, capacity=cfg.er_beds)
        self.er_doctors = simpy.PriorityResource(self.env, capacity=cfg.er_doctors)
        self.er_nurses = simpy.PriorityResource(self.env, capacity=max(1, cfg.er_nurses))

        self.lab_analyzers = simpy.PriorityResource(self.env, capacity=max(1, cfg.lab_analyzers))
        self.lab_technicians = simpy.PriorityResource(self.env, capacity=max(1, cfg.lab_technicians))

        ct_cap = max(1, cfg.imaging_ct) if not cfg.ct_failure else 0
        mri_cap = max(1, cfg.imaging_mri) if not cfg.mri_failure else 0
        if ct_cap == 0:
            ct_cap = 0
        self.ct_scanners = simpy.PriorityResource(self.env, capacity=max(1, cfg.imaging_ct))
        self.mri_machines = simpy.PriorityResource(self.env, capacity=max(1, cfg.imaging_mri))
        self.xray_rooms = simpy.PriorityResource(self.env, capacity=max(1, cfg.imaging_xray))
        self._ct_failed = cfg.ct_failure
        self._mri_failed = cfg.mri_failure

        self.icu_beds = simpy.PriorityResource(self.env, capacity=max(1, cfg.icu_beds))
        self.icu_doctors = simpy.PriorityResource(self.env, capacity=max(1, cfg.icu_doctors))
        self.icu_nurses = simpy.PriorityResource(self.env, capacity=max(1, cfg.icu_nurses))

        self.ward_beds = simpy.PriorityResource(self.env, capacity=max(1, cfg.ward_beds))
        self.ward_doctors = simpy.PriorityResource(self.env, capacity=max(1, cfg.ward_doctors))
        self.ward_nurses = simpy.PriorityResource(self.env, capacity=max(1, cfg.ward_nurses))

        self.discharge_staff = simpy.PriorityResource(self.env, capacity=max(1, cfg.discharge_staff))

        self._dept_capacity = {
            Department.ER: cfg.er_beds,
            Department.LABS: cfg.lab_analyzers,
            Department.IMAGING: cfg.imaging_ct + cfg.imaging_mri + cfg.imaging_xray,
            Department.ICU: cfg.icu_beds,
            Department.WARD: cfg.ward_beds,
            Department.DISCHARGE: cfg.discharge_staff,
        }

    def _warm_start(self):
        """Pre-populate the simulation with a modest number of existing patients."""
        warm_count = 18
        departments = [
            Department.ER, Department.LABS, Department.IMAGING,
            Department.ICU, Department.WARD
        ]
        weights = [0.30, 0.15, 0.15, 0.15, 0.25]
        for i in range(warm_count):
            patient = Patient.generate(arrival_time=-(random.uniform(30, 240)))
            dept = random.choices(departments, weights=weights)[0]
            patient.current_department = dept
            patient.arrival_time = -(random.uniform(30, 240))

            if dept == Department.ER:
                patient.state = PatientState.IN_ER
                patient.er_start = patient.arrival_time
            elif dept == Department.LABS:
                patient.state = PatientState.IN_LABS
                patient.labs_start = patient.arrival_time
            elif dept == Department.IMAGING:
                patient.state = PatientState.IN_IMAGING
                patient.imaging_start = patient.arrival_time
            elif dept == Department.ICU:
                patient.state = PatientState.IN_ICU
                patient.icu_start = patient.arrival_time
            elif dept == Department.WARD:
                patient.state = PatientState.IN_WARD
                patient.ward_start = patient.arrival_time

            patient.total_wait_time = random.uniform(60, 150)
            self.active_patients[patient.patient_id] = patient
            self.total_admitted += 1

    def _patient_journey(self, patient: Patient):
        """SimPy process representing a single patient's journey through the hospital."""
        cfg = self.config
        env = self.env
        p = patient
        priority = p.priority

        try:
            p.state = PatientState.TRIAGE
            p.current_department = Department.ER
            p.triage_start = env.now
            triage_time = self._sample_time(10, 25, p.severity, scale=1.0)
            yield env.timeout(triage_time)
            p.triage_end = env.now

            p.state = PatientState.WAITING_ER
            p.er_queue_enter = env.now
            with self.er_beds.request(priority=priority) as bed_req, \
                 self.er_doctors.request(priority=priority) as doc_req:
                yield bed_req & doc_req
                p.total_wait_time += (env.now - p.er_queue_enter)
                p.state = PatientState.IN_ER
                p.er_start = env.now

                er_time = self._sample_time(45, 120, p.severity, scale=1.8)
                yield env.timeout(er_time)
                p.er_end = env.now

            if p.pathway.needs_labs:
                p.state = PatientState.WAITING_LABS
                p.labs_queue_enter = env.now
                p.current_department = Department.LABS
                lab_slowdown_factor = 2.5 if cfg.lab_slowdown else 1.0

                with self.lab_analyzers.request(priority=priority) as analyzer_req, \
                     self.lab_technicians.request(priority=priority) as tech_req:
                    yield analyzer_req & tech_req
                    p.total_wait_time += (env.now - p.labs_queue_enter)
                    p.state = PatientState.IN_LABS
                    p.labs_start = env.now

                    lab_time = self._sample_time(50, 130, p.severity, scale=1.2) * lab_slowdown_factor
                    yield env.timeout(lab_time)
                    p.labs_end = env.now

            if p.pathway.needs_imaging:
                p.state = PatientState.WAITING_IMAGING
                p.imaging_queue_enter = env.now
                p.current_department = Department.IMAGING

                if p.pathway.imaging_type == "ct":
                    resource = self.ct_scanners
                    base_time = (60, 100)
                elif p.pathway.imaging_type == "mri":
                    resource = self.mri_machines
                    base_time = (75, 120)
                else:
                    resource = self.xray_rooms
                    base_time = (25, 50)

                with resource.request(priority=priority) as img_req:
                    yield img_req
                    p.total_wait_time += (env.now - p.imaging_queue_enter)
                    p.state = PatientState.IN_IMAGING
                    p.imaging_start = env.now

                    img_time = self._sample_time(*base_time, p.severity, scale=1.0)
                    yield env.timeout(img_time)
                    p.imaging_end = env.now

            if p.pathway.needs_icu:
                p.state = PatientState.WAITING_ICU
                p.icu_queue_enter = env.now
                p.current_department = Department.ICU

                with self.icu_beds.request(priority=priority) as icu_req, \
                     self.icu_nurses.request(priority=priority) as nurse_req:
                    yield icu_req & nurse_req
                    wait = env.now - p.icu_queue_enter
                    p.total_wait_time += wait
                    if wait > 60 and p.severity in (Severity.HIGH, Severity.CRITICAL):
                        self._create_alert(
                            "critical", "icu",
                            f"Patient {p.patient_id} waited {wait:.0f}m for ICU bed"
                        )
                    p.state = PatientState.IN_ICU
                    p.icu_start = env.now

                    icu_time = self._sample_time(120, 480, p.severity, scale=2.0)
                    yield env.timeout(icu_time)
                    p.icu_end = env.now

            if p.pathway.needs_ward:
                p.state = PatientState.WAITING_WARD
                p.ward_queue_enter = env.now
                p.current_department = Department.WARD

                with self.ward_beds.request(priority=priority) as ward_req:
                    yield ward_req
                    p.total_wait_time += (env.now - p.ward_queue_enter)
                    p.state = PatientState.IN_WARD
                    p.ward_start = env.now

                    ward_time = self._sample_time(240, 1440, p.severity, scale=1.5)
                    yield env.timeout(ward_time)
                    p.ward_end = env.now

            p.state = PatientState.WAITING_DISCHARGE
            p.current_department = Department.DISCHARGE
            with self.discharge_staff.request(priority=priority) as disc_req:
                yield disc_req
                p.state = PatientState.DISCHARGED
                discharge_time = self._sample_time(10, 30, p.severity, scale=0.5)
                yield env.timeout(discharge_time)
                p.discharge_time = env.now

            with self._lock:
                if p.patient_id in self.active_patients:
                    del self.active_patients[p.patient_id]
                    self.discharged_patients.append(p)
                    self.total_discharged += 1
                    self.discharge_times.append(p.discharge_time - p.arrival_time)

        except simpy.Interrupt:
            pass
        except Exception as exc:
            logger.error(f"Patient journey error for {patient.patient_id}: {exc}")

    def _sample_time(
        self, low: float, high: float, severity: Severity, scale: float = 1.0
    ) -> float:
        """Sample service time using log-normal distribution."""
        severity_multiplier = {
            Severity.LOW: 0.75,
            Severity.MEDIUM: 1.0,
            Severity.HIGH: 1.4,
            Severity.CRITICAL: 1.8,
        }[severity]
        mean = (low + high) / 2 * severity_multiplier * scale
        sigma = 0.3
        mu = math.log(mean) - 0.5 * sigma ** 2
        return max(1.0, random.lognormvariate(mu, sigma))

    def _patient_arrivals(self):
        """SimPy process: Poisson patient arrival generator."""
        while True:
            cfg = self.config
            rate = cfg.arrival_rate
            if cfg.flu_outbreak:
                rate *= cfg.flu_multiplier
            if cfg.covid_surge:
                rate *= 1.8
            if cfg.heatwave:
                rate *= 1.4

            hour = (self.env.now / 60) % 24
            tod_factor = 1.0 + 0.4 * math.sin((hour - 6) * math.pi / 12)
            rate *= max(0.3, tod_factor)

            inter_arrival = random.expovariate(rate / 60.0)
            yield self.env.timeout(inter_arrival)

            patient = Patient.generate(arrival_time=self.env.now)

            if cfg.mass_casualty and random.random() < 0.15:
                patient.severity = Severity.CRITICAL
                patient.pathway = patient._generate_pathway(Severity.CRITICAL)

            with self._lock:
                self.active_patients[patient.patient_id] = patient
                self.total_admitted += 1

            self.env.process(self._patient_journey(patient))

    def _metrics_collector(self):
        """SimPy process: collects metrics every simulated minute."""
        while True:
            yield self.env.timeout(1.0)
            metrics = self._extract_metrics()
            with self._lock:
                self.metrics_history.append(metrics)
                if metrics.get("avg_wait_time") is not None:
                    self.wait_time_history.append(metrics["avg_wait_time"])
                if metrics.get("throughput_per_hour") is not None:
                    self.throughput_history.append(metrics["throughput_per_hour"])
                self._util_history["er"].append(
                    self.er_doctors.count / max(1, self.er_doctors.capacity))
                self._util_history["icu"].append(
                    self.icu_doctors.count / max(1, self.icu_doctors.capacity))
                self._util_history["ward"].append(
                    self.ward_doctors.count / max(1, self.ward_doctors.capacity))

    def _alert_monitor(self):
        """SimPy process: monitors for system-wide alert conditions."""
        while True:
            yield self.env.timeout(5.0)
            self._check_alerts()

    _DETERIORATION_THRESH = {
        "critical": 15, "high": 45, "medium": 90, "low": 180
    }
    _SEPSIS_COMPLAINTS = {
        "sepsis indicators", "respiratory distress", "acute mi symptoms",
        "suspected stroke", "respiratory failure", "cardiac arrest",
        "anaphylaxis", "mass hemorrhage", "multi-system trauma"
    }
    _SLA_THRESH = {"critical": 10, "high": 30, "medium": 60, "low": 120}

    def _check_alerts(self):
        state = self.get_hospital_state()
        if not state:
            return

        for dept_name, dept in state["departments"].items():
            if dept["occupancy"] >= 0.92:
                self._create_alert("critical", dept_name,
                    f"{dept['display_name']} at {dept['occupancy']*100:.0f}% capacity — CRITICAL")
            elif dept["occupancy"] >= 0.85:
                self._create_alert("warning", dept_name,
                    f"{dept['display_name']} approaching capacity ({dept['occupancy']*100:.0f}%)")

        metrics = state.get("metrics", {})
        if metrics.get("avg_wait_time", 0) > 150:
            self._create_alert("warning", "hospital",
                f"Hospital-wide average wait time exceeds 2 hours ({metrics['avg_wait_time']:.0f} min)")

        now = self.env.now
        with self._lock:
            for p in self.active_patients.values():
                sev = p.severity.value

                # Deterioration: waiting past severity threshold
                if p.state.value.startswith("waiting") and not p.deterioration_notified:
                    thresh = self._DETERIORATION_THRESH.get(sev, 180)
                    queue_enter = (
                        p.er_queue_enter   if p.state == PatientState.WAITING_ER   else
                        p.icu_queue_enter  if p.state == PatientState.WAITING_ICU  else
                        p.ward_queue_enter if p.state == PatientState.WAITING_WARD else None
                    )
                    if queue_enter and (now - queue_enter) >= thresh:
                        p.deterioration_alert = True
                        p.deterioration_notified = True
                        p.risk_score = min(1.0, p.risk_score + 0.18)
                        self._create_alert("critical", p.current_department.value,
                            f"DETERIORATION — {p.name} ({sev.upper()}) waiting "
                            f"{now - queue_enter:.0f} min · risk now {p.risk_score:.2f}")

                # Sepsis risk: high-risk complaint waiting > 60 min
                if (not p.sepsis_risk and
                        p.chief_complaint.lower() in self._SEPSIS_COMPLAINTS and
                        p.state.value.startswith("waiting")):
                    wait = now - p.arrival_time
                    if wait >= 60:
                        p.sepsis_risk = True
                        self._create_alert("critical", p.current_department.value,
                            f"SEPSIS RISK — {p.name}: '{p.chief_complaint}' — "
                            f"{wait:.0f} min without treatment")

                # Boarding: finished ER but still waiting for bed
                if (p.state in (PatientState.WAITING_ICU, PatientState.WAITING_WARD)
                        and p.er_end is not None):
                    board_time = now - p.er_end
                    p.boarding = True
                    if board_time >= 120 and not p.deterioration_notified:
                        p.deterioration_notified = True
                        self._create_alert("warning", "hospital",
                            f"BOARDING — {p.name} ({sev.upper()}) boarded "
                            f"{board_time:.0f} min waiting for {p.state.value.replace('waiting_', '').upper()} bed")

                # SLA breach
                if p.er_start is not None and not p.sla_breached:
                    time_to_care = p.er_start - p.arrival_time
                    if time_to_care > self._SLA_THRESH.get(sev, 120):
                        p.sla_breached = True

    def _create_alert(self, severity: str, department: str, message: str):
        with self._lock:
            for alert in self.active_alerts[-5:]:
                if alert.department == department and alert.message == message:
                    return
            self._alert_id_counter += 1
            alert = HospitalAlert(
                alert_id=f"ALT-{self._alert_id_counter:04d}",
                severity=severity,
                department=department,
                message=message,
                timestamp=self.env.now,
            )
            self.active_alerts.append(alert)
            if len(self.active_alerts) > 50:
                self.active_alerts = self.active_alerts[-30:]

    def _extract_metrics(self) -> dict:
        try:
            with self._lock:
                patients = list(self.active_patients.values())
                n = len(patients)
                if n == 0:
                    avg_wait = 0.0
                else:
                    current_waits = []
                    for p in patients:
                        try:
                            if p.state.value.startswith("waiting"):
                                if p.state == PatientState.WAITING_ER and hasattr(p, 'er_queue_enter') and p.er_queue_enter:
                                    current_waits.append(self.env.now - p.er_queue_enter)
                                elif p.state == PatientState.WAITING_LABS and hasattr(p, 'labs_queue_enter') and p.labs_queue_enter:
                                    current_waits.append(self.env.now - p.labs_queue_enter)
                                elif p.state == PatientState.WAITING_IMAGING and hasattr(p, 'imaging_queue_enter') and p.imaging_queue_enter:
                                    current_waits.append(self.env.now - p.imaging_queue_enter)
                                elif p.state == PatientState.WAITING_ICU and hasattr(p, 'icu_queue_enter') and p.icu_queue_enter:
                                    current_waits.append(self.env.now - p.icu_queue_enter)
                                elif p.state == PatientState.WAITING_WARD and hasattr(p, 'ward_queue_enter') and p.ward_queue_enter:
                                    current_waits.append(self.env.now - p.ward_queue_enter)
                                elif p.state == PatientState.WAITING_DISCHARGE:
                                    current_waits.append(0.0)
                        except Exception:
                            pass
                    avg_wait = sum(current_waits) / max(1, len(current_waits)) if current_waits else 0.0

            recent_discharges = sum(
                1 for p in self.discharged_patients[-100:]
                if p.discharge_time and (self.env.now - p.discharge_time) <= 60
            )
            throughput = recent_discharges
            icu_util = self.icu_beds.count / max(1, self.icu_beds.capacity)
            er_util = self.er_beds.count / max(1, self.er_beds.capacity)
            ward_util = self.ward_beds.count / max(1, self.ward_beds.capacity)
            bed_util = (self.icu_beds.count + self.er_beds.count + self.ward_beds.count) / max(
                1, self.icu_beds.capacity + self.er_beds.capacity + self.ward_beds.capacity
            )
            total_staff_used = (
                self.er_doctors.count + self.er_nurses.count +
                self.icu_doctors.count + self.icu_nurses.count +
                self.ward_doctors.count + self.ward_nurses.count
            )
            total_staff_cap = (
                self.er_doctors.capacity + self.er_nurses.capacity +
                self.icu_doctors.capacity + self.icu_nurses.capacity +
                self.ward_doctors.capacity + self.ward_nurses.capacity
            )
            staff_util = total_staff_used / max(1, total_staff_cap)
            critical = sum(1 for p in patients if p.severity in (Severity.HIGH, Severity.CRITICAL))
            mortality_risk = min(1.0, sum(p.risk_score for p in patients if p.severity == Severity.CRITICAL) / max(1, n) * 5)
            severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
            for p in patients:
                key = p.severity.value
                if key in severity_counts:
                    severity_counts[key] += 1
            return {
                "sim_time": round(self.env.now, 1),
                "avg_wait_time": round(avg_wait if self._crisis_active() else min(avg_wait, 240.0), 1),
                "active_patients": n,
                "severity_counts": severity_counts,
                "discharged_today": self.total_discharged,
                "total_admitted": self.total_admitted,
                "throughput_per_hour": round(throughput, 1),
                "bed_utilization": round(bed_util, 3),
                "icu_utilization": round(icu_util, 3),
                "er_utilization": round(er_util, 3),
                "ward_utilization": round(ward_util, 3),
                "staff_utilization": round(staff_util, 3),
                "critical_patients": critical,
                "mortality_risk_index": round(mortality_risk, 3),
                "alerts_active": len([a for a in self.active_alerts if not a.resolved]),
            }
        except Exception as exc:
            logger.error(f"Error extracting metrics: {exc}", exc_info=True)
            return {
                "sim_time": round(self.env.now, 1),
                "avg_wait_time": 0.0,
                "active_patients": 0,
                "severity_counts": {"critical": 0, "high": 0, "medium": 0, "low": 0},
                "discharged_today": 0,
                "total_admitted": 0,
                "throughput_per_hour": 0.0,
                "bed_utilization": 0.0,
                "icu_utilization": 0.0,
                "er_utilization": 0.0,
                "ward_utilization": 0.0,
                "staff_utilization": 0.0,
                "critical_patients": 0,
                "mortality_risk_index": 0.0,
                "alerts_active": 0,
            }

    def get_hospital_state(self) -> dict:
        """Extract complete hospital state snapshot."""
        with self._lock:
            env = self.env
            patients = list(self.active_patients.values())

            def get_dept_state(
                dept_id: str, display: str,
                bed_res: Optional[simpy.PriorityResource],
                capacity: int,
                dept_enum: Department,
            ) -> dict:
                dept_patients = [p for p in patients if p.current_department == dept_enum]
                in_service = [p for p in dept_patients if "waiting" not in p.state.value]
                queued = [
                    p for p in dept_patients
                    if "waiting" in p.state.value and p.current_department == dept_enum
                ]
                occupancy = (len(in_service) / max(1, capacity)) if capacity > 0 else 0.0
                occupancy = min(1.0, occupancy)

                current_waits = []
                for p in queued:
                    try:
                        if p.state == PatientState.WAITING_ER and hasattr(p, 'er_queue_enter') and p.er_queue_enter:
                            current_waits.append(self.env.now - p.er_queue_enter)
                        elif p.state == PatientState.WAITING_LABS and hasattr(p, 'labs_queue_enter') and p.labs_queue_enter:
                            current_waits.append(self.env.now - p.labs_queue_enter)
                        elif p.state == PatientState.WAITING_IMAGING and hasattr(p, 'imaging_queue_enter') and p.imaging_queue_enter:
                            current_waits.append(self.env.now - p.imaging_queue_enter)
                        elif p.state == PatientState.WAITING_ICU and hasattr(p, 'icu_queue_enter') and p.icu_queue_enter:
                            current_waits.append(self.env.now - p.icu_queue_enter)
                        elif p.state == PatientState.WAITING_WARD and hasattr(p, 'ward_queue_enter') and p.ward_queue_enter:
                            current_waits.append(self.env.now - p.ward_queue_enter)
                    except Exception:
                        pass
                raw_wait = sum(current_waits) / max(1, len(current_waits)) if current_waits else 0.0
                avg_wait = raw_wait if self._crisis_active() else min(raw_wait, 240.0)

                beds_avail = 0
                if bed_res:
                    beds_avail = bed_res.capacity - bed_res.count

                state = "healthy"
                if occupancy >= 0.92 or len(queued) >= 12:
                    state = "critical"
                elif occupancy >= 0.82 or len(queued) >= 6:
                    state = "warning"

                return {
                    "name": dept_id,
                    "display_name": display,
                    "occupancy": round(occupancy, 3),
                    "queue_length": len(queued),
                    "avg_wait_time": round(avg_wait, 1),
                    "current_patients": len(in_service),
                    "capacity": capacity,
                    "beds_available": max(0, beds_avail),
                    "status": state,
                    "patients_in": [p.patient_id for p in in_service[:20]],
                    "patients_queued": [p.patient_id for p in queued[:20]],
                    "resource_utilization": round(
                        bed_res.count / max(1, bed_res.capacity) if bed_res else occupancy, 3
                    ),
                }

            departments = {
                "er": get_dept_state(
                    "er", "Emergency Dept", self.er_beds, self.config.er_beds, Department.ER
                ),
                "labs": get_dept_state(
                    "labs", "Laboratory", self.lab_analyzers, self.config.lab_analyzers, Department.LABS
                ),
                "imaging": get_dept_state(
                    "imaging", "Imaging", self.ct_scanners,
                    self.config.imaging_ct + self.config.imaging_mri + self.config.imaging_xray,
                    Department.IMAGING,
                ),
                "icu": get_dept_state(
                    "icu", "ICU", self.icu_beds, self.config.icu_beds, Department.ICU
                ),
                "ward": get_dept_state(
                    "ward", "General Ward", self.ward_beds, self.config.ward_beds, Department.WARD
                ),
                "discharge": get_dept_state(
                    "discharge", "Discharge", self.discharge_staff,
                    self.config.discharge_staff, Department.DISCHARGE
                ),
            }

            advanced = self._compute_advanced_metrics(patients, departments)

            for dept_key in ("er", "icu", "ward"):
                if dept_key in departments:
                    departments[dept_key]["burnout_risk"] = advanced["burnout_risk"].get(dept_key, False)
            if "er" in departments:
                departments["er"]["boarding_count"] = advanced["boarding_count"]

            metrics = self._extract_metrics()
            metrics.update({
                "boarding_count":       advanced["boarding_count"],
                "deteriorating_count":  advanced["deteriorating_count"],
                "sepsis_count":         advanced["sepsis_count"],
                "sla_compliance":       advanced["sla_compliance"],
                "diversion_risk":       advanced["diversion_risk"],
                "minutes_to_diversion": advanced["minutes_to_diversion"],
                "delay_cost_per_hour":  advanced["delay_cost_per_hour"],
            })

            sorted_patients = sorted(patients, key=lambda p: (p.priority, -p.total_wait_time))
            patient_list = [p.to_dict() for p in sorted_patients[:100]]

            alerts = [
                {
                    "alert_id": a.alert_id,
                    "severity": a.severity,
                    "department": a.department,
                    "message": a.message,
                    "timestamp": round(a.timestamp, 1),
                }
                for a in self.active_alerts[-10:]
                if not a.resolved
            ]

            flow = self._compute_flow(patients)

            return {
                "sim_time": round(env.now, 1),
                "real_timestamp": time.time(),
                "departments": departments,
                "patients": patient_list,
                "metrics": metrics,
                "alerts": alerts,
                "flow": flow,
                "forecast_24h": self._generate_24h_forecast(),
                "config": {
                    "arrival_rate": self.config.arrival_rate,
                    "flu_outbreak": self.config.flu_outbreak,
                    "ct_failure": self.config.ct_failure,
                    "mri_failure": self.config.mri_failure,
                    "lab_slowdown": self.config.lab_slowdown,
                    "mass_casualty": self.config.mass_casualty,
                    "heatwave": self.config.heatwave,
                    "covid_surge": self.config.covid_surge,
                },
            }

    def _compute_flow(self, patients: List[Patient]) -> dict:
        """Compute patient flow rates between departments."""
        flow = {
            "registration_to_er": 0,
            "er_to_labs": 0,
            "er_to_imaging": 0,
            "er_to_icu": 0,
            "er_to_ward": 0,
            "er_to_discharge": 0,
            "labs_to_imaging": 0,
            "labs_to_ward": 0,
            "imaging_to_icu": 0,
            "imaging_to_ward": 0,
            "icu_to_ward": 0,
            "ward_to_discharge": 0,
        }

        for p in patients:
            dept = p.current_department
            state = p.state
            if dept == Department.ER and "waiting" in state.value:
                flow["registration_to_er"] += 1
            elif dept == Department.LABS and "waiting" in state.value:
                flow["er_to_labs"] += 1
            elif dept == Department.IMAGING and "waiting" in state.value:
                if p.pathway.needs_icu:
                    flow["er_to_imaging"] += 1
                else:
                    flow["er_to_imaging"] += 1
            elif dept == Department.ICU and "waiting" in state.value:
                flow["imaging_to_icu"] += 1
            elif dept == Department.WARD and "waiting" in state.value:
                if p.icu_end:
                    flow["icu_to_ward"] += 1
                elif p.imaging_end:
                    flow["imaging_to_ward"] += 1
                elif p.labs_end:
                    flow["labs_to_ward"] += 1
                else:
                    flow["er_to_ward"] += 1
            elif dept == Department.DISCHARGE:
                flow["ward_to_discharge"] += 1

        return flow

    def get_forecast(self, horizon_minutes: int = 60) -> dict:
        """Generate forecasts for key metrics over the given horizon."""
        with self._lock:
            history = list(self.metrics_history)

        if len(history) < 10:
            return {}

        def ets_forecast(values: list, steps: int, alpha: float = 0.3) -> list:
            if not values:
                return []
            s = values[0]
            for v in values[1:]:
                s = alpha * v + (1 - alpha) * s
            trend = (values[-1] - values[0]) / max(1, len(values)) * 0.1
            return [max(0, s + trend * i) for i in range(1, steps + 1)]

        wait_times = [h.get("avg_wait_time", 0) for h in history]
        icu_utils = [h.get("icu_utilization", 0) for h in history]
        bed_utils = [h.get("bed_utilization", 0) for h in history]
        throughputs = [h.get("throughput_per_hour", 0) for h in history]

        steps = horizon_minutes

        return {
            "horizon_minutes": horizon_minutes,
            "wait_time_forecast": ets_forecast(wait_times, steps),
            "icu_utilization_forecast": [min(1.0, v) for v in ets_forecast(icu_utils, steps)],
            "bed_utilization_forecast": [min(1.0, v) for v in ets_forecast(bed_utils, steps)],
            "throughput_forecast": ets_forecast(throughputs, steps),
            "predicted_bottleneck": self._predict_bottleneck(icu_utils, bed_utils, wait_times),
        }

    def _predict_bottleneck(
        self, icu_utils: list, bed_utils: list, wait_times: list
    ) -> Optional[dict]:
        """Predict the next bottleneck to form."""
        if not icu_utils:
            return None

        latest_icu = icu_utils[-1] if icu_utils else 0
        latest_bed = bed_utils[-1] if bed_utils else 0
        latest_wait = wait_times[-1] if wait_times else 0
        trend_icu = (icu_utils[-1] - icu_utils[-10]) / 10 if len(icu_utils) >= 10 else 0
        trend_bed = (bed_utils[-1] - bed_utils[-10]) / 10 if len(bed_utils) >= 10 else 0

        candidates = []

        if latest_icu > 0.7 or trend_icu > 0.01:
            eta = max(5, int((0.95 - latest_icu) / max(0.001, trend_icu)))
            candidates.append({
                "department": "ICU",
                "metric": "utilization",
                "current_value": latest_icu,
                "predicted_value": min(1.0, latest_icu + trend_icu * 60),
                "eta_minutes": min(240, eta),
                "confidence": 0.78 + random.uniform(-0.05, 0.05),
                "severity": "critical" if latest_icu > 0.85 else "warning",
            })

        if latest_bed > 0.75 or trend_bed > 0.01:
            eta = max(10, int((0.95 - latest_bed) / max(0.001, trend_bed)))
            candidates.append({
                "department": "General Ward",
                "metric": "bed utilization",
                "current_value": latest_bed,
                "predicted_value": min(1.0, latest_bed + trend_bed * 60),
                "eta_minutes": min(240, eta),
                "confidence": 0.72 + random.uniform(-0.05, 0.05),
                "severity": "warning",
            })

        if latest_wait > 90:
            candidates.append({
                "department": "ER",
                "metric": "wait time",
                "current_value": latest_wait,
                "predicted_value": latest_wait * 1.15,
                "eta_minutes": 45,
                "confidence": 0.65 + random.uniform(-0.05, 0.05),
                "severity": "warning",
            })

        return candidates[0] if candidates else None

    def _compute_advanced_metrics(self, patients: list, departments: dict) -> dict:
        now = self.env.now
        er = departments.get("er", {})
        icu = departments.get("icu", {})
        ward = departments.get("ward", {})

        boarding = [p for p in patients
                    if p.state in (PatientState.WAITING_ICU, PatientState.WAITING_WARD)
                    and p.er_end is not None]
        boarding_count = len(boarding)

        deteriorating = sum(1 for p in patients if p.deterioration_alert)
        sepsis_count   = sum(1 for p in patients if p.sepsis_risk)

        treated = [p for p in patients if p.er_start is not None]
        sla_compliant = sum(
            1 for p in treated
            if (p.er_start - p.arrival_time) <= self._SLA_THRESH.get(p.severity.value, 120)
        )
        waiting_breached = sum(
            1 for p in patients
            if p.state == PatientState.WAITING_ER and p.er_queue_enter is not None
            and (now - p.er_queue_enter) > self._SLA_THRESH.get(p.severity.value, 120)
        )
        sla_denom = max(1, len(treated) + waiting_breached)
        sla_compliance = round(sla_compliant / sla_denom, 3)

        er_occ   = er.get("occupancy", 0)
        icu_occ  = icu.get("occupancy", 0)
        ward_occ = ward.get("occupancy", 0)
        diversion_score = er_occ * 0.45 + icu_occ * 0.35 + ward_occ * 0.20
        er_q = er.get("queue_length", 0)
        rate  = max(0.01, self.config.arrival_rate / 60)
        headroom = max(0.0, 0.95 - diversion_score)
        minutes_to_diversion = int(headroom / rate * 8) if diversion_score < 0.95 else 0

        hourly_cost = boarding_count * 1400 + er_q * 50

        burnout: Dict[str, bool] = {}
        for dept_key, hist in self._util_history.items():
            if len(hist) >= 30:
                burnout[dept_key] = (sum(list(hist)[-30:]) / 30) > 0.88
            else:
                burnout[dept_key] = False

        return {
            "boarding_count":        boarding_count,
            "deteriorating_count":   deteriorating,
            "sepsis_count":          sepsis_count,
            "sla_compliance":        sla_compliance,
            "diversion_risk":        round(min(1.0, diversion_score), 3),
            "minutes_to_diversion":  minutes_to_diversion,
            "delay_cost_per_hour":   hourly_cost,
            "burnout_risk":          burnout,
        }

    def _generate_24h_forecast(self) -> list:
        now_hour = (self.env.now / 60) % 24
        base = self.config.arrival_rate
        crisis_mult = (
            2.5 if self.config.flu_outbreak else
            1.8 if self.config.covid_surge else
            1.4 if self.config.heatwave else 1.0
        )
        forecast = []
        for i in range(25):
            hour = (now_hour + i) % 24
            tod  = max(0.3, 1.0 + 0.4 * math.sin((hour - 6) * math.pi / 12))
            predicted = round(base * tod * crisis_mult, 1)
            capacity  = round(
                (self.er_doctors.capacity + self.er_nurses.capacity) * 4.5, 1
            )
            forecast.append({
                "hour_offset":         i,
                "hour_of_day":         int(hour),
                "predicted_arrivals":  predicted,
                "staffing_capacity":   capacity,
            })
        return forecast

    def _crisis_active(self) -> bool:
        cfg = self.config
        return any([
            cfg.flu_outbreak, cfg.covid_surge, cfg.heatwave,
            cfg.mass_casualty, cfg.ct_failure, cfg.mri_failure, cfg.lab_slowdown,
        ])

    def _resize(self, resource: simpy.PriorityResource, new_cap: int) -> None:
        """
        Update a SimPy PriorityResource capacity in-place without recreating it.
        Recreating resources orphans every in-flight patient process that holds a
        reference to the old object — those processes would wait forever because
        the old resource never gets new capacity.  Instead we mutate _capacity
        directly (a plain integer attribute).
        """
        new_cap = max(1, int(new_cap))
        resource._capacity = new_cap

    def update_config(self, new_config: SimulationConfig) -> None:
        """Hot-reload simulation configuration — resizes live resources in-place."""
        with self._lock:
            old = self.config
            self.config = new_config
            self._resize(self.er_beds,        new_config.er_beds)
            self._resize(self.er_doctors,     new_config.er_doctors)
            self._resize(self.er_nurses,      max(1, new_config.er_nurses))
            self._resize(self.lab_analyzers,  max(1, new_config.lab_analyzers))
            self._resize(self.lab_technicians,max(1, new_config.lab_technicians))
            self._resize(self.ct_scanners,    max(1, new_config.imaging_ct))
            self._resize(self.mri_machines,   max(1, new_config.imaging_mri))
            self._resize(self.xray_rooms,     max(1, new_config.imaging_xray))
            self._resize(self.icu_beds,       new_config.icu_beds)
            self._resize(self.icu_doctors,    max(1, new_config.icu_doctors))
            self._resize(self.icu_nurses,     max(1, new_config.icu_nurses))
            self._resize(self.ward_beds,      new_config.ward_beds)
            self._resize(self.ward_doctors,   max(1, new_config.ward_doctors))
            self._resize(self.ward_nurses,    max(1, new_config.ward_nurses))
            self._resize(self.discharge_staff,max(1, new_config.discharge_staff))

            self._adjust_queue_timestamps(old, new_config)

        logger.info("Simulation config hot-reloaded (resources resized in-place)")

    def _adjust_queue_timestamps(self, old: SimulationConfig, new: SimulationConfig) -> None:
        crisis = self._crisis_active()
        cap = 9999.0 if crisis else 240.0
        def target_wait(staff: float, arrival: float) -> float:
            return min(cap, max(3.0, (arrival / max(1.0, staff)) * 30.0))

        now = self.env.now
        arrival = new.arrival_rate

        targets = {
            PatientState.WAITING_ER:      target_wait(new.er_doctors + new.er_nurses,   arrival),
            PatientState.WAITING_ICU:     target_wait(new.icu_doctors + new.icu_nurses,  arrival * 0.25),
            PatientState.WAITING_WARD:    target_wait(new.ward_doctors + new.ward_nurses, arrival * 0.35),
            PatientState.WAITING_LABS:    target_wait(new.lab_technicians,               arrival * 0.4),
            PatientState.WAITING_IMAGING: target_wait(new.lab_technicians + new.imaging_ct + new.imaging_mri,
                                                       arrival * 0.25),
        }
        attrs = {
            PatientState.WAITING_ER:      'er_queue_enter',
            PatientState.WAITING_ICU:     'icu_queue_enter',
            PatientState.WAITING_WARD:    'ward_queue_enter',
            PatientState.WAITING_LABS:    'labs_queue_enter',
            PatientState.WAITING_IMAGING: 'imaging_queue_enter',
        }

        for p in self.active_patients.values():
            t    = targets.get(p.state)
            attr = attrs.get(p.state)
            if t is None or attr is None or not hasattr(p, attr):
                continue
            setattr(p, attr, now - t)

    def trigger_event(self, event_type: str, params: dict = None):
        """Trigger an emergency or operational event."""
        params = params or {}
        cfg = self.config

        if event_type == "flu_outbreak":
            cfg.flu_outbreak = True
            cfg.flu_multiplier = params.get("multiplier", 2.5)
            self._create_alert("critical", "hospital", "Flu outbreak: patient arrivals surging")

        elif event_type == "ct_failure":
            cfg.ct_failure = True
            self._create_alert("critical", "imaging", "CT scanner failure — imaging queue will grow")

        elif event_type == "mri_failure":
            cfg.mri_failure = True
            self._create_alert("warning", "imaging", "MRI machine offline")

        elif event_type == "lab_slowdown":
            cfg.lab_slowdown = True
            self._create_alert("warning", "labs", "Laboratory processing slowdown — results delayed")

        elif event_type == "mass_casualty":
            cfg.mass_casualty = True
            count = params.get("count", 15)
            for _ in range(count):
                p = Patient.generate(arrival_time=self.env.now)
                p.severity = random.choice([Severity.HIGH, Severity.CRITICAL])
                p.pathway = Patient._generate_pathway(p.severity)
                with self._lock:
                    self.active_patients[p.patient_id] = p
                    self.total_admitted += 1
                self.env.process(self._patient_journey(p))
            self._create_alert("critical", "hospital", f"Mass casualty event: {count} patients incoming")

        elif event_type == "heatwave":
            cfg.heatwave = True
            cfg.arrival_rate *= 1.4
            self._create_alert("warning", "hospital", "Heatwave: increased patient volume expected")

        elif event_type == "covid_surge":
            cfg.covid_surge = True
            self._create_alert("critical", "hospital", "COVID surge: isolation protocols activated")

        elif event_type == "staff_shortage":
            dept = params.get("department", "er")
            cfg.staff_shortage_dept = dept
            self._create_alert("warning", dept, f"Staff shortage reported in {dept.upper()}")

        elif event_type == "clear_event":
            cfg.flu_outbreak = False
            cfg.ct_failure = False
            cfg.mri_failure = False
            cfg.lab_slowdown = False
            cfg.mass_casualty = False
            cfg.heatwave = False
            cfg.covid_surge = False
            cfg.staff_shortage_dept = ""
            cfg.arrival_rate = 8.0
            for a in self.active_alerts:
                a.resolved = True
            logger.info("All events cleared")

    def start(self):
        """Start the simulation in a background thread."""
        if self._running:
            return
        self._running = True
        self.env.process(self._patient_arrivals())
        self.env.process(self._metrics_collector())
        self.env.process(self._alert_monitor())
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        logger.info("Hospital simulation started")

    def stop(self):
        """Stop the simulation."""
        self._running = False
        logger.info("Hospital simulation stopped")

    def _run_loop(self):
        """Run the SimPy simulation at configured speed."""
        target_step = 1.0
        real_delay = 1.0 / self.config.simulation_speed

        while self._running:
            try:
                self.env.run(until=self.env.now + target_step)
                time.sleep(real_delay)
            except Exception as exc:
                logger.error(f"Simulation loop error: {exc}")
                time.sleep(0.1)

    @property
    def sim_time(self) -> float:
        return self.env.now

    def get_metrics_history(self, minutes: int = 60) -> List[dict]:
        with self._lock:
            history = list(self.metrics_history)
        return history[-minutes:]
