/* Animated hospital floor plan that renders departments and patients moving between them. */
"use client";
import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSimulationStore } from "@/store/simulationStore";
import type { Patient, DepartmentKey, DepartmentStatus } from "@/types";
import { statusColor, formatPercent, formatTime } from "@/lib/utils";

const FLOOR = { width: 1100, height: 570 };

type RoomType =
  | "er_bay" | "critical_bay" | "triage" | "nurse_stn" | "corridor"
  | "icu_bed" | "ward_bed" | "ct" | "mri" | "xray" | "lab";

interface RoomDef {
  x: number; y: number; w: number; h: number;
  label?: string;
  type?: RoomType;
}

interface DeptZone {
  key: DepartmentKey;
  label: string;
  x: number; y: number; w: number; h: number;
  color: string;
  rooms?: RoomDef[];
}

const DEPT_ZONES: DeptZone[] = [
  {
    key: "er",
    label: "EMERGENCY DEPARTMENT",
    x: 10, y: 10, w: 720, h: 240,
    color: "#ef4444",
    rooms: [
      { x: 15,  y: 15,  w: 145, h: 105, label: "Triage",    type: "triage" },
      { x: 170, y: 15,  w: 105, h: 105, label: "Bay 1",     type: "er_bay" },
      { x: 285, y: 15,  w: 105, h: 105, label: "Bay 2",     type: "er_bay" },
      { x: 400, y: 15,  w: 105, h: 105, label: "Bay 3",     type: "er_bay" },
      { x: 515, y: 15,  w: 105, h: 105, label: "Bay 4",     type: "er_bay" },
      { x: 620, y: 15,  w: 105, h: 105, label: "Bay 5",     type: "er_bay" },
      { x: 15,  y: 130, w: 145, h: 105, label: "Critical",  type: "critical_bay" },
      { x: 170, y: 130, w: 105, h: 105, label: "Bay 6",     type: "er_bay" },
      { x: 285, y: 130, w: 105, h: 105, label: "Bay 7",     type: "er_bay" },
      { x: 400, y: 130, w: 105, h: 105, label: "Bay 8",     type: "er_bay" },
      { x: 515, y: 130, w: 105, h: 105, label: "Bay 9",     type: "er_bay" },
      { x: 620, y: 130, w: 105, h: 105, label: "Bay 10",    type: "er_bay" },
      { x: 10,  y: 243, w: 375, h: 6,                       type: "corridor" },
      { x: 395, y: 238, w: 335, h: 11,  label: "Nurse Stn", type: "nurse_stn" },
    ],
  },
  {
    key: "labs",
    label: "LABORATORY",
    x: 740, y: 10, w: 350, h: 240,
    color: "#8b5cf6",
    rooms: [
      { x: 745, y: 15,  w: 168, h: 110, label: "Lab A", type: "lab" },
      { x: 920, y: 15,  w: 165, h: 110, label: "Lab B", type: "lab" },
      { x: 745, y: 135, w: 168, h: 110, label: "Lab C", type: "lab" },
      { x: 920, y: 135, w: 165, h: 110, label: "Lab D", type: "lab" },
    ],
  },
  {
    key: "imaging",
    label: "IMAGING",
    x: 10, y: 264, w: 320, h: 296,
    color: "#06b6d4",
    rooms: [
      { x: 15,  y: 269, w: 150, h: 135, label: "CT-1",  type: "ct" },
      { x: 175, y: 269, w: 150, h: 135, label: "CT-2",  type: "ct" },
      { x: 15,  y: 414, w: 150, h: 141, label: "MRI",   type: "mri" },
      { x: 175, y: 414, w: 150, h: 141, label: "X-Ray", type: "xray" },
    ],
  },
  {
    key: "icu",
    label: "INTENSIVE CARE UNIT",
    x: 340, y: 264, w: 370, h: 296,
    color: "#f59e0b",
    rooms: [
      { x: 345, y: 269, w: 88, h: 135, label: "ICU-1", type: "icu_bed" },
      { x: 438, y: 269, w: 88, h: 135, label: "ICU-2", type: "icu_bed" },
      { x: 531, y: 269, w: 88, h: 135, label: "ICU-3", type: "icu_bed" },
      { x: 619, y: 269, w: 87, h: 135, label: "ICU-4", type: "icu_bed" },
      { x: 345, y: 414, w: 88, h: 141, label: "ICU-5", type: "icu_bed" },
      { x: 438, y: 414, w: 88, h: 141, label: "ICU-6", type: "icu_bed" },
      { x: 531, y: 414, w: 88, h: 141, label: "ICU-7", type: "icu_bed" },
      { x: 619, y: 414, w: 87, h: 141, label: "ICU-8", type: "icu_bed" },
    ],
  },
  {
    key: "ward",
    label: "GENERAL WARD",
    x: 720, y: 264, w: 370, h: 296,
    color: "#22c55e",
    rooms: [
      { x: 725,  y: 269, w: 88, h: 135, label: "W-A", type: "ward_bed" },
      { x: 818,  y: 269, w: 88, h: 135, label: "W-B", type: "ward_bed" },
      { x: 911,  y: 269, w: 88, h: 135, label: "W-C", type: "ward_bed" },
      { x: 1000, y: 269, w: 85, h: 135, label: "W-D", type: "ward_bed" },
      { x: 725,  y: 414, w: 88, h: 141, label: "W-E", type: "ward_bed" },
      { x: 818,  y: 414, w: 88, h: 141, label: "W-F", type: "ward_bed" },
      { x: 911,  y: 414, w: 88, h: 141, label: "W-G", type: "ward_bed" },
      { x: 1000, y: 414, w: 85, h: 141, label: "W-H", type: "ward_bed" },
    ],
  },
];

