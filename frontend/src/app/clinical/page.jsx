"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Radio, TrendingUp, TrendingDown, Minus } from "lucide-react";
import Sidebar from "@/components/liquid-glass/Sidebar";
import { useSimulationStore } from "@/store/simulationStore";
import { formatTime, formatSimTime, departmentLabel } from "@/lib/utils";

const toneColor = {
  green: "#059669",
  amber: "#f59e0b",
  red: "#dc2626",
  coral: "#c0603f",
  muted: "#4b5563",
};

function riskTone(score) {
  if (score >= 0.75) return "coral";
  if (score >= 0.5) return "amber";
  if (score >= 0.25) return "muted";
  return "green";
}

export default function Clinical() {
  const { hospitalState, highRiskPatients } = useSimulationStore();
  const [clock, setClock] = useState(null);
  const [feedIdx, setFeedIdx] = useState(0);

  const feedMessages = useMemo(() => {
    const msgs = (hospitalState?.alerts ?? []).map((a) => a.message);
    return msgs.length > 0 ? msgs : ["Waiting for live clinical data..."];
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

  const patients = hospitalState?.patients ?? [];
  const metrics = hospitalState?.metrics;

  const clinicalStats = {
    monitored: metrics?.active_patients ?? 0,
    highAcuity: patients.filter(
      (p) => p.severity === "critical" || p.severity === "high",
    ).length,
    deteriorating: patients.filter((p) => p.deterioration_alert).length,
    sepsisRisk: patients.filter((p) => p.sepsis_risk).length,
  };

  const watchList = useMemo(
    () =>
      (highRiskPatients ?? []).slice(0, 5).map((p, i) => {
        const tone = riskTone(p.risk_score);
        const trend = p.deterioration_alert || p.sepsis_risk ? "up" : "flat";
        return {
          patient_id: p.patient_id,
          name: p.name,
          dept: departmentLabel(p.current_department),
          risk: p.risk_score.toFixed(2),
          tone,
          trend,
          selected: i === 0,
        };
      }),
    [highRiskPatients],
  );

  const patientDetail = highRiskPatients?.[0];
  const trendIcon = { up: TrendingUp, down: TrendingDown, flat: Minus };

  const recommendation = useMemo(() => {
    if (!patientDetail) return null;
    if (
      patientDetail.severity === "critical" ||
      patientDetail.deterioration_alert
    )
      return "Escalate to ICU · continuous monitoring";
    if (patientDetail.sepsis_risk) return "Start sepsis protocol";
    return "Continue routine monitoring";
  }, [patientDetail]);

  const vitals = patientDetail
    ? [
        {
          label: "Wait time",
          value: formatTime(patientDetail.total_wait_time),
          tone: patientDetail.total_wait_time > 120 ? "coral" : "amber",
        },
        {
          label: "Risk score",
          value: `${Math.round(patientDetail.risk_score * 100)}%`,
          tone: riskTone(patientDetail.risk_score),
        },
        {
          label: "Department",
          value: departmentLabel(patientDetail.current_department),
          tone: "muted",
        },
        {
          label: "SLA",
          value: patientDetail.sla_breached ? "Breached" : "On track",
          tone: patientDetail.sla_breached ? "coral" : "green",
        },
      ]
    : [];

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
            Clinical
          </h1>

          <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div className="glass card-hover rounded-[20px] p-5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-neutral-500">
                Monitored
              </span>
              <div className="mt-1 text-[28px] font-bold leading-none text-neutral-800">
                {clinicalStats.monitored}
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
                High acuity
              </span>
              <div className="mt-1 text-[28px] font-bold leading-none text-[#5c2b1c]">
                {clinicalStats.highAcuity}
              </div>
            </div>
            <div className="glass card-hover rounded-[20px] p-5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-neutral-500">
                Deteriorating
              </span>
              <div className="mt-1 text-[28px] font-bold leading-none text-amber-500">
                {clinicalStats.deteriorating}
              </div>
            </div>
            <div className="glass card-hover rounded-[20px] p-5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-neutral-500">
                Sepsis risk
              </span>
              <div className="mt-1 text-[28px] font-bold leading-none text-[#c0603f]">
                {clinicalStats.sepsisRisk}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="glass card-hover rounded-[26px] p-7 lg:col-span-6">
              <h3 className="text-[20px] font-bold text-neutral-800">
                Watch list
              </h3>
              <div className="mt-4 flex flex-col gap-1.5">
                {watchList.map((p) => {
                  const Trend = trendIcon[p.trend];
                  return (
                    <div
                      key={p.patient_id}
                      className="flex items-center gap-3 rounded-[12px] px-3 py-2"
                      style={
                        p.selected
                          ? { background: "rgba(192,96,63,0.14)" }
                          : undefined
                      }
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: toneColor[p.tone] }}
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-[13px] ${p.selected ? "font-bold" : "font-semibold"} text-neutral-800`}
                        >
                          {p.name}
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          {p.dept}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className="mono text-[13px] font-semibold"
                          style={{ color: toneColor[p.tone] }}
                        >
                          {p.risk}
                        </div>
                        <div
                          className="text-[9px] flex items-center justify-end gap-1"
                          style={{ color: toneColor[p.tone] }}
                        >
                          <Trend size={11} />
                          {p.trend === "up" ? "rising" : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {watchList.length === 0 && (
                  <div className="text-[13px] text-neutral-500">
                    No high-risk patients right now
                  </div>
                )}
              </div>
            </div>

            <div className="glass card-hover rounded-[26px] p-7 lg:col-span-6">
              {patientDetail ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-[16px] font-extrabold text-neutral-800">
                        {patientDetail.name}
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        {departmentLabel(patientDetail.current_department)} ·{" "}
                        {patientDetail.age}y · {patientDetail.chief_complaint}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] text-neutral-500 uppercase tracking-[0.06em]">
                        Risk
                      </div>
                      <div className="mono text-[22px] font-semibold text-[#c0603f]">
                        {patientDetail.risk_score.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {vitals.map((v) => (
                      <div
                        key={v.label}
                        className="glass-soft rounded-[14px] px-3 py-2.5"
                      >
                        <div className="text-[9px] text-neutral-500 uppercase">
                          {v.label}
                        </div>
                        <div
                          className="mono text-[17px] font-semibold"
                          style={{ color: toneColor[v.tone] }}
                        >
                          {v.value}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div
                    className="rounded-[16px] px-4 py-3 text-white shadow-[0_14px_30px_-12px_rgba(160,70,45,0.6),inset_0_1px_0_rgba(255,255,255,0.25)]"
                    style={{
                      background: "linear-gradient(120deg, #c0603f, #a84a34)",
                    }}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/80">
                      Recommendation
                    </div>
                    <div className="text-[15px] font-bold mt-0.5">
                      {recommendation}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-[13px] text-neutral-500">
                  No patient selected for review
                </div>
              )}
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
