"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Network,
  Users,
  Brain,
  FlaskConical,
  ChevronRight,
  Play,
  ClipboardList,
  Stethoscope,
  RotateCcw,
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
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="w-72 flex-shrink-0 flex flex-col h-full bg-clinical-surface border-r border-clinical-border">
      <div className="px-4 py-4 border-b border-clinical-border">
        <img
          src="/logo-full.png"
          alt="PulseFlow AI"
          className="w-full object-contain"
        />
      </div>

      <div className="px-4 py-4 border-b border-clinical-border">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded border border-clinical-border bg-clinical-canvas px-3 py-2">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-600 mb-1">
              Patients
            </div>
            <div className="text-lg font-mono font-bold tabular-nums text-slate-900">
              {activePatients}
            </div>
          </div>
          <div
            className={cn(
              "rounded border px-3 py-2",
              alertCount > 0
                ? "border-red-200 bg-red-50"
                : "border-clinical-border bg-clinical-canvas",
            )}
          >
            <div className="text-xs font-medium uppercase tracking-wide text-slate-600 mb-1">
              Alerts
            </div>
            <div
              className={cn(
                "text-lg font-mono font-bold tabular-nums",
                alertCount > 0 ? "text-red-700" : "text-slate-400",
              )}
            >
              {alertCount > 0 ? alertCount : "—"}
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item, idx) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const isDemo = (item as any).accent;
          const isDemoStep = isRunning && currentStep === idx;

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded group cursor-pointer border-l-[3px]",
                  isActive
                    ? "bg-slate-100 border-slate-900"
                    : "border-transparent hover:bg-slate-50",
                  isDemoStep && "bg-slate-100",
                )}
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded flex items-center justify-center flex-shrink-0",
                    isActive ? "bg-slate-200" : "bg-slate-100",
                  )}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5",
                      isActive ? "text-slate-900" : "text-slate-600",
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      "text-sm font-semibold leading-tight",
                      isActive ? "text-slate-900" : "text-slate-700",
                    )}
                  >
                    {item.label}
                    {isDemo && (
                      <span className="ml-2 text-xs font-medium uppercase text-slate-500">
                        Demo
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {item.sublabel}
                  </div>
                </div>
                {isActive && (
                  <ChevronRight className="w-4 h-4 flex-shrink-0 text-slate-900" />
                )}
                {isDemoStep && (
                  <span className="text-xs font-bold uppercase text-slate-700 flex-shrink-0">
                    Active
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 space-y-3 border-t border-clinical-border">
        <button
          onClick={handleReset}
          disabled={resetting}
          className={cn(
            "w-full min-h-11 flex items-center justify-center gap-2 rounded text-sm font-semibold border disabled:opacity-40",
            resetDone
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-clinical-border bg-clinical-surface text-slate-700 hover:bg-slate-50",
          )}
        >
          <RotateCcw className={cn("w-4 h-4", resetting && "spinner")} />
          {resetDone
            ? "Reset Complete"
            : resetting
              ? "Resetting…"
              : "Reset Simulation"}
        </button>
        <div className="text-xs font-mono text-center text-slate-400">
          PULSEFLOW AI v1.0
        </div>
      </div>
    </div>
  );
}
