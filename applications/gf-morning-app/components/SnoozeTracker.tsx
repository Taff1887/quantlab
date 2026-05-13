"use client";

import { useEffect, useState } from "react";
import { supabase, SUPABASE_ENABLED } from "../lib/supabase";

interface SnoozeLog {
  id: string;
  date: string;
  count: number;
  createdAt: string;
}

function todayStr() { return new Date().toISOString().split("T")[0]; }

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function formatDateShort(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-AU", {
    weekday: "short", day: "numeric", month: "short",
  });
}

function mapRow(row: Record<string, unknown>): SnoozeLog {
  return {
    id:        row.id as string,
    date:      row.date as string,
    count:     row.count as number,
    createdAt: (row.created_at as string) ?? "",
  };
}

// ─── localStorage helpers ────────────────────────────────────────────────────

const LS_KEY = "snooze_logs_local";

function lsLoad(): SnoozeLog[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as SnoozeLog[]).sort((a, b) => b.date.localeCompare(a.date));
  } catch { return []; }
}

function lsSave(logs: SnoozeLog[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(logs)); } catch {}
}

function lsUpsert(logs: SnoozeLog[], entry: SnoozeLog): SnoozeLog[] {
  return [entry, ...logs.filter(l => l.date !== entry.date)]
    .sort((a, b) => b.date.localeCompare(a.date));
}

// ─── Component ───────────────────────────────────────────────────────────────

const OPTIONS = [0, 1, 2, 3, 4, 5];

export default function SnoozeTracker() {
  const today     = todayStr();
  const yesterday = yesterdayStr();

  const [logs, setLogs]           = useState<SnoozeLog[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [useLocal, setUseLocal]   = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Today
  const [selected, setSelected]         = useState<number | null>(null);
  const [submittedToday, setSubmittedToday] = useState(false);

  // Yesterday form
  const [showYesterday, setShowYesterday]           = useState(false);
  const [selectedYesterday, setSelectedYesterday]   = useState<number | null>(null);
  const [savingYesterday, setSavingYesterday]       = useState(false);

  async function fetchLogs() {
    setLoading(true);
    if (!SUPABASE_ENABLED) {
      setUseLocal(true);
      const local = lsLoad();
      setLogs(local);
      const t = local.find(l => l.date === today);
      if (t) { setSelected(t.count); setSubmittedToday(true); }
      setLoading(false);
      return;
    }
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const { data, error } = await supabase
        .from("snooze_logs")
        .select("*")
        .gte("date", cutoff.toISOString().split("T")[0])
        .order("date", { ascending: false });
      if (error) throw error;
      const mapped = ((data ?? []) as Record<string, unknown>[]).map(mapRow);
      setLogs(mapped);
      setUseLocal(false);
      const t = mapped.find(l => l.date === today);
      if (t) { setSelected(t.count); setSubmittedToday(true); }
    } catch {
      setUseLocal(true);
      const local = lsLoad();
      setLogs(local);
      const t = local.find(l => l.date === today);
      if (t) { setSelected(t.count); setSubmittedToday(true); }
    }
    setLoading(false);
  }

  useEffect(() => { fetchLogs(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function save(date: string, count: number): Promise<SnoozeLog[]> {
    const entry: SnoozeLog = { id: date, date, count, createdAt: new Date().toISOString() };
    if (useLocal) {
      const updated = lsUpsert(logs, entry);
      lsSave(updated);
      setLogs(updated);
      return updated;
    }
    try {
      const { error } = await supabase.from("snooze_logs").upsert(
        { id: date, date, count, created_at: new Date().toISOString() },
        { onConflict: "date" }
      );
      if (error) throw error;
      await fetchLogs();
      return logs; // fetchLogs updates state; return value unused
    } catch {
      setUseLocal(true);
      const updated = lsUpsert(logs, entry);
      lsSave(updated);
      setLogs(updated);
      return updated;
    }
  }

  async function handleSubmit() {
    if (selected === null || submittedToday) return;
    setSaving(true);
    await save(today, selected);
    setSubmittedToday(true);
    setSaving(false);
  }

  async function handleSubmitYesterday() {
    if (selectedYesterday === null) return;
    setSavingYesterday(true);
    await save(yesterday, selectedYesterday);
    setShowYesterday(false);
    setSelectedYesterday(null);
    setSavingYesterday(false);
  }

  if (loading) return <div className="card animate-pulse h-32" />;

  const yesterdayLog  = logs.find(l => l.date === yesterday);
  const historyLogs   = logs.filter(l => l.date !== today);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-1">
        <h2 className="section-title">⏰ Snooze Tracker</h2>
        {useLocal && <span className="text-[10px] text-slate-300 font-medium">local only</span>}
      </div>
      <p className="text-xs text-slate-400 mb-4">How many times did you hit snooze today?</p>

      {/* Today */}
      {submittedToday ? (
        <div className={`rounded-2xl px-4 py-3 mb-4 border ${
          selected === 0 ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-200"
        }`}>
          <p className="text-sm font-bold text-slate-800">
            {selected === 0
              ? "✅ Zero snoozes today!"
              : `${selected === 5 ? "5+" : selected} snooze${selected !== 1 ? "s" : ""} logged`}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Already submitted for today</p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-3">
            {OPTIONS.map(n => (
              <button
                key={n}
                onClick={() => setSelected(n)}
                className={`flex-1 h-11 rounded-xl text-sm font-bold border transition-all ${
                  selected === n
                    ? n === 0
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-orange-500 text-white border-orange-500"
                    : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                }`}
              >
                {n === 5 ? "5+" : n}
              </button>
            ))}
          </div>
          <button
            onClick={handleSubmit}
            disabled={selected === null || saving}
            className="btn-primary w-full mb-4 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Submit"}
          </button>
        </>
      )}

      {/* Log yesterday — only if not already logged */}
      {!yesterdayLog && (
        <div className="mb-4">
          {showYesterday ? (
            <div className="border border-slate-100 rounded-2xl p-3 bg-slate-50/50">
              <p className="text-xs font-semibold text-slate-500 mb-2">
                How many snoozes yesterday?
              </p>
              <div className="flex gap-2 mb-3">
                {OPTIONS.map(n => (
                  <button
                    key={n}
                    onClick={() => setSelectedYesterday(n)}
                    className={`flex-1 h-9 rounded-xl text-xs font-bold border transition-all ${
                      selectedYesterday === n
                        ? n === 0 ? "bg-emerald-600 text-white border-emerald-600" : "bg-orange-500 text-white border-orange-500"
                        : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    {n === 5 ? "5+" : n}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSubmitYesterday}
                  disabled={selectedYesterday === null || savingYesterday}
                  className="btn-primary text-xs py-1.5 px-4 disabled:opacity-40"
                >
                  {savingYesterday ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => { setShowYesterday(false); setSelectedYesterday(null); }}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowYesterday(true)}
              className="text-xs text-blue-600 font-semibold"
            >
              + Log yesterday
            </button>
          )}
        </div>
      )}

      {/* History */}
      {historyLogs.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(v => !v)}
            className="text-xs text-blue-600 font-semibold"
          >
            {showHistory
              ? "▲ Hide history"
              : `▼ ${historyLogs.length} previous day${historyLogs.length !== 1 ? "s" : ""}`}
          </button>

          {showHistory && (
            <div className="mt-3 divide-y divide-slate-50">
              {historyLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between py-2">
                  <span className="text-xs text-slate-500">{formatDateShort(log.date)}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                    log.count === 0
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {log.count === 5 ? "5+" : log.count} {log.count === 1 ? "snooze" : "snoozes"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
