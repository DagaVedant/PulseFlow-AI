"""Care coordination engine. Maintains a specialist roster with live availability countdowns, a manually editable set of fixed operational bottlenecks, four tracked executive-view patients, and a constraint-aware recommendation generator that joins patients to specialists while respecting non-movable constraints."""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class Specialist:
    specialist_id: str
    name: str
    specialty: str
    role: str
    avg_consult_min: int
    patient_load: int
    queue_length: int
    busy_min: int
    current_assignment: str = ""

    def _available_in(self, now: float) -> int:
        if self.busy_min <= 0:
            return 0
        cycle = 30 + self.avg_consult_min
        seed = int(self.specialist_id, 16) % cycle
        phase = (now + seed) % cycle
        busy_window = min(self.busy_min, cycle - 1)
        return round(busy_window - phase) if phase < busy_window else 0

    def to_dict(self, now: float) -> dict:
        available_in = self._available_in(now)
        status = "available" if available_in == 0 else (
            "in_surgery" if "Surgery" in self.current_assignment or "OR" in self.current_assignment
            else "busy"
        )
        return {
            "specialist_id": self.specialist_id,
            "name": self.name,
            "specialty": self.specialty,
            "role": self.role,
            "avg_consult_min": self.avg_consult_min,
            "patient_load": self.patient_load,
            "queue_length": self.queue_length,
            "available_in_min": available_in,
            "status": status,
            "current_assignment": self.current_assignment if available_in > 0 else "Available for consult",
        }


@dataclass
class FixedBottleneck:
    bottleneck_id: str
    resource_name: str
    resource_type: str
    status: str
    priority: str
    notes: str = ""
    start_label: str = ""
    release_label: str = ""
    release_at: Optional[float] = None
    created_at: float = 0.0

    def to_dict(self, now: float) -> dict:
        release_in = None
        if self.release_at is not None:
            release_in = max(0, round(self.release_at - now))
        return {
            "bottleneck_id": self.bottleneck_id,
            "resource_name": self.resource_name,
            "resource_type": self.resource_type,
            "status": self.status,
            "priority": self.priority,
            "notes": self.notes,
            "start_label": self.start_label,
            "release_label": self.release_label,
            "release_in_min": release_in,
            "active": release_in is None or release_in > 0,
        }


@dataclass
class TrackedPatient:
    patient_id: str
    name: str
    age: int
    condition: str
    severity: str
    priority: str
    awaiting_specialty: str
    preferred_role: str
    ed_wait_base: float
    target_window_min: int
    base_risk: float
    pathway: List[str] = field(default_factory=list)
    created_at: float = 0.0

    def wait_min(self, now: float) -> float:
        drift = min(12.0, max(0.0, now - self.created_at))
        return self.ed_wait_base + drift

    def risk(self, now: float) -> float:
        elapsed = min(30.0, max(0.0, now - self.created_at))
        deterioration = min(0.02, (elapsed / max(1, self.target_window_min)) * 0.02)
        return min(0.99, self.base_risk + deterioration)


PREFERRED_ROLES = {
    "Neurology": ["Stroke Specialist", "Neurocritical Care Physician"],
    "Cardiology": ["Heart Failure Specialist", "Interventional Cardiologist", "Electrophysiologist"],
    "Pulmonology": ["Pulmonary Specialist", "Critical Care Specialist"],
    "Orthopedics": ["Trauma Surgeon", "Joint Replacement Specialist"],
    "Oncology": ["Medical Oncologist", "Radiation Oncologist"],
    "Gastroenterology": ["GI Specialist"],
    "Emergency Medicine": ["Attending Physician", "Trauma Physician"],
}


