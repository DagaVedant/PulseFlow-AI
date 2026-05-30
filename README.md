# PulseFlow AI — Hospital Digital Twin Platform

An AI-powered hospital operating system that simulates, monitors, and optimizes an entire hospital in real time. PulseFlow creates a live digital twin of patient flow, department capacity, and staff utilization — turning reactive hospital management into predictive, data-driven decision-making.

---

## What It Does

Most hospitals discover problems after they happen — queues overflow, staff burn out, and patients wait hours for a 20-minute consultation. PulseFlow runs a continuous simulation of the hospital so administrators can see bottlenecks forming before they affect care, test interventions without touching real operations, and apply AI-generated optimization recommendations with a single click.

---

## Stack

| Layer | Technology |
|---|---|
| Simulation | Python · SimPy discrete-event engine |
| Backend | FastAPI · WebSocket broadcast · OR-Tools optimizer |
| AI Copilot | Ollama (local LLM — runs fully offline, no API key) |
| Frontend | Next.js 14 · React Flow · Framer Motion · Zustand |
| Realtime | WebSocket — state broadcast every 0.8 s |

---

## Architecture

```
SimPy Simulation (background thread)
        │  state snapshot every sim-minute
        ▼
FastAPI + WebSocket manager
        │  broadcasts JSON every 0.8 s
        ▼
Next.js frontend (5 pages)
```

The simulation runs in a background thread at configurable speed (default: 60 sim-minutes per real second). OR-Tools handles resource-allocation optimization; Ollama generates plain-prose explanations of the optimizer's recommendations.

---

## Project Structure

```
PulseFlow AI/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app + WebSocket endpoint
│   │   ├── config.py                # Settings via pydantic-settings
│   │   ├── core/
│   │   │   ├── simulation/
│   │   │   │   ├── engine.py        # SimPy hospital digital twin
│   │   │   │   └── patient.py       # Patient entity + enums
│   │   │   ├── optimization/
│   │   │   │   └── optimizer.py     # OR-Tools + SciPy fallback
│   │   │   ├── forecasting/
│   │   │   │   └── forecaster.py    # Time-series bottleneck prediction
│   │   │   └── ai/
│   │   │       └── copilot.py       # Ollama LLM copilot
│   │   ├── api/v1/                  # REST routes
│   │   └── services/                # Orchestration + WebSocket manager
│   ├── requirements.txt
│   └── run.py
│
└── frontend/
    └── src/
        ├── app/
        │   ├── command-center/      # Page 1 — hospital floor plan
        │   ├── digital-twin/        # Page 2 — React Flow network
        │   ├── patient-intel/       # Page 3 — patient tracking
        │   ├── copilot/             # Page 4 — AI analysis
        │   └── sandbox/             # Page 5 — what-if simulator
        ├── components/
        ├── hooks/                   # useWebSocket, useSimulation
        ├── store/                   # Zustand state
        └── types/
```

---

## Running Locally

