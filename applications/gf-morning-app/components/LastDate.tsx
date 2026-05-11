"use client";
import { useEffect, useState } from "react";
import type { DateNight } from "@/types";
import { getItem, setItem } from "@/lib/storage";

const STORAGE_KEY = "mcc_date_nights";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr + "T00:00:00").getTime();
  return Math.floor(diff / 86_400_000);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function LastDate() {
  const [dates, setDates] = useState<DateNight[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [form, setForm] = useState({ date: todayStr(), note: "" });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setDates(getItem<DateNight[]>(STORAGE_KEY, []));
    setHydrated(true);
  }, []);

  function save(updated: DateNight[]) {
    const sorted = [...updated].sort((a, b) => b.date.localeCompare(a.date));
    setDates(sorted);
    setItem(STORAGE_KEY, sorted);
  }

  function handleAdd() {
    if (!form.date) return;
    save([
      ...dates,
      {
        id: Date.now().toString(),
        date: form.date,
        note: form.note.trim(),
        createdAt: new Date().toISOString(),
      },
    ]);
    setForm({ date: todayStr(), note: "" });
    setShowForm(false);
  }

  function handleDelete(id: string) {
    save(dates.filter((d) => d.id !== id));
  }

  if (!hydrated) return <div className="card animate-pulse h-36" />;

  const latest = dates[0];
  const ago = latest ? daysSince(latest.date) : null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">💑 Date Night</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs font-semibold text-blue-600"
        >
          {showForm ? "Cancel" : "+ Add date"}
        </button>
      </div>

      {/* Latest date display */}
      {latest ? (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-rose-400 uppercase tracking-wide mb-1">
                Last date night
              </p>
              <p className="text-sm font-semibold text-slate-800">
                {formatDate(latest.date)}
              </p>
              {latest.note && (
                <p className="text-xs text-slate-500 mt-1 italic">"{latest.note}"</p>
              )}
            </div>
            <div className="text-right flex-shrink-0 ml-3">
              <p className="text-3xl font-bold text-rose-500 leading-none">
                {ago === 0 ? "🎉" : ago}
              </p>
              {ago !== 0 && (
                <p className="text-xs text-slate-400 mt-0.5">
                  day{ago !== 1 ? "s" : ""} ago
                </p>
              )}
              {ago === 0 && <p className="text-xs text-rose-400 mt-0.5">Today!</p>}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-2xl p-4 mb-4 text-center">
          <p className="text-slate-400 text-sm">No date nights logged yet 🌹</p>
          <p className="text-xs text-slate-300 mt-1">Add your first one below</p>
        </div>
      )}

      {/* Add form */}
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
            <label className="label">What did you do? (optional)</label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="e.g. dinner at Aria, beach walk, movie night"
              className="input"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <button onClick={handleAdd} className="btn-primary w-full">
            Save Date Night
          </button>
        </div>
      )}

      {/* History */}
      {dates.length > 1 && (
        <div>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showHistory ? "▾" : "▸"} {dates.length - 1} previous date
            {dates.length > 2 ? "s" : ""}
          </button>

          {showHistory && (
            <div className="mt-3 divide-y divide-slate-50">
              {dates.slice(1).map((d) => (
                <div
                  key={d.id}
                  className="flex items-start justify-between py-2.5 group"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {formatDate(d.date)}
                    </p>
                    {d.note && (
                      <p className="text-xs text-slate-400 italic mt-0.5">"{d.note}"</p>
                    )}
                    <p className="text-xs text-slate-300 mt-0.5">{daysSince(d.date)} days ago</p>
                  </div>
                  <button
                    onClick={() => handleDelete(d.id)}
                    className="text-slate-200 hover:text-red-400 transition-colors text-sm opacity-0 group-hover:opacity-100 flex-shrink-0 ml-3"
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
