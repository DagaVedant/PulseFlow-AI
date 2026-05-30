/* Animated hospital floor plan that renders departments and patients moving between them. */
"use client";
import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSimulationStore } from "@/store/simulationStore";
import type { Patient, DepartmentKey, DepartmentStatus } from "@/types";
import { statusColor, formatPercent, formatTime, departmentLabel } from "@/lib/utils";

const FLOOR = {
  width: 900,
  height: 600,
};

interface DeptZone {
  key: DepartmentKey;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rooms?: RoomDef[];
  color: string;
}

interface RoomDef {
  x: number; y: number; w: number; h: number; label?: string;
}

const DEPT_ZONES: DeptZone[] = [
  {
    key: "er",
    label: "EMERGENCY DEPT",
    x: 10, y: 10, w: 560, h: 175,
    color: "#ef4444",
    rooms: [
      { x: 10, y: 10, w: 100, h: 60, label: "Triage" },
      { x: 120, y: 10, w: 70, h: 60, label: "R1" },
      { x: 200, y: 10, w: 70, h: 60, label: "R2" },
      { x: 280, y: 10, w: 70, h: 60, label: "R3" },
      { x: 360, y: 10, w: 70, h: 60, label: "R4" },
      { x: 440, y: 10, w: 70, h: 60, label: "R5" },
      { x: 10, y: 80, w: 100, h: 60, label: "Critical" },
      { x: 120, y: 80, w: 70, h: 60, label: "R6" },
      { x: 200, y: 80, w: 70, h: 60, label: "R7" },
      { x: 280, y: 80, w: 70, h: 60, label: "R8" },
      { x: 360, y: 80, w: 70, h: 60, label: "R9" },
      { x: 440, y: 80, w: 70, h: 60, label: "R10" },
      { x: 10, y: 150, w: 100, h: 20, label: "Nurse Stn" },
      { x: 120, y: 150, w: 390, h: 20, label: "ER Corridor" },
    ],
  },
  {
    key: "labs",
    label: "LABORATORY",
    x: 580, y: 10, w: 180, h: 175,
    color: "#8b5cf6",
    rooms: [
      { x: 580, y: 10, w: 80, h: 75, label: "Lab A" },
      { x: 670, y: 10, w: 80, h: 75, label: "Lab B" },
      { x: 580, y: 95, w: 80, h: 75, label: "Lab C" },
      { x: 670, y: 95, w: 80, h: 75, label: "Lab D" },
    ],
  },
  {
    key: "imaging",
    label: "IMAGING",
    x: 10, y: 200, w: 220, h: 170,
    color: "#06b6d4",
    rooms: [
      { x: 10, y: 200, w: 100, h: 75, label: "CT-1" },
      { x: 120, y: 200, w: 100, h: 75, label: "CT-2" },
      { x: 10, y: 285, w: 100, h: 75, label: "MRI-1" },
      { x: 120, y: 285, w: 100, h: 75, label: "X-Ray" },
    ],
  },
  {
    key: "icu",
    label: "ICU",
    x: 240, y: 200, w: 270, h: 170,
    color: "#f59e0b",
    rooms: [
      { x: 240, y: 200, w: 60, h: 75, label: "ICU-1" },
      { x: 310, y: 200, w: 60, h: 75, label: "ICU-2" },
      { x: 380, y: 200, w: 60, h: 75, label: "ICU-3" },
      { x: 440, y: 200, w: 60, h: 75, label: "ICU-4" },
      { x: 240, y: 285, w: 60, h: 75, label: "ICU-5" },
      { x: 310, y: 285, w: 60, h: 75, label: "ICU-6" },
      { x: 380, y: 285, w: 60, h: 75, label: "ICU-7" },
      { x: 440, y: 285, w: 60, h: 75, label: "ICU-8" },
    ],
  },
  {
    key: "ward",
    label: "GENERAL WARD",
    x: 520, y: 200, w: 240, h: 170,
    color: "#22c55e",
    rooms: [
      { x: 520, y: 200, w: 55, h: 75, label: "W-A" },
      { x: 585, y: 200, w: 55, h: 75, label: "W-B" },
      { x: 650, y: 200, w: 55, h: 75, label: "W-C" },
      { x: 705, y: 200, w: 55, h: 75, label: "W-D" },
      { x: 520, y: 285, w: 55, h: 75, label: "W-E" },
      { x: 585, y: 285, w: 55, h: 75, label: "W-F" },
      { x: 650, y: 285, w: 55, h: 75, label: "W-G" },
      { x: 705, y: 285, w: 55, h: 75, label: "W-H" },
    ],
  },
  {
    key: "discharge",
    label: "DISCHARGE",
    x: 10, y: 385, w: 280, h: 100,
    color: "#64748b",
    rooms: [
      { x: 10, y: 385, w: 130, h: 80, label: "Checkout A" },
      { x: 150, y: 385, w: 130, h: 80, label: "Checkout B" },
    ],
  },
];

