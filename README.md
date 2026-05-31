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
| Analytics Engine | `analytics.py` — forecasting, optimization, AI narrative in one module |
| Optimizer | Google OR-Tools GLOP linear programming (SciPy SLSQP fallback) |
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
│   │   │   └── analytics.py            # Consolidated: forecasting + OR-Tools optimizer
│   │   │                               #   + Ollama copilot + care coordination
│   │   ├── api/v1/
│   │   │   ├── router.py               # Mounts all sub-routers
│   │   │   ├── hospital.py             # /simulation endpoints
│   │   │   ├── ai.py                   # /ai endpoints (copilot, optimization, care)
│   │   │   └── simulation.py           # /simulation config + event triggers
│   │   └── services/
│   │       └── service.py              # Orchestration layer (SimulationService)
│   ├── requirements.txt
│   └── run.py                          # Entry point — uvicorn
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── command-center/         # Page 1 — animated floor plan + KPI cards
│       │   ├── digital-twin/           # Page 2 — React Flow network topology
│       │   ├── patient-intel/          # Page 3 — curated patient AI dashboard
│       │   ├── operations/             # Page 4 — specialist & constraint hub
│       │   ├── copilot/                # Page 5 — AI optimizer interface
│       │   ├── sandbox/                # Page 6 — what-if simulation controls
│       │   ├── shift-report/           # Page 7 — auto-generated handoff
│       │   └── demo/                   # Page 8 — automated demo controller
│       ├── components/
│       │   └── layout/
│       │       ├── Sidebar.tsx         # Left nav + logo + live stats + demo step indicator
│       │       └── TopBar.tsx          # Sim-time chip
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
├── pitch_snippets.py                   # Investor pitch — 3 annotated code snippets
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
cd backend && python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt && python run.py
```
```bash
cd frontend && npm install && npm run dev
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

## Analytics Engine — `analytics.py`

All four analytical capabilities live in a single consolidated module at `backend/app/core/analytics.py`. Each is independently instantiated and the module degrades gracefully when optional dependencies (OR-Tools, Ollama) are not installed.

### 1. Holt-Winters Demand Forecasting (`HospitalForecaster`)

Predicts ICU/ER/bed utilization across four time horizons (1 h, 3 h, 6 h, 24 h) using double exponential smoothing with Savitzky-Golay pre-smoothing. Every prediction includes 95% confidence bands that widen as the horizon grows — so administrators always know not just what to expect, but how certain that prediction is.

```python
# Double exponential smoothing — level and trend updated each tick
alpha, beta = 0.3, 0.1
for v in smoothed[1:]:
    new_level = alpha * v + (1 - alpha) * (level + trend)
    new_trend = beta * (new_level - level) + (1 - beta) * trend
    level, trend = new_level, new_trend

# 95% confidence bands — uncertainty grows with horizon
uncertainty = 1.645 * sigma * math.sqrt(1 + i * 0.05)
```

`forecast_demand()` also estimates per-minute arrival rates for the next N minutes, factoring in a time-of-day sinusoidal adjustment based on the current simulated hour.

### 2. Google OR-Tools LP Staffing Optimizer (`HospitalOptimizer`)

When a bottleneck is detected, the optimizer doesn't just flag it — it solves it. Uses Google OR-Tools GLOP linear programming to find the mathematically optimal reallocation of doctors and nurses across ER, ICU, and Ward, subject to hard constraints:

- Total floating staff budget cannot be exceeded
- No department can be pulled below minimum safe coverage (50% of current)
- ICU pressure is weighted 3× in the objective function (life-critical)

```python
solver = pywraplp.Solver.CreateSolver("GLOP")

# Decision variables: staff delta per department
d_er_doc  = solver.NumVar(-inp.er_doctors,   inp.available_doctors, "er_doc")
d_icu_doc = solver.NumVar(-inp.icu_doctors,  inp.available_doctors, "icu_doc")

# Hard constraints
solver.Add(d_er_doc + d_icu_doc + d_wd_doc <= inp.available_doctors)
solver.Add(inp.er_doctors + d_er_doc >= max(1, inp.er_doctors // 2))

# Objective: maximize weighted load reduction (ICU = 3× weight)
er_l  = inp.er_queue  / max(1, inp.er_beds)
icu_l = inp.icu_queue / max(1, inp.icu_beds) * 3
solver.Minimize(-(2.0*d_er_doc*er_l + 3.0*d_icu_doc*icu_l + ...))
```

