# PulseFlow AI — Hospital Digital Twin Platform

An AI-powered hospital operating system that simulates, monitors, and optimizes an entire hospital in real time. PulseFlow creates a living digital twin of patient flow, department capacity, specialist availability, and staff utilization — turning reactive hospital management into predictive, data-driven decision-making.

The platform runs a full discrete-event hospital simulation in the background, broadcasts live state to every connected browser via WebSocket, and gives operators a suite of purpose-built views: a real-time floor plan, a network topology graph, a curated high-acuity patient dashboard with AI-generated care plans, an operations control hub for managing specialist constraints, an AI copilot that runs OR-Tools optimization and explains it in plain English, a what-if simulation sandbox, and an auto-generated shift handoff report. An automated demo walkthrough showcases every feature in under 90 seconds.

---

## What Problem It Solves

Most hospitals discover bottlenecks after they form. A queue overflows. A specialist is double-booked. The ICU hits 100% occupancy and diverts patients. By the time a manager gets the data, the window for intervention has passed.

PulseFlow runs a continuous simulation of the hospital so administrators can see problems forming before they affect care, test interventions without touching real operations, and apply AI-generated optimization recommendations instantly. The optimizer is grounded in real simulation data, so recommendations are calculated — not hallucinated.

---

## Stack

| Layer | Technology |
|---|---|
| Simulation Engine | Python · SimPy discrete-event simulation |
| Backend | FastAPI · WebSocket broadcast · REST API |
| Optimizer | Google OR-Tools linear programming (SciPy SLSQP fallback) |
| AI Copilot | Ollama — local LLM, fully offline, no API key required |
| Care Coordination | Custom Python coordinator — specialist roster + constraint engine |
| Frontend | Next.js 14 · React Flow · Framer Motion · Zustand |
| Realtime | WebSocket — full hospital state broadcast every 0.8 seconds |

---

## Architecture

```
SimPy Simulation Engine (background thread, 60× real time)
        │
        │  state snapshot every simulated minute
        ▼
FastAPI Application
        │  ├── REST API  /api/v1/*
        │  └── WebSocket /ws
        │
        │  broadcasts full hospital state JSON every 0.8 s
        ▼
Next.js Frontend (8 pages)
  ├── Command Center     — live animated floor plan
  ├── Digital Twin       — React Flow network topology
  ├── Patient Intel      — curated 4-patient AI dashboard
  ├── Operations Hub     — specialist roster + constraint management
  ├── AI Copilot         — OR-Tools optimizer + LLM explanation
  ├── Simulation Sandbox — live config sliders + crisis events
  ├── Shift Report       — auto-generated handoff brief
  └── Auto Demo          — 81-second automated walkthrough
```

The simulation runs in a background Python thread at configurable speed (default: 60 simulated minutes per real second). All shared state is protected by a `threading.RLock`. The WebSocket manager fans out the JSON broadcast to every connected client simultaneously.

---

## Project Structure

