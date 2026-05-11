"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface SnoozeLog {
  id: string;
  date: string;    // YYYY-MM-DD
  count: number;
  createdAt: string;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function formatDateShort(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function mapRow(row: Record<string, unknown>): SnoozeLog {
  return {
    id: row.id as string,
    date: row.date as string,
    count: row.count as number,
    createdAt: row.created_at as string,
  };
}

const SNOOZE_OPTIONS = [0, 1, 2, 3, 4, 5];

/** Returns the ISO week string "YYYY-Www" for a given YYYY-MM-DD */
function isoWeekKey(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay(); // Mon=1 … Sun=7
  const thursday = new Date(date.getTime() + (4 - dayOfWeek) * 86_400_000);
  const year = thursday.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const dow1 = startOfYear.getDay() === 0 ? 7 : startOfYear.getDay();
  const startOfW1 = new Date(startOfYear.getTime() - (dow1 - 1) * 86_400_000);
  const week = Math.floor((thursday.getTime() - startOfW1.getTime()) / (7 * 86_400_000)) + 1;
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export default function SnoozeTracker() {
  const today = todayStr();
  const [logs, setLogs] = useState<SnoozeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCount, setSelectedCount] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  async function fetchLogs() {
    setLoading(true);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 13);
    const cutoffStr = cutoff.toISOString().split("T")[0];

    const { data } = await supabase
      .from("snooze_logs")
      .select("*")
      .gte("date", cutoffStr)
      .order("date", { ascending: false });

    const mapped = ((data ?? []) as Record<string, unknown>[]).map(mapRow);
    setLogs(mapped);

    const todayEntry = mapped.find((l) => l.date === today);
    if (todayEntry) setSelectedCount(todayEntry.count);
    else setSelectedCount(null);

    setLoading(false);
  }

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave(count: number) {
    setSelectedCount(count);
    setSaving(true);
    await supabase.from("snooze_logs").upsert(
      { id: today, date: today, count, created_at: new Date().toISOString() },
      { onConflict: "date" }
    );
    await fetchLogs();
    setSaving(false);
  }

  if (loading) return <div className="card animate-pulse h-32" />;

  const todayEntry = logs.find((l) => l.date === today);
  const historyLogs = logs.filter((l) => l.date !== today);

  // Check if the current ISO week (Mon-Sun) is all-zero snoozes
  const todayWeekKey = isoWeekKey(today);

  // Build a map of date → count for the last 14 days
  const logMap = new Map(logs.map((l) => [l.date, l.count]));

  // Check all 7 days of the current week up to today
  const allDaysThisWeek: string[] = [];
  const [ty, tm, td] = today.split("-").map(Number);
  const todayDate = new Date(ty, tm - 1, td);
  const todayDow = todayDate.getDay() === 0 ? 7 : todayDate.getDay(); // Mon=1 … Sun=7
  // Mon of this week
  const mondayDate = new Date(todayDate.getTime() - (todayDow - 1) * 86_400_000);
  for (let i = 0; i < todayDow; i++) {
    const d = new Date(mondayDate.getTime() + i * 86_400_000);
    const str = d.toISOString().split("T")[0];
    allDaysThisWeek.push(str);
  }

  const weekComplete =
    allDaysThisWeek.length === 7 &&
    allDaysThisWeek.every((d) => logMap.has(d) && logMap.get(d) === 0);

  const weekAllZeroSoFar =
    allDaysThisWeek.length > 0 &&
    allDaysThisWeek.every((d) => logMap.has(d) && logMap.get(d) === 0);

  // 2-week average
  const logsWithData = logs.filter((l) => l.date !== today);
  const avgSnoozes =
    logsWithData.length > 0
      ? (logsWithData.reduce((s, l) => s + l.count, 0) / logsWithData.length).toFixed(1)
      : null;

  // Bar chart: last 14 days in ascending date order
  const chartDays: { date: string; count: number | null }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const str = d.toISOString().split("T")[0];
    chartDays.push({ date: str, count: logMap.has(str) ? logMap.get(str)! : null });
  }
  const maxCount = Math.max(...chartDays.map((d) => d.count ?? 0), 1);

  return (
    <div className="card">
      <div className="mb-3">
        <h2 className="section-title">⏰ Snooze Tracker</h2>
        <p className="text-xs text-slate-400 mt-0.5">How many times did you snooze today?</p>
      </div>

      {/* Coffee win banner */}
      {weekComplete && (
        <div className="mb-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">☕</span>
          <div>
            <p className="text-sm font-bold text-amber-800">Zero snoozes all week!</p>
            <p className="text-xs text-amber-600">You earned a coffee ☕</p>
          </div>
        </div>
      )}

      {!weekComplete && weekAllZeroSoFar && allDaysThisWeek.length > 1 && (
        <div className="mb-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-2 text-xs text-emerald-700 font-semibold">
          🌟 {allDaysThisWeek.length} day{allDaysThisWeek.length !== 1 ? "s" : ""} snooze-free this week — keep going!
        </div>
      )}

      {/* Today's picker */}
      <div className="mb-1">
        <p className="label mb-2">Snooze count</p>
        <div className="flex gap-2">
          {SNOOZE_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => handleSave(n)}
              disabled={saving}
              className={`flex-1 h-10 rounded-xl text-sm font-bold border transition-all ${
                selectedCount === n
                  ? n === 0
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-orange-500 text-white border-orange-500 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"
              } disabled:opacity-50`}
            >
              {n === 5 ? "5+" : n}
            </button>
          ))}
        </div>
      </div>

      {todayEntry !== undefined && (
        <p className="text-xs text-slate-400 mt-1.5">
          {todayEntry.count === 0
            ? "✅ No snoozes today!"
            : `${todayEntry.count === 5 ? "5+" : todayEntry.count} snooze${todayEntry.count !== 1 ? "s" : ""} logged`}
          {saving && " — saving…"}
        </p>
      )}

      {/* Stats */}
      {avgSnoozes !== null && (
        <p className="text-xs text-slate-400 mt-1">
          14-day avg: <span className="font-semibold text-slate-600">{avgSnoozes}</span> snoozes/day
        </p>
      )}

      {/* Mini bar chart */}
      {logs.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="text-xs font-semibold text-blue-600 mb-2"
          >
            {showHistory ? "▲ Hide chart" : "▼ Last 14 days"}
          </button>

          {showHistory && (
            <div className="flex items-end gap-0.5 h-16 mt-1">
              {chartDays.map(({ date, count }) => {
                const isToday = date === today;
                const height = count === null ? 0 : Math.max((count / maxCount) * 100, count > 0 ? 8 : 0);
                const barColor =
                  count === null
                    ? "bg-slate-100"
                    : count === 0
                    ? "bg-emerald-400"
                    : count <= 2
                    ? "bg-amber-400"
                    : "bg-red-400";
                return (
                  <div key={date} className="flex-1 flex flex-col items-center justify-end gap-0.5">
                    <div
                      className={`w-full rounded-t transition-all ${barColor} ${isToday ? "ring-1 ring-blue-400" : ""}`}
                      style={{ height: count === null ? "4px" : count === 0 ? "4px" : `${height}%` }}
                      title={`${formatDateShort(date)}: ${count === null ? "no data" : count === 5 ? "5+" : count}`}
                    />
                    {isToday && (
                      <span className="text-[8px] text-blue-500 font-bold leading-none">•</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {showHistory && (
            <div className="flex justify-between mt-0.5">
              <span className="text-[9px] text-slate-300">14 days ago</span>
              <span className="text-[9px] text-slate-300">Today</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
