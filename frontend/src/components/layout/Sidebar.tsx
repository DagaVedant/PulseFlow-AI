/* Left navigation sidebar linking the five main pages. */
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity, Network, Users, Brain, FlaskConical,
  AlertTriangle, ChevronRight, Play, ClipboardList, Stethoscope, RotateCcw
} from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";
import { useDemoStore } from "@/store/demoStore";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useState } from "react";

const NAV_ITEMS = [
  {
    href: "/command-center",
    icon: Activity,
    label: "Command Center",
    sublabel: "Hospital floor plan",
  },
  {
    href: "/digital-twin",
    icon: Network,
    label: "Digital Twin",
    sublabel: "System network",
  },
  {
    href: "/patient-intel",
    icon: Users,
    label: "Patient Intel",
    sublabel: "Patient tracking",
  },
  {
    href: "/operations",
    icon: Stethoscope,
    label: "Operations Hub",
    sublabel: "Specialists & constraints",
  },
  {
    href: "/copilot",
    icon: Brain,
    label: "AI Copilot",
    sublabel: "Operations AI",
  },
  {
    href: "/sandbox",
    icon: FlaskConical,
    label: "Sandbox",
    sublabel: "What-if scenarios",
  },
  {
    href: "/shift-report",
    icon: ClipboardList,
    label: "Shift Report",
    sublabel: "Handoff summary",
  },
  {
    href: "/demo",
    icon: Play,
    label: "Auto Demo",
    sublabel: "1-click walkthrough",
    accent: true,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { criticalAlerts, hospitalState } = useSimulationStore();
  const { isRunning, currentStep } = useDemoStore();
  const activePatients = hospitalState?.metrics?.active_patients ?? 0;
  const alertCount = criticalAlerts.length;
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const handleReset = async () => {
    if (resetting) return;
    setResetting(true);
    try {
      await api.resetSimulation();
      setResetDone(true);
      setTimeout(() => setResetDone(false), 2000);
    } catch {
      /* backend unreachable */
    } finally {
      setResetting(false);
    }
  };

  return (
    <div
      className="w-[300px] flex-shrink-0 flex flex-col h-full"
      style={{
        background: "linear-gradient(180deg, #080c18 0%, #0d1225 100%)",
        borderRight: "1px solid rgba(12,200,212,0.12)",
      }}
    >
      {}
      <div className="px-6 py-5 border-b" style={{ borderColor: "rgba(12,200,212,0.12)" }}>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="PulseFlow logo" className="w-14 h-14 object-contain flex-shrink-0" />
          <div>
            <div className="text-lg font-bold text-white tracking-wide">PulseFlow</div>
            <div className="text-xs font-mono tracking-widest uppercase mt-0.5" style={{ color: "#0CC8D4" }}>
              AI Platform
            </div>
          </div>
        </div>
      </div>

      {}
      <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(12,200,212,0.1)" }}>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg px-3 py-2.5" style={{ background: "rgba(12,200,212,0.06)", border: "1px solid rgba(12,200,212,0.1)" }}>
            <div className="text-xs text-slate-500 font-mono uppercase mb-1">Patients</div>
            <div className="text-xl font-bold font-mono" style={{ color: "#0CC8D4" }}>{activePatients}</div>
          </div>
          <div className="rounded-lg px-3 py-2.5" style={{ background: alertCount > 0 ? "rgba(224,24,122,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid ${alertCount > 0 ? "rgba(224,24,122,0.15)" : "rgba(255,255,255,0.05)"}` }}>
            <div className="text-xs text-slate-500 font-mono uppercase mb-1">Alerts</div>
            <div className="text-xl font-bold font-mono" style={{ color: alertCount > 0 ? "#E0187A" : "#475569" }}>
              {alertCount > 0 ? alertCount : "—"}
            </div>
          </div>
        </div>
      </div>

      {}
      <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map((item, idx) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const isDemo = (item as any).accent;
          const isDemoStep = isRunning && currentStep === idx;

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 3 }}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-200 group cursor-pointer",
                  isActive && !isDemo
                    ? "border-l-[3px]"
                    : isDemo
                    ? "border-l-[3px]"
                    : "hover:bg-white/[0.05]"
                )}
                style={
                  isActive && !isDemo
                    ? { background: "rgba(12,200,212,0.08)", borderLeftColor: "#0CC8D4" }
                    : isDemo
                    ? { background: "rgba(124,58,237,0.08)", borderLeftColor: "rgba(124,58,237,0.6)" }
                    : undefined
                }
                animate={isDemoStep ? { backgroundColor: ["rgba(12,200,212,0.04)", "rgba(12,200,212,0.14)", "rgba(12,200,212,0.04)"] } : {}}
                transition={isDemoStep ? { duration: 1.2, repeat: Infinity } : {}}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors bg-white/[0.04] group-hover:bg-white/[0.07]"
                  style={
                    isActive && !isDemo
                      ? { background: "rgba(12,200,212,0.15)" }
                      : isDemo
                      ? { background: "rgba(124,58,237,0.15)" }
                      : undefined
                  }
                >
                  <Icon
                    className="w-5 h-5"
                    style={{
                      color: isActive && !isDemo ? "#0CC8D4"
                           : isDemo ? "#a78bfa"
                           : undefined
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={cn("text-sm font-semibold leading-tight", !isActive && !isDemo && "text-slate-300 group-hover:text-white")}
                    style={
                      isActive && !isDemo ? { color: "#67e8f0" }
                      : isDemo ? { color: "#c4b5fd" }
                      : undefined
                    }
                  >
                    {item.label}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">{item.sublabel}</div>
                </div>
                {isActive && !isDemo && <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "#0CC8D4" }} />}
                {isDemoStep && (
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: "#0CC8D4" }}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {}
      <div className="px-5 py-4 space-y-3" style={{ borderTop: "1px solid rgba(12,200,212,0.1)" }}>
        <button
          onClick={handleReset}
          disabled={resetting}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-mono font-bold transition-all disabled:opacity-40"
          style={{
            background: resetDone ? "rgba(12,200,212,0.08)" : "rgba(224,24,122,0.06)",
            border: `1px solid ${resetDone ? "rgba(12,200,212,0.3)" : "rgba(224,24,122,0.2)"}`,
            color: resetDone ? "#0CC8D4" : "#E0187A",
          }}
        >
          <RotateCcw className={cn("w-3.5 h-3.5", resetting && "animate-spin")} />
          {resetDone ? "Reset Complete" : resetting ? "Resetting..." : "Reset Simulation"}
        </button>
        <div className="text-[10px] font-mono text-center" style={{ color: "rgba(12,200,212,0.2)" }}>
          PULSEFLOW AI v1.0
        </div>
      </div>
    </div>
  );
}
