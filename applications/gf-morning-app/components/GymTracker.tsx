"use client";

import { useEffect, useState } from "react";
import { supabase, SUPABASE_ENABLED } from "../lib/supabase";
import type { GymSession, WorkoutType, GymDetails, ExerciseSet } from "../types";

const LS_KEY = "gym_sessions_local";

const WORKOUT_TYPES: WorkoutType[] = ["Pilates","Legs","Upper Body","Run","Stairmaster","Other"];

const WORKOUT_EMOJI: Record<WorkoutType, string> = {
  Pilates: "🧘‍♀️", Legs: "🦵", "Upper Body": "💪", Run: "🏃‍♀️", Stairmaster: "🪜", Other: "⭐",
};

type TimePeriod = "all" | "2w" | "1m" | "3m";

const TIME_PERIOD_OPTIONS: { label: string; value: TimePeriod }[] = [
  { label: "All time", value: "all" },
  { label: "Last 2 weeks", value: "2w" },
  { label: "Last month", value: "1m" },
  { label: "Last 3 months", value: "3m" },
];

function todayStr() { return new Date().toISOString().split("T")[0]; }

function cutoffDate(period: TimePeriod): string | null {
  if (period === "all") return null;
  const d = new Date();
  if (period === "2w") d.setDate(d.getDate() - 14);
  if (period === "1m") d.setMonth(d.getMonth() - 1);
  if (period === "3m") d.setMonth(d.getMonth() - 3);
  return d.toISOString().split("T")[0];
}

function emptySet(withWeight = true): ExerciseSet {
  return withWeight ? { weight: 0, reps: 0, sets: 0 } : { reps: 0, sets: 0 };
}

function emptyDetails(): GymDetails { return {}; }

// ─── localStorage helpers ─────────────────────────────────────────────────────

function lsLoad(): GymSession[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GymSession[];
    // Sort descending by date (same as DB order)
    return parsed.sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

function lsSave(sessions: GymSession[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(sessions));
  } catch {
    /* ignore */
  }
}

// ─── Detail summary ───────────────────────────────────────────────────────────

function fmtSet(s?: ExerciseSet, showWeight = true): string | null {
  if (!s) return null;
  const parts: string[] = [];
  if (showWeight && s.weight) parts.push(`${s.weight}kg`);
  if (s.reps) parts.push(`${s.reps} reps`);
  if (s.sets) parts.push(`${s.sets} sets`);
  return parts.length ? parts.join(" × ") : null;
}

function DetailSummary({ type, details }: { type: WorkoutType; details?: GymDetails }) {
  if (!details) return null;
  if (type === "Legs") {
    const parts = [
      details.squats ? `Squats: ${fmtSet(details.squats)}` : "Squats: N/A",
      details.rdls ? `RDLs: ${fmtSet(details.rdls)}` : "RDLs: N/A",
      details.hipThrusts ? `Hip Thrusts: ${fmtSet(details.hipThrusts)}` : "Hip Thrusts: N/A",
    ];
    return <p className="text-xs text-slate-400 mt-0.5">{parts.join(" | ")}</p>;
  }
  if (type === "Upper Body") {
    const pu = fmtSet(details.pullUps, false);
    return <p className="text-xs text-slate-400 mt-0.5">Pull Ups: {pu ?? "N/A"}</p>;
  }
  if (type === "Stairmaster") {
    const parts = [
      details.flights ? `${details.flights} flights` : null,
      details.minutes ? `${details.minutes} min` : null,
    ].filter(Boolean);
    if (!parts.length) return null;
    return <p className="text-xs text-slate-400 mt-0.5">{parts.join(" in ")}</p>;
  }
  return null;
}

// ─── Exercise row with N/A toggle ─────────────────────────────────────────────

