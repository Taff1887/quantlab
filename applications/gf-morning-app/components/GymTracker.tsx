"use client";
import { useEffect, useState } from "react";
import type { GymSession, WorkoutType } from "@/types";
import { getItem, setItem } from "@/lib/storage";

const STORAGE_KEY = "mcc_gym_sessions";

const WORKOUT_TYPES: WorkoutType[] = [
  "Pilates", "Weights", "Cardio", "Walk", "Class", "Other",
];

const WORKOUT_EMOJI: Record<WorkoutType, string> = {
  Pilates: "🧘‍♀️",
  Weights: "🏋️‍♀️",
  Cardio: "🏃‍♀️",
  Walk: "🚶‍♀️",
  Class: "🎯",
  Other: "💪",
};

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function daysSince(dateStr: string) {
  return Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 86_400_000
  );
}

export default function GymTracker() {
  const [sessions, setSessions] = useState<GymSession[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [form, setForm] = useState({
    date: todayStr(),
    type: "Pilates" as WorkoutType,
    notes: "",
  });

  useEffect(() => {
    setSessions(getItem<GymSession[]>(STORAGE_KEY, []));
  }, []);

  function save(updated: GymSession[]) {
    setSessions(updated);
    setItem(STORAGE_KEY, updated);
  }

  function handleAdd() {
    if (!form.date) return;
    save([
      {
        id: Date.now().toString(),
        date: form.date,
        type: form.type,
        notes: form.notes.trim(),
      },
      ...sessions,
    ]);
    setForm({ date: todayStr(), type: "Pilates", notes: "" });
    setShowForm(false);
  }

  function handleDelete(id: string) {
    save(sessions.filter((s) => s.id !== id));
  }

  const last = sessions[0];
  const daysAgo = last ? daysSince(last.date) : null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Gym Tracker</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn-primary text-xs py-1.5 px-3"
        >
          {showForm ? "Cancel" : "+ Log Session"}
        </button>
      </div>

      {/* Last session summary */}
      {last ? (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-4">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">
            Last workout
          </p>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{WORKOUT_EMOJI[last.type]}</span>
            <div>
              <p className="font-semibold text-slate-800">{last.type}</p>
              <p className="text-xs text-slate-500">
                {new Date(last.date).toLocaleDateString("en-AU", {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                })}
                {" · "}
                {daysAgo === 0
                  ? "Today"
                  : daysAgo === 1
                  ? "Yesterday"
                  : `${daysAgo} days ago`}
              </p>
            </div>
          </div>
          {last.notes && (
            <p className="text-xs text-slate-500 mt-2 italic">"{last.notes}"</p>
          )}
        </div>
      ) : (
        <div className="bg-slate-50 rounded-2xl p-4 mb-4 text-center">
          <p className="text-slate-400 text-sm">No sessions logged yet 💤</p>
        </div>
      )}

      {/* Log form */}
      {showForm && (
        <div className="border border-slate-100 rounded-2xl p-4 mb-4 space-y-3 bg-slate-50/50">
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Workout type</label>
            <div className="flex flex-wrap gap-2">
              {WORKOUT_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setForm({ ...form, type: t })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    form.type === t
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
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="e.g. Felt strong today, skipped abs"
              className="input"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <button onClick={handleAdd} className="btn-primary w-full">
            Save Session
          </button>
        </div>
      )}

      {/* History toggle */}
      {sessions.length > 1 && (
        <div>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="text-xs text-blue-600 font-semibold"
          >
            {showHistory ? "▾ Hide history" : `▸ View all ${sessions.length} sessions`}
          </button>

          {showHistory && (
            <div className="mt-3 divide-y divide-slate-50">
              {sessions.slice(1).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{WORKOUT_EMOJI[s.type]}</span>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{s.type}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(s.date).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-slate-200 hover:text-red-400 transition-colors text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
