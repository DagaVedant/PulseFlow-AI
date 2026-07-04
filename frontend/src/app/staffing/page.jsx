"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Radio, Sparkles } from "lucide-react";
import Sidebar from "@/components/liquid-glass/Sidebar";
import { useSimulationStore } from "@/store/simulationStore";
import { formatSimTime, departmentLabel } from "@/lib/utils";

const toneColor = {
  green: "#059669",
  amber: "#f59e0b",
  red: "#dc2626",
  coral: "#c0603f",
};

const DEPTS = ["er", "icu", "ward", "labs", "imaging"];

export default function Staffing() {
  const { hospitalState } = useSimulationStore();
  const [clock, setClock] = useState(null);
  const [feedIdx, setFeedIdx] = useState(0);

  const feedMessages = useMemo(() => {
    const msgs = (hospitalState?.alerts ?? []).map((a) => a.message);
    return msgs.length > 0 ? msgs : ["Waiting for live staffing data..."];
  }, [hospitalState?.alerts]);

  useEffect(() => {
    setClock(hospitalState ? formatSimTime(hospitalState.sim_time) : "--:--");
  }, [hospitalState?.sim_time]);

  useEffect(() => {
    const id = setInterval(
      () => setFeedIdx((i) => (i + 1) % feedMessages.length),
      4200,
    );
    return () => clearInterval(id);
  }, [feedMessages.length]);

  const specialists = hospitalState?.care?.specialists ?? [];
  const departments = hospitalState?.departments;

  const availableNow = specialists.filter(
    (s) => s.available_in_min === 0,
  ).length;
  const overloaded = specialists.filter((s) => s.queue_length > 2).length;

  const coverage = useMemo(() => {
    if (!departments) return 0;
    const keys = DEPTS.filter((k) => departments[k]);
    if (keys.length === 0) return 0;
    const avg =
      keys.reduce((sum, k) => sum + (1 - departments[k].occupancy), 0) /
      keys.length;
    return Math.max(0, Math.round(avg * 100));
  }, [departments]);

  const queuedPatients = useMemo(() => {
    if (!departments) return 0;
    return DEPTS.filter((k) => departments[k]).reduce(
      (sum, k) => sum + (departments[k].queue_length || 0),
      0,
    );
  }, [departments]);

  const burnoutDepts = useMemo(() => {
    if (!departments) return 0;
    return DEPTS.filter((k) => departments[k]?.burnout_risk).length;
  }, [departments]);

  const deptCoverage = useMemo(() => {
    if (!departments) return [];
    return DEPTS.filter((k) => departments[k]).map((k) => {
      const d = departments[k];
      const tone =
        d.occupancy >= 0.85 ? "coral" : d.occupancy >= 0.6 ? "amber" : "green";
      return {
        name: departmentLabel(k),
        pct: Math.round(d.occupancy * 100),
        tone,
      };
    });
  }, [departments]);

  const suggestion = useMemo(() => {
    if (deptCoverage.length < 2) return null;
    const sorted = [...deptCoverage].sort((a, b) => b.pct - a.pct);
    const busiest = sorted[0];
    const quietest = sorted[sorted.length - 1];
    if (
      !busiest ||
      !quietest ||
      busiest.name === quietest.name ||
      busiest.pct - quietest.pct < 15
    )
      return null;
    return {
      move: `Shift staff ${quietest.name} → ${busiest.name}`,
      impact: `${busiest.name} at ${busiest.pct}% vs ${quietest.name} at ${quietest.pct}% capacity`,
    };
  }, [deptCoverage]);

  const onCall = specialists.slice(0, 3);

  const bgStyle = useMemo(
    () => ({
      background:
        "linear-gradient(180deg, #0a3a63 0%, #08265a 45%, #061a4a 100%)",
    }),
    [],
  );

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
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute inset-0 flex gap-2 px-1"
          style={{ filter: "blur(9px)" }}
        >
          {columns.map((c, i) => (
            <div
              key={i}
              className="-mt-[9%] h-[118%] rounded-[140px] wallpaper-col"
              style={{
                flex: c.flex,
                background: c.bg,
                animationDelay: `${i * 0.6}s`,
              }}
            />
          ))}
        </div>
        <div
          className="absolute rounded-[120px] wallpaper-capsule-a"
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
          className="absolute rounded-full wallpaper-capsule-b"
          style={{
            width: 150,
            height: 190,
            top: "44%",
            left: "45%",
            background: "linear-gradient(180deg, #6fbfe6, #0a2c6e)",
            filter: "blur(7px)",
          }}
        />
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
        <Sidebar />

        <main className="flex-1 px-8 pb-10 pt-10 md:px-12 lg:px-16 max-w-[1600px]">
          <h1 className="cursive text-[52px] font-bold leading-tight tracking-tight text-white drop-shadow-[0_2px_18px_rgba(4,18,54,0.5)]">
            Staffing
          </h1>

          <div
            className="mt-8 grid gap-4"
            style={{
              gridTemplateColumns: "1.4fr 0.9fr 0.9fr",
              gridTemplateRows: "auto auto",
            }}
          >
            <div
              className="glass card-hover rounded-[26px] p-6 flex flex-col"
              style={{ gridRow: "span 2" }}
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Specialists on duty
              </span>
              <span className="mt-auto text-[60px] font-bold leading-[0.9] text-neutral-800">
                {specialists.length}
              </span>
              <span className="mt-2 text-[12px] font-semibold text-emerald-600">
                {availableNow} available now ·{" "}
                {specialists.length - availableNow} busy
              </span>
            </div>
            <div className="glass card-hover rounded-[20px] p-5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-neutral-500">
                Coverage
              </span>
              <div className="mt-1 text-[26px] font-bold leading-none text-neutral-800">
                {coverage}%
              </div>
            </div>
            <div className="glass card-hover rounded-[20px] p-5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-neutral-500">
                Overloaded
              </span>
              <div className="mt-1 text-[26px] font-bold leading-none text-neutral-800">
                {overloaded}
              </div>
            </div>
            <div
              className="glass card-hover rounded-[20px] p-5"
              style={{
                background:
                  "linear-gradient(150deg, rgba(224,168,140,0.5), rgba(206,138,110,0.32))",
              }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[#7a3b25]">
                Queued patients
              </span>
              <div className="mt-1 text-[26px] font-bold leading-none text-[#5c2b1c]">
                {queuedPatients}
              </div>
            </div>
            <div className="glass card-hover rounded-[20px] p-5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-neutral-500">
                Burnout risk depts
              </span>
              <div className="mt-1 text-[26px] font-bold leading-none text-amber-500">
                {burnoutDepts}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="glass card-hover rounded-[26px] p-7 lg:col-span-7">
              <h3 className="text-[20px] font-bold text-neutral-800">
                Department capacity
              </h3>
              <div className="mt-5 space-y-4">
                {deptCoverage.map((d) => (
                  <div key={d.name}>
                    <div className="flex items-center justify-between text-[14px]">
                      <span
                        className={
                          d.tone === "coral"
                            ? "text-[#9a3f28]"
                            : "text-neutral-600"
                        }
                      >
                        {d.name}
                      </span>
                      <span
                        className="font-semibold mono"
                        style={{ color: toneColor[d.tone] }}
                      >
                        {d.pct}%
                      </span>
                    </div>
                    <div className="mt-2 h-[6px] overflow-hidden rounded-full bg-black/[0.06]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${d.pct}%`,
                          background: toneColor[d.tone],
                          transition: "width 0.9s cubic-bezier(0.22,1,0.36,1)",
                        }}
                      />
                    </div>
                  </div>
                ))}
                {deptCoverage.length === 0 && (
                  <div className="text-[13px] text-neutral-500">
                    Waiting for department data...
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 lg:col-span-5">
              {suggestion ? (
                <div
                  className="glass card-hover rounded-[26px] p-6"
                  style={{
                    background:
                      "linear-gradient(150deg, rgba(167,220,190,0.5), rgba(140,200,170,0.3))",
                  }}
                >
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[#15603a]">
                    <Sparkles size={14} />
                    Suggested move
                  </div>
                  <div className="mt-2 text-[19px] font-extrabold text-[#14532d]">
                    {suggestion.move}
                  </div>
                  <div className="mt-1 text-[12px] text-[#2f6b4c]">
                    {suggestion.impact}
                  </div>
                </div>
              ) : (
                <div className="glass card-hover rounded-[26px] p-6">
                  <div className="text-[13px] text-neutral-500">
                    Departments are balanced — no reallocation needed right now.
                  </div>
                </div>
              )}

              <div className="glass card-hover rounded-[26px] p-6">
                <div className="text-[13px] font-bold text-neutral-800 mb-3">
                  On call
                </div>
                <div className="flex flex-col gap-3">
                  {onCall.map((p) => (
                    <div
                      key={p.specialist_id}
                      className="flex items-center gap-3"
                    >
                      <div className="w-[30px] h-[30px] rounded-full grid place-items-center text-[11px] font-bold text-white bg-gradient-to-br from-emerald-500 to-emerald-600">
                        {p.name
                          .split(" ")
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold text-neutral-800 truncate">
                          {p.name}
                        </div>
                        <div className="text-[10px] text-neutral-500 truncate">
                          {p.specialty}
                        </div>
                      </div>
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          background:
                            p.available_in_min === 0 ? "#059669" : "#f59e0b",
                        }}
                      />
                    </div>
                  ))}
                  {onCall.length === 0 && (
                    <div className="text-[13px] text-neutral-500">
                      Loading roster...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

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
