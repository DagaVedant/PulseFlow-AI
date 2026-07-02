# PulseFlow AI

Simulates a whole hospital in real time and layers AI on top of it, patient flow, department capacity, staff load, all running live and streaming to the browser over WebSocket.

![demo](frontend/public/logos/logo-full-cropped.png)

## Try it

**[Demo Link](https://pulse-flow-d1g7ub4bc-dagavedants-projects.vercel.app/command-center)**, not live yet. `render.yaml` for the backend and the CORS config already pointing at `pulseflow-ai.vercel.app` are both sitting there, so it's basically wired up, just needs an actual push and this link filled in.

## Quick start

Two services, so this is more than 3 commands no matter how I cut it:

```powershell
.\start-backend.ps1
.\start-frontend.ps1
```

open `http://localhost:3000`, click **Auto Demo** in the sidebar, hit **Start Full Demo**. runs itself for about 80 seconds, mouse stays free the whole time.

## Features

There's a real-time floor plan with patients actually moving between departments, full state broadcast every 0.8s over WebSocket. Same hospital as a network graph too, departments as nodes, patient flow as edges, if you'd rather see topology than a floor plan. An AI copilot that solves staffing bottlenecks with real linear programming, OR-Tools with a SciPy fallback, not an LLM guessing at numbers. A sandbox for stacking crisis events, flu outbreak, CT scanner failure, and watching the cascade hit the floor plan live. 4 curated patients spanning the risk spectrum instead of a 270-row table nobody's going to read, each with AI care recommendations. An auto-generated shift handoff report. And real dark/light mode with no flash on load, built around a design contract I wrote based on HIPAA/WCAG constraints, UI-level alignment only, not an actual certification, don't get excited.

## How to run it locally

**Backend**, Python 3.11
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python run.py
```

**Frontend**, Next.js 15
```powershell
cd frontend
npm install
npm run dev
```

backend's on `http://localhost:8000` (docs at `/docs`), frontend on `http://localhost:3000`, WebSocket at `ws://localhost:8000/ws`. nothing here is actually required to boot, everything degrades gracefully if it's missing:

```
# backend/.env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/pulseflow   # optional, sim runs in-memory without it
REDIS_URL=redis://localhost:6379                                               # optional
SECRET_KEY=your_secret_key_here_change_in_production
SIMULATION_SPEED=60
CORS_ORIGINS=http://localhost:3000
```

```
# frontend/.env.local
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Ollama's optional, if it's not running the AI narrative just falls back to deterministic text, everything else works exactly the same.

one annoying thing: if this sits inside a OneDrive folder, `npm run dev` will sometimes crash on startup with `EINVAL: readlink ... .next`. OneDrive turns the build files into cloud placeholders and Next chokes trying to clean them up. delete `.next` and run it again. if it keeps happening, move the folder out of OneDrive.

## How it works

The thing I actually care about here is that the AI never gets to make up numbers. When the copilot flags a bottleneck it doesn't just tell you, it solves for the best doctor/nurse reallocation across ER, ICU, and Ward using OR-Tools linear programming against real sim data, with actual constraints, you can't blow the staffing budget, no department drops below minimum safe coverage, ICU pressure counts 3x because it's life critical. Falls back to SciPy, then plain heuristics if even that doesn't converge. Ollama's only job is to take whatever the optimizer already decided and explain it in plain English, running fully local so patient data never leaves the building. 5 second timeout, instant fallback, and honestly the fallback text is close enough that you usually can't tell which one you got.

Also worth mentioning, the sim itself runs on SimPy in a daemon thread instead of async. SimPy's coroutines and asyncio don't get along, and a thread with a lock was just simpler than fighting that.

## Credits

SimPy for the discrete-event sim, FastAPI for the backend, Google OR-Tools for the optimizer, Ollama for local AI narrative generation, Next.js + React Flow + Zustand on the frontend.