```
PulseFlow AI/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI app + WebSocket endpoint + message router
│   │   ├── config.py                   # Settings via pydantic-settings (.env)
│   │   ├── core/
│   │   │   ├── simulation/
│   │   │   │   ├── engine.py           # SimPy hospital digital twin — THE core
│   │   │   │   └── patient.py          # Patient entity model + severity enums
│   │   │   ├── optimization/
│   │   │   │   └── optimizer.py        # OR-Tools LP optimizer + SciPy fallback
│   │   │   ├── forecasting/
│   │   │   │   └── forecaster.py       # Time-series bottleneck prediction
│   │   │   ├── ai/
│   │   │   │   └── copilot.py          # Ollama LLM copilot + deterministic fallback
│   │   │   └── care/
│   │   │       ├── __init__.py         # Exposes CareCoordinator
│   │   │       └── coordinator.py      # Specialist roster · bottleneck constraints · tracked patients
│   │   ├── api/v1/
│   │   │   ├── router.py               # Mounts all sub-routers
│   │   │   ├── simulation.py           # /simulation endpoints
│   │   │   ├── copilot.py              # /copilot endpoints
│   │   │   └── care.py                 # /care endpoints (NEW)
│   │   └── services/
│   │       ├── simulation_service.py   # Orchestration layer
│   │       └── websocket_manager.py    # Connection pool + broadcast
│   ├── requirements.txt
│   └── run.py                          # Entry point — uvicorn
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── command-center/         # Page 1 — animated floor plan
│       │   ├── digital-twin/           # Page 2 — React Flow network
│       │   ├── patient-intel/          # Page 3 — curated patient AI dashboard
│       │   ├── operations/             # Page 4 — specialist & constraint hub (NEW)
│       │   ├── copilot/                # Page 5 — AI optimizer interface
│       │   ├── sandbox/                # Page 6 — what-if simulation controls
│       │   ├── shift-report/           # Page 7 — auto-generated handoff
│       │   └── demo/                   # Page 8 — automated demo controller (NEW)
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Sidebar.tsx         # Left nav + live stats + demo step indicator
│       │   │   ├── CrisisGlow.tsx      # Red pulsing border overlay during critical alerts
│       │   │   └── AnimatedNumber.tsx  # Smooth numeric transitions (700ms easing)
│       ├── hooks/
│       │   ├── useWebSocket.ts         # WebSocket connection + message sender
│       │   └── useSimulation.ts        # Simulation state subscriber
│       ├── store/
│       │   ├── simulationStore.ts      # Zustand — live hospital state
│       │   └── demoStore.ts            # Zustand — demo orchestration + pending actions
│       ├── lib/
│       │   ├── api.ts                  # Typed REST API client
│       │   └── utils.ts                # formatTime, formatPercent, cn, etc.
│       └── types/
│           └── index.ts                # All shared TypeScript types
│
├── DEMO_SCRIPT.md                      # Detailed demo guide with talking points
├── CLAUDE.md                           # Developer guide for AI-assisted development
└── README.md                           # This file
```

---

## Running Locally

