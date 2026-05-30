# PulseFlow AI — Demo Script

One-click automated demo. Navigate to the **Auto Demo** tab in the sidebar and press **Start Demo**.

## What Happens (52 seconds total)

| Time | Page | What to highlight |
|------|------|-------------------|
| 0–5s | Command Center | Live floor plan — patient dots moving in real time, department health bars |
| 5–10s | Digital Twin | Network topology — show edge flow numbers, department node stats |
| 10–21s | Patient Intelligence | AI auto-analyzes top 4 patients — point out risk scores and care pathways |
| 21–34s | AI Copilot | Optimizer fires — show root cause analysis, before/after metrics panel |
| 34–50s | Simulation Sandbox | Flu outbreak triggers (metrics spike), then max staff applied (recovery arc) |

## Manual Talking Points

### Command Center
- "This is a live SimPy discrete-event simulation — every dot is an individual patient entity"
- "Green = healthy department, yellow = warning, red = critical — updates every 0.8 seconds"
- "The live event feed on the right shows admissions and alerts as they happen"

### Digital Twin
- "The numbers on the edges are patients in transit between departments right now"
- "Each node shows real-time bed occupancy, queue depth, and wait time"

### Patient Intelligence
- "We're running parallel AI requests for every patient — Ollama LLM, fully local, no API key"
- "Risk score is computed from severity, pathway complexity, and wait time delta"

### AI Copilot
- "OR-Tools constraint optimizer runs in microseconds — the AI only explains, never decides"
- "Before/After panel shows what changed since we clicked Run Analysis"
- "Click Implement All to push recommendations directly into the live simulation"

### Simulation Sandbox
- "Flu outbreak: 2.5× arrival multiplier — watch the ER queue spike in real time"
- "Increasing doctors compresses queue timestamps instantly — no simulation settling delay"
- "This is the what-if tool — test any staffing scenario before it happens in real life"

## Tips
- Your mouse is completely free during the demo — hover over anything to show details
- The crisis glow (red border) activates automatically when critical alerts fire
- If a page loads slowly, the demo timing still works — actions are dispatched after a 1.5s buffer
