/* Card displaying a patient's vitals, care pathway, risk score, and optional AI summary. */
"use client";
import { motion } from "framer-motion";
import { Clock, MapPin, AlertTriangle, Activity } from "lucide-react";
import type { Patient } from "@/types";
import {
  severityBadgeClass, severityColor, riskColor, riskLabel,
  formatTime, departmentLabel, cn
} from "@/lib/utils";

interface PatientCardProps {
  patient: Patient;
  selected?: boolean;
  onClick?: () => void;
  showSummary?: string;
}

const STATE_LABELS: Record<string, string> = {
  arriving: "Arriving",
  triage: "In Triage",
  waiting_er: "Waiting (ER)",
  in_er: "In ER",
  waiting_labs: "Waiting (Labs)",
  in_labs: "In Labs",
  waiting_imaging: "Waiting (Imaging)",
  in_imaging: "In Imaging",
  waiting_icu: "Waiting (ICU)",
  in_icu: "In ICU",
  waiting_ward: "Waiting (Ward)",
  in_ward: "In Ward",
  waiting_discharge: "Awaiting Discharge",
  discharged: "Discharged",
};

export function PatientCard({ patient: p, selected, onClick, showSummary }: PatientCardProps) {
  const risk = p.risk_score;
  const rColor = riskColor(risk);
  const isWaiting = p.state.startsWith("waiting");

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      onClick={onClick}
      className={cn(
        "rounded-lg p-3 cursor-pointer transition-all duration-200",
        selected ? "ring-1 ring-blue-500/50" : ""
      )}
      style={{
        background: selected ? "rgba(59,130,246,0.08)" : "rgba(15,22,41,0.6)",
        border: `1px solid ${selected ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.06)"}`,
      }}
      whileHover={{ backgroundColor: "rgba(59,130,246,0.06)" }}
    >
      {}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-white">{p.name}</span>
            <span className="text-[10px] text-slate-600 font-mono">#{p.patient_id}</span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5 font-mono">
            Age {p.age} • {p.chief_complaint}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase", severityBadgeClass(p.severity))}>
            {p.severity}
          </span>
          {risk > 0.5 && (
            <span className="text-[8px] font-mono" style={{ color: rColor }}>
              {riskLabel(risk)} RISK
            </span>
          )}
        </div>
      </div>

      {}
      <div className="flex items-center gap-3 text-xs font-mono">
        <div className="flex items-center gap-1">
          <MapPin className="w-2.5 h-2.5 text-slate-600" />
          <span className="text-slate-400">{departmentLabel(p.current_department)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Activity className="w-2.5 h-2.5 text-slate-600" />
          <span
            className={cn(
              isWaiting ? "text-yellow-400" : "text-slate-400"
            )}
          >
            {STATE_LABELS[p.state] ?? p.state}
          </span>
        </div>
        {p.total_wait_time > 0 && (
          <div className="flex items-center gap-1 ml-auto">
            <Clock className="w-2.5 h-2.5 text-slate-600" />
            <span className={cn(
              "font-bold",
              p.total_wait_time > 90 ? "text-red-400" :
              p.total_wait_time > 60 ? "text-yellow-400" : "text-slate-400"
            )}>
              {formatTime(p.total_wait_time)}
            </span>
          </div>
        )}
      </div>

      {}
      <div className="mt-2 flex items-center gap-2">
        <div className="text-[8px] text-slate-700 font-mono w-8">Risk</div>
        <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${risk * 100}%`, background: rColor, opacity: 0.7 }}
          />
        </div>
        <div className="text-[8px] font-mono" style={{ color: rColor }}>
          {(risk * 100).toFixed(0)}
        </div>
      </div>

      {}
      <div className="flex gap-1 mt-1.5 flex-wrap">
        {p.pathway.needs_labs && (
          <span className="text-[8px] px-1 py-0.5 rounded bg-purple-950/40 text-purple-400 font-mono border border-purple-900/30">
            Labs
          </span>
        )}
        {p.pathway.needs_imaging && (
          <span className="text-[8px] px-1 py-0.5 rounded bg-cyan-950/40 text-cyan-400 font-mono border border-cyan-900/30">
            {p.pathway.imaging_type.toUpperCase()}
          </span>
        )}
        {p.pathway.needs_icu && (
          <span className="text-[8px] px-1 py-0.5 rounded bg-amber-950/40 text-amber-400 font-mono border border-amber-900/30">
            ICU
          </span>
        )}
        {p.pathway.needs_ward && (
          <span className="text-[8px] px-1 py-0.5 rounded bg-green-950/40 text-green-400 font-mono border border-green-900/30">
            Ward
          </span>
        )}
      </div>

      {}
      {showSummary && (
        <div
          className="mt-2 pt-2 border-t border-slate-800/50 text-[9px] text-slate-400 font-mono leading-relaxed"
        >
          {showSummary}
        </div>
      )}
    </motion.div>
  );
}
