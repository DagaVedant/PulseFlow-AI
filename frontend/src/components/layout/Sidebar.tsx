/* Left navigation sidebar linking the five main pages. */
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity, Network, Users, Brain, FlaskConical,
  AlertTriangle, ChevronRight, Zap, Play
} from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";
import { useDemoStore } from "@/store/demoStore";
import { cn } from "@/lib/utils";

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
    href: "/demo",
    icon: Play,
    label: "Auto Demo",
    sublabel: "1-click walkthrough",
    accent: true,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isConnected, criticalAlerts, hospitalState } = useSimulationStore();
  const { isRunning, currentStep } = useDemoStore();
  const activePatients = hospitalState?.metrics?.active_patients ?? 0;
  const alertCount = criticalAlerts.length;

  return (
    <div
      className="w-[300px] flex-shrink-0 flex flex-col h-full"
      style={{
        background: "linear-gradient(180deg, #0a0e1a 0%, #0f1629 100%)",
        borderRight: "1px solid rgba(59,130,246,0.12)",
      }}
    >
      {}
      <div className="px-6 py-7 border-b border-blue-950/50">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
                boxShadow: "0 0 24px rgba(59,130,246,0.55)",
              }}
            >
              <Zap className="w-6 h-6 text-white" />
            </div>
            {isConnected && (
              <span
                className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0a0e1a]"
                style={{ boxShadow: "0 0 8px rgba(52,211,153,0.9)" }}
              />
            )}
          </div>
          <div>
            <div className="text-lg font-bold text-white tracking-wide">PulseFlow</div>
            <div className="text-xs text-blue-400 font-mono tracking-widest uppercase mt-0.5">
              AI Platform
            </div>
          </div>
        </div>
      </div>

      {}
      <div className="px-5 py-4 border-b border-blue-950/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-2.5 h-2.5 rounded-full",
                isConnected ? "bg-emerald-400" : "bg-red-500"
              )}
              style={isConnected ? { boxShadow: "0 0 8px rgba(52,211,153,0.9)" } : {}}
            />
            <span className="text-sm text-slate-400 font-mono font-medium">
              {isConnected ? "LIVE" : "OFFLINE"}
            </span>
          </div>
          {alertCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-950/60 border border-red-800/50">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-sm text-red-400 font-mono font-bold">{alertCount}</span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-950/30 rounded-lg px-3 py-2.5">
            <div className="text-xs text-slate-500 font-mono uppercase mb-1">Patients</div>
            <div className="text-xl font-bold text-blue-300 font-mono">{activePatients}</div>
          </div>
          <div className="bg-blue-950/30 rounded-lg px-3 py-2.5">
            <div className="text-xs text-slate-500 font-mono uppercase mb-1">Alerts</div>
            <div
              className={cn(
                "text-xl font-bold font-mono",
                alertCount > 0 ? "text-red-400" : "text-emerald-400"
              )}
            >
              {alertCount > 0 ? alertCount : "CLEAR"}
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
          const isDemoStep = isRunning && idx < 5 && currentStep === idx;

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 3 }}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-200 group cursor-pointer",
                  isActive && !isDemo
                    ? "bg-blue-500/12 border-l-[3px] border-blue-500"
                    : isDemo
                    ? "border-l-[3px] border-purple-500/60"
                    : "hover:bg-white/[0.05]"
                )}
                style={isDemo ? { background: "rgba(124,58,237,0.08)" } : undefined}
                animate={isDemoStep ? { backgroundColor: ["rgba(59,130,246,0.05)", "rgba(59,130,246,0.15)", "rgba(59,130,246,0.05)"] } : {}}
                transition={isDemoStep ? { duration: 1.2, repeat: Infinity } : {}}
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                    isActive && !isDemo
                      ? "bg-blue-500/20"
                      : isDemo
                      ? "bg-purple-500/15"
                      : "bg-white/[0.04] group-hover:bg-white/[0.07]"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5",
                      isActive && !isDemo ? "text-blue-400"
                      : isDemo ? "text-purple-400"
                      : "text-slate-500 group-hover:text-slate-300"
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "text-sm font-semibold leading-tight",
                    isActive && !isDemo ? "text-blue-200"
                    : isDemo ? "text-purple-300"
                    : "text-slate-300 group-hover:text-white"
                  )}>
                    {item.label}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">{item.sublabel}</div>
                </div>
                {isActive && !isDemo && <ChevronRight className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                {isDemoStep && (
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0"
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {}
      <div className="px-5 py-4 border-t border-blue-950/30">
        <div className="text-[10px] text-slate-700 font-mono text-center">
          PULSEFLOW AI v1.0 • SIMULATION ENGINE ACTIVE
        </div>
        <div className="mt-1 text-[10px] font-mono text-center"
          style={{ color: isConnected ? "#1e3a5f" : "#374151" }}>
          {isConnected ? "● CONNECTED TO DIGITAL TWIN" : "○ CONNECTING..."}
        </div>
      </div>
    </div>
  );
}
