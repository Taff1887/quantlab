"use client";

import { useEffect, useState } from "react";
import { supabase, SUPABASE_ENABLED } from "../lib/supabase";
import type { GymSession, WorkoutType, GymDetails, FreeExercise } from "../types";

const LS_KEY = "gym_sessions_local";

const WORKOUT_TYPES: WorkoutType[] = ["Legs", "Upper Body", "Run", "Stairmaster"];

const WORKOUT_EMOJI: Record<WorkoutType, string> = {
  Legs: "🦵", "Upper Body": "💪", Run: "🏃‍♀️", Stairmaster: "🪜",
};

// Workout types that get the free-form exercise list
const EXERCISE_TYPES: WorkoutType[] = ["Legs", "Upper Body"];
function showsExercises(type: WorkoutType) { return EXERCISE_TYPES.includes(type); }

type TimePeriod = "all" | "2w" | "1m" | "3m";

const TIME_PERIOD_OPTIONS: { label: string; value: TimePeriod }[] = [
  { label: "All time", value: "all" },
  { label: "Last 2 weeks", value: "2w" },
  { label: "Last month", value: "1m" },
  { label: "Last 3 months", value: "3m" },
];

function todayStr() { return new Date().toISOString().split("T")[0]; }

/** Format YYYY-MM-DD → "Friday 20 March 2026" */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-AU", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function cutoffDate(period: TimePeriod): string | null {
  if (period === "all") return null;
  const d = new Date();
  if (period === "2w") d.setDate(d.getDate() - 14);
  if (period === "1m") d.setMonth(d.getMonth() - 1);
  if (period === "3m") d.setMonth(d.getMonth() - 3);
  return d.toISOString().split("T")[0];
}

function defaultExercises(): FreeExercise[] {
  return [{ name: "", weight: 0, reps: 0, sets: 0 }];
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

function lsLoad(): GymSession[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as GymSession[]).sort((a, b) => b.date.localeCompare(a.date));
  } catch { return []; }
}

function lsSave(sessions: GymSession[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(sessions)); } catch {}
}

// ─── Detail summary — one exercise per line ───────────────────────────────────

