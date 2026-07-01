"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Play, Square, CheckCircle } from "lucide-react";
import { useDemoStore } from "@/store/demoStore";

interface Step {
  route: string;
  duration: number;
  actions?: { delay: number; action: string }[];
}

const STEPS: Step[] = [
  {
    route: "/command-center",
    duration: 10000,
    actions: [{ delay: 4000, action: "view_ambulances" }],
  },
  { route: "/digital-twin", duration: 10000 },
  {
    route: "/patient-intel",
    duration: 10000,
    actions: [{ delay: 1800, action: "analyze_patients" }],
  },
  {
    route: "/operations",
    duration: 10000,
    actions: [
      { delay: 2500, action: "add_constraint" },
      { delay: 7000, action: "remove_constraint" },
    ],
  },
  {
    route: "/copilot",
    duration: 10000,
    actions: [{ delay: 1500, action: "run_copilot" }],
  },
  {
    route: "/sandbox",
    duration: 10000,
    actions: [{ delay: 1500, action: "sandbox_demo" }],
  },
  { route: "/shift-report", duration: 10000 },
];

function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("aborted"));
    });
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
            timers.push(
              setTimeout(() => setPendingAction(act.action as any), act.delay),
            );
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
    <div className="flex flex-col items-center justify-center h-full gap-8 p-8 bg-clinical-canvas">
      <div className="text-center select-none">
        <h1 className="text-5xl font-black text-ink tracking-tight">
          PulseFlow AI
        </h1>
        <p className="text-muted font-mono text-base mt-2 tracking-widest uppercase">
          Demo
        </p>
      </div>

      {done ? (
        <button
          key="restart"
          onClick={() => {
            setDone(false);
            start();
          }}
          className="flex items-center gap-4 px-8 py-6 rounded-lg text-xl font-black text-white bg-emerald-600 hover:bg-emerald-700 transition-colors min-h-11"
        >
          <CheckCircle className="w-7 h-7" />
          Run Again
        </button>
      ) : !playing ? (
        <button
          key="start"
          onClick={start}
          className="flex items-center gap-4 px-8 py-6 rounded-lg text-xl font-black text-white bg-emerald-600 hover:bg-emerald-700 transition-colors min-h-11"
        >
          <Play className="w-7 h-7" fill="white" />
          Start Demo
        </button>
      ) : (
        <button
          key="stop"
          onClick={stop}
          className="flex items-center gap-4 px-8 py-6 rounded-lg text-xl font-black border border-crit-line bg-crit-soft text-crit-ink hover:bg-crit-soft transition-colors min-h-11"
        >
          <Square className="w-7 h-7" fill="currentColor" />
          Stop
        </button>
      )}
    </div>
  );
}