class CareCoordinator:
    """Owns the curated care-coordination state. All mutation happens on the asyncio event loop, so no locking is required; the simulation thread only reads sim_time."""

    def __init__(self):
        self.specialists: List[Specialist] = []
        self.bottlenecks: Dict[str, FixedBottleneck] = {}
        self.tracked: List[TrackedPatient] = []
        self._seed_done = False

    def _seed(self, now: float = 0.0):
        s = lambda *a, **k: self.specialists.append(Specialist(*a, **k))
        sid = lambda: uuid.uuid4().hex[:6].upper()

        s(sid(), "Dr. Alan Reyes",   "Cardiology",  "Interventional Cardiologist", 35, 4, 2, 28, "Cath Lab — STEMI")
        s(sid(), "Dr. Nina Patel",   "Cardiology",  "Electrophysiologist",         30, 2, 1, 0)
        s(sid(), "Dr. Omar Haddad",  "Cardiology",  "Heart Failure Specialist",    25, 5, 3, 18, "Inpatient rounds")
        s(sid(), "Dr. Grace Liu",    "Neurology",   "Stroke Specialist",           20, 3, 2, 12, "Reading CT angiography")
        s(sid(), "Dr. Peter Novak",  "Neurology",   "Neurocritical Care Physician",30, 4, 1, 40, "ICU consult")
        s(sid(), "Dr. Sara Kim",     "Pulmonology", "Pulmonary Specialist",        25, 3, 1, 0)
        s(sid(), "Dr. Luis Mendez",  "Pulmonology", "Critical Care Specialist",    30, 5, 2, 22, "ICU ventilator management")
        s(sid(), "Dr. Emma Wright",  "Orthopedics", "Trauma Surgeon",              40, 2, 1, 8)
        s(sid(), "Dr. Raj Sharma",   "Orthopedics", "Joint Replacement Specialist",45, 1, 0, 0)
        s(sid(), "Dr. Chen Wei",     "Oncology",    "Medical Oncologist",          30, 3, 2, 35, "Chemotherapy planning")
        s(sid(), "Dr. Maria Costa",  "Oncology",    "Radiation Oncologist",        35, 2, 1, 50, "Treatment planning")
        s(sid(), "Dr. John Park",    "Gastroenterology", "GI Specialist",          30, 2, 1, 15)
        s(sid(), "Dr. Aisha Bello",  "Emergency Medicine", "Attending Physician",  15, 8, 4, 0)
        s(sid(), "Dr. Tom Fischer",  "Emergency Medicine", "Trauma Physician",     20, 6, 3, 5, "Trauma bay")
        s(sid(), "R. Daniels, RT",   "Shared", "Respiratory Therapist", 20, 6, 2, 0)
        s(sid(), "M. Okafor, PT",    "Shared", "Physical Therapist",    25, 4, 1, 18)
        s(sid(), "K. Schmidt, PharmD","Shared","Pharmacist",            10, 9, 3, 0)
        s(sid(), "L. Tran, RN",      "Shared", "Case Manager",          20, 7, 2, 8)
        s(sid(), "P. Adeyemi, MSW",  "Shared", "Social Worker",         30, 5, 1, 25)

        self.add_bottleneck({
            "resource_name": "Dr. Sarah Chen",
            "resource_type": "Specialist",
            "status": "In CABG Surgery",
            "priority": "high",
            "notes": "Cardiac surgeon — cannot be interrupted for consults",
            "release_label": "2:45 PM",
            "release_in_min": 75,
        }, now=now)
        self.add_bottleneck({
            "resource_name": "MRI Suite 2",
            "resource_type": "Equipment",
            "status": "Scheduled maintenance",
            "priority": "medium",
            "notes": "Coil calibration — imaging routed to MRI Suite 1",
            "release_label": "1:30 PM",
            "release_in_min": 40,
        }, now=now)
        self.add_bottleneck({
            "resource_name": "Dr. Omar Haddad",
            "resource_type": "Specialist",
            "status": "Covering Cardiac ICU emergency",
            "priority": "high",
            "notes": "Heart failure specialist pulled to ICU — unavailable for ED consults",
            "release_label": "3:10 PM",
            "release_in_min": 100,
        }, now=now)

        self.tracked = [
            TrackedPatient("EXEC-1001", "James Wilson", 67, "Acute Stroke", "critical", "critical",
                           "Neurology", "Stroke Specialist", 52, 25, 0.93,
                           ["CT Angiography", "Neuro ICU", "tPA Window"], created_at=now),
            TrackedPatient("EXEC-1002", "Maria Rodriguez", 74, "Heart Failure Exacerbation", "high", "high",
                           "Cardiology", "Heart Failure Specialist", 94, 60, 0.87,
                           ["Labs", "Echocardiogram", "Telemetry", "Ward"], created_at=now),
            TrackedPatient("EXEC-1003", "Kevin Thompson", 46, "Pneumonia", "medium", "moderate",
                           "Pulmonology", "Pulmonary Specialist", 37, 120, 0.43,
                           ["Chest X-Ray", "Labs", "Ward"], created_at=now),
            TrackedPatient("EXEC-1004", "Emily Carter", 28, "Minor Fracture", "low", "low",
                           "Orthopedics", "Trauma Surgeon", 18, 180, 0.12,
                           ["X-Ray", "Casting", "Discharge"], created_at=now),
        ]

    def add_bottleneck(self, data: dict, now: float = 0.0) -> dict:
        bid = data.get("bottleneck_id") or f"BN-{uuid.uuid4().hex[:5].upper()}"
        release_in = data.get("release_in_min")
        release_at = (now + float(release_in)) if release_in not in (None, "") else None
        bn = FixedBottleneck(
            bottleneck_id=bid,
            resource_name=data.get("resource_name", "Unnamed resource"),
            resource_type=data.get("resource_type", "Equipment"),
            status=data.get("status", "Unavailable"),
            priority=data.get("priority", "medium"),
            notes=data.get("notes", ""),
            start_label=data.get("start_label", ""),
            release_label=data.get("release_label", ""),
            release_at=release_at,
            created_at=now,
        )
        self.bottlenecks[bid] = bn
        return bn.to_dict(now)

    def remove_bottleneck(self, bottleneck_id: str) -> bool:
        return self.bottlenecks.pop(bottleneck_id, None) is not None

    def _find_specialist(self, specialty: str, preferred_role: str, now: float) -> Optional[Specialist]:
        pool = [sp for sp in self.specialists if sp.specialty == specialty]
        if not pool:
            return None
        ranked = PREFERRED_ROLES.get(specialty, [])

        def sort_key(sp: Specialist):
            role_rank = ranked.index(sp.role) if sp.role in ranked else len(ranked)
            return (sp._available_in(now), role_rank)

        preferred = [sp for sp in pool if sp.role == preferred_role]
        if preferred:
            preferred.sort(key=lambda sp: sp._available_in(now))
            return preferred[0]
        pool.sort(key=sort_key)
        return pool[0]

    def _matching_bottleneck(self, name: str, now: float) -> Optional[FixedBottleneck]:
        """An active constraint that names a person (Specialist/Doctor/Nurse)."""
        low = name.lower()
        for bn in self.bottlenecks.values():
            if bn.resource_type not in ("Specialist", "Doctor", "Nurse"):
                continue
            if not bn.to_dict(now)["active"]:
                continue
            rn = bn.resource_name.lower()
            if rn in low or low in rn:
                return bn
        return None

    def _blocking_bottleneck(self, specialist: Optional[Specialist], now: float) -> Optional[FixedBottleneck]:
        if not specialist:
            return None
        return self._matching_bottleneck(specialist.name, now)

    def _specialist_dict(self, sp: Specialist, now: float) -> dict:
        """Specialist view with any matching fixed constraint overriding availability —
        a manually added constraint immediately pulls the specialist off the roster."""
        d = sp.to_dict(now)
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

    def get_patient(self, patient_id: str, now: float) -> Optional[dict]:
        for tp in self.tracked:
            if tp.patient_id == patient_id:
                return self._patient_dict(tp, now)
        return None

    def _patient_dict(self, tp: TrackedPatient, now: float) -> dict:
        wait = tp.wait_min(now)
        risk = tp.risk(now)
        sp = self._find_specialist(tp.awaiting_specialty, tp.preferred_role, now)
        blocker = self._blocking_bottleneck(sp, now)
        sp_dict = self._specialist_dict(sp, now) if sp else None
        rec = self._build_recommendation(tp, sp, blocker, wait, risk, now)
        return {
            "patient_id": tp.patient_id,
            "name": tp.name,
            "age": tp.age,
            "condition": tp.condition,
            "chief_complaint": tp.condition,
            "severity": tp.severity,
            "priority": tp.priority,
            "awaiting_specialty": tp.awaiting_specialty,
            "preferred_role": tp.preferred_role,
            "ed_wait_min": round(wait),
            "total_wait_time": round(wait),
            "target_window_min": tp.target_window_min,
            "over_target": wait > tp.target_window_min,
            "over_target_min": max(0, round(wait - tp.target_window_min)),
            "risk_score": round(risk, 2),
            "risk_pct": round(risk * 100),
            "pathway": tp.pathway,
            "specialist": sp_dict,
            "recommendation": rec,
        }

    def _build_recommendation(self, tp, sp, blocker, wait, risk, now) -> dict:
        reasons: List[str] = []
        if wait > tp.target_window_min:
            reasons.append(
                f"{tp.condition} exceeds the {tp.target_window_min}-min target evaluation window "
                f"(waited {round(wait)} min)"
            )
        else:
            reasons.append(
                f"{tp.condition} is within the {tp.target_window_min}-min target window "
                f"({round(wait)} min elapsed)"
            )

        alternative = None
        if sp:
            eta = sp.to_dict(now)["available_in_min"]
            if blocker:
                bd = blocker.to_dict(now)
                until = bd["release_label"] or (f"{bd['release_in_min']} min" if bd["release_in_min"] is not None else "later")
                alt = self._find_alternative(tp, sp, now)
                alternative = alt.name if alt else None
                reasons.append(
                    f"{blocker.resource_name} is a fixed constraint ({blocker.status}) until {until}"
                )
                if alt:
                    alt_eta = alt.to_dict(now)["available_in_min"]
                    reasons.append(
                        f"Reroute to {alt.role} {alt.name} — "
                        + ("available now" if alt_eta == 0 else f"available in {alt_eta} min")
                    )
            else:
                reasons.append(
                    f"{sp.role} {sp.name} is "
                    + ("available now" if eta == 0 else f"available in {eta} min")
                )
        else:
            reasons.append(f"No {tp.awaiting_specialty} specialist is currently on the roster")

        deterioration = round(risk * 19)
        throughput = {"critical": 9, "high": 7, "moderate": 4, "low": 2}.get(tp.priority, 4)
        reasons.append(f"Expected reduction in deterioration risk: {deterioration}%")
        reasons.append(f"Predicted ED throughput improvement: {throughput}%")

        return {
            "title": f"Prioritize {tp.awaiting_specialty} Consult for {tp.name}",
            "reasons": reasons,
            "deterioration_reduction": deterioration,
            "throughput_improvement": throughput,
            "blocked": blocker is not None,
            "alternative": alternative,
            "urgency": tp.priority,
        }

    def _find_alternative(self, tp, blocked_sp, now) -> Optional[Specialist]:
        pool = [
            sp for sp in self.specialists
            if sp.specialty == tp.awaiting_specialty
            and sp.specialist_id != blocked_sp.specialist_id
            and not self._blocking_bottleneck(sp, now)
        ]
        if not pool:
            return None
        pool.sort(key=lambda sp: sp._available_in(now))
        return pool[0]

    def get_state(self, now: float) -> dict:
        self._ensure_seeded(now)
        return {
            "specialists": [self._specialist_dict(sp, now) for sp in self.specialists],
            "bottlenecks": [bn.to_dict(now) for bn in self.bottlenecks.values()],
            "tracked_patients": [self._patient_dict(tp, now) for tp in self.tracked],
        }

    def _ensure_seeded(self, now: float) -> None:
        """Seed specialists, patients, and constraints on first real get_state call so
        release_at values are anchored to actual sim_time (not 0)."""
        if self._seed_done:
            return
        self._seed_done = True
        self._seed(now)

    def get_recommendations(self, now: float) -> List[dict]:
        order = {"critical": 0, "high": 1, "moderate": 2, "low": 3}
        recs = []
        for tp in self.tracked:
            pd = self._patient_dict(tp, now)
            recs.append({
                "patient_id": tp.patient_id,
                "patient_name": tp.name,
                "condition": tp.condition,
                "priority": tp.priority,
                "risk_pct": pd["risk_pct"],
                "ed_wait_min": pd["ed_wait_min"],
                **pd["recommendation"],
            })
        recs.sort(key=lambda r: order.get(r["priority"], 9))
        return recs
