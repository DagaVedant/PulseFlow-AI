/* Patient Intelligence page: patient cards, risk scores, and on-demand AI summaries. */
"use client";
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Users, AlertTriangle, Clock, MapPin, Activity, ChevronLeft, ChevronRight, Zap, RefreshCw } from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";
import { api } from "@/lib/api";
import {
  severityBadgeClass, severityColor, riskColor, riskLabel,
  formatTime, departmentLabel, cn
} from "@/lib/utils";
import type { Patient, Severity } from "@/types";

type FilterSeverity = "all" | Severity;

const STATE_LABELS: Record<string, string> = {
  arriving: "Arriving",
  triage: "In Triage",
  waiting_er: "Waiting — ER",
  in_er: "In ER",
  waiting_labs: "Waiting — Labs",
  in_labs: "In Labs",
  waiting_imaging: "Waiting — Imaging",
  in_imaging: "In Imaging",
  waiting_icu: "Waiting — ICU",
  in_icu: "In ICU",
  waiting_ward: "Waiting — Ward",
  in_ward: "In Ward",
  waiting_discharge: "Awaiting Discharge",
  discharged: "Discharged",
};

const PAGE_SIZE = 4;

export default function PatientIntelPage() {
  const { hospitalState, highRiskPatients } = useSimulationStore();
  const patients = hospitalState?.patients ?? [];

  const [search, setSearch] = useState("");
  const [filterSev, setFilterSev] = useState<FilterSeverity>("all");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [loadingSummary, setLoadingSummary] = useState<string | null>(null);
  const [analyzingAll, setAnalyzingAll] = useState(false);

  const filtered = useMemo(() => {
    return patients
      .filter((p) => {
        if (filterSev !== "all" && p.severity !== filterSev) return false;
        if (search) {
          const s = search.toLowerCase();
          if (
            !p.name.toLowerCase().includes(s) &&
            !p.patient_id.toLowerCase().includes(s) &&
            !p.chief_complaint.toLowerCase().includes(s)
          ) return false;
        }
        return true;
      })
      .sort((a, b) => b.risk_score - a.risk_score || a.total_wait_time - b.total_wait_time);
  }, [patients, filterSev, search]);

  useEffect(() => { setPage(0); }, [filterSev, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const visible = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  async function loadSummary(id: string) {
    if (summaries[id]) return;
    setLoadingSummary(id);
    try {
      const res = await api.getPatientSummary(id);
      setSummaries((prev) => ({ ...prev, [id]: res.summary }));
    } catch {
      setSummaries((prev) => ({ ...prev, [id]: "Summary unavailable." }));
    } finally {
      setLoadingSummary(null);
    }
  }

  const handleSelect = (id: string) => {
    setSelectedId(selectedId === id ? null : id);
    if (selectedId !== id) loadSummary(id);
  };

  const analyzeAll = async () => {
    setAnalyzingAll(true);

    const ids = visible.map((p) => p.patient_id);
    await Promise.all(ids.map((id) => loadSummary(id)));

    setSelectedId(null);
    setAnalyzingAll(false);
  };

  return (
    <div className="flex flex-col h-full p-6 gap-5 overflow-hidden">

      {}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400" />
            Patient Intelligence
          </h1>
          <p className="text-sm text-slate-500 font-mono mt-1">
            Sorted by risk score — showing highest priority first
          </p>
        </div>
        <div className="flex items-center gap-3">
          {highRiskPatients.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-950/40 border border-red-800/40">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-sm font-mono font-bold text-red-400">
                {highRiskPatients.length} HIGH RISK
              </span>
            </div>
          )}
          <button
            onClick={analyzeAll}
            disabled={analyzingAll}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-mono font-bold transition-all"
            style={{
              background: analyzingAll ? "rgba(59,130,246,0.08)" : "rgba(59,130,246,0.15)",
              border: "1px solid rgba(59,130,246,0.4)",
              color: analyzingAll ? "#60a5fa" : "#93c5fd",
            }}
          >
            {analyzingAll
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing...</>
              : <><Zap className="w-4 h-4" /> Analyze All 4</>
            }
          </button>
        </div>
      </div>

      {}
      <div className="flex gap-3 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
          <input
            type="text"
            placeholder="Search by name, ID, or complaint..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-mono bg-slate-900/60 border border-slate-700/50 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-600/50"
          />
        </div>
        <select
          value={filterSev}
          onChange={(e) => setFilterSev(e.target.value as FilterSeverity)}
          className="text-sm font-mono px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700/50 text-slate-300 focus:outline-none"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {visible.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-slate-600 font-mono text-sm">
            No patients match your filters
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 items-start">
            <AnimatePresence mode="popLayout">
              {visible.map((patient) => (
                <LargePatientCard
                  key={patient.patient_id}
                  patient={patient}
                  selected={selectedId === patient.patient_id}
                  summary={summaries[patient.patient_id]}
                  loadingSummary={loadingSummary === patient.patient_id || (analyzingAll && !summaries[patient.patient_id])}
                  showSummary={!!(summaries[patient.patient_id]) || selectedId === patient.patient_id || (analyzingAll && !summaries[patient.patient_id])}
                  onClick={() => handleSelect(patient.patient_id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {}
      {totalPages > 1 && (
        <div className="flex items-center justify-between flex-shrink-0 pt-1">
          <span className="text-xs text-slate-600 font-mono">
            Page {page + 1} of {totalPages} • {filtered.length} patients
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-2 rounded-lg disabled:opacity-30 hover:bg-white/[0.05] transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="p-2 rounded-lg disabled:opacity-30 hover:bg-white/[0.05] transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface LargeCardProps {
  patient: Patient;
  selected: boolean;
  summary?: string;
  loadingSummary: boolean;
  showSummary?: boolean;
  onClick: () => void;
}

function LargePatientCard({ patient: p, selected, summary, loadingSummary, showSummary, onClick }: LargeCardProps) {
  const risk = p.risk_score;
  const rColor = riskColor(risk);
  const sColor = severityColor(p.severity);
  const isWaiting = p.state.startsWith("waiting");

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      onClick={onClick}
      className="flex flex-col rounded-2xl p-5 cursor-pointer"
      style={{
        background: selected ? "rgba(59,130,246,0.07)" : "rgba(15,22,41,0.7)",
        border: `1.5px solid ${selected ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.07)"}`,
        boxShadow: selected ? "0 0 24px rgba(59,130,246,0.12)" : "none",
      }}
      whileHover={{ borderColor: "rgba(59,130,246,0.25)" }}
    >
      {}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="text-lg font-bold text-white leading-tight truncate">{p.name}</div>
          <div className="text-xs text-slate-500 font-mono mt-0.5">
            #{p.patient_id} · Age {p.age}
          </div>
        </div>
        <span
          className={cn(
            "text-xs px-3 py-1.5 rounded-lg font-mono font-bold uppercase flex-shrink-0",
            severityBadgeClass(p.severity)
          )}
        >
          {p.severity}
        </span>
      </div>

      {}
      <div className="text-sm text-slate-300 mb-4 leading-snug">
        {p.chief_complaint}
      </div>

      {}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-sm font-mono text-slate-400">
            {departmentLabel(p.current_department)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-slate-600" />
          <span className={cn("text-sm font-mono", isWaiting ? "text-yellow-400" : "text-slate-400")}>
            {STATE_LABELS[p.state] ?? p.state}
          </span>
        </div>
      </div>

      {}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {}
        <div
          className="rounded-xl px-3 py-2.5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3 h-3 text-slate-600" />
            <span className="text-[10px] text-slate-600 font-mono uppercase">Wait</span>
          </div>
          <div
            className="text-xl font-bold font-mono"
            style={{
              color: p.total_wait_time > 120 ? "#ff3b3b"
                : p.total_wait_time > 80 ? "#ffaa00"
                : "#e2e8f0",
            }}
          >
            {formatTime(p.total_wait_time)}
          </div>
        </div>

        {}
        <div
          className="rounded-xl px-3 py-2.5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="text-[10px] text-slate-600 font-mono uppercase mb-1">Risk</div>
          <div className="text-xl font-bold font-mono" style={{ color: rColor }}>
            {riskLabel(risk)}
          </div>
          <div className="mt-1.5 h-1 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${risk * 100}%`, background: rColor, opacity: 0.75 }}
            />
          </div>
        </div>
      </div>

      {}
      <div className="flex gap-1.5 flex-wrap mb-3">
        {p.pathway.needs_labs && (
          <span className="text-xs px-2.5 py-1 rounded-lg bg-purple-950/50 text-purple-300 font-mono border border-purple-900/40">
            Labs
          </span>
        )}
        {p.pathway.needs_imaging && (
          <span className="text-xs px-2.5 py-1 rounded-lg bg-cyan-950/50 text-cyan-300 font-mono border border-cyan-900/40">
            {p.pathway.imaging_type.toUpperCase()}
          </span>
        )}
        {p.pathway.needs_icu && (
          <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-950/50 text-amber-300 font-mono border border-amber-900/40">
            ICU
          </span>
        )}
        {p.pathway.needs_ward && (
          <span className="text-xs px-2.5 py-1 rounded-lg bg-green-950/50 text-green-300 font-mono border border-green-900/40">
            Ward
          </span>
        )}
      </div>

      {}
      <AnimatePresence>
        {(selected || showSummary) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 pt-3 border-t border-slate-700/50">
              {loadingSummary ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 font-mono animate-pulse">
                  <span className="text-blue-500">●</span>
                  Generating AI summary...
                </div>
              ) : summary ? (
                <p className="text-sm text-slate-300 leading-relaxed">{summary}</p>
              ) : (
                <p className="text-sm text-slate-600 italic">Loading summary...</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
