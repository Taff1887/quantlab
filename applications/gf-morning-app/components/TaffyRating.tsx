"use client";

import { useEffect, useState } from "react";
import { supabase, SUPABASE_ENABLED } from "../lib/supabase";

const LS_KEY = "taffy_ratings_local";

interface RatingRow {
  id: string;
  date: string;
  rating: number;
  feedback: string;
  createdAt: string;
}

function todayStr() { return new Date().toISOString().split("T")[0]; }

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-AU", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function mapRow(row: Record<string, unknown>): RatingRow {
  return {
    id:        row.id as string,
    date:      row.date as string,
    rating:    row.rating as number,
    feedback:  (row.feedback as string) ?? "",
    createdAt: (row.created_at as string) ?? (row.createdAt as string) ?? "",
  };
}

function ratingColor(n: number) {
  if (n <= 3) return "bg-red-100 text-red-700 border-red-200";
  if (n <= 6) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-emerald-100 text-emerald-700 border-emerald-200";
}

function ratingEmoji(n: number) {
  if (n <= 2) return "😭";
  if (n <= 4) return "😬";
  if (n <= 6) return "😐";
  if (n <= 8) return "😊";
  if (n <= 9) return "😄";
  return "🥰";
}

// ─── localStorage helpers ────────────────────────────────────────────────────

function lsLoad(): RatingRow[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as RatingRow[]).sort((a, b) => b.date.localeCompare(a.date));
  } catch { return []; }
}

function lsSave(rows: RatingRow[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(rows)); } catch {}
}

