"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { DateNight } from "../types";

const LS_KEY = "date_nights_local";

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

function rowToDateNight(row: Record<string, unknown>): DateNight {
  return {
    id: row.id as string,
    date: row.date as string,
    note: (row.note as string) ?? "",
    createdAt: (row.created_at as string) ?? (row.createdAt as string) ?? "",
  };
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

function lsLoad(): DateNight[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DateNight[];
    return parsed.sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

function lsSave(dates: DateNight[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(dates));
  } catch {
    /* ignore */
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LastDate() {
  const [dates, setDates] = useState<DateNight[]>([]);
  const [loading, setLoading] = useState(true);
  const [useLocal, setUseLocal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [formDate, setFormDate] = useState(todayStr());
  const [formNote, setFormNote] = useState("");

  async function fetchDates() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("date_nights")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      setDates(((data ?? []) as Record<string, unknown>[]).map(rowToDateNight));
      setUseLocal(false);
    } catch {
      setUseLocal(true);
      setDates(lsLoad());
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchDates();
  }, []);

  function openAddForm() {
    setEditId(null);
    setFormDate(todayStr());
    setFormNote("");
    setShowForm(true);
  }

  function openEditForm(d: DateNight) {
    setEditId(d.id);
    setFormDate(d.date);
    setFormNote(d.note ?? "");
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formDate) return;

    if (useLocal) {
      const current = lsLoad();
      if (editId) {
        const updated = current.map((d) =>
          d.id === editId ? { ...d, date: formDate, note: formNote.trim() } : d
        );
        lsSave(updated);
        setDates(updated.sort((a, b) => b.date.localeCompare(a.date)));
      } else {
        const newEntry: DateNight = {
          id: crypto.randomUUID(),
          date: formDate,
          note: formNote.trim(),
          createdAt: new Date().toISOString(),
        };
        const updated = [newEntry, ...current].sort((a, b) => b.date.localeCompare(a.date));
        lsSave(updated);
        setDates(updated);
      }
      setShowForm(false);
      setEditId(null);
      return;
    }

    try {
      if (editId) {
        const { error } = await supabase
          .from("date_nights")
          .update({ date: formDate, note: formNote.trim() })
          .eq("id", editId);
        if (error) throw error;
      } else {
        const id = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        const { error } = await supabase.from("date_nights").insert({
          id,
          date: formDate,
          note: formNote.trim(),
          created_at: createdAt,
        });
        if (error) throw error;
      }
    } catch {
      // Fall back to localStorage on error
      setUseLocal(true);
      const current = lsLoad();
      if (editId) {
        const updated = current.map((d) =>
          d.id === editId ? { ...d, date: formDate, note: formNote.trim() } : d
        );
        lsSave(updated);
        setDates(updated.sort((a, b) => b.date.localeCompare(a.date)));
      } else {
        const newEntry: DateNight = {
          id: crypto.randomUUID(),
          date: formDate,
          note: formNote.trim(),
          createdAt: new Date().toISOString(),
        };
        const updated = [newEntry, ...current].sort((a, b) => b.date.localeCompare(a.date));
        lsSave(updated);
        setDates(updated);
      }
      setShowForm(false);
      setEditId(null);
      return;
    }
    setShowForm(false);
    setEditId(null);
    fetchDates();
  }

  async function handleDelete(id: string) {
    if (useLocal) {
      const updated = lsLoad().filter((d) => d.id !== id);
      lsSave(updated);
      setDates(updated);
      return;
    }
    try {
      const { error } = await supabase.from("date_nights").delete().eq("id", id);
      if (error) throw error;
    } catch {
      setUseLocal(true);
      const updated = lsLoad().filter((d) => d.id !== id);
      lsSave(updated);
      setDates(updated);
      return;
    }
    fetchDates();
  }

  if (loading) {
    return <div className="card animate-pulse h-36" />;
  }

  const latest = dates[0];
  const ago = latest ? daysSince(latest.date) : null;
  const history = dates.slice(1);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="section-title">💑 Date Night</h2>
          {useLocal && (
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2 py-0.5">
              local only
            </span>
          )}
        </div>
        <button
          onClick={showForm ? cancelForm : openAddForm}
          className="text-xs font-semibold text-blue-600"
        >
          {showForm ? "Cancel" : "+ Add date"}
        </button>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="border border-slate-100 rounded-2xl p-4 mb-4 space-y-3 bg-slate-50/50"
        >
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">What did you do? (optional)</label>
            <input
              type="text"
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder="e.g. dinner at Aria, beach walk, movie night"
              className="input"
            />
          </div>
          <button type="submit" className="btn-primary w-full">
            {editId ? "Save Changes" : "Save Date Night"}
          </button>
        </form>
      )}

      {/* Latest date card */}
      {latest ? (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 mb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-rose-400 uppercase tracking-wide mb-1">
                Last date night
              </p>
              <p className="text-sm font-semibold text-slate-800">
                {formatDate(latest.date)}
              </p>
              {latest.note && (
                <p className="text-xs text-slate-500 mt-1 italic">
                  &ldquo;{latest.note}&rdquo;
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 ml-3 flex-shrink-0">
              <div className="text-right">
                <p className="text-3xl font-bold text-rose-500 leading-none">
                  {ago === 0 ? "🎉" : ago}
                </p>
                {ago !== 0 && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    day{ago !== 1 ? "s" : ""} ago
                  </p>
                )}
                {ago === 0 && (
                  <p className="text-xs text-rose-400 mt-0.5">Today!</p>
                )}
              </div>
              <button
                onClick={() => openEditForm(latest)}
                className="text-xs text-rose-600 border border-rose-200 rounded-xl px-2.5 py-1 hover:bg-rose-100 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(latest.id)}
                className="text-xs text-slate-300 hover:text-red-400 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-2xl p-4 mb-4 text-center">
          <p className="text-slate-400 text-sm">No date nights logged yet 🌹</p>
          <p className="text-xs text-slate-300 mt-1">Add your first one above</p>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showHistory ? "▾" : "▸"} {history.length} previous date
            {history.length !== 1 ? "s" : ""}
          </button>

          {showHistory && (
            <div className="mt-3 divide-y divide-slate-50">
              {history.map((d) => (
                <div
                  key={d.id}
                  className="flex items-start justify-between py-2.5 group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">
                      {formatDate(d.date)}
                    </p>
                    {d.note && (
                      <p className="text-xs text-slate-400 italic mt-0.5">
                        &ldquo;{d.note}&rdquo;
                      </p>
                    )}
                    <p className="text-xs text-slate-300 mt-0.5">
                      {daysSince(d.date)} days ago
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    <button
                      onClick={() => openEditForm(d)}
                      className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(d.id)}
                      className="text-slate-300 hover:text-red-400 transition-colors text-sm"
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