function DetailSummary({ type, details }: { type: WorkoutType; details?: GymDetails }) {
  if (!details) return null;

  if (type === "Stairmaster") {
    const parts = [
      details.flights ? `${details.flights} flights` : null,
      details.minutes ? `${details.minutes} min` : null,
    ].filter(Boolean);
    if (!parts.length) return null;
    return <p className="text-xs text-slate-400 mt-0.5">{parts.join(" in ")}</p>;
  }

  if (type === "Run") {
    const parts = [
      details.distance ? `${details.distance}km` : null,
      details.runTime ? `${details.runTime} min` : null,
    ].filter(Boolean);
    if (!parts.length) return null;
    return <p className="text-xs text-slate-400 mt-0.5">{parts.join(" · ")}</p>;
  }

  const exercises = details.exercises?.filter((e) => !e.na && e.name?.trim());
  if (!exercises?.length) return null;

  return (
    <div className="mt-1 space-y-0.5">
      {exercises.map((ex, i) => {
        const parts = [
          ex.weight ? `${ex.weight}kg` : null,
          ex.reps ? `${ex.reps} reps` : null,
          ex.sets ? `${ex.sets} sets` : null,
        ].filter(Boolean);
        return (
          <p key={i} className="text-xs text-slate-400">
            {ex.name}{parts.length ? `: ${parts.join(" × ")}` : ""}
          </p>
        );
      })}
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
  const [formType, setFormType] = useState<WorkoutType>("Legs");
  const [formNotes, setFormNotes] = useState("");
  const [exerciseList, setExerciseList] = useState<FreeExercise[]>(defaultExercises());
  const [formFlights, setFormFlights] = useState(0);
  const [formMinutes, setFormMinutes] = useState(0);
  const [formDistance, setFormDistance] = useState(0);
  const [formRunTime, setFormRunTime] = useState(0);

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

  // ── Exercise list helpers ─────────────────────────────────────────────────

  function updateExercise(idx: number, patch: Partial<FreeExercise>) {
    setExerciseList((prev) => prev.map((e, i) => i === idx ? { ...e, ...patch } : e));
  }

  function removeExercise(idx: number) {
    setExerciseList((prev) => prev.filter((_, i) => i !== idx));
  }

  function addExercise() {
    setExerciseList((prev) => [...prev, { name: "", weight: 0, reps: 0, sets: 0 }]);
  }

  // ── Form open / close ─────────────────────────────────────────────────────

  function openAddForm() {
    setEditId(null);
    setFormDate(todayStr());
    setFormType("Legs");
    setFormNotes("");
    setExerciseList(defaultExercises());
    setFormFlights(0);
    setFormMinutes(0);
    setFormDistance(0);
    setFormRunTime(0);
    setShowForm(true);
  }

  function openEditForm(session: GymSession) {
    setEditId(session.id);
    setFormDate(session.date);
    setFormType(session.type);
    setFormNotes(session.notes ?? "");

    if (session.type === "Stairmaster") {
      setFormFlights(session.details?.flights ?? 0);
      setFormMinutes(session.details?.minutes ?? 0);
      setFormDistance(0);
      setFormRunTime(0);
      setExerciseList(defaultExercises());
    } else if (session.type === "Run") {
      setFormDistance(session.details?.distance ?? 0);
      setFormRunTime(session.details?.runTime ?? 0);
      setFormFlights(0);
      setFormMinutes(0);
      setExerciseList(defaultExercises());
    } else if (showsExercises(session.type)) {
      const exs = session.details?.exercises;
      setExerciseList(exs?.length ? exs : defaultExercises());
      setFormFlights(0);
      setFormMinutes(0);
      setFormDistance(0);
      setFormRunTime(0);
    } else {
      setExerciseList(defaultExercises());
      setFormFlights(0);
      setFormMinutes(0);
      setFormDistance(0);
      setFormRunTime(0);
    }
    setShowForm(true);
  }

  function cancelForm() { setShowForm(false); setEditId(null); }

  function handleTypeChange(t: WorkoutType) {
    setFormType(t);
    setExerciseList(defaultExercises());
    setFormFlights(0);
    setFormMinutes(0);
    setFormDistance(0);
    setFormRunTime(0);
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    let details: GymDetails = {};
    if (formType === "Stairmaster") {
      details = { flights: formFlights || undefined, minutes: formMinutes || undefined };
    } else if (formType === "Run") {
      details = { distance: formDistance || undefined, runTime: formRunTime || undefined };
    } else if (showsExercises(formType)) {
      const filled = exerciseList.filter((ex) => ex.name.trim() || ex.na);
      if (filled.length) details = { exercises: filled };
    }

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
        const updated = current.map((s) => s.id === editId ? { ...s, ...payload } : s);
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
      {/* Blue header */}
      <div className="bg-gradient-to-r from-sky-400 to-blue-500 -mx-5 -mt-5 px-5 pt-4 pb-3 mb-4 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🍑</span>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wide">Butler&apos;s Booty Tracker</p>
              {useLocal && <p className="text-[10px] text-sky-200">local only</p>}
            </div>
          </div>
          <button
            className="text-xs font-semibold bg-white/20 text-white px-3 py-1.5 rounded-full hover:bg-white/30 transition-colors"
            onClick={openAddForm}
          >
            + Log Session
          </button>
        </div>
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
              placeholder="e.g. Felt strong today, heavy session" />
          </div>

          {/* Free-form exercise list */}
          {showsExercises(formType) && (
            <div className="border-t border-slate-100 pt-3">
              <div className="space-y-3">
                {exerciseList.map((ex, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        className="input flex-1 text-sm font-medium"
                        placeholder="Exercise name (e.g. Squats)"
                        value={ex.name}
                        onChange={(e) => updateExercise(idx, { name: e.target.value })}
                      />
                      {exerciseList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeExercise(idx)}
                          className="text-slate-300 hover:text-red-400 transition-colors text-sm flex-shrink-0"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="label">Weight (kg)</label>
                        <input type="number" min={0} value={ex.weight || ""} placeholder="0"
                          onChange={(e) => updateExercise(idx, { weight: Number(e.target.value) })}
                          onFocus={(e) => e.target.select()}
                          className="input text-sm" />
                      </div>
                      <div>
                        <label className="label">Reps</label>
                        <input type="number" min={0} value={ex.reps || ""} placeholder="0"
                          onChange={(e) => updateExercise(idx, { reps: Number(e.target.value) })}
                          onFocus={(e) => e.target.select()}
                          className="input text-sm" />
                      </div>
                      <div>
                        <label className="label">Sets</label>
                        <input type="number" min={0} value={ex.sets || ""} placeholder="0"
                          onChange={(e) => updateExercise(idx, { sets: Number(e.target.value) })}
                          onFocus={(e) => e.target.select()}
                          className="input text-sm" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addExercise}
                className="text-xs text-blue-600 font-semibold mt-3"
              >
                + Add exercise
              </button>
            </div>
          )}

          {/* Stairmaster */}
          {formType === "Stairmaster" && (
            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Session details</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Flights of stairs</label>
                  <input type="number" min={0} value={formFlights || ""}
                    onChange={(e) => setFormFlights(Number(e.target.value))}
                    className="input text-sm" placeholder="0" />
                </div>
                <div>
                  <label className="label">Time (minutes)</label>
                  <input type="number" min={0} value={formMinutes || ""}
                    onChange={(e) => setFormMinutes(Number(e.target.value))}
                    className="input text-sm" placeholder="0" />
                </div>
              </div>
            </div>
          )}

          {/* Run */}
          {formType === "Run" && (
            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Session details</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Distance (km)</label>
                  <input type="number" min={0} step={0.1} value={formDistance || ""}
                    onChange={(e) => setFormDistance(Number(e.target.value))}
                    className="input text-sm" placeholder="0" />
                </div>
                <div>
                  <label className="label">Time (minutes)</label>
                  <input type="number" min={0} value={formRunTime || ""}
                    onChange={(e) => setFormRunTime(Number(e.target.value))}
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
              <div className="flex items-start gap-3">
                <span className="text-3xl flex-shrink-0">{WORKOUT_EMOJI[latest.type]}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">{latest.type}</p>
                  <p className="text-xs text-slate-500">{formatDate(latest.date)}</p>
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
                <div key={s.id} className="flex items-start justify-between py-2.5">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <span className="text-lg flex-shrink-0 mt-0.5">{WORKOUT_EMOJI[s.type]}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700">{s.type}</p>
                      <p className="text-xs text-slate-400">{formatDate(s.date)}</p>
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