const DEPT_PATIENT_AREA: Record<string, { x: number; y: number; w: number; h: number }> = {
  er:           { x: 175, y: 20,  w: 545, h: 220 },
  triage:       { x: 20,  y: 20,  w: 140, h: 105 },
  labs:         { x: 750, y: 20,  w: 330, h: 225 },
  imaging:      { x: 20,  y: 274, w: 300, h: 281 },
  icu:          { x: 350, y: 274, w: 355, h: 281 },
  ward:         { x: 730, y: 274, w: 355, h: 281 },
  registration: { x: 350, y: 274, w: 355, h: 281 },
  discharge:    { x: 20,  y: 274, w: 300, h: 281 },
};

interface PatientDotData {
  id: string;
  x: number;
  y: number;
  severity: string;
  state: string;
}

function getPatientColor(severity: string): string {
  return (
    { low: "#22c55e", medium: "#ffe600", high: "#ffaa00", critical: "#ff3b3b" }[severity] ?? "#64748b"
  );
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
    deptPatients.forEach((p) => {
      const col = Math.floor(rng(p.patient_id + "x") * 12);
      const row = Math.floor(rng(p.patient_id + "y") * 10);
      const x = area.x + 8 + (col * (area.w - 16)) / 12;
      const y = area.y + 8 + (row * (area.h - 16)) / 10;
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

function Bed({ x, y, w, h, color, monitor = false }: {
  x: number; y: number; w: number; h: number; color: string; monitor?: boolean;
}) {
  const bw = Math.min(w - 18, 70);
  const bh = Math.min(h - 36, 38);
  const bx = x + w / 2 - bw / 2;
  const by = y + h / 2 - bh / 2 + (monitor ? 8 : 5);
  return (
    <g opacity={0.75}>
      <rect x={bx} y={by} width={bw} height={bh} rx="3"
        fill="rgba(10,14,26,0.5)" stroke={color} strokeWidth="0.9" opacity={0.5} />
      <rect x={bx} y={by} width={5} height={bh} rx="2"
        fill={color} opacity={0.45} />
      <rect x={bx + bw - 5} y={by} width={5} height={bh} rx="2"
        fill={color} opacity={0.3} />
      <rect x={bx + 7} y={by + 3} width={bw * 0.28} height={bh * 0.65} rx="2"
        fill={color} opacity={0.28} />
      <rect x={bx + 7 + bw * 0.28 + 2} y={by + 3} width={bw * 0.58} height={bh * 0.75} rx="1"
        fill={color} opacity={0.1} />
      <rect x={bx + 5}       y={by + bh + 1} width={6} height={3} rx="1.5" fill={color} opacity={0.28} />
      <rect x={bx + bw - 11} y={by + bh + 1} width={6} height={3} rx="1.5" fill={color} opacity={0.28} />
      {monitor && (
        <>
          <rect x={bx + bw / 2 - 16} y={by - 24} width={32} height={19} rx="2"
            fill="rgba(10,14,26,0.8)" stroke={color} strokeWidth="0.6" opacity={0.65} />
          <polyline
            points={`${bx + bw / 2 - 12},${by - 14} ${bx + bw / 2 - 6},${by - 14} ${bx + bw / 2 - 4},${by - 20} ${bx + bw / 2 - 2},${by - 9} ${bx + bw / 2},${by - 14} ${bx + bw / 2 + 10},${by - 14}`}
            fill="none" stroke={color} strokeWidth="1.2" opacity={0.65} />
          <rect x={bx + bw / 2 - 3} y={by - 5} width={6} height={5} rx="1" fill={color} opacity={0.2} />
          <line x1={bx + bw + 5} y1={by - 18} x2={bx + bw + 5} y2={by + bh + 2}
            stroke={color} strokeWidth="1" opacity={0.35} />
          <circle cx={bx + bw + 5} cy={by - 18} r="5.5"
            fill="none" stroke={color} strokeWidth="1" opacity={0.3} />
        </>
      )}
      {!monitor && (
        <line x1={bx + bw + 4} y1={by - 5} x2={bx + bw + 4} y2={by + bh + 2}
          stroke={color} strokeWidth="0.8" opacity={0.25} />
      )}
    </g>
  );
}

function CTScanner({ x, y, w, h, color }: { x: number; y: number; w: number; h: number; color: string }) {
  const cx = x + w / 2 - 10;
  const cy = y + h / 2 - 5;
  return (
    <g opacity={0.72}>
      <circle cx={cx} cy={cy} r={30} fill="none" stroke={color} strokeWidth="11" opacity={0.32} />
      <circle cx={cx} cy={cy} r={17} fill="rgba(6,182,212,0.05)" stroke={color} strokeWidth="1" opacity={0.45} />
      <rect x={cx + 2} y={cy - 5} width={52} height={10} rx="3"
        fill={color} opacity={0.22} stroke={color} strokeWidth="0.6" />
      <rect x={cx + 46} y={cy + 5} width={10} height={22} rx="2" fill={color} opacity={0.18} />
      <rect x={cx - 48} y={cy - 18} width={12} height={26} rx="2"
        fill={color} opacity={0.14} stroke={color} strokeWidth="0.5" />
      <rect x={cx - 46} y={cy - 13} width={8} height={3} rx="0.8" fill={color} opacity={0.4} />
      <rect x={cx - 46} y={cy - 7} width={8} height={3} rx="0.8" fill={color} opacity={0.4} />
      <rect x={cx - 46} y={cy - 1} width={8} height={3} rx="0.8" fill={color} opacity={0.4} />
    </g>
  );
}

function MRIScanner({ x, y, w, h, color }: { x: number; y: number; w: number; h: number; color: string }) {
  const cx = x + w / 2 - 5;
  const cy = y + h / 2 - 5;
  return (
    <g opacity={0.72}>
      <rect x={cx - 42} y={cy - 27} width={84} height={55} rx="27"
        fill="none" stroke={color} strokeWidth="11" opacity={0.32} />
      <rect x={cx - 26} y={cy - 17} width={52} height={35} rx="17"
        fill="rgba(6,182,212,0.04)" stroke={color} strokeWidth="1" opacity={0.4} />
      <rect x={cx - 8} y={cy - 5} width={65} height={10} rx="3"
        fill={color} opacity={0.22} stroke={color} strokeWidth="0.6" />
      <rect x={cx - 40} y={cy + 28} width={80} height={8} rx="2" fill={color} opacity={0.18} />
    </g>
  );
}

function XRayMachine({ x, y, w, h, color }: { x: number; y: number; w: number; h: number; color: string }) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  return (
    <g opacity={0.72}>
      <rect x={cx - 3} y={cy - 48} width={6} height={68} rx="2.5" fill={color} opacity={0.32} />
      <rect x={cx - 38} y={cy - 48} width={76} height={5} rx="2" fill={color} opacity={0.28} />
      <rect x={cx - 24} y={cy - 65} width={48} height={20} rx="3"
        fill="rgba(10,14,26,0.6)" stroke={color} strokeWidth="0.8" opacity={0.55} />
      <line x1={cx - 18} y1={cy - 58} x2={cx + 18} y2={cy - 58}
        stroke={color} strokeWidth="0.7" opacity={0.35} />
      <line x1={cx - 18} y1={cy - 52} x2={cx + 18} y2={cy - 52}
        stroke={color} strokeWidth="0.7" opacity={0.35} />
      <rect x={cx - 38} y={cy + 22} width={76} height={11} rx="3"
        fill={color} opacity={0.2} stroke={color} strokeWidth="0.6" />
      <rect x={cx - 6} y={cy + 33} width={12} height={18} rx="2" fill={color} opacity={0.18} />
    </g>
  );
}

function LabStation({ x, y, w, h, color }: { x: number; y: number; w: number; h: number; color: string }) {
  const lx = x + w / 2 - 42;
  const ly = y + h / 2 - 18;
  return (
    <g opacity={0.72}>
      <rect x={lx} y={ly + 30} width={28} height={7} rx="2.5" fill={color} opacity={0.38} />
      <rect x={lx + 10} y={ly - 2} width={5} height={33} rx="1.5" fill={color} opacity={0.32} />
      <rect x={lx + 2} y={ly - 2} width={21} height={5} rx="1.5" fill={color} opacity={0.3} />
      <rect x={lx + 1} y={ly - 10} width={11} height={10} rx="2"
        fill="rgba(10,14,26,0.5)" stroke={color} strokeWidth="0.7" opacity={0.55} />
      <rect x={lx + 5} y={ly + 13} width={23} height={5} rx="1" fill={color} opacity={0.3} />
      <circle cx={lx + 12} cy={ly + 22} r="3.5"
        fill="none" stroke={color} strokeWidth="1.2" opacity={0.4} />
      <path d={`M${lx + 36} ${ly + 32} L${lx + 34} ${ly + 14} L${lx + 38} ${ly + 8} L${lx + 48} ${ly + 8} L${lx + 52} ${ly + 14} L${lx + 50} ${ly + 32} Z`}
        fill={color} opacity={0.14} stroke={color} strokeWidth="0.9" />
      <rect x={lx + 40} y={ly + 1} width={7} height={8} rx="1.5" fill={color} opacity={0.2} />
      <rect x={lx + 56} y={ly - 2} width={9} height={34} rx="4.5"
        fill={color} opacity={0.14} stroke={color} strokeWidth="0.9" />
      <rect x={lx + 57} y={ly + 15} width={7} height={10} rx="3.5" fill={color} opacity={0.3} />
    </g>
  );
}

function TriageDesk({ x, y, w, h, color }: { x: number; y: number; w: number; h: number; color: string }) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  return (
    <g opacity={0.65}>
      <rect x={cx - 35} y={cy - 5} width={70} height={28} rx="3"
        fill="rgba(10,14,26,0.4)" stroke={color} strokeWidth="0.8" opacity={0.45} />
      <rect x={cx - 30} y={cy - 22} width={28} height={18} rx="2"
        fill="rgba(10,14,26,0.7)" stroke={color} strokeWidth="0.6" opacity={0.55} />
      <rect x={cx - 26} y={cy - 18} width={20} height={2} rx="0.5" fill={color} opacity={0.3} />
      <rect x={cx - 26} y={cy - 14} width={20} height={2} rx="0.5" fill={color} opacity={0.3} />
      <rect x={cx - 26} y={cy - 10} width={14} height={2} rx="0.5" fill={color} opacity={0.3} />
      <rect x={cx + 10} y={cy - 18} width={18} height={14} rx="2"
        fill={color} opacity={0.12} stroke={color} strokeWidth="0.5" />
      <rect x={cx - 48} y={cy + 5} width={14} height={18} rx="2" fill={color} opacity={0.18} />
      <rect x={cx + 34} y={cy + 5} width={14} height={18} rx="2" fill={color} opacity={0.18} />
    </g>
  );
}

function RoomEquipment({ room, color }: { room: RoomDef; color: string }) {
  const { x, y, w, h, type } = room;
  if (type === "er_bay")       return <Bed x={x} y={y} w={w} h={h} color={color} />;
  if (type === "critical_bay") return <Bed x={x} y={y} w={w} h={h} color={color} monitor />;
  if (type === "icu_bed")      return <Bed x={x} y={y} w={w} h={h} color={color} monitor />;
  if (type === "ward_bed")     return <Bed x={x} y={y} w={w} h={h} color={color} />;
  if (type === "triage")       return <TriageDesk x={x} y={y} w={w} h={h} color={color} />;
  if (type === "ct")           return <CTScanner x={x} y={y} w={w} h={h} color={color} />;
  if (type === "mri")          return <MRIScanner x={x} y={y} w={w} h={h} color={color} />;
  if (type === "xray")         return <XRayMachine x={x} y={y} w={w} h={h} color={color} />;
  if (type === "lab")          return <LabStation x={x} y={y} w={w} h={h} color={color} />;
  if (type === "nurse_stn") {
    return (
      <g opacity={0.4}>
        <rect x={x + 4} y={y + 1} width={w - 8} height={h - 2} rx="1"
          fill={color} opacity={0.12} />
        <text x={x + w / 2} y={y + h / 2 + 3} textAnchor="middle"
          fontSize="6" fill={color} opacity={0.5} fontFamily="monospace">NURSE STN</text>
      </g>
    );
  }
  return null;
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
        <defs>
          <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(59,130,246,0.04)" strokeWidth="0.5" />
          </pattern>
          {["healthy", "warning", "critical"].map((s) => (
            <radialGradient key={s} id={`grad-${s}`} cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor={
                s === "healthy" ? "rgba(0,255,136,0.1)" :
                s === "warning" ? "rgba(255,170,0,0.1)" :
                "rgba(255,59,59,0.13)"
              } />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          ))}
        </defs>

        <rect width={FLOOR.width} height={FLOOR.height} fill="url(#grid)" />
        <rect x={5} y={5} width={FLOOR.width - 10} height={FLOOR.height - 10}
          fill="none" stroke="rgba(59,130,246,0.12)" strokeWidth="1" rx="4" />

        {DEPT_ZONES.map((zone) => {
          const status = getDeptStatus(zone.key);
          const occupancy = getDeptOccupancy(zone.key);
          const sColor = statusColor(status);

          return (
            <g
              key={zone.key}
              onMouseEnter={() => setTooltip({ dept: zone.key, x: zone.x + zone.w / 2, y: zone.y })}
              onMouseLeave={() => setTooltip(null)}
            >
              <rect
                x={zone.x} y={zone.y} width={zone.w} height={zone.h}
                fill={`url(#grad-${status})`}
                stroke={sColor} strokeWidth="1.2" strokeOpacity="0.4" rx="4"
              />

              {zone.rooms?.map((room, ri) => (
                <g key={ri}>
                  {room.type !== "corridor" && room.type !== "nurse_stn" && (
                    <rect
                      x={room.x + 2} y={room.y + 2}
                      width={room.w - 4} height={room.h - 4}
                      fill="rgba(0,0,0,0.18)" stroke="rgba(255,255,255,0.06)"
                      strokeWidth="0.6" rx="2"
                    />
                  )}
                  <RoomEquipment room={room} color={zone.color} />
                  {room.label && room.type !== "corridor" && (
                    <text
                      x={room.x + room.w / 2}
                      y={room.y + room.h - 7}
                      textAnchor="middle"
                      fontSize="8"
                      fill="rgba(255,255,255,0.35)"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="600"
                    >
                      {room.label}
                    </text>
                  )}
                </g>
              ))}

              <text
                x={zone.x + 8} y={zone.y + 14}
                fontSize="9" fontWeight="700"
                fill={sColor} fillOpacity="0.9"
                fontFamily="JetBrains Mono, monospace"
                letterSpacing="0.8"
              >
                {zone.label}
              </text>

              <circle
                cx={zone.x + zone.w - 12} cy={zone.y + 12} r="5"
                fill={sColor}
                style={{
                  filter: `drop-shadow(0 0 5px ${sColor})`,
                  animation: status === "critical" ? "pulse-critical 1.5s infinite" : undefined,
                }}
              />

              <text
                x={zone.x + zone.w - 24} y={zone.y + 15}
                textAnchor="end" fontSize="8"
                fill={sColor} fillOpacity="0.85"
                fontFamily="monospace"
              >
                {Math.round(occupancy * 100)}%
              </text>

              <rect
                x={zone.x + 2} y={zone.y + zone.h - 4}
                width={Math.max(0, (zone.w - 4) * occupancy)}
                height="3"
                fill={sColor} fillOpacity="0.55" rx="1.5"
              />
            </g>
          );
        })}

        <rect x={10} y={254} width={1080} height={8}
          fill="rgba(59,130,246,0.03)" stroke="rgba(59,130,246,0.07)" strokeWidth="0.5" />
        <text x={550} y={260} textAnchor="middle" fontSize="6"
          fill="rgba(59,130,246,0.28)" fontFamily="monospace">— MAIN CORRIDOR —</text>

        <AnimatePresence mode="popLayout">
          {patientDots.map((dot) => (
            <motion.circle
              key={dot.id}
              cx={dot.x}
              cy={dot.y}
              r={dot.severity === "critical" ? 5 : dot.severity === "high" ? 4.5 : 4}
              fill={getPatientColor(dot.severity)}
              fillOpacity={0.88}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ cx: dot.x, cy: dot.y, scale: 1, opacity: 0.88 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 28, damping: 24, duration: 4.0 }}
              style={{
                filter: dot.severity === "critical"
                  ? `drop-shadow(0 0 6px ${getPatientColor(dot.severity)})`
                  : `drop-shadow(0 0 2px ${getPatientColor(dot.severity)})`,
              }}
            />
          ))}
        </AnimatePresence>

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
  dept, deptData, anchorX, anchorY,
}: {
  dept: string;
  deptData: any;
  anchorX: number;
  anchorY: number;
}) {
  const status = deptData.status as DepartmentStatus;
  const sColor = statusColor(status);
  const x = Math.min(anchorX, 850);
  const y = Math.max(anchorY - 105, 8);

  return (
    <g>
      <rect x={x - 88} y={y} width={176} height={98}
        fill="rgba(10,14,26,0.97)" stroke={sColor} strokeWidth="1" strokeOpacity="0.5" rx="5" />
      <text x={x} y={y + 15} textAnchor="middle" fontSize="10" fontWeight="700"
        fill={sColor} fontFamily="monospace">
        {deptData.display_name?.toUpperCase()}
      </text>
      <line x1={x - 82} y1={y + 20} x2={x + 82} y2={y + 20}
        stroke={sColor} strokeWidth="0.5" strokeOpacity="0.3" />
      {[
        ["Occupancy", formatPercent(deptData.occupancy)],
        ["Queue",     `${deptData.queue_length} patients`],
        ["Avg Wait",  formatTime(deptData.avg_wait_time)],
        ["Beds Avail",`${deptData.beds_available}`],
      ].map(([label, val], i) => (
        <g key={label}>
          <text x={x - 80} y={y + 34 + i * 15} fontSize="8.5"
            fill="rgba(148,163,184,0.85)" fontFamily="monospace">{label}</text>
          <text x={x + 80} y={y + 34 + i * 15} textAnchor="end" fontSize="8.5"
            fill="rgba(226,232,240,0.95)" fontFamily="monospace" fontWeight="600">{val}</text>
        </g>
      ))}
    </g>
  );
}