const DEPT_PATIENT_AREA: Record<string, { x: number; y: number; w: number; h: number }> = {
  er: { x: 20, y: 20, w: 540, h: 130 },
  triage: { x: 20, y: 20, w: 95, h: 50 },
  labs: { x: 590, y: 20, w: 160, h: 155 },
  imaging: { x: 20, y: 210, w: 200, h: 140 },
  icu: { x: 250, y: 210, w: 250, h: 140 },
  ward: { x: 530, y: 210, w: 220, h: 140 },
  discharge: { x: 20, y: 395, w: 260, h: 70 },
  registration: { x: 300, y: 395, w: 460, h: 70 },
};

interface PatientDotData {
  id: string;
  x: number;
  y: number;
  severity: string;
  state: string;
}

function getPatientColor(severity: string): string {
  return {
    low: "#22c55e",
    medium: "#f59e0b",
    high: "#ef4444",
    critical: "#dc2626",
  }[severity] ?? "#64748b";
}

function getDeptPatientPositions(patients: Patient[]): PatientDotData[] {

  const groups: Record<string, Patient[]> = {};
  for (const p of patients) {
    const key = p.current_department;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }

  const dots: PatientDotData[] = [];
  const rng = (seed: string) => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
    return Math.abs(h) / 2147483647;
  };

  for (const [deptKey, deptPatients] of Object.entries(groups)) {
    const area = DEPT_PATIENT_AREA[deptKey];
    if (!area) continue;

    deptPatients.forEach((p, i) => {

      const seed1 = p.patient_id + "x";
      const seed2 = p.patient_id + "y";
      const col = Math.floor(rng(seed1) * 10);
      const row = Math.floor(rng(seed2) * 8);
      const x = area.x + 8 + (col * (area.w - 16)) / 10;
      const y = area.y + 8 + (row * (area.h - 16)) / 8;
      dots.push({
        id: p.patient_id,
        x: Math.max(area.x + 4, Math.min(area.x + area.w - 4, x)),
        y: Math.max(area.y + 4, Math.min(area.y + area.h - 4, y)),
        severity: p.severity,
        state: p.state,
      });
    });
  }

  return dots;
}

interface TooltipState {
  dept: DepartmentKey;
  x: number;
  y: number;
}

