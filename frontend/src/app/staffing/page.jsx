"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Radio, Sparkles } from "lucide-react";
import Sidebar from "@/components/liquid-glass/Sidebar";
import {
  staffStats,
  deptCoverage,
  suggestion,
  onCall,
  feedMessages,
} from "@/components/liquid-glass/staffingMock";

const toneColor = {
  green: "#059669",
  amber: "#f59e0b",
  red: "#dc2626",
  coral: "#c0603f",
};

const toneText = {
  green: "text-emerald-600",
  amber: "text-amber-500",
  red: "text-red-500",
  coral: "text-[#c0603f]",
};

export default function Staffing() {
  const [active, setActive] = useState("staff");
  const [clock, setClock] = useState("09:41");
  const [feedIdx, setFeedIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setClock(
        `${String(9 + (d.getMinutes() % 1)).padStart(2, "0")}:${String(
          41 + (d.getSeconds() % 19),
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
            Staffing
          </h1>

          {/* Stat bento */}
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
                On shift now
              </span>
              <span className="mt-auto text-[60px] font-bold leading-[0.9] text-neutral-800">
                {staffStats.onShift}
              </span>
              <span className="mt-2 text-[12px] font-semibold text-emerald-600">
                {staffStats.doctors} doctors · {staffStats.nurses} nurses
              </span>
            </div>
            <div className="glass card-hover rounded-[20px] p-5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-neutral-500">
                Coverage
              </span>
              <div className="mt-1 text-[26px] font-bold leading-none text-neutral-800">
                {staffStats.coverage}%
              </div>
            </div>
            <div className="glass card-hover rounded-[20px] p-5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-neutral-500">
                Overtime
              </span>
              <div className="mt-1 text-[26px] font-bold leading-none text-neutral-800">
                {staffStats.overtime}
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
                Open shifts
              </span>
              <div className="mt-1 text-[26px] font-bold leading-none text-[#5c2b1c]">
                {staffStats.openShifts}
              </div>
            </div>
            <div className="glass card-hover rounded-[20px] p-5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-neutral-500">
                Burnout risk
              </span>
              <div className="mt-1 text-[26px] font-bold leading-none text-amber-500">
                {staffStats.burnoutRisk}
              </div>
            </div>
          </div>

          {/* Coverage + suggestion */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="glass card-hover rounded-[26px] p-7 lg:col-span-7">
              <h3 className="text-[20px] font-bold text-neutral-800">
                Department coverage
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
                        className={`font-semibold mono ${toneText[d.tone]}`}
                      >
                        {d.staffed} / {d.needed}
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
              </div>
            </div>

            <div className="flex flex-col gap-4 lg:col-span-5">
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

              <div className="glass card-hover rounded-[26px] p-6">
                <div className="text-[13px] font-bold text-neutral-800 mb-3">
                  On call
                </div>
                <div className="flex flex-col gap-3">
                  {onCall.map((p) => (
                    <div key={p.initials} className="flex items-center gap-3">
                      <div
                        className="w-[30px] h-[30px] rounded-full grid place-items-center text-[11px] font-bold text-white"
                        style={{ background: p.color }}
                      >
                        {p.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold text-neutral-800">
                          {p.name}
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          {p.role}
                        </div>
                      </div>
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: toneColor[p.status] }}
                      />
                    </div>
                  ))}
                </div>
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
