"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface RatingRow {
  id: string;
  week: string;
  rating: number;
  feedback: string;
  createdAt: string;
}

function getWeekKey(date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function weekLabel(weekKey: string): string {
  // e.g. "2026-W19" → "Week 19, 2026"
  const [year, w] = weekKey.split("-W");
  return `Week ${w}, ${year}`;
}

function mapRow(row: Record<string, unknown>): RatingRow {
  return {
    id: row.id as string,
    week: row.week as string,
    rating: row.rating as number,
    feedback: (row.feedback as string) ?? "",
    createdAt: row.created_at as string,
  };
}

export default function TaffyRating() {
  const currentWeek = getWeekKey();

  const [rows, setRows] = useState<RatingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Form state
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");

  async function fetchRatings() {
    setLoading(true);
    const { data } = await supabase
      .from("ratings")
      .select("*")
      .order("week", { ascending: false })
      .limit(10);
    const mapped = ((data ?? []) as Record<string, unknown>[]).map(mapRow);
    setRows(mapped);

    // Pre-fill form if current week exists
    const thisWeek = mapped.find((r) => r.week === currentWeek);
    if (thisWeek) {
      setSelectedRating(thisWeek.rating);
      setFeedback(thisWeek.feedback ?? "");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchRatings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    if (!selectedRating) return;
    setSaving(true);
    await supabase.from("ratings").upsert(
      {
        id: currentWeek, // use week as id for simple upsert
        week: currentWeek,
        rating: selectedRating,
        feedback,
        created_at: new Date().toISOString(),
      },
      { onConflict: "week" }
    );
    await fetchRatings();
    setSaving(false);
  }

  if (loading) {
    return <div className="card animate-pulse h-40" />;
  }

  const currentEntry = rows.find((r) => r.week === currentWeek);
  const historyRows = rows.filter((r) => r.week !== currentWeek).slice(0, 5);

  const ratingColor = (n: number) => {
    if (n <= 3) return "bg-red-100 text-red-700 border-red-200";
    if (n <= 6) return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  };

  return (
    <div className="card">
      <div className="mb-4">
        <h2 className="section-title">⭐ Taffy Rating</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          How did Taffy do this week?
        </p>
        <p className="text-xs text-slate-300 mt-0.5">{weekLabel(currentWeek)}</p>
      </div>

      {/* Rating buttons */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => setSelectedRating(n)}
            className={`w-9 h-9 rounded-xl text-sm font-bold border transition-all ${
              selectedRating === n
                ? "bg-blue-600 text-white border-blue-600 shadow-sm scale-105"
                : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Feedback textarea */}
      <div className="mb-3">
        <label className="label">Feedback</label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="What was great? What could be better? Best moment, worst moment..."
          rows={3}
          className="input resize-none text-sm leading-relaxed"
        />
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!selectedRating || saving}
        className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed mb-4"
      >
        {saving ? "Saving…" : currentEntry ? "Update Rating" : "Save Rating"}
      </button>

      {/* Current week summary (if saved) */}
      {currentEntry && (
        <div className="flex items-center gap-2 mb-4 bg-slate-50 rounded-xl px-3 py-2">
          <span
            className={`text-sm font-bold px-2.5 py-1 rounded-lg border ${ratingColor(currentEntry.rating)}`}
          >
            {currentEntry.rating}/10
          </span>
          <p className="text-xs text-slate-500 italic line-clamp-1">
            {currentEntry.feedback || "No feedback yet"}
          </p>
        </div>
      )}

      {/* History */}
      {historyRows.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="text-xs text-blue-600 font-semibold"
          >
            {showHistory ? "▾ Hide history" : `▸ Past ${historyRows.length} weeks`}
          </button>

          {showHistory && (
            <div className="mt-3 space-y-2">
              {historyRows.map((row) => (
                <div
                  key={row.week}
                  className="flex items-start gap-3 py-2 border-t border-slate-50"
                >
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-lg border flex-shrink-0 ${ratingColor(row.rating)}`}
                  >
                    {row.rating}/10
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">
                      {weekLabel(row.week)}
                    </p>
                    {row.feedback && (
                      <p className="text-xs text-slate-400 italic mt-0.5 line-clamp-2">
                        {row.feedback}
                      </p>
                    )}
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