Falls back to SciPy SLSQP automatically if OR-Tools is not installed. Falls back to rule-based heuristics if the solver fails to converge.

### 3. Ollama Local LLM Copilot (`AICopilot`)

Translates optimizer output into plain English using a locally running Ollama model. Patient data never leaves the hospital's servers — directly addressing the HIPAA objection that kills most AI pilots in healthcare.

```python
async def _call(self, prompt, max_tokens=180):
    if not self._available():
        return None  # instant fallback — never blocks
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(_ollama_chat, self.model, self.base_url,
                              self._msgs(prompt), max_tokens), timeout=5.0)
    except Exception:
        return None  # deterministic fallback text kicks in
```

The 5-second timeout and deterministic fallback mean the platform is never degraded by LLM latency. Fallback output is identical in format to LLM output — indistinguishable to the end user.

### 4. Care Coordination (`CareCoordinator`)

Manages the specialist roster, fixed bottleneck constraints, and four tracked high-acuity patients. Generates constraint-aware care recommendations: if the assigned specialist is blocked by an active Operations Hub constraint, the system automatically reroutes to a backup specialist.

---

## UI Design System

### Color Palette

Derived from the PulseFlow logo — a teal/pink/purple triad on a deep dark background.

| Token | Value | Usage |
|---|---|---|
| Teal | `#0CC8D4` | Active nav, healthy metrics, borders, sim-time chip |
| Pink | `#E0187A` | Critical alerts, alert counter, reset button idle |
| Purple | `#7C3AED` | Auto Demo nav item, neutral metric accents |
| Background | `#080c18` / `#0d1225` | Page and sidebar backgrounds |
| Text primary | `#e2e8f0` | Headings, values |
| Text muted | `#475569` | Labels, sublabels |

### KPI Card States

The six metric cards on Command Center use four status states, each mapped to the brand palette:

| State | Border | Value Color | Usage |
|---|---|---|---|
| `healthy` | `rgba(12,200,212,0.22)` | `#0CC8D4` | Normal utilization |
| `warning` | `rgba(245,158,11,0.22)` | `#f0a030` | Approaching threshold |
| `critical` | `rgba(224,24,122,0.25)` | `#E0187A` | Breach threshold |
| `neutral` | `rgba(124,58,237,0.2)` | `#9d6fe8` | Throughput, secondary metrics |

### Logo

Place the PulseFlow logo at `frontend/public/logo.png`. The sidebar header renders it at 56×56px via a plain `<img>` tag. No Next.js Image optimization config is required.

---

## The Eight Pages

### Page 1 — Command Center

The primary real-time operations view. An animated hospital floor plan renders every department with realistic equipment icons — treatment bays, IV poles, CT gantries, MRI rooms, microscopes, lab workstations. Patient dots move across the map as the simulation advances, color-coded by severity.

**Key features:**
- **Animated floor plan** — department zones rendered as styled SVG regions. Patients appear and disappear in real time as they move through their care pathways
- **Six KPI metric cards** — Avg Wait, Active Patients, Bed Util, ICU Util, Throughput, Critical Count — each color-coded by status using the brand palette
- **Diversion Banner** — horizontal strip below the KPI row showing ambulance diversion risk %, estimated minutes to diversion, delay cost per hour, and SLA compliance
- **Hospital Score** — composite efficiency index (0–100) rendered as a radial gauge with FAIR / GOOD / EXCELLENT label
- **Department health panels** — right sidebar with live occupancy %, queue depth, and average wait time per department
- **Live Event Feed** — bottom-right panel logging clinical events with simulated timestamps

---

### Page 2 — Digital Twin

A React Flow network topology that renders the hospital as a directed graph. Every department is a node; every patient handoff pathway is an edge.

**Key features:**
- **Live node health rings** — occupancy ring fills and changes color in real time. 90%+ pulses with a warning
- **Edge flow rates** — labeled with live patient flow rates between departments
- **Bottleneck identification** — two adjacent red nodes with a heavy edge is a visual bottleneck signature

---

### Page 3 — Patient Intelligence

Executive-level dashboard tracking the four highest-acuity patients. Curated to span the full risk spectrum (critical → stable) and exercise every feature: constraint-blocked recommendations, rerouted care plans, over-target wait times.

**The four tracked patients:**
- **James Wilson** — 93% deterioration risk, awaiting Neurology, critical priority
- **Maria Rodriguez** — 87% risk, awaiting Cardiology, high priority
- **Kevin Thompson** — 43% risk, awaiting Pulmonology, moderate priority
- **Emily Carter** — 12% risk, stable monitoring, low priority

