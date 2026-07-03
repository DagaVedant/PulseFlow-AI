"use client";
import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Radio } from "lucide-react";
import Sidebar from "@/components/liquid-glass/Sidebar";
import {
  initialState,
  floorPlan,
  departments,
  alertPatient,
  feedMessages,
} from "@/components/liquid-glass/mock";

const cellColor = {
  green: "bg-emerald-600",
  amber: "bg-amber-500",
  orange: "bg-orange-500",
  muted: "bg-neutral-300/70",
};

const barColor = {
  green: "from-emerald-500 to-emerald-600",
  amber: "from-amber-400 to-amber-500",
  red: "from-orange-500 to-red-500",
};

function StatCard({
  label,
  value,
  className = "",
  big = false,
  valueClass = "",
  tint = false,
}) {
  const style = tint
    ? {
        background:
          "linear-gradient(150deg, rgba(250,229,208,0.9), rgba(248,218,192,0.6))",
      }
    : undefined;
  return (
    <div
      className={`glass card-hover rounded-[26px] p-6 flex flex-col ${className}`}
      style={style}
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </span>
      <span
        className={`mt-auto font-bold tracking-tight text-neutral-800 ${
          big ? "text-[64px] leading-[0.9]" : "text-[38px] leading-none"
        } ${valueClass}`}
      >
        {value}
      </span>
    </div>
  );
}

function ScoreRing({ score, label }) {
  const pct = Math.min(100, Math.max(0, score));
  const r = 26;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div className="flex items-center gap-4">
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="rgba(0,0,0,0.06)"
          strokeWidth="6"
        />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="url(#scoreGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{
            transition: "stroke-dasharray 0.8s cubic-bezier(0.22,1,0.36,1)",
          }}
        />
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>
      </svg>
      <div className="text-right">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
          Hospital score
        </div>
        <div className="text-[26px] font-bold leading-tight text-red-500">
          {score} <span className="text-neutral-400 font-medium">·</span>{" "}
          {label}
        </div>
      </div>
    </div>
  );
}

