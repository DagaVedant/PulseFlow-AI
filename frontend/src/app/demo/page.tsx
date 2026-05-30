/* Automated demo controller — navigates through all platform pages with timed pauses and auto-triggered actions. */
"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Square, CheckCircle, Loader2 } from "lucide-react";
import { useDemoStore } from "@/store/demoStore";

const STEPS = [
  {
    label: "Command Center",
    desc: "Live hospital floor plan with real-time patient movement and department health",
    route: "/command-center",
    duration: 5000,
    icon: "🏥",
  },
  {
    label: "Digital Twin",
    desc: "Network topology showing patient flow rates between departments",
    route: "/digital-twin",
    duration: 5000,
    icon: "🔗",
  },
  {
    label: "Patient Intelligence",
    desc: "AI generates clinical summaries for the highest-risk patients",
    route: "/patient-intel",
    duration: 11500,
    icon: "👤",
  },
  {
    label: "AI Copilot",
    desc: "OR-Tools optimizer detects bottlenecks and builds intervention plan",
    route: "/copilot",
    duration: 13500,
    icon: "🧠",
  },
  {
    label: "Simulation Sandbox",
    desc: "Trigger a flu outbreak, watch cascading effects, apply AI fix",
    route: "/sandbox",
    duration: 16000,
    icon: "⚗️",
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
  const abortRef = useRef<AbortController | null>(null);

  const totalDuration = STEPS.reduce((s, x) => s + x.duration, 0) / 1000;

  const start = async () => {
    const abort = new AbortController();
    abortRef.current = abort;
    setPlaying(true);
    setDone(false);
    setRunning(true);

    try {
      for (let i = 0; i < STEPS.length; i++) {
        const s = STEPS[i];
        setStep(i);
        setCurrentStep(i);
        router.push(s.route);

        if (i === 2) {
          await delay(1500, abort.signal);
          setPendingAction("analyze_patients");
          await delay(s.duration - 1500, abort.signal);
        } else if (i === 3) {
          await delay(1500, abort.signal);
          setPendingAction("run_copilot");
          await delay(s.duration - 1500, abort.signal);
        } else if (i === 4) {
          await delay(1500, abort.signal);
          setPendingAction("sandbox_demo");
          await delay(s.duration - 1500, abort.signal);
        } else {
          await delay(s.duration, abort.signal);
        }
      }
      setDone(true);
    } catch {
      /* aborted */
    } finally {
      setPlaying(false);
      setRunning(false);
      setCurrentStep(-1);
      setStep(-1);
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    useDemoStore.getState().clearAction();
  };

  const elapsed = STEPS.slice(0, Math.max(0, step)).reduce((s, x) => s + x.duration, 0) / 1000;

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-6 gap-6 overflow-auto">
      <div className="text-center">
        <div className="text-4xl mb-3">▶</div>
        <h1 className="text-2xl font-bold text-white mb-1 tracking-wide">Auto Demo</h1>
        <p className="text-slate-400 font-mono text-sm">
          {totalDuration.toFixed(0)}s automated walkthrough · mouse stays free
        </p>
      </div>

      <div className="w-full max-w-xl space-y-2.5">
        {STEPS.map((s, i) => {
          const isActive = step === i;
          const isDone   = step > i || done;
          return (
            <motion.div
              key={i}
              animate={{
                backgroundColor: isActive
                  ? "rgba(59,130,246,0.12)"
                  : isDone
                  ? "rgba(0,255,136,0.05)"
                  : "rgba(255,255,255,0.025)",
                borderColor: isActive
                  ? "rgba(59,130,246,0.45)"
                  : isDone
                  ? "rgba(0,255,136,0.25)"
                  : "rgba(255,255,255,0.07)",
              }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-4 p-4 rounded-2xl"
              style={{ border: "1px solid" }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 font-mono font-bold"
                style={{
                  background: isDone ? "rgba(0,255,136,0.15)" : isActive ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.05)",
                  color: isDone ? "#00ff88" : isActive ? "#60a5fa" : "#475569",
                }}
              >
                {isDone ? <CheckCircle className="w-4 h-4" /> : isActive ? <Loader2 className="w-4 h-4 animate-spin" /> : s.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  {s.label}
                  {isActive && (
                    <motion.span
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="text-xs font-mono text-blue-400 px-2 py-0.5 rounded bg-blue-950/50"
                    >
                      LIVE
                    </motion.span>
                  )}
                </div>
                <div className="text-xs text-slate-600 font-mono mt-0.5 truncate">{s.desc}</div>
              </div>
              <div className="text-xs text-slate-700 font-mono flex-shrink-0">
                {(s.duration / 1000).toFixed(0)}s
              </div>
            </motion.div>
          );
        })}
      </div>

      {playing && (
        <div className="w-full max-w-xl">
          <div className="flex justify-between text-xs text-slate-600 font-mono mb-1.5">
            <span>Progress</span>
            <span>{elapsed.toFixed(0)}s / {totalDuration.toFixed(0)}s</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #3b82f6, #8b5cf6)" }}
              animate={{ width: `${(elapsed / totalDuration) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {done ? (
          <motion.button
            key="restart"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => { setDone(false); start(); }}
            className="flex items-center gap-3 px-10 py-4 rounded-2xl text-base font-bold font-mono text-white"
            style={{ background: "rgba(0,255,136,0.12)", border: "1px solid rgba(0,255,136,0.3)" }}
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
            Start Demo
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
            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)", color: "#f87171" }}
          >
            <Square className="w-5 h-5" fill="currentColor" />
            Stop Demo
          </motion.button>
        )}
      </AnimatePresence>

      <p className="text-xs text-slate-700 font-mono text-center max-w-sm">
        Your mouse is free during the demo — hover, highlight, and explain anything as it plays.
      </p>
    </div>
  );
}