### Prerequisites
- Python 3.11+
- Node.js 18+
- [Ollama](https://ollama.com) (optional — AI narration degrades gracefully without it)

### Backend
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python run.py
```

### Frontend
```powershell
cd frontend
npm install
npm run dev
```

### Access
| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| WebSocket | ws://localhost:8000/ws |

### Environment Variables

**backend/.env** (all optional)
```
ANTHROPIC_API_KEY=        # not used — Ollama is the AI provider
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
SIMULATION_SPEED=60       # sim-minutes per real second
BASE_ARRIVAL_RATE=8.0     # patients per hour
```

**frontend/.env.local**
```
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---

## The Five Pages

### 1 — Command Center
The primary operations view. An animated hospital floor plan renders every department (ER, Labs, Imaging, ICU, Ward) with realistic equipment icons — treatment bays with beds and IV poles, CT/MRI gantries, microscopes and lab flasks. Patient dots move across the map in real time, color-coded by severity. Active alerts appear alongside a live KPI strip.

### 2 — Digital Twin
A React Flow network showing all departments as nodes with real-time occupancy, queue depth, and wait-time metrics. Edge labels show patient flow rates between departments.

### 3 — Patient Intelligence
A searchable, filterable list of every active patient with severity badge, care pathway, risk score, and current wait time. Click any patient to request an AI-generated clinical summary from the local Ollama model. An "Analyze All" button loads summaries for the visible cohort in parallel.

### 4 — AI Copilot
Runs the OR-Tools optimizer against the current simulation state, then sends the result to Ollama for a plain-prose explanation. Shows a pentagon radar chart of hospital health dimensions, current metrics, bottleneck predictions, and specific recommended actions. A single button applies all AI recommendations directly to the live simulation.

### 5 — Simulation Sandbox
Live configuration panel with aggregated sliders (Doctors, Nurses, Lab Technicians, Hospital Beds, CT Scanners, MRI Machines, Arrival Rate). Changes apply automatically with a 600 ms debounce and take effect immediately — the simulation's queue timestamps are recomputed on every config change so wait times respond within one broadcast cycle. Emergency event toggles (Flu Outbreak, COVID Surge, Mass Casualty, CT Failure, etc.) fire instantly.

---

## Simulation Design

- **Warm start** — 18 pre-existing patients across departments on boot, so the demo is live immediately
- **Arrival model** — Poisson process at a configurable base rate, modulated by active crisis events (flu: 2.5×, heatwave: 1.4×, COVID: 1.8×)
- **Patient pathways** — probabilistic routing through ER → Labs → Imaging → ICU / Ward → Discharge based on severity
- **Wait time calculation** — current queue wait (time since queue entry for each waiting patient), capped at 4 hours
- **Resource resizing** — SimPy resource `_capacity` is mutated in-place on config change, never recreated, so in-flight patient processes are never orphaned
- **Cumulative counters** — discharge counts and admission totals never reset; no daily rollover
- **Thread safety** — all shared state accessed under `threading.RLock`

---

## WebSocket Protocol

**Client → Server**
```json
{ "type": "update_config",   "config": { "arrival_rate": 12, "er_doctors": 8 } }
{ "type": "trigger_event",   "event_type": "flu_outbreak", "params": {} }
{ "type": "request_optimization" }
```

**Server → Client** (every 0.8 s)
```json
{
  "type": "hospital_state",
  "sim_time": 432.0,
  "departments": { "er": { "occupancy": 0.74, "queue_length": 12, "avg_wait_time": 38.5, ... } },
  "patients": [ { "patient_id": "...", "severity": "high", "state": "waiting_er", ... } ],
  "metrics": { "avg_wait_time": 41.2, "bed_utilization": 0.68, ... },
  "alerts": [ { "severity": "warning", "message": "ER queue exceeding capacity", ... } ]
}
```

---

## Demo Scenario (1 minute)

1. Open http://localhost:3000 — hospital is already running with live patients on the floor plan
2. Navigate to **Simulation Sandbox** — drag Arrival Rate up, watch ER queue and wait times spike instantly
3. Drag Doctors back up — wait times drop within a second
4. Toggle **Flu Outbreak** — cascading effects across all departments
5. Navigate to **AI Copilot** → click **Run Analysis** — optimizer fires and Ollama explains the bottleneck
6. Click **Implement All AI Recommendations** — config applies, metrics visibly improve
7. Navigate to **Digital Twin** to see the network-level flow rates normalize
8. Navigate to **Patient Intelligence** — click a critical patient for an AI summary

---

## Key Design Decisions

**Why OR-Tools + Ollama instead of just an LLM?**
The optimizer makes the decisions using linear programming. Ollama only explains them in plain prose. This avoids hallucinated recommendations and keeps the AI grounded in simulation data.

**Why SimPy in a thread instead of async?**
SimPy's coroutine model conflicts with Python's asyncio event loop. Running it in a daemon thread with an RLock for shared state is simpler and more stable than bridging the two.

**Why Ollama?**
Fully local, free, no API keys, works offline. The copilot degrades gracefully to deterministic fallback text when Ollama is not running — the rest of the platform is unaffected.