export default function CommandCenter() {
  const [active, setActive] = useState("dashboard");
  const [s, setS] = useState(initialState);
  const [clock, setClock] = useState("09:05");
  const [feedIdx, setFeedIdx] = useState(0);

  // gentle live simulation
  useEffect(() => {
    const id = setInterval(() => {
      setS((p) => {
        const jitter = (v, d, min, max) =>
          Math.min(
            max,
            Math.max(min, +(v + (Math.random() * 2 - 1) * d).toFixed(0)),
          );
        return {
          ...p,
          activePatients: jitter(p.activePatients, 3, 168, 192),
          critical: jitter(p.critical, 1, 26, 34),
          bedUtil: jitter(p.bedUtil, 2, 30, 42),
          icuUtil: jitter(p.icuUtil, 2, 8, 18),
          throughput: +(Math.random() * 1.4).toFixed(1),
          diversion: jitter(p.diversion, 2, 18, 29),
        };
      });
    }, 3200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setClock(
        `${String(9 + (d.getMinutes() % 1)).padStart(2, "0")}:${String(
          5 + (d.getSeconds() % 55),
        )
          .toString()
          .padStart(2, "0")}`,
      );
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(
      () => setFeedIdx((i) => (i + 1) % feedMessages.length),
      4200,
    );
    return () => clearInterval(id);
  }, []);

  const bgStyle = useMemo(
    () => ({
      background:
        "linear-gradient(180deg, #0a3a63 0%, #08265a 45%, #061a4a 100%)",
    }),
    [],
  );

  // Apple iMac-style liquid glass capsule columns (generic recreation)
  const columns = useMemo(
    () => [
      {
        flex: 1.2,
        bg: "linear-gradient(180deg, #4aa3c9 0%, #0c2f7a 62%, #061a4a 100%)",
      },
      {
        flex: 1.0,
        bg: "linear-gradient(180deg, #1fae9e 0%, #0d3a7e 60%, #06214f 100%)",
      },
      {
        flex: 1.35,
        bg: "linear-gradient(180deg, #6fbfe6 0%, #123f86 58%, #07235a 100%)",
      },
      {
        flex: 0.75,
        bg: "linear-gradient(180deg, #a9d8f2 0%, #2f78c0 40%, #0a2c6e 100%)",
      },
      {
        flex: 1.1,
        bg: "linear-gradient(360deg, #7cc4ec 0%, #123c82 60%, #08245a 100%)",
      },
      {
        flex: 1.0,
        bg: "linear-gradient(180deg, #2bb6cf 0%, #0d3480 58%, #061f52 100%)",
      },
      {
        flex: 1.28,
        bg: "linear-gradient(180deg, #57a8e0 0%, #103a82 60%, #071f56 100%)",
      },
      {
        flex: 0.85,
        bg: "linear-gradient(180deg, #22b3a6 0%, #0e3c7e 55%, #063a5e 100%)",
      },
      {
        flex: 1.15,
        bg: "linear-gradient(180deg, #86cbef 0%, #123f88 60%, #07225a 100%)",
      },
    ],
    [],
  );

  return (
    <div className="min-h-screen w-full flex overflow-hidden" style={bgStyle}>
      {/* Apple-style liquid glass capsule wallpaper */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute inset-0 flex gap-2 px-1"
          style={{ filter: "blur(9px)" }}
        >
          {columns.map((c, i) => (
            <div
              key={i}
              className="-mt-[9%] h-[118%] rounded-[140px]"
              style={{ flex: c.flex, background: c.bg }}
            />
          ))}
        </div>
        {/* floating center capsules */}
        <div
          className="absolute rounded-[120px]"
          style={{
            width: 130,
            height: 230,
            top: "26%",
            left: "47%",
            background: "linear-gradient(180deg, #a9d8f2, #123f86)",
            filter: "blur(7px)",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 150,
            height: 190,
            top: "44%",
            left: "45%",
            background: "linear-gradient(180deg, #6fbfe6, #0a2c6e)",
            filter: "blur(7px)",
          }}
        />
        {/* subtle sheen + darkening for depth */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(1200px 700px at 20% 0%, rgba(255,255,255,0.16), rgba(255,255,255,0) 55%)," +
              "linear-gradient(180deg, rgba(4,18,54,0.15), rgba(4,18,54,0.35))",
          }}
        />
      </div>

      <div className="relative z-10 flex w-full">
        <Sidebar active={active} setActive={setActive} />

        <main className="flex-1 px-8 pb-10 pt-10 md:px-12 lg:px-16 max-w-[1600px]">
          <h1 className="cursive text-[52px] font-bold leading-tight tracking-tight text-white drop-shadow-[0_2px_18px_rgba(4,18,54,0.5)]">
            Hospital command center
          </h1>

          {/* KPI row */}
          <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <StatCard
              label="Active patients"
              value={s.activePatients}
              big
              className="lg:col-span-4 min-h-[200px]"
            />
            <div className="lg:col-span-3">
              <div
                className="glass card-hover flex h-full min-h-[200px] flex-col rounded-[26px] p-6"
                style={{
                  background:
                    "linear-gradient(155deg, rgba(224,168,140,0.92), rgba(206,138,110,0.9))",
                  border: "1px solid rgba(255,255,255,0.4)",
                }}
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85">
                  Critical
                </span>
                <span className="mt-auto text-[64px] font-bold leading-[0.9] tracking-tight text-[#5c2b1c]">
                  {s.critical}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:col-span-5">
              <StatCard
                label="Avg wait"
                value={`${s.avgWait}h`}
                className="min-h-[92px]"
              />
              <StatCard
                label="ICU util"
                value={`${s.icuUtil}%`}
                className="min-h-[92px]"
                tint
              />
              <StatCard
                label="Bed util"
                value={`${s.bedUtil}%`}
                className="min-h-[92px]"
              />
              <StatCard
                label="Throughput"
                value={`${s.throughput.toFixed(1)}/hr`}
                className="min-h-[92px]"
                tint
              />
            </div>
          </div>

          {/* Peach tint overlay on ICU + Throughput handled via extra cards below is skipped; keep simple */}

          {/* Diversion + score */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="glass card-hover rounded-[26px] px-7 py-6 lg:col-span-9">
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} className="text-amber-500" />
                <span className="text-[15px] font-medium text-neutral-600">
                  Diversion
                </span>
                <div className="relative mx-3 h-[9px] flex-1 overflow-hidden rounded-full bg-black/[0.06]">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                    style={{
                      width: `${s.diversion}%`,
                      transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)",
                    }}
                  />
                </div>
                <span className="text-[15px] font-semibold text-neutral-700 tabular-nums">
                  {s.diversion}%
                </span>
                <span className="text-neutral-300">·</span>
                <span className="text-[15px] text-neutral-500 tabular-nums">
                  ${s.costPerHr.toLocaleString()}/hr
                </span>
                <span className="text-neutral-300">·</span>
                <span className="text-[15px] text-neutral-500">
                  {s.sla}% SLA
                </span>
              </div>
            </div>
            <div
              className="glass card-hover flex items-center justify-center rounded-[26px] px-6 py-5 lg:col-span-3"
              style={{
                background:
                  "linear-gradient(150deg, rgba(250,232,214,0.85), rgba(247,220,200,0.6))",
              }}
            >
              <ScoreRing score={s.hospitalScore} label={s.scoreLabel} />
            </div>
          </div>

          {/* Bottom panels */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Floor plan */}
            <div className="glass card-hover rounded-[26px] p-7 lg:col-span-5">
              <h3 className="text-[20px] font-bold text-neutral-800">
                Floor plan
              </h3>
              <div className="mt-5 grid grid-cols-2 gap-4">
                {floorPlan.map((z) => (
                  <div key={z.name} className="glass-soft rounded-[18px] p-4">
                    <div className="text-[14px] font-semibold text-neutral-700">
                      {z.name}
                    </div>
                    <div className="mt-3 flex gap-1.5">
                      {z.cells.map((c, i) => (
                        <span
                          key={i}
                          className={`h-[18px] w-[18px] rounded-[5px] ${cellColor[c]}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Department status */}
            <div className="glass card-hover rounded-[26px] p-7 lg:col-span-4">
              <h3 className="text-[20px] font-bold text-neutral-800">
                Department status
              </h3>
              <div className="mt-5 space-y-5">
                {departments.map((d) => (
                  <div key={d.name}>
                    <div className="flex items-center justify-between text-[14px]">
                      <span className="text-neutral-600">{d.name}</span>
                      <span
                        className={`font-semibold tabular-nums ${
                          d.tone === "red"
                            ? "text-red-500"
                            : d.tone === "amber"
                              ? "text-amber-500"
                              : "text-emerald-600"
                        }`}
                      >
                        {d.value}%
                      </span>
                    </div>
                    <div className="mt-2 h-[6px] overflow-hidden rounded-full bg-black/[0.06]">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${barColor[d.tone]}`}
                        style={{
                          width: `${d.value}%`,
                          transition: "width 0.9s cubic-bezier(0.22,1,0.36,1)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Alerts */}
            <div className="glass card-hover rounded-[26px] p-7 lg:col-span-3">
              <div className="flex items-center justify-between">
                <span className="text-[16px] font-bold text-red-500">
                  Alerts
                </span>
              </div>
              <div
                className="mt-4 rounded-[18px] px-5 py-4 text-white shadow-[0_14px_30px_-12px_rgba(160,70,45,0.6),inset_0_1px_0_rgba(255,255,255,0.25)]"
                style={{
                  background: "linear-gradient(120deg, #c0603f, #a84a34)",
                }}
              >
                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/80">
                  {alertPatient.type}
                </div>
                <div className="mt-1 text-[19px] font-bold">
                  {alertPatient.name}
                </div>
              </div>
              <div className="mt-4 text-[13px] text-neutral-400">
                ER queue: {s.erQueue} waiting
              </div>
            </div>
          </div>

          {/* Live footer */}
          <div className="glass-soft mono mt-4 flex items-center gap-3 rounded-[22px] px-7 py-4 text-[13px] text-neutral-500">
            <Radio size={15} className="text-emerald-600 animate-pulse" />
            <span className="font-semibold text-neutral-600">LIVE</span>
            <span>{clock}</span>
            <span className="text-neutral-300">·</span>
            <span key={feedIdx} className="tick animate-[fadeIn_0.5s_ease]">
              {feedMessages[feedIdx]}
            </span>
          </div>
        </main>
      </div>
    </div>
  );
}
