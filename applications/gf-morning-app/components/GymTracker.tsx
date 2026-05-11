"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { GymSession, WorkoutType } from "../types";

const WORKOUT_TYPES: WorkoutType[] = [
  "Pilates",
  "Legs",
  "Upper Body",
  "Run",
  "Stairmaster",
  "Walk",
  "Class",
  "Other",
];

const WORKOUT_EMOJI: Record<WorkoutType, string> = {
  Pilates: "🧘‍♀️",
  Legs: "🦵",
  "Upper Body": "💪",
  Run: "🏃‍♀️",
  Stairmaster: "🪜",
  Walk: "🚶‍♀️",
  Class: "🎯",
  Other: "⭐",
};

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function GymTracker() {
  const [sessions, setSessions] = useState<GymSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [formDate, setFormDate] = useState(todayStr());
  const [formType, setFormType] = useState<WorkoutType>("Pilates");
  const [formNotes, setFormNotes] = useState("");

  async function fetchSessions() {
    setLoading(true);
    const { data } = await supabase
      .from("gym_sessions")
      .select("*")
      .order("date", { ascending: false });
    setSessions((data as GymSession[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchSessions();
  }, []);

  function openAddForm() {
    setEditId(null);
    setFormDate(todayStr());
    setFormType("Pilates");
    setFormNotes("");
    setShowForm(true);
  }

  function openEditForm(session: GymSession) {
    setEditId(session.id);
    setFormDate(session.date);
    setFormType(session.type);
    setFormNotes(session.notes ?? "");
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { date: formDate, type: formType, notes: formNotes };
    if (editId) {
      await supabase.from("gym_sessions").update(payload).eq("id", editId);
    } else {
      const id = crypto.randomUUID();
      await supabase.from("gym_sessions").insert({ id, ...payload });
    }
    setShowForm(false);
    setEditId(null);
    fetchSessions();
  }

  async function handleDelete(id: string) {
    await supabase.from("gym_sessions").delete().eq("id", id);
    fetchSessions();
  }

  if (loading) {
    return <div className="card animate-pulse h-36" />;
  }

  const latest = sessions[0];
  const history = sessions.slice(1);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Gym Tracker 🏋️‍♀️</h2>
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
            <input
              className="input"
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Workout type</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {WORKOUT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFormType(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    formType === t
                      ? "bg-blue-600 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:border-blue-300"
                  }`}
                >
                  {WORKOUT_EMOJI[t]} {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <input
              className="input"
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="e.g. Felt strong today, skipped abs"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1">
              {editId ? "Save Changes" : "Log Session"}
            </button>
            <button
              type="button"
              onClick={cancelForm}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Last session card */}
      {latest ? (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">
                Last workout
              </p>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{WORKOUT_EMOJI[latest.type]}</span>
                <div>
                  <p className="font-semibold text-slate-800">{latest.type}</p>
                  <p className="text-xs text-slate-500">{latest.date}</p>
                </div>
              </div>
              {latest.notes && (
                <p className="text-xs text-slate-500 mt-2 italic">"{latest.notes}"</p>
              )}
            </div>
            <button
              onClick={() => openEditForm(latest)}
              className="text-xs text-emerald-700 border border-emerald-200 rounded-xl px-3 py-1.5 hover:bg-emerald-100 transition-colors flex-shrink-0"
            >
              Edit
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-2xl p-4 mb-4 text-center">
          <p className="text-slate-400 text-sm">No sessions logged yet 💤</p>
        </div>
      )}

      {/* History toggle */}
      {history.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="text-xs text-blue-600 font-semibold"
          >
            {showHistory
              ? "▾ Hide history"
              : `▸ View all ${history.length} previous session${history.length !== 1 ? "s" : ""}`}
          </button>

          {showHistory && (
            <div className="mt-3 divide-y divide-slate-50">
              {history.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{WORKOUT_EMOJI[s.type]}</span>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{s.type}</p>
                      <p className="text-xs text-slate-400">{s.date}</p>
                      {s.notes && (
                        <p className="text-xs text-slate-400 italic">"{s.notes}"</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3 flex-shrink-0">
                    <button
                      onClick={() => openEditForm(s)}
                      className="text-xs text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-slate-200 hover:text-red-400 transition-colors text-sm"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