**Key features:**
- **Risk score bars** with animated fill — scores creep over time to reflect realistic deterioration
- **Specialist availability inline** — name, status (AVAILABLE / IN SURGERY / BUSY), countdown until free
- **Constraint-aware AI recommendations** — if the assigned specialist is blocked by an Operations Hub constraint, the system generates a rerouted care plan with a backup specialist automatically

---

### Page 4 — Operations Hub

The operational control layer. Adding a constraint here propagates immediately to Patient Intelligence (rerouted care plans), AI Copilot (optimizer treats the specialist as unavailable), and the Shift Report.

**Panels:**
- **Specialist Availability Grid** — 19 specialists across 7 specialties with real-time availability countdowns
- **Fixed Bottlenecks form** — resource name, type, priority, status, duration, release label, notes

---

### Page 5 — AI Copilot

Runs the analytics engine on demand and presents results in a unified interface.

**Key features:**
- **Pentagon radar chart** — five hospital health dimensions: ER Utilization, ICU Utilization, Bed Occupancy, Staff Efficiency, Throughput
- **Staffing Recommendations table** — specific deltas per department/role, colored by urgency
- **Bottleneck Predictions** — from `HospitalForecaster.generate_bottleneck_predictions()`
- **AI Narrative** — plain-prose from Ollama (or deterministic fallback), displayed with a live model badge
- **Implement All button** — applies every staffing recommendation to the live simulation in one click

---

### Page 6 — Simulation Sandbox

Live configuration sliders for every hospital parameter. Changes apply to the simulation immediately with no submit step. Projected metrics update from formulas (not the simulation) so feedback is instant.

**Sliders:** Arrival Rate, Doctors, Nurses, Lab Technicians, Hospital Beds, CT Scanners, MRI Machines

**Crisis Events:** Flu Outbreak (2.5×), COVID Surge (1.8×), Heatwave (1.4×), Mass Casualty, CT Failure, MRI Failure, Lab Slowdown — stackable

---

### Page 7 — Shift Report

Auto-generated handoff brief. Reads from full-population simulation metrics — not the 100-record frontend list — so patient counts and severity breakdowns are always accurate regardless of simulation size.

---

### Page 8 — Auto Demo

Self-running 81-second walkthrough across all 7 content pages with auto-triggered actions at precise timestamps. The presenter's mouse stays free throughout.

| Step | Page | Duration | Auto Action |
|------|------|----------|-------------|
| 1 | Command Center | 7s | Live floor plan |
| 2 | Digital Twin | 6s | Network topology |
| 3 | Patient Intel | 13s | t=1.8s → Analyze All |
| 4 | Operations Hub | 16s | t=2.5s → add constraint; t=10s → remove |
| 5 | AI Copilot | 15s | t=1.5s → Run Analysis |
| 6 | Sandbox | 17s | t=1.5s → Flu Outbreak; t=7.5s → max staff; t=15.5s → reset |
| 7 | Shift Report | 6s | Observe handoff summary |

---

## Simulation Design

### Warm Start
Seeds 35 pre-existing patients across departments on boot. The platform looks like a hospital mid-shift from the first second.

### Arrival Model
Poisson process at configurable base rate (default: 8.0/hr). Crisis multipliers: Flu Outbreak (2.5×), COVID Surge (1.8×), Heatwave (1.4×). Mass Casualty injects 15 critical patients directly.

### Patient Pathways
Probabilistic severity-weighted pathways. Typical critical patient: ER intake → Labs → Imaging (CT) → ICU → Ward → Discharge. SimPy `yield env.timeout()` models each care step duration.

### Resource Resizing
`Resource._capacity` is mutated in-place — never recreated. In-flight patients are never evicted. New capacity takes effect for the next requesting patient.

### Specialist Availability
Deterministic availability cycle computed from `sim_time` and a per-specialist seeded phase. No separate scheduling simulation required.

### Fixed Constraints
`FixedBottleneck.release_at` anchors are shifted forward on first read so pre-seeded constraints always start with a future expiry. Frontend countdowns are `release_at - sim_time` — no client-side timer required for the authoritative value.

### Thread Safety
All mutable state accessed under `threading.RLock`. SimPy runs in a daemon thread; FastAPI broadcast loop runs in the asyncio event loop.

---

## WebSocket Protocol

