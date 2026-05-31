"""Patient entity for the hospital digital twin simulation."""
from __future__ import annotations
import uuid
import random
from enum import Enum
from dataclasses import dataclass, field
from typing import List, Optional

class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class PatientState(str, Enum):
    ARRIVING = "arriving"
    TRIAGE = "triage"
    WAITING_ER = "waiting_er"
    IN_ER = "in_er"
    WAITING_LABS = "waiting_labs"
    IN_LABS = "in_labs"
    WAITING_IMAGING = "waiting_imaging"
    IN_IMAGING = "in_imaging"
    WAITING_ICU = "waiting_icu"
    IN_ICU = "in_icu"
    WAITING_WARD = "waiting_ward"
    IN_WARD = "in_ward"
    WAITING_DISCHARGE = "waiting_discharge"
    DISCHARGED = "discharged"

class Department(str, Enum):
    ER = "er"
    LABS = "labs"
    IMAGING = "imaging"
    ICU = "icu"
    WARD = "ward"
    DISCHARGE = "discharge"
    TRIAGE = "triage"
    REGISTRATION = "registration"

SEVERITY_WEIGHTS = {
    Severity.LOW: 0.55,
    Severity.MEDIUM: 0.30,
    Severity.HIGH: 0.12,
    Severity.CRITICAL: 0.03,
}

SEVERITY_PRIORITY = {
    Severity.LOW: 4,
    Severity.MEDIUM: 3,
    Severity.HIGH: 2,
    Severity.CRITICAL: 1,
}

@dataclass
class PatientPathway:
    needs_labs: bool = False
    needs_imaging: bool = False
    needs_icu: bool = False
    needs_ward: bool = False
    imaging_type: str = "xray"

