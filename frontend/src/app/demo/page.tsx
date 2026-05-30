/* Automated demo controller — 7-step walkthrough showcasing every interactive feature of PulseFlow AI. */
"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Square, CheckCircle, Loader2, ChevronRight } from "lucide-react";
import { useDemoStore } from "@/store/demoStore";

interface Step {
  label: string;
  desc: string;
  route: string;
  duration: number;
  icon: string;
  detail: string;
  actions?: { delay: number; action: string }[];
}

const STEPS: Step[] = [
  {
    label: "Command Center",
    desc: "Live hospital floor plan with real-time patient flow",
    route: "/command-center",
    duration: 7000,
    icon: "🏥",
    detail: "Watch patients move through departments in real-time. Live Event Feed shows timestamped clinical events as they occur.",
  },
  {
    label: "Digital Twin",
    desc: "Network topology showing inter-department patient flow rates",
    route: "/digital-twin",
    duration: 6000,
    icon: "🔗",
    detail: "Node health, flow rates between departments, and bottleneck indicators visualised as a live directed graph.",
  },
  {
    label: "Patient Intelligence",
    desc: "Four high-acuity patients — AI generates constraint-aware care plans",
    route: "/patient-intel",
    duration: 13000,
    icon: "👤",
    detail: "Risk scores, specialist-await status, and escalation pathways for James (93%), Maria (87%), Kevin (43%), Emily (12%). Click Analyze All to generate live AI plans.",
    actions: [{ delay: 1800, action: "analyze_patients" }],
  },
  {
    label: "Operations Hub",
    desc: "Specialist roster + live constraint entry demo",
    route: "/operations",
    duration: 16000,
    icon: "🩺",
    detail: "Adding Dr. Nina Patel to CABG surgery automatically removes her from the available roster. Countdown ticks in real time. Then constraint is cleared.",
    actions: [
      { delay: 2500, action: "add_constraint" },
      { delay: 10000, action: "remove_constraint" },
    ],
  },
  {
    label: "AI Copilot",
    desc: "OR-Tools optimizer detects bottlenecks and builds an intervention plan",
    route: "/copilot",
    duration: 15000,
    icon: "🧠",
    detail: "Bottleneck predictions, staffing recommendations, and AI narrative. Hit Implement All to apply changes directly to the simulation.",
    actions: [{ delay: 1500, action: "run_copilot" }],
  },
  {
    label: "Simulation Sandbox",
    desc: "Trigger a flu outbreak, watch cascading effects, recover with max staff",
    route: "/sandbox",
    duration: 17000,
    icon: "⚗️",
    detail: "Flu outbreak 2.5× arrival rate spikes queues and occupancy. Then staff is maxed out to show instant recovery. Events reset automatically.",
    actions: [{ delay: 1500, action: "sandbox_demo" }],
  },
  {
    label: "Shift Report",
    desc: "Auto-generated handoff brief for the incoming charge nurse",
    route: "/shift-report",
    duration: 6000,
    icon: "📋",
    detail: "Full-population counts from the simulation: boarding patients, deteriorating patients, sepsis alerts — all accurate to the live simulation state.",
  },
];

function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => { clearTimeout(t); reject(new DOMException("aborted")); });
  });
}

