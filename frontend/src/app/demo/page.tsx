/* Automated demo controller — single-button 81-second walkthrough of PulseFlow AI. */
"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Square, CheckCircle } from "lucide-react";
import { useDemoStore } from "@/store/demoStore";

interface Step {
  route: string;
  duration: number;
  actions?: { delay: number; action: string }[];
}

const STEPS: Step[] = [
  { route: "/command-center", duration: 10000, actions: [{ delay: 4000, action: "view_ambulances" }] },
  { route: "/digital-twin",   duration: 10000 },
  { route: "/patient-intel",  duration: 10000, actions: [{ delay: 1800, action: "analyze_patients" }] },
  { route: "/operations",     duration: 10000, actions: [{ delay: 2500, action: "add_constraint" }, { delay: 7000, action: "remove_constraint" }] },
  { route: "/copilot",        duration: 10000, actions: [{ delay: 1500, action: "run_copilot" }] },
  { route: "/sandbox",        duration: 10000, actions: [{ delay: 1500, action: "sandbox_demo" }] },
  { route: "/shift-report",   duration: 10000 },
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
  const [done, setDone] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const start = async () => {
    const abort = new AbortController();
    abortRef.current = abort;
    setPlaying(true);
    setDone(false);
    setRunning(true);

    try {
      for (let i = 0; i < STEPS.length; i++) {
        const s = STEPS[i];
        setCurrentStep(i);
        router.push(s.route);

        const timers: ReturnType<typeof setTimeout>[] = [];
        if (s.actions) {
          for (const act of s.actions) {
            timers.push(setTimeout(() => setPendingAction(act.action as any), act.delay));
          }
        }

        try {
          await delay(s.duration, abort.signal);
        } finally {
          timers.forEach(clearTimeout);
        }
      }
      setDone(true);
    } catch {
      /* aborted */
    } finally {
      setPlaying(false);
      setRunning(false);
      setCurrentStep(-1);
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    useDemoStore.getState().clearAction();
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-10">

      <div className="text-center select-none">
        <h1 className="text-5xl font-black text-white tracking-tight">PulseFlow AI</h1>
        <p className="text-slate-500 font-mono text-base mt-2 tracking-widest uppercase">Demo</p>
      </div>

      <AnimatePresence mode="wait">
        {done ? (
          <motion.button
            key="restart"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => { setDone(false); start(); }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-4 px-16 py-6 rounded-3xl text-xl font-black font-mono text-white"
            style={{
              background: "linear-gradient(135deg, #059669 0%, #2563eb 100%)",
            }}
          >
            <CheckCircle className="w-7 h-7" />
            Run Again
          </motion.button>
        ) : !playing ? (
          <motion.button
            key="start"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ scale: 1.04, boxShadow: "0 0 80px rgba(34,197,94,0.5), 0 0 160px rgba(59,130,246,0.3)" }}
            whileTap={{ scale: 0.97 }}
            onClick={start}
            className="flex items-center gap-4 px-16 py-6 rounded-3xl text-xl font-black font-mono text-white"
            style={{
              background: "linear-gradient(135deg, #059669 0%, #2563eb 100%)",
            }}
          >
            <Play className="w-7 h-7" fill="white" />
            Start Demo
          </motion.button>
        ) : (
          <motion.button
            key="stop"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={stop}
            className="flex items-center gap-4 px-16 py-6 rounded-3xl text-xl font-black font-mono"
            style={{
              background: "rgba(239,68,68,0.12)",
              border: "1.5px solid rgba(239,68,68,0.4)",
              color: "#f87171",
            }}
          >
            <Square className="w-7 h-7" fill="currentColor" />
            Stop
          </motion.button>
        )}
      </AnimatePresence>

    </div>
  );
}
