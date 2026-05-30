"""
PulseFlow AI — AI Operations Copilot
Ollama-powered local LLM for operational planning and explanation.
Runs entirely offline — no API keys or internet connection required.
The optimizer makes decisions; the AI explains them.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Optional, List

logger = logging.getLogger(__name__)

try:
    import ollama as _ollama
    OLLAMA_AVAILABLE = True
except ImportError:
    OLLAMA_AVAILABLE = False
    logger.warning("ollama package not installed — using fallback text responses")


SYSTEM_PROMPT = """You are the AI Operations Copilot for PulseFlow AI, a hospital management platform.

Respond with plain prose only. No markdown, no asterisks, no bold, no headers, no bullet points, no labels like "Current State:" or "Root Cause:". Just clean sentences.

Always be concise, specific (use real numbers), and actionable. Do NOT make clinical diagnoses."""


import time as _time

# Cache Ollama reachability so we don't pay an HTTP round-trip on every call.
_ollama_cache: dict = {"ok": False, "ts": 0.0}
_OLLAMA_TTL = 20.0   # re-check every 20 seconds


def _is_ollama_running(base_url: str) -> bool:
    """Check Ollama reachability, cached for 20 s."""
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


def _chat(model: str, base_url: str, messages: list, max_tokens: int = 180) -> str:
    """
    Synchronous Ollama chat call.
    Wrapped in asyncio.to_thread by callers so it doesn't block the event loop.
    Kept short (max_tokens=180) so responses are fast.
    """
    client = _ollama.Client(host=base_url)
    response = client.chat(
        model=model,
        messages=messages,
        options={"num_predict": max_tokens, "temperature": 0.3},
    )
    return response["message"]["content"]


class AICopilot:
    """
    Ollama-powered local AI copilot.
    Connects to a locally running Ollama instance (http://localhost:11434 by default).
    Falls back gracefully to deterministic text if Ollama is not running.
    """

    def __init__(self, base_url: str = "http://localhost:11434", model: str = "llama3.2"):
        self.base_url = base_url
        self.model = model

    def _available(self) -> bool:
        return OLLAMA_AVAILABLE and _is_ollama_running(self.base_url)

    def _build_messages(self, user_prompt: str) -> list:
        return [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

    async def explain_bottleneck(self, state: dict, optimization_result: dict) -> dict:
        """Generate a natural-language explanation of the current bottleneck situation."""
        context = self._build_bottleneck_context(state, optimization_result)

        if not self._available():
            return self._fallback_bottleneck_explanation(state, optimization_result, context)

        prompt = f"""Hospital state summary:
{context}

Optimization result:
- Bottleneck: {optimization_result.get('bottleneck_department', 'unknown')}
- Severity: {optimization_result.get('bottleneck_severity', 'unknown')}
- Root causes: {', '.join(optimization_result.get('root_causes', [])[:3])}
- Predicted wait reduction: {optimization_result.get('predicted_wait_reduction', 0):.0f} minutes
- Predicted throughput increase: {optimization_result.get('predicted_throughput_increase', 0):.0f}%

Respond with 3-4 plain sentences of prose (no markdown, no labels, no asterisks):
1. What the main problem is right now
2. Why it is happening (root cause chain)
3. What will happen if not addressed
4. The single most impactful intervention"""

        try:
            text = await asyncio.wait_for(
                asyncio.to_thread(_chat, self.model, self.base_url,
                                  self._build_messages(prompt), 150),
                timeout=5.0,
            )
            return {
                "explanation": text,
                "model": self.model,
                "generated": True,
                "bottleneck_department": optimization_result.get("bottleneck_department", ""),
                "severity": optimization_result.get("bottleneck_severity", ""),
            }
        except Exception as exc:
            logger.warning(f"Ollama explain_bottleneck: {type(exc).__name__} — using fallback")
            return self._fallback_bottleneck_explanation(state, optimization_result, context)

    async def generate_patient_summary(self, patient: dict) -> str:
        """Generate a 2-sentence operational summary for a patient."""
        if not self._available():
            return self._fallback_patient_summary(patient)

        prompt = f"""Patient data:
- Age: {patient.get('age', '?')}  Severity: {patient.get('severity', '?').upper()}
- Chief complaint: {patient.get('chief_complaint', '?')}
- Current department: {patient.get('current_department', '?')}
- Current state: {patient.get('state', '?')}
- Risk score: {patient.get('risk_score', 0):.2f}
- Total wait time: {patient.get('total_wait_time', 0):.0f} minutes
- Needs: labs={patient.get('pathway', {}).get('needs_labs')}, imaging={patient.get('pathway', {}).get('needs_imaging')}, ICU={patient.get('pathway', {}).get('needs_icu')}

Write 2 sentences of plain text (no labels, no markdown). Sentence 1: where the patient is and what they need. Sentence 2: their risk level and urgency."""

        try:
            return await asyncio.wait_for(
                asyncio.to_thread(_chat, self.model, self.base_url,
                                  self._build_messages(prompt), 80),
                timeout=5.0,
            )
        except Exception as exc:
            logger.warning(f"Ollama patient summary: {type(exc).__name__} — using fallback")
            return self._fallback_patient_summary(patient)

    async def generate_intervention_narrative(
        self, optimization_result: dict, state: dict
    ) -> dict:
        """Generate a complete intervention plan narrative."""
        recs = optimization_result.get("recommendations", [])
        plan = optimization_result.get("intervention_plan", [])

        if not self._available():
            return self._fallback_intervention_narrative(optimization_result)

        recs_text = "\n".join([
            f"- {r['resource_type'].title()} in {r['department']}: "
            f"{'+'  if r['delta'] > 0 else ''}{r['delta']} (current: {r['current']})"
            for r in recs[:5]
        ])
        plan_text = "\n".join([f"- {s}" for s in plan[:6]])

        prompt = f"""Optimization recommendations:

Staff reallocation:
{recs_text}

Intervention steps:
{plan_text}

Predicted outcomes:
- Wait time reduction: {optimization_result.get('predicted_wait_reduction', 0):.0f} minutes
- Throughput increase: {optimization_result.get('predicted_throughput_increase', 0):.0f}%
- Utilization improvement: {optimization_result.get('predicted_utilization_improvement', 0)*100:.0f}%

Write 3-4 sentences of plain prose (no markdown, no asterisks, no labels): situation, recommended actions, and expected impact."""

        try:
            narrative = await asyncio.wait_for(
                asyncio.to_thread(_chat, self.model, self.base_url,
                                  self._build_messages(prompt), 150),
                timeout=5.0,
            )
            return {
                "narrative": narrative,
                "recommendations": recs,
                "intervention_plan": plan,
                "predicted_outcomes": {
                    "wait_reduction": optimization_result.get("predicted_wait_reduction", 0),
                    "throughput_increase": optimization_result.get("predicted_throughput_increase", 0),
                    "utilization_improvement": optimization_result.get("predicted_utilization_improvement", 0),
                },
                "model": self.model,
            }
        except Exception as exc:
            logger.warning(f"Ollama intervention narrative: {type(exc).__name__} — using fallback")
            return self._fallback_intervention_narrative(optimization_result)

    async def generate_shift_report(self, state: dict, history: List[dict]) -> str:
        """Generate an end-of-shift operational report."""
        if not self._available():
            return self._fallback_shift_report(state, history)

        m = state.get("metrics", {})
        alerts = state.get("alerts", [])
        alert_summary = "; ".join([a.get("message", "") for a in alerts[:3]]) or "None"

        prompt = f"""Hospital operational summary:
- Avg wait time: {m.get('avg_wait_time', 0):.0f} min
- Active patients: {m.get('active_patients', 0)}
- Discharged: {m.get('discharged_today', 0)}
- Bed utilization: {m.get('bed_utilization', 0)*100:.0f}%
- ICU utilization: {m.get('icu_utilization', 0)*100:.0f}%
- ER utilization: {m.get('er_utilization', 0)*100:.0f}%
- Staff utilization: {m.get('staff_utilization', 0)*100:.0f}%
- Critical patients: {m.get('critical_patients', 0)}
- Active alerts: {alert_summary}

Write 4-5 sentences of plain prose (no markdown, no asterisks): overall status, any key incidents, department pressures, and what the incoming shift should focus on."""

        try:
            return await asyncio.wait_for(
                asyncio.to_thread(_chat, self.model, self.base_url,
                                  self._build_messages(prompt), 180),
                timeout=5.0,
            )
        except Exception as exc:
            logger.warning(f"Ollama shift report: {type(exc).__name__} — using fallback")
            return self._fallback_shift_report(state, history)

    # -------- Deterministic fallbacks (used when Ollama is not running) --------

    def _build_bottleneck_context(self, state: dict, opt: dict) -> str:
        depts = state.get("departments", {})
        metrics = state.get("metrics", {})
        lines = [
            f"Active patients: {metrics.get('active_patients', 0)} | "
            f"Avg wait: {metrics.get('avg_wait_time', 0):.0f} min"
        ]
        for key, d in depts.items():
            lines.append(
                f"{d.get('display_name', key)}: "
                f"{d.get('current_patients', 0)}/{d.get('capacity', 0)} beds, "
                f"queue: {d.get('queue_length', 0)}, status: {d.get('status', '?')}"
            )
        return "\n".join(lines)

    def _fallback_bottleneck_explanation(self, state: dict, opt: dict, context: str) -> dict:
        dept = opt.get("bottleneck_department", "ER")
        sev = opt.get("bottleneck_severity", "warning")
        wait_red = opt.get("predicted_wait_reduction", 0)
        causes = opt.get("root_causes", [])
        plan = opt.get("intervention_plan", [])
        m = state.get("metrics", {})
        depts = state.get("departments", {})
        er = depts.get("er", {})
        icu = depts.get("icu", {})

        avg_wait = m.get("avg_wait_time", 0)
        active = m.get("active_patients", 0)
        er_queue = er.get("queue_length", 0)
        er_occ = er.get("occupancy", 0) * 100
        icu_occ = icu.get("occupancy", 0) * 100
        critical = m.get("critical_patients", 0)

        cause_text = causes[0] if causes else f"{dept} is operating above safe capacity"
        plan_text = plan[0] if plan else "reallocate staff to the primary bottleneck"

        explanation = (
            f"With {active} active patients and an average wait of {avg_wait:.0f} minutes across the hospital, "
            f"{dept} is the critical bottleneck — {er_occ:.0f}% bed occupancy with {er_queue} patients queued. "
            f"{cause_text}. ICU is at {icu_occ:.0f}% capacity with {critical} critical cases requiring immediate oversight. "
            f"The optimizer recommends: {plan_text}. "
            f"Applying these changes is projected to cut average wait by {wait_red:.0f} minutes "
            f"and free up downstream capacity within the next 30 minutes."
        )
        return {
            "explanation": explanation,
            "model": "fallback",
            "generated": False,
            "bottleneck_department": dept,
            "severity": sev,
        }

    def _fallback_patient_summary(self, patient: dict) -> str:
        name = patient.get("name", "Patient")
        sev = patient.get("severity", "low")
        dept = patient.get("current_department", "er").replace("_", " ").upper()
        complaint = patient.get("chief_complaint", "unspecified condition")
        wait = patient.get("total_wait_time", 0)
        risk = patient.get("risk_score", 0)
        age = patient.get("age", "unknown")
        state = patient.get("state", "").replace("_", " ")

        urgency = "Immediate escalation recommended" if risk > 0.7 else (
            "Close monitoring required" if risk > 0.4 else "Stable — routine care pathway"
        )
        wait_context = f"has waited {wait:.0f} minutes" if wait > 0 else "recently arrived"

        return (
            f"{name}, {age}, {sev.upper()} severity — presenting with {complaint}. "
            f"Currently {state} in {dept} and {wait_context}. "
            f"Risk index {risk:.2f} ({int(risk*100)}th percentile). {urgency}."
        )

    def _fallback_intervention_narrative(self, opt: dict) -> dict:
        recs = opt.get("recommendations", [])
        plan = opt.get("intervention_plan", [])
        wait_red = opt.get("predicted_wait_reduction", 0)
        thru_inc = opt.get("predicted_throughput_increase", 0)
        util_imp = opt.get("predicted_utilization_improvement", 0)
        dept = opt.get("bottleneck_department", "ER")

        high_urgency = [r for r in recs if r.get("urgency") in ("critical", "high")]
        primary = high_urgency[0] if high_urgency else (recs[0] if recs else None)

        if primary:
            action = (
                f"Move {abs(primary['delta'])} additional {primary['resource_type']} "
                f"to {primary['department']} (currently {primary['current']}, target {primary['recommended']})"
            )
        else:
            action = "redistribute staff across departments to match patient load"

        narrative = (
            f"The OR-Tools optimizer has processed the current simulation state and flagged {dept} as the highest-priority intervention point. "
            f"Primary action: {action}. "
            f"This addresses the root cause directly — throughput is constrained by staff-to-patient ratio, not bed availability. "
            f"Across {len(recs)} recommended changes, the model projects a {wait_red:.0f}-minute reduction in average wait time, "
            f"a {thru_inc:.0f}% increase in hourly throughput, and {util_imp*100:.0f}% improvement in resource utilization. "
            f"Click Implement All to apply immediately."
        )
        return {
            "narrative": narrative,
            "recommendations": recs,
            "intervention_plan": plan,
            "predicted_outcomes": {
                "wait_reduction": wait_red,
                "throughput_increase": thru_inc,
                "utilization_improvement": util_imp,
            },
            "model": "fallback",
        }

    def _fallback_shift_report(self, state: dict, history: List[dict]) -> str:
        m = state.get("metrics", {})
        depts = state.get("departments", {})
        alerts = state.get("alerts", [])
        active = m.get("active_patients", 0)
        avg_wait = m.get("avg_wait_time", 0)
        bed_util = m.get("bed_utilization", 0)
        icu_util = m.get("icu_utilization", 0)
        critical = m.get("critical_patients", 0)
        er = depts.get("er", {})
        er_queue = er.get("queue_length", 0)
        alert_count = len([a for a in alerts if not a.get("resolved", False)])
        status = "critical" if bed_util > 0.90 else ("elevated" if bed_util > 0.75 else "stable")

        priority = (
            "ICU capacity is the immediate concern — transfer protocols should be reviewed"
            if icu_util > 0.85 else
            f"ER queue of {er_queue} requires additional triage staff"
            if er_queue > 10 else
            "maintain current staffing ratios through end of shift"
        )

        return (
            f"Hospital is {status} with {active} active patients. "
            f"Average wait is {avg_wait:.0f} minutes with {er_queue} queued in ER. "
            f"Bed utilization at {bed_util*100:.0f}%, ICU at {icu_util*100:.0f}% — "
            f"{critical} critical patients require monitoring. "
            f"{'Warning: ' + str(alert_count) + ' unresolved alerts.' if alert_count > 0 else 'No critical alerts active.'} "
            f"Incoming shift priority: {priority}."
        )
