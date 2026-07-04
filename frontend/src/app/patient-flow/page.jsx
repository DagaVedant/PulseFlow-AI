"use client";
import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, Radio } from "lucide-react";
import Sidebar from "@/components/liquid-glass/Sidebar";
import { useSimulationStore } from "@/store/simulationStore";
import { formatTime, formatSimTime, departmentLabel } from "@/lib/utils";

const toneColor = {
  green: "#059669",
  amber: "#f59e0b",
  red: "#dc2626",
  coral: "#c0603f",
};

const CHAIN = ["er", "labs", "imaging", "icu", "ward"];
const FLOW_KEYS = [
  "registration_to_er",
  "er_to_labs",
  "labs_to_imaging",
  "imaging_to_icu",
  "icu_to_ward",
];

function buildStations(departments) {
  if (!departments) return [];
  return CHAIN.filter((k) => departments[k]).map((k) => {
    const d = departments[k];
    const tone =
      d.occupancy >= 0.85 ? "red" : d.occupancy >= 0.6 ? "amber" : "green";
    return {
      name: departmentLabel(k),
      count: d.current_patients,
      load: Math.round(d.occupancy * 100),
      tone,
      bottleneck: d.status === "critical",
    };
  });
}

export default function PatientFlow() {
  const { hospitalState } = useSimulationStore();
  const [clock, setClock] = useState(null);
  const [feedIdx, setFeedIdx] = useState(0);

  const feedMessages = useMemo(() => {
    const msgs = (hospitalState?.alerts ?? []).map((a) => a.message);
    return msgs.length > 0 ? msgs : ["Waiting for live flow data..."];
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

  const departments = hospitalState?.departments;
  const stations = useMemo(() => buildStations(departments), [departments]);
  const dischargeCount =
    departments?.discharge?.current_patients ??
    hospitalState?.metrics?.discharged_today ??
    0;
  const flow = hospitalState?.flow;
  const rates = FLOW_KEYS.map((k) =>
    flow ? `${Math.round(flow[k] ?? 0)}/hr` : "—",
  );

  const avgTransit = useMemo(() => {
    if (!departments) return "—";
    const vals = CHAIN.filter((k) => departments[k]).map(
      (k) => departments[k].avg_wait_time,
    );
    if (vals.length === 0) return "—";
    return formatTime(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [departments]);

  const bottleneckDept = useMemo(() => {
    if (!departments) return "—";
    let worst = null;
    for (const k of CHAIN) {
      const d = departments[k];
      if (!d) continue;
      if (!worst || d.occupancy > worst.occupancy)
        worst = { key: k, occupancy: d.occupancy };
    }
    return worst ? departmentLabel(worst.key) : "—";
  }, [departments]);

  const waitByStage = useMemo(() => {
    if (!departments) return [];
    const pairs = [
      ["er", "labs"],
      ["labs", "imaging"],
      ["imaging", "icu"],
      ["icu", "ward"],
    ];
    return pairs
      .filter(([a, b]) => departments[a] && departments[b])
      .map(([a, b]) => {
        const d = departments[a];
        const tone =
          d.avg_wait_time >= 90
            ? "coral"
            : d.avg_wait_time >= 45
              ? "amber"
              : "green";
        return {
          label: `${departmentLabel(a)} → ${departmentLabel(b)}`,
          value: formatTime(d.avg_wait_time),
          pct: Math.min(100, Math.round((d.avg_wait_time / 120) * 100)),
          tone,
        };
      });
  }, [departments]);

  const stalledPatient = useMemo(() => {
    const patients = hospitalState?.patients ?? [];
    const boarding = patients
      .filter((p) => p.boarding || p.sla_breached)
      .sort((a, b) => b.total_wait_time - a.total_wait_time);
    return boarding[0] ?? null;
  }, [hospitalState?.patients]);

  const overSlaCount = (hospitalState?.patients ?? []).filter(
    (p) => p.sla_breached,
  ).length;

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
            Patient flow
          </h1>

          <div className="glass card-hover mt-8 rounded-[26px] p-7">
            <h3 className="text-[20px] font-bold text-neutral-800">
              Live journey
            </h3>
            <div className="mt-6 flex items-center gap-2">
              {stations.map((st, i) => (
                <React.Fragment key={st.name}>
                  <div
                    className="glass-soft flex-1 rounded-[16px] p-3 text-center"
                    style={
                      st.bottleneck
                        ? { border: "1px solid rgba(220,80,60,0.5)" }
                        : undefined
                    }
                  >
                    <div
                      className={`text-[11px] font-semibold uppercase tracking-[0.04em] ${st.bottleneck ? "text-[#9a3f28]" : "text-neutral-600"}`}
                    >
                      {st.name}
                    </div>
                    <div className="mono text-[24px] font-medium text-neutral-800 my-1">
                      {st.count}
                    </div>
                    <div className="h-[4px] rounded-full bg-black/[0.08] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${st.load}%`,
                          background: toneColor[st.tone],
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col items-center text-white/85">
                    <ArrowRight size={18} />
                    <span className="mono text-[10px]">{rates[i]}</span>
                  </div>
                </React.Fragment>
              ))}
              <div
                className="glass-soft rounded-[16px] p-3 text-center"
                style={{ flex: "0.7" }}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#166534]">
                  Out
                </div>
                <div className="mono text-[24px] font-medium text-[#166534] my-1">
                  {dischargeCount}
                </div>
                <div className="text-[10px] text-neutral-600">discharged</div>
              </div>
            </div>
            {stations.length === 0 && (
              <div className="mt-4 text-[13px] text-neutral-500">
                Waiting for department data...
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="glass card-hover rounded-[26px] p-6">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Avg transit
              </span>
              <div className="mt-2 text-[38px] font-bold leading-none text-neutral-800">
                {avgTransit}
              </div>
            </div>
            <div className="glass card-hover rounded-[26px] p-6">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                In transit
              </span>
              <div className="mt-2 text-[38px] font-bold leading-none text-neutral-800">
                {hospitalState?.metrics?.active_patients ?? "—"}
              </div>
            </div>
            <div
              className="glass card-hover rounded-[26px] p-6"
              style={{
                background:
                  "linear-gradient(150deg, rgba(224,168,140,0.5), rgba(206,138,110,0.32))",
              }}
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a3b25]">
                Bottleneck
              </span>
              <div className="mt-2 text-[30px] font-bold leading-none text-[#5c2b1c]">
                {bottleneckDept}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="glass card-hover rounded-[26px] p-7 lg:col-span-7">
              <h3 className="text-[20px] font-bold text-neutral-800">
                Wait by stage
              </h3>
              <div className="mt-5 space-y-4">
                {waitByStage.map((w) => (
                  <div key={w.label}>
                    <div className="flex items-center justify-between text-[14px]">
                      <span className="text-neutral-600">{w.label}</span>
                      <span
                        className="font-semibold tabular-nums"
                        style={{
                          color:
                            w.tone === "coral"
                              ? "#c0603f"
                              : w.tone === "amber"
                                ? "#f59e0b"
                                : "#059669",
                        }}
                      >
                        {w.value}
                      </span>
                    </div>
                    <div className="mt-2 h-[6px] overflow-hidden rounded-full bg-black/[0.06]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${w.pct}%`,
                          background: toneColor[w.tone],
                          transition: "width 0.9s cubic-bezier(0.22,1,0.36,1)",
                        }}
                      />
                    </div>
                  </div>
                ))}
                {waitByStage.length === 0 && (
                  <div className="text-[13px] text-neutral-500">
                    Waiting for department data...
                  </div>
                )}
              </div>
            </div>

            <div className="glass card-hover rounded-[26px] p-7 lg:col-span-5">
              <h3 className="text-[16px] font-bold text-red-500">Stalled</h3>
              {stalledPatient ? (
                <div
                  className="mt-4 rounded-[18px] px-5 py-4 text-white shadow-[0_14px_30px_-12px_rgba(160,70,45,0.6),inset_0_1px_0_rgba(255,255,255,0.25)]"
                  style={{
                    background: "linear-gradient(120deg, #c0603f, #a84a34)",
                  }}
                >
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/80">
                    {stalledPatient.boarding ? "Boarding" : "SLA breached"}
                  </div>
                  <div className="mt-1 text-[19px] font-bold">
                    {stalledPatient.name} ·{" "}
                    {formatTime(stalledPatient.total_wait_time)}
                  </div>
                </div>
              ) : (
                <div className="mt-4 text-[13px] text-neutral-500">
                  No stalled patients right now
                </div>
              )}
              <div className="mt-4 text-[13px] text-neutral-400">
                {overSlaCount} more over SLA
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
