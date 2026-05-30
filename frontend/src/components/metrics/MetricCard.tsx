/* Reusable KPI card with status-based coloring. */
"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  status?: "healthy" | "warning" | "critical" | "neutral";
  trend?: number;
  subtitle?: string;
  className?: string;
}

const STATUS_STYLES = {
  healthy: {
    border: "rgba(0,255,136,0.2)",
    bg: "rgba(0,255,136,0.04)",
    color: "#00ff88",
    glow: "0 0 20px rgba(0,255,136,0.08)",
  },
  warning: {
    border: "rgba(255,170,0,0.25)",
    bg: "rgba(255,170,0,0.05)",
    color: "#ffaa00",
    glow: "0 0 20px rgba(255,170,0,0.08)",
  },
  critical: {
    border: "rgba(255,59,59,0.3)",
    bg: "rgba(255,59,59,0.06)",
    color: "#ff3b3b",
    glow: "0 0 20px rgba(255,59,59,0.12)",
  },
  neutral: {
    border: "rgba(59,130,246,0.15)",
    bg: "rgba(59,130,246,0.04)",
    color: "#60a5fa",
    glow: "0 0 20px rgba(59,130,246,0.06)",
  },
};

export function MetricCard({
  icon: Icon,
  label,
  value,
  unit,
  status = "neutral",
  trend,
  subtitle,
  className,
}: MetricCardProps) {
  const styles = STATUS_STYLES[status];

  return (
    <div
      className={cn("rounded-xl p-4 transition-all duration-300", className)}
      style={{
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        boxShadow: styles.glow,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="p-2 rounded-lg"
          style={{ background: `${styles.color}18` }}
        >
          <Icon className="w-4 h-4" style={{ color: styles.color }} />
        </div>
        {trend !== undefined && (
          <div
            className={cn(
              "text-[10px] font-mono px-1.5 py-0.5 rounded",
              trend > 0
                ? "text-red-400 bg-red-950/40"
                : "text-emerald-400 bg-emerald-950/40"
            )}
          >
            {trend > 0 ? "↑" : "↓"} {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>

      <div className="space-y-0.5">
        <div className="text-xs text-slate-500 font-mono uppercase tracking-wide">
          {label}
        </div>
        <motion.div
          key={String(value)}
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="flex items-baseline gap-1"
        >
          <span
            className="text-3xl font-bold font-mono"
            style={{ color: styles.color }}
          >
            {value}
          </span>
          {unit && (
            <span className="text-sm text-slate-500 font-mono">{unit}</span>
          )}
        </motion.div>
        {subtitle && (
          <div className="text-[10px] text-slate-600 font-mono">{subtitle}</div>
        )}
      </div>
    </div>
  );
}