### Prerequisites
- Python 3.11+
- Node.js 18+
- [Ollama](https://ollama.com) — optional. If not installed, the AI narrative falls back to deterministic prose. Everything else works without it.

### Backend
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1          # Windows
# source venv/bin/activate           # macOS / Linux
pip install -r requirements.txt
python run.py
```

### Frontend
```powershell
cd frontend
npm install
npm run dev
```

### macOS / Linux (first time)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py
```
```bash
cd frontend
npm install
npm run dev
```

### Access
| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |
| WebSocket | ws://localhost:8000/ws |

### Environment Variables

**backend/.env** (all optional — the platform runs without any of these)
```
OLLAMA_BASE_URL=http://localhost:11434   # Local Ollama instance
OLLAMA_MODEL=llama3.2                    # Any Ollama-compatible model
SIMULATION_SPEED=60                      # Simulated minutes per real second
BASE_ARRIVAL_RATE=8.0                    # Patients per hour base rate
```

**frontend/.env.local**
```
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---

## The Eight Pages

### Page 1 — Command Center

The primary real-time operations view. An animated hospital floor plan renders every department with realistic equipment icons — treatment bays, IV poles, CT gantries, MRI rooms, microscopes, lab workstations. Patient dots move across the map as the simulation advances, color-coded by severity: red (critical), orange (high), blue (medium), green (low).

**Key features:**
- **Animated floor plan** — department zones rendered as styled SVG regions with realistic equipment iconography. Patients appear and disappear in real time as they move through their care pathways
- **Department health panels** — right sidebar shows ER, Labs, Imaging, ICU, and Ward, each with live occupancy %, queue depth, and average wait time. Color transitions from green → amber → red as utilization climbs
- **Live Event Feed** — bottom-right panel logs clinical events as they occur, each stamped with a simulated clock time (HH:MM format). Events include patient admissions, critical escalations, department overloads, discharge events, and crisis triggers. Timestamps use a tabular-nums font for clean alignment
- **Critical alert counter** — top status bar counts active critical alerts. When the count is nonzero, the entire interface gains a pulsing red border glow (CrisisGlow component) visible from across the room
- **Live patient count** — total active patients updated every broadcast cycle from the full-population metric, not the truncated display list

---

### Page 2 — Digital Twin

A React Flow network topology that renders the hospital as a directed graph. Every department is a node; every patient handoff pathway is an edge. This view answers the question "where in the system is flow breaking down?" without needing to look at individual departments in isolation.

**Key features:**
- **Live node health rings** — each department node has an occupancy ring that fills and changes color in real time. A ring at 90%+ pulses with a warning glow
- **Department stats inside nodes** — occupancy %, queue depth, and average wait time displayed directly on the node face, updating every 0.8 seconds
- **Edge flow rates** — directed edges labeled with live patient flow rates (patients per simulated hour) between departments. Thick, bright edges indicate high-volume pathways; thin, dim edges indicate low flow
- **Legend** — pinned at the bottom of the graph explaining node color states and edge weight interpretation
- **Bottleneck identification** — when two adjacent nodes are both red and the edge between them is heavy, that's a visual bottleneck signature: a handoff is failing, not just a single department being full

---

### Page 3 — Patient Intelligence

An executive-level dashboard tracking the four highest-acuity patients in the hospital. Designed for rapid situational awareness: a charge nurse or administrator can scan this view in 10 seconds and know exactly which patients are at risk, why, and what the recommended action is.

Rather than showing a 300-row patient list, this page presents a curated set of four anchored patients with clinically realistic profiles, specialist-await status, and constraint-aware AI recommendations generated without an LLM round-trip.

**The four tracked patients:**
- **James** — 93% deterioration risk, awaiting Cardiology, critical priority
- **Maria** — 87% risk, awaiting Neurology, high priority
- **Kevin** — 43% risk, awaiting Orthopedics, moderate priority
- **Emily** — 12% risk, stable monitoring, low priority

**Key features:**
- **Risk score bars** — color-coded risk percentage with animated bar fill. Scores creep slightly over time to reflect realistic clinical deterioration, capped to avoid unrealistic 100% values during long demo sessions
- **ED wait time tracking** — each patient card shows current wait time, target window, and whether the patient is over target. Over-target times display in red with the overage amount (e.g., "+42m over target")
- **Specialist availability inline** — each card shows the name, status (AVAILABLE / IN SURGERY / BUSY), and countdown until free for the assigned specialist. If that specialist is locked by an active Operations Hub constraint, the card reflects this immediately
- **Constraint-aware AI recommendations** — the recommendation box on each card generates an evidence-style analysis: title, 2–3 clinical reasoning bullets, projected risk reduction %, and projected throughput improvement %. When the assigned specialist is constrained (blocked), the system automatically generates a rerouted care plan using a backup specialist
- **Analyze All button** — plays a 1.1-second shimmer animation across all four cards simultaneously, then reveals the AI ANALYSIS badge. No LLM latency — the analysis is instant and deterministic
- **Blocked / Available state** — cards where the specialist is constrained show an amber BLOCKED banner and rerouted recommendation; cards with available specialists show the standard blue action plan

---

### Page 4 — Operations Hub

The operational control layer of the platform. Operations Hub is where the real-world state of the OR, specialist roster, and equipment is entered, and where that state propagates downstream to every other view. Adding a constraint here affects what the AI Copilot recommends, what the Patient Intelligence page shows, and what the optimizer treats as fixed.

This page has two panels side by side: the **Specialist Availability Grid** on the left, and the **Fixed Bottlenecks & Constraints** form + list on the right.

**Specialist Availability Grid:**
- Specialists grouped by specialty (Cardiology, Neurology, Orthopedics, Gastroenterology, Pulmonology, etc.)
- Each specialist card shows: name, role, current assignment, patient load, queue length, and real-time availability countdown
- Status badges: AVAILABLE (green), IN SURGERY (red), BUSY (amber)
- Availability countdowns tick down in real time — every second the "free in Xm" counter decrements. When a specialist completes their surgery, the status flips to AVAILABLE
- Specialists linked to an active fixed constraint automatically reflect that constraint's status — their card flips to IN SURGERY with the constraint's release time
- Summary badges at the top of the page: "X available now" and "Y fixed constraints"

**Fixed Bottlenecks & Constraints form:**
- Free-text resource name (type any doctor, specialist, piece of equipment, or OR name)
- Resource type dropdown: Doctor, Specialist, Operating Room, Equipment, Bed, Nurse
- Priority: low / medium / high / critical (affects color-coding across the platform)
- Status text field (e.g., "In CABG Surgery", "Emergency maintenance", "CT calibration")
- Duration in minutes — when the constraint was added, this starts counting down
- Release label (e.g., "3:30 PM", "After rounds") — displayed on the constraint card
- Optional notes for context

**Active Constraints list:**
- Each active constraint rendered as a card with priority-colored border
- Constraint countdown ticks down live — "frees in 90m" → "frees in 89m" every second, identical to the specialist availability countdowns
- X button to remove a constraint instantly — the card slides out with an exit animation, and the linked specialist immediately returns to available on the left grid
- Empty state message: "No fixed constraints. The optimizer treats all resources as movable." — the optimizer reads this list and respects every entry as a hard constraint

**Cascade effect:**
When you add a constraint naming a specialist, the effect propagates immediately:
1. Their specialist card on the left grid flips to IN SURGERY / constrained
2. Patient Intelligence pages show the constraint blocking their patients' care plans
3. The AI Copilot optimizer treats that specialist as unavailable when building recommendations
4. The rerouted care plans in Patient Intelligence update to reflect the new reality

---

### Page 5 — AI Copilot

The analytical engine of the platform. The AI Copilot runs Google OR-Tools linear programming against the current simulation state, generates specific staffing recommendations, predicts future bottlenecks, and explains everything in plain prose via Ollama.

The key design principle: **the optimizer decides, the AI explains**. Recommendations are calculated from real simulation data — the LLM cannot hallucinate a staffing change because it never makes the recommendation in the first place. It only describes what the optimizer calculated.

**Key features:**
- **Pentagon radar chart** — five hospital health dimensions visualized as a radar: ER Utilization, ICU Utilization, Bed Occupancy, Staff Efficiency, Throughput. The shape of the pentagon tells you at a glance where the hospital is healthy (points at the edge) and where it's stressed (points pulled toward the center). The chart is large and visually prominent
- **Current Metrics snapshot** — captured at the moment Run Analysis is clicked. Shows pre-intervention state so you can compare against post-implementation changes
- **Bottleneck Predictions** — specific predictions with urgency ratings (low / medium / high / critical), department attribution, and time-to-criticality estimates. Generated by the forecasting module from recent metrics history
- **Staffing Recommendations table** — specific, actionable recommendations: department, resource type, current value, recommended value, delta. E.g., "ER Doctors: 4 → 7 (+3)", "ICU Nurses: 8 → 12 (+4)". Each row colored by urgency
- **AI Narrative** — plain-prose explanation of the optimizer's reasoning, generated by Ollama. Displayed with a **● LIVE** green pulsing badge. If Ollama is not running, the fallback narrative is generated deterministically from the optimizer data — identical format, no indication that it's a fallback
- **Implement All AI Recommendations button** — applies every staffing recommendation from the optimizer to the live simulation in one click. The simulation config updates immediately, and the next broadcast cycle reflects the changes. After implementation, a success confirmation replaces the button

---

### Page 6 — Simulation Sandbox

The what-if laboratory. Every configuration parameter in the hospital can be adjusted in real time with instant visual feedback. Changes apply to the live simulation automatically — no submit button, no confirmation dialog.

The Sandbox is designed for demonstrating the relationship between staffing decisions, resource allocation, and patient outcomes. Drag a slider and watch the projected metrics respond instantly.

**Staffing sliders (left panel):**
- **Arrival Rate** — patients per hour baseline. Range: 2–25. The primary lever for simulating surge demand
- **Doctors** — total hospital doctors. Automatically distributed: 35% ER, 25% ICU, 40% Ward. Range: 3–40
- **Nurses** — total hospital nurses. Automatically distributed: 25% ER, 40% ICU, 35% Ward. Range: 12–100
- **Lab Technicians** — dedicated to the laboratory department. Range: 2–20
- All sliders have +/- increment buttons in addition to the drag handle. Changes are debounced 600ms before being sent to the simulation

**Infrastructure sliders (left panel):**
- **Hospital Beds** — total bed count, automatically split ~28% ER / 14% ICU / 58% Ward. Range: 60–300
- **CT Scanners** — imaging department CT machines. Range: 0–5
- **MRI Machines** — imaging department MRI units. Range: 0–4

**Emergency Events grid (right panel):**
Seven one-click crisis scenarios that affect the simulation immediately:
- **Flu Outbreak** — 2.5× arrival rate multiplier, elevated severity distribution
- **COVID Surge** — 1.8× arrivals + isolation room consumption
- **Heatwave** — 1.4× arrivals, skewed toward elderly and cardiac presentations
- **Mass Casualty** — injects 15 critical patients simultaneously
- **CT Failure** — CT scanner offline, imaging backlogs form
- **MRI Failure** — MRI scanner offline
- **Lab Slowdown** — 2.5× lab processing time, downstream departments starved of results

Events can be stacked. A Flu Outbreak + CT Failure combination creates cascading pressure that the optimizer has to navigate around.

**Projected Department Status (right panel):**
Three department cards (ER, ICU, Ward) showing projected metrics calculated from the current slider values — independent of the simulation state. This means feedback is instant: move a slider and the projected queue, occupancy, and wait time update immediately without waiting for the simulation to drain.

The projected formula: `queue = base_queue × (arrival_multiplier / staff_ratio)`, capped for realism. Bed occupancy uses the bed count ratio. This decoupling from the backend means you can demonstrate "what would happen if we cut staff by 30%" in real time, mid-conversation.

**Fixed constraints badge:**
If any fixed constraints are active in Operations Hub, a badge in the header shows the count. This keeps the Sandbox operator aware that the optimizer is working within those constraints even as they adjust sliders.

---

### Page 7 — Shift Report

An automatically generated handoff brief for the outgoing charge nurse to pass to the incoming shift. Every number on this page is pulled from the live simulation state at the moment the page is viewed — no manual entry, no copy-paste.

The design priority is speed of comprehension. A nurse starting their shift needs to scan this in under 30 seconds and know where the hospital stands.

**Key features:**
- **Timestamped header** — auto-generated with day, date, and time to the minute
- **Full-population patient counts** — this is a critical distinction. The frontend's patient list is limited to 100 records for performance. The Shift Report reads directly from the simulation's full-population metrics, so a hospital with 270 active patients shows 270 — not 100
- **Severity breakdown** — Total Active broken down into Critical / High / Medium / Low with color-coded counts. Each count reads from the simulation's `severity_counts` metric, not the truncated list
- **Boarding patients** — count of patients waiting more than 4 hours for an inpatient bed. A key quality metric in real hospitals
- **Deteriorating patients** — count of patients whose condition has worsened since admission. Flags the workload spike for incoming staff
- **Sepsis alerts** — count of active sepsis protocol activations. High-urgency items for the incoming team
- **Department status section** — ER, Labs, Imaging, ICU, Ward — each with current occupancy, queue length, and average wait time, formatted for a report context rather than a dashboard
- **Active Alerts** — all current system alerts with severity, message, and timestamp
- **Print button** — renders a clean version suitable for printing. No dark background, no animations — just the information

---

### Page 8 — Auto Demo

A self-running walkthrough controller that navigates through all 7 content pages in sequence, fires interactive actions automatically at precise timestamps, and shows a real-time progress tracker. Designed to let a presenter run the demo hands-free while talking to an audience.

**The 7-step sequence (81 seconds total):**

| Step | Page | Duration | Auto Action |
|------|------|----------|-------------|
| 1 | Command Center | 7s | None — live floor plan speaks for itself |
| 2 | Digital Twin | 6s | None — observe node health and flow rates |
| 3 | Patient Intel | 13s | t=1.8s → fires Analyze All → AI badges appear |
| 4 | Operations Hub | 16s | t=2.5s → adds Dr. Nina Patel constraint; t=10s → removes it |
| 5 | AI Copilot | 15s | t=1.5s → fires Run Analysis → radar + recommendations populate |
| 6 | Simulation Sandbox | 17s | t=1.5s → Flu Outbreak + arrival spike; t=7.5s → max staff; t=15.5s → reset |
| 7 | Shift Report | 6s | None — observe full-population handoff summary |

**Key features:**
- **Expandable step cards** — the currently active step expands to show a full description plus a list of auto-triggered actions with their timing (e.g., "auto: add constraint in 2.5s")
- **Live elapsed timer** — updates every 250ms with current elapsed / total duration
- **Gradient progress bar** — blue → purple, animating smoothly as steps complete
- **Done / In-Progress / Pending state** — each step shows a spinner while active, a checkmark when done, and the step icon while waiting
- **Stop at any time** — the Stop button aborts all pending timers cleanly. Navigating away during the demo doesn't break anything
- **Mouse stays free** — the presenter can hover, highlight, click into any detail, or scroll anywhere during playback. The walkthrough is additive, not exclusive

---

## Simulation Design

### Warm Start
The simulation seeds 35 pre-existing patients across departments on boot. When you open the platform, it looks like a hospital mid-shift — not an empty system warming up. Patients are already in queues, beds are already occupied, and the event feed already has history.

### Arrival Model
New patient arrivals follow a Poisson process at a configurable base rate (default: 8.0 patients/hour). Active crisis events apply multipliers: Flu Outbreak (2.5×), COVID Surge (1.8×), Heatwave (1.4×). Mass Casualty injects a fixed batch of 15 critical patients directly.

### Patient Pathways
Each patient is assigned a care pathway at arrival based on probabilistic severity distribution. A typical critical patient: ER intake → Lab tests → Imaging (CT) → ICU admission → Ward transfer → Discharge. Pathway branches are probabilistic and severity-weighted. SimPy `yield env.timeout()` calls model each care step's duration.

### Wait Time Calculation
Wait time is the time each patient has been in a queue since reaching the front. Under normal operations, wait times are capped at 240 minutes (4 hours) to reflect realistic hospital policy. During an active crisis (`_crisis_active()` check), the cap is lifted and wait times can grow unconstrained to show the impact of a surge.

### Resource Resizing
When slider changes arrive from the frontend, the simulation's SimPy `Resource._capacity` is mutated in-place — never recreated. In-flight patient processes that already hold a resource slot are never evicted. New capacity takes effect for the next patient that requests the resource.

### Specialist Availability
Each specialist has a deterministic availability cycle computed from `sim_time` and a seeded per-specialist phase. This produces realistic-looking cycle behavior (available → busy → available) without requiring any separate scheduling simulation. The cycle is a repeating window function, so availability changes gradually and predictably as sim time advances.

### Fixed Constraints
The `CareCoordinator` maintains a list of `FixedBottleneck` objects. Each has a `release_at` anchor — the simulated time at which the constraint expires. On the first read after seeding, anchors are shifted forward by the current `sim_time` so pre-seeded constraints always start with a future expiry, never with "frees in 0m". Frontend countdowns are computed from `release_at - sim_time` at each broadcast cycle.

### Cumulative Counters
Discharge counts and total admission counts never reset. There is no midnight rollover, no daily reset. This makes throughput metrics meaningful across long demo sessions.

### Thread Safety
All mutable simulation state is accessed under a `threading.RLock`. The SimPy engine runs in a daemon thread; the FastAPI broadcast loop runs in the asyncio event loop. The lock ensures consistent state snapshots are taken between simulation ticks.

---

## Care Coordination Layer

The `backend/app/core/care/` module is a purpose-built layer independent from the simulation engine. It manages three things:

### Specialist Roster
Twelve specialists across six specialties, each modeled as a `Specialist` dataclass with:
- `specialist_id`, `name`, `role`, `specialty`
- `status` — computed at read time from constraint overlay
- `available_in_min` — computed from the deterministic cycle window, overlaid with any active fixed constraint
- `patient_load`, `queue_length`, `current_assignment` — used for display on the Operations Hub grid

### Fixed Bottleneck Constraints
`FixedBottleneck` entries are added via the Operations Hub form or the WebSocket `add_bottleneck` message. Each entry:
- Is matched against the specialist roster by name at read time
- Overrides the matched specialist's status to `in_surgery` and sets their `available_in_min` to the constraint's remaining time
- Is returned in every WebSocket broadcast under `state.care.bottlenecks`
- Counts down via `release_at - sim_time`, so the frontend only needs to display the value — no separate client-side timer is needed for the authoritative value (though the UI adds a local 1-second tick for visual smoothness)

### Tracked Patients
Four curated `TrackedPatient` entries with anchored base risk scores (93%, 87%, 43%, 12%) and minor deterministic creep over time (capped to avoid runaway values). Each patient generates a `CareRecommendation` at read time:
- Looks up the preferred specialist for the patient's awaiting specialty
- Checks if that specialist is blocked by an active constraint (`_blocking_bottleneck()`)
- If blocked: generates a rerouted recommendation naming the backup specialist
- If available: generates a standard priority escalation recommendation
- Includes `deterioration_reduction` and `throughput_improvement` projections

---

## WebSocket Protocol

**Client → Server**
```json
{ "type": "update_config",    "config": { "arrival_rate": 12, "er_doctors": 8 } }
{ "type": "trigger_event",    "event_type": "flu_outbreak", "params": {} }
{ "type": "request_optimization" }
{ "type": "add_bottleneck",   "data": { "resource_name": "Dr. Nina Patel", "priority": "critical", ... } }
{ "type": "remove_bottleneck","bottleneck_id": "bn_abc123" }
```

**Server → Client** (every 0.8 seconds)
```json
{
  "type": "hospital_state",
  "sim_time": 432.0,
  "departments": {
    "er": { "occupancy": 0.74, "queue_length": 12, "avg_wait_time": 38.5, "beds_available": 9 }
  },
  "patients": [ { "patient_id": "...", "severity": "high", "state": "waiting_er", "wait_time": 22.1 } ],
  "metrics": {
    "active_patients": 271,
    "avg_wait_time": 41.2,
    "bed_utilization": 0.68,
    "er_utilization": 0.74,
    "icu_utilization": 0.61,
    "severity_counts": { "critical": 18, "high": 64, "medium": 131, "low": 58 },
    "boarding_count": 7,
    "deteriorating_count": 23,
    "sepsis_count": 4
  },
  "alerts": [ { "severity": "warning", "message": "ER queue exceeding capacity", "timestamp": 431.2 } ],
  "care": {
    "specialists": [ { "specialist_id": "sp_001", "name": "Dr. Nina Patel", "status": "available", "available_in_min": 0 } ],
    "bottlenecks": [],
    "tracked_patients": [ { "patient_id": "james_001", "risk_pct": 93, "recommendation": { ... } } ]
  }
}
```

---

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/simulation/state` | Full hospital state snapshot |
| POST | `/api/v1/simulation/config` | Update simulation configuration |
| POST | `/api/v1/simulation/event` | Trigger a crisis event |
| GET | `/api/v1/copilot/analyze` | Run optimization + AI narrative |
| POST | `/api/v1/copilot/optimize` | Run optimizer only (no AI) |
| GET | `/api/v1/care/state` | Specialists, bottlenecks, tracked patients |
| GET | `/api/v1/care/specialists` | Specialist roster only |
| GET | `/api/v1/care/bottlenecks` | Active constraints only |
| POST | `/api/v1/care/bottlenecks` | Add a fixed constraint |
| DELETE | `/api/v1/care/bottlenecks/{id}` | Remove a constraint |
| GET | `/api/v1/care/patients/{id}/summary` | AI summary for a tracked patient |

Full interactive API documentation: **http://localhost:8000/docs**

---

## Key Design Decisions

**Why OR-Tools + Ollama instead of just an LLM?**
The optimizer makes all decisions using linear programming grounded in real simulation data. Ollama only explains those decisions in prose. This means recommendations are calculated, not hallucinated. The LLM cannot suggest staffing changes it invented — it can only describe what OR-Tools derived.

**Why SimPy in a thread instead of async?**
SimPy's coroutine model uses Python generators that conflict with asyncio's event loop. Running SimPy in a daemon thread with an RLock for shared state is simpler, more stable, and easier to reason about than bridging two coroutine systems.

**Why Ollama?**
Fully local, free, no API keys, works offline. The copilot degrades gracefully to deterministic fallback text when Ollama is not running — indistinguishable in format from the LLM output. The rest of the platform is completely unaffected.

**Why decouple projected metrics from the simulation in the Sandbox?**
The simulation is a running process with queues that take time to drain. If the Sandbox waited for the sim to reflect every slider move, feedback would lag 10–30 seconds. By computing projected metrics from formulas tied to staff ratios and arrival rates, the Sandbox gives instant, realistic feedback that communicates the direction and magnitude of change even before the simulation catches up.

**Why a curated 4-patient view instead of a full patient list?**
For executive and demo contexts, a 270-row table is noise. The four tracked patients are chosen to span the full risk spectrum (critical → stable) and to exercise every feature of the system: constraint-blocked recommendations, rerouted care plans, over-target wait times, and near-real-time risk escalation. A charge nurse wants to know about James and Maria — not scroll through 270 names.

**Why fixed constraints instead of inferring specialist availability from the simulation?**
Real hospitals have information that doesn't flow through the patient record system: verbal OR schedules, equipment service windows, off-site consults. The Operations Hub captures this real-world operational state explicitly, making it available to the optimizer and AI without requiring the simulation to model OR scheduling.

---

## Demo

See **DEMO_SCRIPT.md** for the full step-by-step demo guide including talking points, Q&A preparation, and manual fallback instructions.

The fastest way to run the demo: open the platform, click **Auto Demo** in the left sidebar, click **Start Full Demo**. The entire walkthrough runs in 81 seconds. Your mouse stays free the whole time.