function ExerciseRow({
  label,
  value,
  showWeight = true,
  isNA,
  onChange,
  onToggleNA,
}: {
  label: string;
  value: ExerciseSet;
  showWeight?: boolean;
  isNA: boolean;
  onChange: (v: ExerciseSet) => void;
  onToggleNA: () => void;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-semibold text-slate-600">{label}</p>
        <button
          type="button"
          onClick={onToggleNA}
          className={`text-xs px-2.5 py-0.5 rounded-lg font-bold border transition-all ${
            isNA
              ? "bg-slate-300 text-slate-600 border-slate-400"
              : "bg-white text-slate-400 border-slate-200 hover:bg-slate-100"
          }`}
        >
          N/A
        </button>
      </div>
      {isNA ? (
        <p className="text-xs text-slate-300 italic pl-1 py-1">Skipped / not done this session</p>
      ) : (
        <div className={`grid gap-2 ${showWeight ? "grid-cols-3" : "grid-cols-2"}`}>
          {showWeight && (
            <div>
              <label className="label">Weight (kg)</label>
              <input
                type="number" min={0}
                value={value.weight || ""}
                onChange={(e) => onChange({ ...value, weight: Number(e.target.value) })}
                onFocus={(e) => e.target.select()}
                className="input text-sm" placeholder="0"
              />
            </div>
          )}
          <div>
            <label className="label">Reps</label>
            <input
              type="number" min={0}
              value={value.reps || ""}
              onChange={(e) => onChange({ ...value, reps: Number(e.target.value) })}
              onFocus={(e) => e.target.select()}
              className="input text-sm" placeholder="0"
            />
          </div>
          <div>
            <label className="label">Sets</label>
            <input
              type="number" min={0}
              value={value.sets || ""}
              onChange={(e) => onChange({ ...value, sets: Number(e.target.value) })}
              onFocus={(e) => e.target.select()}
              className="input text-sm" placeholder="0"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GymTracker() {
  const [sessions, setSessions] = useState<GymSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [useLocal, setUseLocal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all");

  // Form state
  const [formDate, setFormDate] = useState(todayStr());
  const [formType, setFormType] = useState<WorkoutType>("Pilates");
  const [formNotes, setFormNotes] = useState("");
  const [details, setDetails] = useState<GymDetails>(emptyDetails());
  const [naExercises, setNaExercises] = useState<Set<string>>(new Set());

  async function fetchSessions() {
    setLoading(true);
    if (!SUPABASE_ENABLED) {
      setUseLocal(true);
      setSessions(lsLoad());
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("gym_sessions")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      setSessions((data as GymSession[]) ?? []);
      setUseLocal(false);
    } catch {
      setUseLocal(true);
      setSessions(lsLoad());
    }
    setLoading(false);
  }

  useEffect(() => { fetchSessions(); }, []);

  function toggleNA(key: string) {
    setNaExercises((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
        setDetails((d) => {
          const copy = { ...d };
          delete copy[key as keyof GymDetails];
          return copy;
        });
      }
      return next;
    });
  }

  function openAddForm() {
    setEditId(null);
    setFormDate(todayStr());
    setFormType("Pilates");
    setFormNotes("");
    setDetails(emptyDetails());
    setNaExercises(new Set());
    setShowForm(true);
  }

  function openEditForm(session: GymSession) {
    setEditId(session.id);
    setFormDate(session.date);
    setFormType(session.type);
    setFormNotes(session.notes ?? "");
    setDetails(session.details ?? emptyDetails());
    const na = new Set<string>();
    if (session.type === "Legs") {
      if (!session.details?.squats) na.add("squats");
      if (!session.details?.rdls) na.add("rdls");
      if (!session.details?.hipThrusts) na.add("hipThrusts");
    }
    if (session.type === "Upper Body" && !session.details?.pullUps) na.add("pullUps");
    setNaExercises(na);
    setShowForm(true);
  }

  function cancelForm() { setShowForm(false); setEditId(null); }

  function handleTypeChange(t: WorkoutType) {
    setFormType(t);
    setDetails(emptyDetails());
    setNaExercises(new Set());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { date: formDate, type: formType, notes: formNotes, details };
    try {
      if (editId) {
        const { error } = await supabase.from("gym_sessions").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("gym_sessions").insert({ id: crypto.randomUUID(), ...payload });
        if (error) throw error;
      }
      setUseLocal(false);
    } catch {
      setUseLocal(true);
      const current = lsLoad();
      if (editId) {
        const updated = current.map((s) =>
          s.id === editId ? { ...s, ...payload } : s
        );
        lsSave(updated);
        setSessions(updated.sort((a, b) => b.date.localeCompare(a.date)));
      } else {
        const newSession: GymSession = { id: crypto.randomUUID(), ...payload };
        const updated = [newSession, ...current].sort((a, b) => b.date.localeCompare(a.date));
        lsSave(updated);
        setSessions(updated);
      }
      setShowForm(false);
      setEditId(null);
      return;
    }
    setShowForm(false);
    setEditId(null);
    fetchSessions();
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase.from("gym_sessions").delete().eq("id", id);
      if (error) throw error;
      setUseLocal(false);
    } catch {
      setUseLocal(true);
      const updated = lsLoad().filter((s) => s.id !== id);
      lsSave(updated);
      setSessions(updated);
      return;
    }
    fetchSessions();
  }

  if (loading) return <div className="card animate-pulse h-40" />;

  const cutoff = cutoffDate(timePeriod);
  const filteredSessions = cutoff ? sessions.filter((s) => s.date >= cutoff) : sessions;
  const latest = filteredSessions[0];
  const history = filteredSessions.slice(1);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="section-title">🍑 Butler&apos;s Booty Tracker</h2>
          {useLocal && (
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2 py-0.5">
              local only
            </span>
          )}
        </div>
        <button className="btn-primary text-xs py-1.5 px-3" onClick={openAddForm}>
          + Log Session
        </button>
      </div>

      {/* Log / Edit form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="border border-slate-100 rounded-2xl p-4 mb-4 space-y-3 bg-slate-50/50"
        >
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" value={formDate}
              onChange={(e) => setFormDate(e.target.value)} required />
          </div>

          <div>
            <label className="label">Workout type</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {WORKOUT_TYPES.map((t) => (
                <button key={t} type="button" onClick={() => handleTypeChange(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    formType === t
                      ? "bg-blue-600 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:border-blue-300"
                  }`}>
                  {WORKOUT_EMOJI[t]} {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <input className="input" type="text" value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="e.g. Felt strong today, skipped abs" />
          </div>

          {/* Legs */}
          {formType === "Legs" && (
            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                Exercise details — tap N/A for anything you skipped
              </p>
              <ExerciseRow label="Squats"
                value={details.squats ?? emptySet(true)}
                isNA={naExercises.has("squats")}
                onToggleNA={() => toggleNA("squats")}
                onChange={(v) => setDetails((d) => ({ ...d, squats: v }))}
              />
              <ExerciseRow label="RDLs"
                value={details.rdls ?? emptySet(true)}
                isNA={naExercises.has("rdls")}
                onToggleNA={() => toggleNA("rdls")}
                onChange={(v) => setDetails((d) => ({ ...d, rdls: v }))}
              />
              <ExerciseRow label="Hip Thrusts"
                value={details.hipThrusts ?? emptySet(true)}
                isNA={naExercises.has("hipThrusts")}
                onToggleNA={() => toggleNA("hipThrusts")}
                onChange={(v) => setDetails((d) => ({ ...d, hipThrusts: v }))}
              />
            </div>
          )}

          {/* Upper Body */}
          {formType === "Upper Body" && (
            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                Exercise details — tap N/A if skipped
              </p>
              <ExerciseRow label="Pull Ups"
                value={details.pullUps ?? emptySet(false)}
                showWeight={false}
                isNA={naExercises.has("pullUps")}
                onToggleNA={() => toggleNA("pullUps")}
                onChange={(v) => setDetails((d) => ({ ...d, pullUps: v }))}
              />
            </div>
          )}

          {/* Stairmaster */}
          {formType === "Stairmaster" && (
            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                Session details
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Flights of stairs</label>
                  <input type="number" min={0} value={details.flights ?? ""}
                    onChange={(e) => setDetails((d) => ({ ...d, flights: Number(e.target.value) }))}
                    className="input text-sm" placeholder="0" />
                </div>
                <div>
                  <label className="label">Time (minutes)</label>
                  <input type="number" min={0} value={details.minutes ?? ""}
                    onChange={(e) => setDetails((d) => ({ ...d, minutes: Number(e.target.value) }))}
                    className="input text-sm" placeholder="0" />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1">
              {editId ? "Save Changes" : "Log Session"}
            </button>
            <button type="button" onClick={cancelForm}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Latest session */}
      {latest ? (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-4">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">Last workout</p>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{WORKOUT_EMOJI[latest.type]}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">{latest.type}</p>
                  <p className="text-xs text-slate-500">{latest.date}</p>
                  <DetailSummary type={latest.type} details={latest.details} />
                </div>
              </div>
              {latest.notes && (
                <p className="text-xs text-slate-500 mt-2 italic">&ldquo;{latest.notes}&rdquo;</p>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0 ml-3">
              <button onClick={() => openEditForm(latest)}
                className="text-xs text-emerald-700 border border-emerald-200 rounded-xl px-3 py-1.5 hover:bg-emerald-100 transition-colors">
                Edit
              </button>
              <button onClick={() => handleDelete(latest.id)}
                className="text-xs text-slate-300 hover:text-red-400 border border-slate-100 hover:border-red-200 rounded-xl px-3 py-1.5 transition-colors">
                ✕
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-2xl p-4 mb-4 text-center">
          <p className="text-slate-400 text-sm">No sessions logged yet 💤</p>
        </div>
      )}

      {/* Time period filter */}
      <div className="mb-3">
        <label className="label">History period</label>
        <select value={timePeriod} onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
          className="input text-sm">
          {TIME_PERIOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <button onClick={() => setShowHistory((v) => !v)} className="text-xs text-blue-600 font-semibold">
            {showHistory ? "▾ Hide history" : `▸ View ${history.length} previous session${history.length !== 1 ? "s" : ""}`}
          </button>
          {showHistory && (
            <div className="mt-3 divide-y divide-slate-50">
              {history.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="text-lg flex-shrink-0">{WORKOUT_EMOJI[s.type]}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700">{s.type}</p>
                      <p className="text-xs text-slate-400">{s.date}</p>
                      <DetailSummary type={s.type} details={s.details} />
                      {s.notes && <p className="text-xs text-slate-400 italic mt-0.5">&ldquo;{s.notes}&rdquo;</p>}
                    </div>
                  </div>
                  <div className="flex gap-3 flex-shrink-0 ml-3">
                    <button onClick={() => openEditForm(s)}
                      className="text-xs text-slate-400 hover:text-slate-700 transition-colors">Edit</button>
                    <button onClick={() => handleDelete(s.id)}
                      className="text-slate-200 hover:text-red-400 transition-colors text-sm">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {filteredSessions.length === 0 && (
        <p className="text-xs text-slate-400 text-center py-2">No sessions in this period.</p>
      )}
    </div>
  );
}
