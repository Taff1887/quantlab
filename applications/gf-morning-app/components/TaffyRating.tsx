"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface RatingRow {
  id: string;
  date: string;       // YYYY-MM-DD
  rating: number;
  feedback: string;
  createdAt: string;
}

type TimePeriod = "all" | "2w" | "1m" | "3m";

const PERIOD_OPTIONS: { label: string; value: TimePeriod }[] = [
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

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-AU", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function mapRow(row: Record<string, unknown>): RatingRow {
  return {
    id: row.id as string,
    date: row.date as string,
    rating: row.rating as number,
    feedback: (row.feedback as string) ?? "",
    createdAt: row.created_at as string,
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

export default function TaffyRating() {
  const today = todayStr();

  const [rows, setRows] = useState<RatingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyPeriod, setHistoryPeriod] = useState<TimePeriod>("all");
  const [expandedNote, setExpandedNote] = useState<string | null>(null);

  // Form state
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");

  async function fetchRatings() {
    setLoading(true);
    const { data } = await supabase
      .from("taffy_ratings")
      .select("*")
      .order("date", { ascending: false })
      .limit(60);
    const mapped = ((data ?? []) as Record<string, unknown>[]).map(mapRow);
    setRows(mapped);

    // Pre-fill if today already has an entry
    const todayEntry = mapped.find((r) => r.date === today);
    if (todayEntry) {
      setSelectedRating(todayEntry.rating);
      setFeedback(todayEntry.feedback ?? "");
    } else {
      setSelectedRating(null);
      setFeedback("");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchRatings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit() {
    if (!selectedRating) return;
    setSaving(true);
    await supabase.from("taffy_ratings").upsert(
      {
        id: today,
        date: today,
        rating: selectedRating,
        feedback,
        created_at: new Date().toISOString(),
      },
      { onConflict: "date" }
    );
    await fetchRatings();
    setSaving(false);
  }

  if (loading) return <div className="card animate-pulse h-40" />;

  const todayEntry = rows.find((r) => r.date === today);
  const prevEntry = rows.find((r) => r.date !== today);   // most recent non-today entry

  const cutoff = cutoffDate(historyPeriod);
  const historyRows = rows
    .filter((r) => r.date !== today)
    .filter((r) => !cutoff || r.date >= cutoff);

  return (
    <div className="card">
      {/* Header */}
      <div className="mb-4">
        <h2 className="section-title">🌟 How is Taffy doing?</h2>
      </div>

      {/* Previous rating callout */}
      {prevEntry && (
        <div className="mb-4 bg-slate-50 rounded-2xl px-4 py-3">
          <p className="text-xs text-slate-400 mb-1.5">Previously rated on {formatDate(prevEntry.date)}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-base font-bold px-3 py-1 rounded-xl border ${ratingColor(prevEntry.rating)}`}>
              {prevEntry.rating}/10 {ratingEmoji(prevEntry.rating)}
            </span>
            {prevEntry.feedback && (
              <button
                onClick={() => setExpandedNote(expandedNote === prevEntry.date ? null : prevEntry.date)}
                className="text-xs text-blue-500 font-semibold ml-auto"
              >
                {expandedNote === prevEntry.date ? "▲ hide" : "▼ see more"}
              </button>
            )}
          </div>
          {expandedNote === prevEntry.date && prevEntry.feedback && (
            <p className="text-xs text-slate-500 italic mt-2 leading-relaxed">
              &ldquo;{prevEntry.feedback}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Rating picker */}
      <div className="mb-1">
        <p className="label mb-2">Rate Taffy today</p>
        <div className="flex gap-1.5 flex-wrap">
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
      </div>

      {selectedRating && (
        <p className="text-xs text-slate-400 mt-1 mb-3">
          {selectedRating}/10 {ratingEmoji(selectedRating)}
        </p>
      )}

      {/* Feedback textarea */}
      <div className="mb-3">
        <label className="label">Notes</label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="What was great? What could be better? What did you find annoying?"
          rows={3}
          className="input resize-none text-sm leading-relaxed"
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!selectedRating || saving}
        className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed mb-4"
      >
        {saving ? "Saving…" : todayEntry ? "Update today's rating" : "Submit rating"}
      </button>

      {/* Today's saved summary */}
      {todayEntry && (
        <div className={`flex items-center gap-2 mb-4 rounded-xl px-3 py-2 border ${ratingColor(todayEntry.rating)}`}>
          <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${ratingColor(todayEntry.rating)}`}>
            {todayEntry.rating}/10 {ratingEmoji(todayEntry.rating)}
          </span>
          <p className="text-xs italic opacity-80 line-clamp-1">
            {todayEntry.feedback || "No notes added"}
          </p>
        </div>
      )}

      {/* History */}
      {historyRows.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="text-xs text-blue-600 font-semibold"
            >
              {showHistory
                ? "▲ Hide history"
                : `▼ ${historyRows.length} previous rating${historyRows.length !== 1 ? "s" : ""}`}
            </button>
          </div>

          {showHistory && (
            <>
              {/* Period filter */}
              <select
                value={historyPeriod}
                onChange={(e) => setHistoryPeriod(e.target.value as TimePeriod)}
                className="input text-sm mb-3"
              >
                {PERIOD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              <div className="space-y-1">
                {historyRows.map((row) => (
                  <div key={row.date} className="border-t border-slate-50 pt-2 pb-1">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg border flex-shrink-0 ${ratingColor(row.rating)}`}>
                        {row.rating}/10
                      </span>
                      <p className="text-xs text-slate-500 flex-1">{formatDate(row.date)}</p>
                      {row.feedback && (
                        <button
                          onClick={() => setExpandedNote(expandedNote === row.date ? null : row.date)}
                          className="text-xs text-blue-400 font-semibold flex-shrink-0"
                        >
                          {expandedNote === row.date ? "▲" : "▼ notes"}
                        </button>
                      )}
                    </div>
                    {expandedNote === row.date && row.feedback && (
                      <p className="text-xs text-slate-400 italic mt-1.5 ml-1 leading-relaxed">
                        &ldquo;{row.feedback}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