function lsUpsert(rows: RatingRow[], entry: RatingRow): RatingRow[] {
  return [entry, ...rows.filter(r => r.date !== entry.date)]
    .sort((a, b) => b.date.localeCompare(a.date));
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TaffyRating() {
  const today = todayStr();

  const [rows, setRows]         = useState<RatingRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [useLocal, setUseLocal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);

  // Submit form
  const [formDate, setFormDate] = useState(today);
  const [rating, setRating]     = useState<number | null>(null);
  const [notes, setNotes]       = useState("");

  // Inline edit
  const [editId, setEditId]           = useState<string | null>(null);
  const [editRating, setEditRating]   = useState<number>(5);
  const [editNotes, setEditNotes]     = useState("");
  const [savingEdit, setSavingEdit]   = useState(false);

  async function fetchRatings() {
    setLoading(true);
    if (!SUPABASE_ENABLED) {
      setUseLocal(true);
      setRows(lsLoad());
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("taffy_ratings")
        .select("*")
        .order("date", { ascending: false })
        .limit(200);
      if (error) throw error;
      setRows(((data ?? []) as Record<string, unknown>[]).map(mapRow));
      setUseLocal(false);
    } catch {
      setUseLocal(true);
      setRows(lsLoad());
    }
    setLoading(false);
  }

  useEffect(() => { fetchRatings(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Pre-fill form when selected date already has a rating
  useEffect(() => {
    const existing = rows.find(r => r.date === formDate);
    if (existing) { setRating(existing.rating); setNotes(existing.feedback ?? ""); }
    else           { setRating(null); setNotes(""); }
  }, [formDate, rows]);

  async function handleSubmit() {
    if (!rating) return;
    setSaving(true);
    const entry: RatingRow = {
      id: formDate, date: formDate, rating, feedback: notes,
      createdAt: new Date().toISOString(),
    };

    if (useLocal) {
      const updated = lsUpsert(rows, entry);
      lsSave(updated);
      setRows(updated);
    } else {
      try {
        const { error } = await supabase.from("taffy_ratings").upsert(
          { id: formDate, date: formDate, rating, feedback: notes, created_at: new Date().toISOString() },
          { onConflict: "date" }
        );
        if (error) throw error;
        await fetchRatings();
      } catch {
        setUseLocal(true);
        const updated = lsUpsert(rows, entry);
        lsSave(updated);
        setRows(updated);
      }
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleSaveEdit(row: RatingRow) {
    setSavingEdit(true);
    const updated: RatingRow = { ...row, rating: editRating, feedback: editNotes };
    if (useLocal) {
      const newRows = lsUpsert(rows.filter(r => r.id !== row.id), updated);
      lsSave(newRows); setRows(newRows);
    } else {
      try {
        const { error } = await supabase.from("taffy_ratings").upsert(
          { id: row.id, date: row.date, rating: editRating, feedback: editNotes, created_at: row.createdAt },
          { onConflict: "date" }
        );
        if (error) throw error;
        await fetchRatings();
      } catch {
        setUseLocal(true);
        const newRows = lsUpsert(rows.filter(r => r.id !== row.id), updated);
        lsSave(newRows); setRows(newRows);
      }
    }
    setEditId(null);
    setSavingEdit(false);
  }

  async function handleDelete(id: string) {
    if (useLocal) {
      const updated = rows.filter(r => r.id !== id);
      lsSave(updated); setRows(updated); return;
    }
    try {
      const { error } = await supabase.from("taffy_ratings").delete().eq("id", id);
      if (error) throw error;
      await fetchRatings();
    } catch {
      setUseLocal(true);
      const updated = rows.filter(r => r.id !== id);
      lsSave(updated); setRows(updated);
    }
  }

  if (loading) return <div className="card animate-pulse h-40" />;

  const existingForDate = rows.find(r => r.date === formDate);
  const isUpdate = !!existingForDate;

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="section-title">🌟 How is Taffy doing?</h2>
          {useLocal && (
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2 py-0.5">
              local only
            </span>
          )}
        </div>
      </div>

      {/* Date */}
      <div className="mb-3">
        <label className="label">Date</label>
        <input
          type="date"
          value={formDate}
          max={today}
          onChange={e => setFormDate(e.target.value)}
          className="input"
        />
      </div>

      {/* Rating picker */}
      <div className="mb-3">
        <label className="label mb-2">Rating</label>
        <div className="flex gap-1.5 flex-wrap">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onClick={() => setRating(n)}
              className={`w-9 h-9 rounded-xl text-sm font-bold border transition-all ${
                rating === n
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm scale-105"
                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        {rating && <p className="text-xs text-slate-400 mt-1">{rating}/10 {ratingEmoji(rating)}</p>}
      </div>

      {/* Notes */}
      <div className="mb-3">
        <label className="label">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="What was great? What could be better?"
          rows={2}
          className="input resize-none text-sm leading-relaxed"
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!rating || saving}
        className={`w-full mb-4 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${
          saved
            ? "bg-emerald-500 text-white font-bold py-3 rounded-2xl text-sm"
            : "btn-primary"
        }`}
      >
        {saving ? "Saving…" : saved ? "✓ Saved!" : isUpdate ? "Update rating" : "Submit rating"}
      </button>

      {/* History */}
      {rows.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(v => !v)}
            className="text-xs text-blue-600 font-semibold"
          >
            {showHistory
              ? "▲ Hide history"
              : `▼ ${rows.length} rating${rows.length !== 1 ? "s" : ""}`}
          </button>

          {showHistory && (
            <div className="space-y-1 mt-2">
              {rows.map(row => {
                const isEditing = editId === row.id;
                return (
                  <div key={row.id} className="border-t border-slate-50 pt-2 pb-1">
                    {isEditing ? (
                      <div className="space-y-2 py-1">
                        <div className="flex gap-1 flex-wrap">
                          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                            <button
                              key={n}
                              onClick={() => setEditRating(n)}
                              className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all ${
                                editRating === n
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "bg-white text-slate-600 border-slate-200"
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                        <textarea
                          className="input text-sm resize-none"
                          rows={2}
                          value={editNotes}
                          onChange={e => setEditNotes(e.target.value)}
                          placeholder="Notes…"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(row)}
                            disabled={savingEdit}
                            className="btn-primary text-xs py-1 px-3 disabled:opacity-40"
                          >
                            {savingEdit ? "Saving…" : "Save"}
                          </button>
                          <button onClick={() => setEditId(null)} className="text-xs text-slate-400">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg border flex-shrink-0 ${ratingColor(row.rating)}`}>
                            {row.rating}/10 {ratingEmoji(row.rating)}
                          </span>
                          <p className="text-xs text-slate-500 flex-1">{formatDate(row.date)}</p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {row.feedback && (
                              <button
                                onClick={() => setExpandedNote(expandedNote === row.id ? null : row.id)}
                                className="text-xs text-blue-400 font-semibold"
                              >
                                {expandedNote === row.id ? "▲" : "▼ notes"}
                              </button>
                            )}
                            <button
                              onClick={() => { setEditId(row.id); setEditRating(row.rating); setEditNotes(row.feedback ?? ""); setExpandedNote(null); }}
                              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(row.id)}
                              className="text-slate-300 hover:text-red-400 transition-colors text-sm"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        {expandedNote === row.id && row.feedback && (
                          <p className="text-xs text-slate-400 italic mt-1.5 ml-1 leading-relaxed">
                            &ldquo;{row.feedback}&rdquo;
                          </p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