@dataclass
class Patient:
    patient_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8].upper())
    arrival_time: float = 0.0
    severity: Severity = Severity.LOW
    state: PatientState = PatientState.ARRIVING
    current_department: Department = Department.REGISTRATION

    triage_start: Optional[float] = None
    triage_end: Optional[float] = None
    er_start: Optional[float] = None
    er_end: Optional[float] = None
    labs_start: Optional[float] = None
    labs_end: Optional[float] = None
    imaging_start: Optional[float] = None
    imaging_end: Optional[float] = None
    icu_start: Optional[float] = None
    icu_end: Optional[float] = None
    ward_start: Optional[float] = None
    ward_end: Optional[float] = None
    discharge_time: Optional[float] = None

    er_queue_enter: Optional[float] = None
    labs_queue_enter: Optional[float] = None
    imaging_queue_enter: Optional[float] = None
    icu_queue_enter: Optional[float] = None
    ward_queue_enter: Optional[float] = None

    pathway: PatientPathway = field(default_factory=PatientPathway)
    name: str = ""
    age: int = 0
    chief_complaint: str = ""
    risk_score: float = 0.0
    total_wait_time: float = 0.0

    deterioration_alert: bool = False
    deterioration_notified: bool = False
    sepsis_risk: bool = False
    boarding: bool = False
    sla_breached: bool = False

    @classmethod
    def generate(cls, arrival_time: float) -> "Patient":
        """
        Creates a brand-new Patient with randomly chosen attributes that
        reflect realistic hospital arrival patterns.

        Parameters:
            arrival_time: The simulated time (in minutes) when this patient
                          arrives at the hospital.

        Returns a fully populated Patient instance with a random severity
        level, name, age, chief complaint, care pathway, and risk score.

        Called by the simulation engine each time a new patient arrival
        event fires in the SimPy event loop.
        """
        severity = random.choices(
            list(SEVERITY_WEIGHTS.keys()),
            weights=list(SEVERITY_WEIGHTS.values()),
        )[0]

        pathway = cls._generate_pathway(severity)
        name = cls._random_name()
        age = random.randint(18, 90)
        complaint = cls._random_complaint(severity)
        risk_score = cls._calculate_risk(severity, age)

        return cls(
            arrival_time=arrival_time,
            severity=severity,
            pathway=pathway,
            name=name,
            age=age,
            chief_complaint=complaint,
            risk_score=risk_score,
        )

    @staticmethod
    def _generate_pathway(severity: Severity) -> PatientPathway:
        """
        Decides which hospital departments a patient must visit based on how
        sick they are, using random probabilities that mirror real triage data.

        Parameters:
            severity: A Severity enum value (LOW, MEDIUM, HIGH, or CRITICAL)
                      describing how ill the patient is.

        Returns a PatientPathway dataclass with boolean flags for labs,
        imaging, ICU, and ward, plus the imaging modality type (xray/ct/mri).

        Called by the generate() class method when building a new Patient.
        """
        if severity == Severity.LOW:
            return PatientPathway(
                needs_labs=random.random() < 0.2,
                needs_imaging=random.random() < 0.1,
                needs_icu=False,
                needs_ward=False,
                imaging_type="xray",
            )
        elif severity == Severity.MEDIUM:
            imaging_type = random.choice(["xray", "ct", "ct"])
            return PatientPathway(
                needs_labs=random.random() < 0.8,
                needs_imaging=random.random() < 0.6,
                needs_icu=False,
                needs_ward=random.random() < 0.5,
                imaging_type=imaging_type,
            )
        elif severity == Severity.HIGH:
            imaging_type = random.choice(["ct", "ct", "mri"])
            return PatientPathway(
                needs_labs=True,
                needs_imaging=True,
                needs_icu=random.random() < 0.6,
                needs_ward=True,
                imaging_type=imaging_type,
            )
        else:
            return PatientPathway(
                needs_labs=True,
                needs_imaging=True,
                needs_icu=True,
                needs_ward=True,
                imaging_type="ct",
            )

    @staticmethod
    def _random_name() -> str:
        """
        Picks a random first name and last name from built-in lists and
        joins them into a single full-name string.

        No input parameters.

        Returns a string like "James Garcia" for display in the patient list.

        Called by generate() when creating a new Patient.
        """
        first = random.choice([
            "James", "Mary", "Robert", "Patricia", "John", "Jennifer",
            "Michael", "Linda", "William", "Barbara", "David", "Susan",
            "Richard", "Jessica", "Joseph", "Sarah", "Thomas", "Karen",
            "Carlos", "Lisa", "Daniel", "Nancy", "Matthew", "Betty",
            "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
        ])
        last = random.choice([
            "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia",
            "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez",
            "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson",
            "Martin", "Lee", "Perez", "Thompson", "White", "Harris",
        ])
        return f"{first} {last}"

    @staticmethod
    def _random_complaint(severity: Severity) -> str:
        """
        Selects a realistic chief complaint string that matches the patient's
        severity level (e.g., critical patients get "Cardiac arrest", not
        "Sore throat").

        Parameters:
            severity: A Severity enum value that determines which pool of
                      complaint strings to draw from.

        Returns a single complaint string such as "Chest pain (atypical)"
        or "Multi-system trauma".

        Called by generate() when building a new Patient.
        """
        complaints = {
            Severity.LOW: [
                "Minor laceration", "Mild headache", "Sore throat",
                "Low-grade fever", "Ankle sprain", "Rash",
                "Minor burn", "Ear pain", "Sinus congestion",
            ],
            Severity.MEDIUM: [
                "Possible fracture", "Abdominal pain", "Chest pain (atypical)",
                "Appendicitis symptoms", "Severe migraine", "Deep laceration",
                "Allergic reaction", "UTI with fever", "Back injury",
            ],
            Severity.HIGH: [
                "Suspected stroke", "Acute MI symptoms", "Severe trauma",
                "Respiratory distress", "Sepsis indicators", "Major fracture",
                "Head injury", "Internal bleeding", "Overdose",
            ],
            Severity.CRITICAL: [
                "Cardiac arrest", "Multi-system trauma", "Severe stroke",
                "Respiratory failure", "Anaphylaxis", "Mass hemorrhage",
            ],
        }
        return random.choice(complaints[severity])

    @staticmethod
    def _calculate_risk(severity: Severity, age: int) -> float:
        """
        Computes a numeric risk score between 0.0 and 1.0 for a patient
        using their severity level as the base and adding extra risk for
        older patients (above 60) plus a small random noise value.

        Parameters:
            severity: A Severity enum value — higher severity means higher
                      base risk (LOW=0.05, MEDIUM=0.25, HIGH=0.65,
                      CRITICAL=0.90).
            age:      The patient's age in years; patients over 60 receive
                      an additional 0.01 per year above 60, capped at +0.30.

        Returns a float clamped to [0.0, 1.0] representing the patient's
        clinical risk score used for prioritisation in the UI.

        Called by generate() when building a new Patient.
        """
        base_risk = {
            Severity.LOW: 0.05,
            Severity.MEDIUM: 0.25,
            Severity.HIGH: 0.65,
            Severity.CRITICAL: 0.90,
        }[severity]
        age_factor = min(0.3, (max(0, age - 60)) * 0.01)
        return min(1.0, base_risk + age_factor + random.uniform(-0.05, 0.05))

    @property
    def priority(self) -> int:
        """
        Returns an integer priority number for this patient where 1 is the
        most urgent (CRITICAL) and 4 is the least urgent (LOW), following
        standard triage numbering.

        No input parameters — reads self.severity.

        Used by the simulation engine to sort patients when multiple are
        waiting for the same resource.
        """
        return SEVERITY_PRIORITY[self.severity]

    @property
    def current_wait_time(self) -> float:
        """
        Returns the total wait time in simulated minutes that this patient
        has accumulated so far while sitting in queues.

        No input parameters — reads self.total_wait_time.

        Returns a float number of minutes; used by the frontend to display
        per-patient wait times and by metrics aggregation.

        This property is a read-only alias for total_wait_time and is
        accessed wherever live queue durations are needed.
        """
        return self.total_wait_time

    def to_dict(self) -> dict:
        """
        Converts this Patient object into a plain Python dictionary so it
        can be serialised to JSON and sent over the WebSocket or REST API.

        No input parameters — reads all fields from self.

        Returns a dict containing patient ID, name, age, arrival time,
        severity, state, department, complaint, risk score, wait time,
        pathway flags, timing milestones, and alert flags.

        Called by the simulation engine when building the hospital_state
        payload that is broadcast to all connected frontend clients.
        """
        return {
            "patient_id": self.patient_id,
            "name": self.name,
            "age": self.age,
            "arrival_time": round(self.arrival_time, 1),
            "severity": self.severity.value,
            "state": self.state.value,
            "current_department": self.current_department.value,
            "chief_complaint": self.chief_complaint,
            "risk_score": round(self.risk_score, 3),
            "total_wait_time": round(self.total_wait_time, 1),
            "pathway": {
                "needs_labs": self.pathway.needs_labs,
                "needs_imaging": self.pathway.needs_imaging,
                "needs_icu": self.pathway.needs_icu,
                "needs_ward": self.pathway.needs_ward,
                "imaging_type": self.pathway.imaging_type,
            },
            "timing": {
                "triage_start": self.triage_start,
                "er_start": self.er_start,
                "labs_start": self.labs_start,
                "imaging_start": self.imaging_start,
                "icu_start": self.icu_start,
                "ward_start": self.ward_start,
                "discharge_time": self.discharge_time,
            },
            "deterioration_alert": self.deterioration_alert,
            "sepsis_risk": self.sepsis_risk,
            "boarding": self.boarding,
            "sla_breached": self.sla_breached,
        }