export default function DemoPage() {
  const router = useRouter();
  const { setRunning, setCurrentStep, setPendingAction } = useDemoStore();
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);
  const [done, setDone] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);
  const elapsedRef = useRef<ReturnType<typeof setInterval>>();

  const totalDuration = STEPS.reduce((s, x) => s + x.duration, 0) / 1000;

  useEffect(() => {
    return () => clearInterval(elapsedRef.current);
  }, []);

  const start = async () => {
    const abort = new AbortController();
    abortRef.current = abort;
    setPlaying(true);
    setDone(false);
    setElapsed(0);
    setRunning(true);
    startTimeRef.current = Date.now();

    clearInterval(elapsedRef.current);
    elapsedRef.current = setInterval(() => {
      setElapsed((Date.now() - startTimeRef.current) / 1000);
    }, 250);

    try {
      for (let i = 0; i < STEPS.length; i++) {
        const s = STEPS[i];
        setStep(i);
        setCurrentStep(i);
        router.push(s.route);

        const pendingTimers: ReturnType<typeof setTimeout>[] = [];

        if (s.actions) {
          for (const act of s.actions) {
            const t = setTimeout(() => {
              setPendingAction(act.action as any);
            }, act.delay);
            pendingTimers.push(t);
          }
        }

        try {
          await delay(s.duration, abort.signal);
        } finally {
          pendingTimers.forEach(clearTimeout);
        }
      }
      setDone(true);
    } catch {
      /* aborted */
    } finally {
      clearInterval(elapsedRef.current);
      setPlaying(false);
      setRunning(false);
      setCurrentStep(-1);
      setStep(-1);
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    clearInterval(elapsedRef.current);
    useDemoStore.getState().clearAction();
    setElapsed(0);
  };

  const stepElapsed = STEPS.slice(0, Math.max(0, step)).reduce((s, x) => s + x.duration, 0) / 1000;

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-8 py-6 gap-6 overflow-auto">

      {/* Title */}
      <div className="text-center">
        <div className="text-5xl mb-3">▶</div>
        <h1 className="text-2xl font-bold text-white mb-1 tracking-wide">PulseFlow AI — Auto Demo</h1>
        <p className="text-slate-400 font-mono text-sm">
          {totalDuration.toFixed(0)}s full platform walkthrough · {STEPS.length} features · mouse stays free
        </p>
      </div>

      {/* Step list */}
      <div className="w-full max-w-2xl space-y-2">
        {STEPS.map((s, i) => {
          const isActive = step === i;
          const isDone   = step > i || done;
          const isPending = step < i && !done;
          return (
            <motion.div
              key={i}
              animate={{
                backgroundColor: isActive
                  ? "rgba(59,130,246,0.10)"
                  : isDone
                  ? "rgba(0,255,136,0.05)"
                  : "rgba(255,255,255,0.02)",
                borderColor: isActive
                  ? "rgba(59,130,246,0.45)"
                  : isDone
                  ? "rgba(0,255,136,0.22)"
                  : "rgba(255,255,255,0.07)",
              }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-4 p-4 rounded-2xl"
              style={{ border: "1px solid" }}
            >
              {/* Step number / status icon */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 font-mono font-bold mt-0.5"
                style={{
                  background: isDone ? "rgba(0,255,136,0.12)" : isActive ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.04)",
                  color: isDone ? "#00ff88" : isActive ? "#60a5fa" : "#475569",
                }}
              >
                {isDone
                  ? <CheckCircle className="w-4 h-4" />
                  : isActive
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <span className="text-sm">{s.icon}</span>}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-white">{s.label}</span>
                  {isActive && (
                    <motion.span
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="text-[10px] font-mono font-bold text-blue-400 px-2 py-0.5 rounded bg-blue-950/50"
                    >
                      LIVE
                    </motion.span>
                  )}
                  {isDone && (
                    <span className="text-[10px] font-mono font-bold text-emerald-500 px-2 py-0.5 rounded bg-emerald-950/40">
                      DONE
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 font-mono mb-1 truncate">{s.desc}</div>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="text-xs text-slate-400 leading-relaxed mt-1.5 pr-4 font-mono"
                  >
                    {s.detail}
                    {s.actions && (
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {s.actions.map((a, ai) => (
                          <span key={ai} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-blue-950/50 text-blue-300 border border-blue-800/40">
                            <ChevronRight className="w-2.5 h-2.5" /> auto: {a.action.replace(/_/g, " ")} in {(a.delay / 1000).toFixed(1)}s
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Duration */}
              <div className="text-xs text-slate-700 font-mono flex-shrink-0 mt-1">
                {(s.duration / 1000).toFixed(0)}s
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Progress bar */}
      {playing && (
        <div className="w-full max-w-2xl">
          <div className="flex justify-between text-xs text-slate-600 font-mono mb-1.5">
            <span>Progress</span>
            <span>{elapsed.toFixed(0)}s / {totalDuration.toFixed(0)}s</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #3b82f6, #8b5cf6)" }}
              animate={{ width: `${Math.min(100, (elapsed / totalDuration) * 100)}%` }}
              transition={{ duration: 0.25 }}
            />
          </div>
        </div>
      )}

      {/* CTA */}
      <AnimatePresence mode="wait">
        {done ? (
          <motion.button
            key="restart"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => { setDone(false); start(); }}
            className="flex items-center gap-3 px-10 py-4 rounded-2xl text-base font-bold font-mono text-white"
            style={{ background: "rgba(0,255,136,0.10)", border: "1px solid rgba(0,255,136,0.3)" }}
          >
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            Demo Complete — Run Again
          </motion.button>
        ) : !playing ? (
          <motion.button
            key="start"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={start}
            className="flex items-center gap-3 px-12 py-5 rounded-2xl text-lg font-bold font-mono text-white"
            style={{
              background: "linear-gradient(135deg, #1d4ed8, #7c3aed)",
              boxShadow: "0 0 50px rgba(59,130,246,0.3), 0 0 100px rgba(124,58,237,0.15)",
            }}
          >
            <Play className="w-6 h-6" fill="white" />
            Start Full Demo
          </motion.button>
        ) : (
          <motion.button
            key="stop"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={stop}
            className="flex items-center gap-3 px-10 py-4 rounded-2xl text-base font-bold font-mono"
            style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.35)", color: "#f87171" }}
          >
            <Square className="w-5 h-5" fill="currentColor" />
            Stop Demo
          </motion.button>
        )}
      </AnimatePresence>

      <p className="text-xs text-slate-700 font-mono text-center max-w-md">
        Your mouse is free throughout — hover, highlight, and explain anything as it plays.
        Each step navigates automatically and triggers the interactive action shown.
      </p>
    </div>
  );
}