**Client → Server**
```json
{ "type": "update_config",    "config": { "arrival_rate": 12, "er_doctors": 8 } }
{ "type": "trigger_event",    "event_type": "flu_outbreak", "params": {} }
{ "type": "request_optimization" }
{ "type": "add_bottleneck",   "data": { "resource_name": "Dr. Nina Patel", "priority": "critical" } }
{ "type": "remove_bottleneck","bottleneck_id": "BN-A3F21" }
```

**Server → Client** (every 0.8 seconds)
```json
{
  "type": "hospital_state",
  "sim_time": 432.0,
  "departments": {
    "er": { "occupancy": 0.74, "queue_length": 12, "avg_wait_time": 38.5 }
  },
  "patients": [ { "patient_id": "...", "severity": "high", "state": "waiting_er", "wait_time": 22.1 } ],
  "metrics": {
    "active_patients": 271,
    "avg_wait_time": 41.2,
    "bed_utilization": 0.68,
    "severity_counts": { "critical": 18, "high": 64, "medium": 131, "low": 58 },
    "boarding_count": 7,
    "deteriorating_count": 23,
    "sepsis_count": 4
  },
  "alerts": [ { "severity": "warning", "message": "ER queue exceeding capacity" } ],
  "care": {
    "specialists": [ { "name": "Dr. Nina Patel", "status": "available", "available_in_min": 0 } ],
    "bottlenecks": [],
    "tracked_patients": [ { "patient_id": "EXEC-1001", "risk_score": 0.93 } ]
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
| GET | `/api/v1/ai/analysis` | Optimization + bottleneck predictions + forecast |
| GET | `/api/v1/ai/optimize` | Run optimizer only |
| GET | `/api/v1/ai/shift-report` | Generate shift handoff narrative |
| GET | `/api/v1/ai/forecast/bottlenecks` | Bottleneck predictions only |
| GET | `/api/v1/ai/care/state` | Specialists, bottlenecks, tracked patients |
| GET | `/api/v1/ai/care/specialists` | Specialist roster |
| GET | `/api/v1/ai/care/bottlenecks` | Active constraints |
| POST | `/api/v1/ai/care/bottlenecks` | Add a fixed constraint |
| DELETE | `/api/v1/ai/care/bottlenecks/{id}` | Remove a constraint |
| GET | `/api/v1/ai/care/patients/{id}/summary` | AI summary for a tracked patient |

Full interactive documentation: **http://localhost:8000/docs**

---

## Key Design Decisions

**Why OR-Tools + Ollama instead of just an LLM?**
The optimizer makes all decisions using linear programming grounded in real simulation data. Ollama only explains those decisions in prose. Recommendations are calculated, not hallucinated.

**Why SimPy in a thread instead of async?**
SimPy's generator-based coroutines conflict with asyncio. A daemon thread with an RLock is simpler and more stable than bridging two coroutine systems.

**Why Ollama?**
Fully local, free, no API keys, HIPAA-friendly. Degrades gracefully to deterministic fallback text — indistinguishable in format. The rest of the platform is unaffected when Ollama is offline.

**Why consolidate analytics into one module?**
The four domains (forecasting, optimization, AI narrative, care coordination) share the same input — the hospital state dict — and are always instantiated together. A single `analytics.py` eliminates circular imports, simplifies the service layer, and makes the dependency chain explicit.

**Why decouple projected metrics from the simulation in the Sandbox?**
The simulation takes 10–30 seconds to drain after a config change. Formula-based projections tied to staff ratios give instant directional feedback before the sim catches up.

**Why a curated 4-patient view instead of a full patient list?**
For executive and demo contexts, a 270-row table is noise. The four tracked patients span the full risk spectrum and exercise every system feature: constraint-blocked recommendations, rerouted care plans, over-target wait times.

---

## Investor Pitch Reference

See `pitch_snippets.py` in the project root for three clean, annotated code snippets designed for technical investor presentations, covering the three core differentiators:

1. **Holt-Winters Demand Forecasting** — multi-horizon time-series with 95% confidence bands
2. **OR-Tools LP Staffing Optimizer** — provably optimal staff reallocation with hard constraints
3. **Ollama Local LLM Copilot** — privacy-safe on-premise AI with graceful degradation

Each snippet includes a spoken pitch script above the code.

---

## Demo

The fastest way to run the demo: open the platform, click **Auto Demo** in the left sidebar, click **Start Full Demo**. The entire walkthrough runs in 81 seconds. Your mouse stays free the whole time.
