# PulseFlow AI

![command center](frontend/public/preview.png)

Simulates a whole hospital in real time and layers AI on top of it, patient flow, department capacity, staff load, all running live and streaming to the browser over WebSocket.

## Try it

**[Demo Link](https://pulse-flow-9ht7a4fs9-dagavedants-projects.vercel.app/command-center)**

`render.yaml` for the backend and `pulseflow-ai.vercel.app` for the frontend, both wired up and deployed.

## Quick start

Two services, so this is more than 3 commands no matter how I cut it:

```powershell
.\start-backend.ps1
.\start-frontend.ps1
```

those handle venv/`pip install`/`npm install` for you on a fresh clone. Once that's done once, `python run.py` from the repo root starts both together in one command.

open `http://localhost:3000`, click **Demo** in the nav bar, hit **Start demo**. runs itself for about 80 seconds, mouse stays free the whole time.

## Features

There's a real-time floor plan with patients actually moving between departments, full state broadcast every 0.8s over WebSocket. An AI copilot that solves staffing bottlenecks with real linear programming, OR-Tools with a SciPy fallback, not an LLM guessing at numbers. A sandbox for stacking crisis events, flu outbreak, CT scanner failure, and watching the cascade hit the floor plan live. 4 curated patients spanning the risk spectrum instead of a 270-row table nobody's going to read, each with AI care recommendations. An auto-generated shift handoff report. Flat, single-theme UI, one navy canvas, `Space Grotesk` for headings, `JetBrains Mono` for every number, no gradients or glass anywhere, rebuilt after the first pass came out looking too AI-generated. And the API and WebSocket are actually gated now, shared-secret auth, rate limiting, WebSocket message validation, structured audit logs on every write, plus a CI job that runs a dependency vulnerability scan on every push.

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

backend's on `http://localhost:8000` (docs at `/docs`), frontend on `http://localhost:3000`, WebSocket at `ws://localhost:8000/ws`. nothing here is required to boot, everything degrades gracefully if it's missing:

```
# backend/.env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/pulseflow   # optional, sim runs in-memory without it
REDIS_URL=redis://localhost:6379                                               # optional, used for rate limiting if set
SECRET_KEY=pulseflow-demo-key
SIMULATION_SPEED=60
CORS_ORIGINS=http://localhost:3000
```

```
# frontend/.env.local
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_API_KEY=pulseflow-demo-key
```

`SECRET_KEY` and `NEXT_PUBLIC_API_KEY` have to match, it's the same shared token, checked as `Authorization: Bearer <token>` on REST calls and `?token=<token>` on the WebSocket. Both default to the same value so a fresh clone works out of the box, just don't ship the default to production, the backend actually refuses to boot if `ENVIRONMENT=production` and it's still set to that.

Ollama's optional, if it's not running the AI narrative just falls back to deterministic text, everything else works exactly the same.

one annoying thing: if this sits inside a OneDrive folder, `npm run dev` will sometimes crash on startup with `EINVAL: readlink ... .next`. OneDrive turns the build files into cloud placeholders and Next chokes trying to clean them up. delete `.next` and run it again. if it keeps happening, move the folder out of OneDrive.

## How it works

The thing I actually care about here is that the AI never gets to make up numbers. When the copilot flags a bottleneck it doesn't just tell you, it solves for the best doctor/nurse reallocation across ER, ICU, and Ward using OR-Tools linear programming against real sim data, with actual constraints, you can't blow the staffing budget, no department drops below minimum safe coverage, ICU pressure counts 3x because it's life critical. Falls back to SciPy, then plain heuristics if even that doesn't converge. Ollama's only job is to take whatever the optimizer already decided and explain it in plain English, running fully local so patient data never leaves the building. 5 second timeout, instant fallback, and honestly the fallback text is close enough that you usually can't tell which one you got.

Also worth mentioning, the sim itself runs on SimPy in a daemon thread instead of async. SimPy's coroutines and asyncio don't get along, and a thread with a lock was just simpler than fighting that.

On auth: I actually built out real JWT login with viewer/operator roles at one point, full accounts, role-gated writes, the works. Then looked at it and decided that was solving a problem this project doesn't have, it's a demo hospital sim with fake patients, not a real one. Reverted back to a single shared secret instead, checked on every REST call and the WebSocket connection, no accounts, no login screen. It's a fence, not a lock, `NEXT_PUBLIC_API_KEY` ships in the browser bundle so a motivated person can pull it out of devtools, but it stops casual/automated access to the open URL, which is what actually mattered here.

## Credits

SimPy for the discrete-event sim, FastAPI for the backend, Google OR-Tools for the optimizer, Ollama for local AI narrative generation, Next.js + React Flow + Zustand on the frontend.