export function HospitalFloorPlan() {
  const { hospitalState } = useSimulationStore();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const departments = hospitalState?.departments ?? {};
  const patients = hospitalState?.patients ?? [];

  const patientDots = useMemo(() => getDeptPatientPositions(patients), [patients]);

  function getDeptStatus(key: DepartmentKey): DepartmentStatus {
    return (departments[key]?.status as DepartmentStatus) ?? "healthy";
  }

  function getDeptOccupancy(key: DepartmentKey): number {
    return departments[key]?.occupancy ?? 0;
  }

  return (
    <div className="relative w-full h-full select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${FLOOR.width} ${FLOOR.height}`}
        className="w-full h-full"
        style={{ background: "transparent" }}
      >
        {}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(59,130,246,0.04)" strokeWidth="0.5" />
          </pattern>
          <filter id="glow-green">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          {}
          {["healthy", "warning", "critical"].map((status) => (
            <radialGradient key={status} id={`grad-${status}`} cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor={
                status === "healthy" ? "rgba(0,255,136,0.12)" :
                status === "warning" ? "rgba(255,170,0,0.12)" :
                "rgba(255,59,59,0.15)"
              } />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          ))}
        </defs>

        <rect width={FLOOR.width} height={FLOOR.height} fill="url(#grid)" />

        {}
        <rect
          x={5} y={5} width={FLOOR.width - 10} height={FLOOR.height - 10}
          fill="none" stroke="rgba(59,130,246,0.15)" strokeWidth="1" rx="4"
        />

        {}
        {DEPT_ZONES.map((zone) => {
          const status = getDeptStatus(zone.key);
          const occupancy = getDeptOccupancy(zone.key);
          const sColor = statusColor(status);

          return (
            <g
              key={zone.key}
              className="dept-zone"
              onMouseEnter={(e) => {
                const rect = svgRef.current?.getBoundingClientRect();
                if (rect) {
                  setTooltip({ dept: zone.key, x: zone.x + zone.w / 2, y: zone.y });
                }
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              {}
              <rect
                x={zone.x} y={zone.y} width={zone.w} height={zone.h}
                fill={`url(#grad-${status})`}
                stroke={sColor}
                strokeWidth="1"
                strokeOpacity="0.4"
                rx="3"
              />

              {}
              <rect
                x={zone.x + 2}
                y={zone.y + zone.h - 4}
                width={Math.max(0, (zone.w - 4) * occupancy)}
                height="3"
                fill={sColor}
                fillOpacity="0.6"
                rx="1.5"
              />

              {}
              {zone.rooms?.map((room, ri) => (
                <g key={ri}>
                  <rect
                    x={room.x + 2} y={room.y + 2}
                    width={room.w - 4} height={room.h - 4}
                    fill="rgba(0,0,0,0.2)"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="0.5"
                    rx="2"
                  />
                  {room.label && room.w > 50 && (
                    <text
                      x={room.x + room.w / 2}
                      y={room.y + room.h / 2 + 3}
                      textAnchor="middle"
                      fontSize="7"
                      fill="rgba(255,255,255,0.25)"
                      fontFamily="monospace"
                    >
                      {room.label}
                    </text>
                  )}
                </g>
              ))}

              {}
              <text
                x={zone.x + 6}
                y={zone.y + 13}
                fontSize="8"
                fontWeight="600"
                fill={sColor}
                fontFamily="JetBrains Mono, monospace"
                letterSpacing="0.5"
              >
                {zone.label}
              </text>

              {}
              <circle
                cx={zone.x + zone.w - 10}
                cy={zone.y + 10}
                r="4"
                fill={sColor}
                style={{
                  filter: `drop-shadow(0 0 4px ${sColor})`,
                  animation: status === "critical" ? "pulse-critical 1.5s infinite" : undefined,
                }}
              />

              {}
              <text
                x={zone.x + zone.w - 22}
                y={zone.y + 13}
                textAnchor="end"
                fontSize="7"
                fill={sColor}
                fillOpacity="0.8"
                fontFamily="monospace"
              >
                {Math.round(occupancy * 100)}%
              </text>
            </g>
          );
        })}

        {}
        <rect x={10} y={195} width={750} height={8} fill="rgba(59,130,246,0.04)" stroke="rgba(59,130,246,0.08)" strokeWidth="0.5" />
        <rect x={10} y={380} width={750} height={8} fill="rgba(59,130,246,0.04)" stroke="rgba(59,130,246,0.08)" strokeWidth="0.5" />
        <text x={375} y={200.5} textAnchor="middle" fontSize="6" fill="rgba(59,130,246,0.3)" fontFamily="monospace">— MAIN CORRIDOR —</text>

        {}
        <AnimatePresence mode="popLayout">
          {patientDots.map((dot) => (
            <motion.circle
              key={dot.id}
              cx={dot.x}
              cy={dot.y}
              r={dot.severity === "critical" ? 4.5 : dot.severity === "high" ? 4 : 3.5}
              fill={getPatientColor(dot.severity)}
              fillOpacity={0.85}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ cx: dot.x, cy: dot.y, scale: 1, opacity: 0.85 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 30, damping: 25, duration: 4.0 }}
              style={{
                filter: dot.severity === "critical"
                  ? `drop-shadow(0 0 5px ${getPatientColor(dot.severity)})`
                  : `drop-shadow(0 0 2px ${getPatientColor(dot.severity)})`,
              }}
            />
          ))}
        </AnimatePresence>

        {}
        {tooltip && departments[tooltip.dept] && (
          <DeptTooltip
            dept={tooltip.dept}
            deptData={departments[tooltip.dept]}
            anchorX={tooltip.x}
            anchorY={tooltip.y}
          />
        )}
      </svg>
    </div>
  );
}

function DeptTooltip({
  dept, deptData, anchorX, anchorY
}: {
  dept: string;
  deptData: any;
  anchorX: number;
  anchorY: number;
}) {
  const status = deptData.status as DepartmentStatus;
  const sColor = statusColor(status);
  const x = Math.min(anchorX, 750);
  const y = Math.max(anchorY - 100, 10);

  return (
    <g>
      <rect
        x={x - 80} y={y}
        width={160} height={90}
        fill="rgba(10,14,26,0.95)"
        stroke={sColor}
        strokeWidth="1"
        strokeOpacity="0.5"
        rx="4"
      />
      <text x={x} y={y + 14} textAnchor="middle" fontSize="9" fontWeight="700" fill={sColor} fontFamily="monospace">
        {deptData.display_name?.toUpperCase()}
      </text>
      <line x1={x - 75} y1={y + 18} x2={x + 75} y2={y + 18} stroke={sColor} strokeWidth="0.5" strokeOpacity="0.3" />
      {[
        ["Occupancy", formatPercent(deptData.occupancy)],
        ["Queue", `${deptData.queue_length} patients`],
        ["Avg Wait", formatTime(deptData.avg_wait_time)],
        ["Beds Avail", `${deptData.beds_available}`],
      ].map(([label, val], i) => (
        <g key={label}>
          <text x={x - 72} y={y + 32 + i * 14} fontSize="8" fill="rgba(148,163,184,0.8)" fontFamily="monospace">{label}</text>
          <text x={x + 72} y={y + 32 + i * 14} textAnchor="end" fontSize="8" fill="rgba(226,232,240,0.9)" fontFamily="monospace" fontWeight="600">{val}</text>
        </g>
      ))}
    </g>
  );
}
