/* Line chart visualizing wait-time history. */
"use client";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";
import { useSimulationStore } from "@/store/simulationStore";
import { formatSimTime } from "@/lib/utils";

export function WaitTimeChart() {
  const { metricsHistory } = useSimulationStore();

  const data = metricsHistory.slice(-60).map((m) => ({
    time: formatSimTime(m.sim_time),
    wait: Math.round(m.avg_wait_time),
    icu: Math.round(m.icu_utilization * 100),
    er: Math.round(m.er_utilization * 100),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="waitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="icuGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="time"
          tick={{ fontSize: 9, fill: "#475569" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 9, fill: "#475569" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "rgba(10,14,26,0.95)",
            border: "1px solid rgba(59,130,246,0.2)",
            borderRadius: "8px",
            fontSize: "11px",
          }}
          labelStyle={{ color: "#94a3b8" }}
          formatter={(value, name) => [
            name === "wait" ? `${value}m` : `${value}%`,
            name === "wait" ? "Avg Wait" : name === "icu" ? "ICU Util" : "ER Util",
          ]}
        />
        <ReferenceLine y={60} stroke="rgba(255,170,0,0.3)" strokeDasharray="3 3" />
        <ReferenceLine y={90} stroke="rgba(255,59,59,0.3)" strokeDasharray="3 3" />
        <Area
          type="monotone"
          dataKey="wait"
          stroke="#3b82f6"
          strokeWidth={1.5}
          fill="url(#waitGrad)"
          dot={false}
          activeDot={{ r: 3, fill: "#3b82f6" }}
        />
        <Area
          type="monotone"
          dataKey="icu"
          stroke="#f59e0b"
          strokeWidth={1}
          fill="url(#icuGrad)"
          dot={false}
          activeDot={{ r: 3, fill: "#f59e0b" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
