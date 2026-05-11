"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Chore, ChoreStatus } from "../types";

const DEFAULT_CHORES = [
  { id: "sheets", name: "🛏️ Bed sheets", interval_days: 14 },
  { id: "clothes", name: "👕 General clothes", interval_days: 14 },
  { id: "towels", name: "🏊 Towels", interval_days: 7 },
];

function rowToChore(row: Record<string, unknown>): Chore {
  return {
    id: row.id as string,
    name: row.name as string,
    intervalDays: row.interval_days as number,
    lastCompleted: (row.last_completed as string | null) ?? null,
  };
}

/** Find the first Sunday that is at least intervalDays after completedDate */
function nextSundayAfterInterval(completedDate: Date, intervalDays: number): Date {
  const minDate = new Date(completedDate.getTime() + intervalDays * 86_400_000);
  const dow = minDate.getDay(); // 0 = Sunday
  const daysUntilSunday = dow === 0 ? 0 : 7 - dow;
  return new Date(minDate.getTime() + daysUntilSunday * 86_400_000);
}

function choreStatus(chore: Chore): {
  status: ChoreStatus;
  daysLeft: number;
  nextDue: Date | null;
} {
  if (!chore.lastCompleted) {
    return { status: "overdue", daysLeft: -99, nextDue: null };
  }
  const completed = new Date(chore.lastCompleted);
  const nextDue = nextSundayAfterInterval(completed, chore.intervalDays);

  // Compare dates at day granularity using local midnight
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const nextDueMidnight = new Date(nextDue.getFullYear(), nextDue.getMonth(), nextDue.getDate());
  const msLeft = nextDueMidnight.getTime() - todayMidnight.getTime();
  const daysLeft = Math.round(msLeft / 86_400_000);

  let status: ChoreStatus;
  if (daysLeft < 0) status = "overdue";
  else if (daysLeft === 0) status = "due-today";
  else if (daysLeft <= 3) status = "due-soon";
  else status = "ok";

  return { status, daysLeft, nextDue };
}

const STATUS_CARD: Record<ChoreStatus, string> = {
  ok: "bg-emerald-50 border-emerald-100",
  "due-soon": "bg-amber-50 border-amber-200",
  "due-today": "bg-amber-50 border-amber-300",
  overdue: "bg-red-50 border-red-200",
};

const STATUS_TEXT: Record<ChoreStatus, string> = {
  ok: "text-emerald-600",
  "due-soon": "text-amber-600",
  "due-today": "text-orange-600",
  overdue: "text-red-600",
};

const STATUS_BADGE: Record<ChoreStatus, string> = {
  ok: "On track ✓",
  "due-soon": "Due soon",
  "due-today": "Due today!",
  overdue: "Overdue ⚠️",
};

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function ChoreCountdown() {
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newInterval, setNewInterval] = useState(7);

  // Edit form
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editInterval, setEditInterval] = useState(7);
  const [editLastCompleted, setEditLastCompleted] = useState("");

  // "Done on date" inline picker
  const [doneOnId, setDoneOnId] = useState<string | null>(null);
  const [doneOnDate, setDoneOnDate] = useState(todayStr());

  async function fetchChores() {
    const { data } = await supabase.from("chores").select("*");
    const rows = (data ?? []) as Record<string, unknown>[];

    if (rows.length === 0) {
      await supabase.from("chores").insert(
        DEFAULT_CHORES.map((c) => ({ ...c, last_completed: null }))
      );
      const { data: fresh } = await supabase.from("chores").select("*");
      setChores(((fresh ?? []) as Record<string, unknown>[]).map(rowToChore));
    } else {
      setChores(rows.map(rowToChore));
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchChores();
  }, []);

  /** Mark done right now */
  async function markDone(id: string) {
    await supabase
      .from("chores")
      .update({ last_completed: new Date().toISOString() })
      .eq("id", id);
    fetchChores();
  }

  /** Mark done on a specific date (backdating) */
  async function markDoneOn(id: string, dateStr: string) {
    // Store as ISO string at noon local time so timezone doesn't flip the day
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d, 12, 0, 0);
    await supabase
      .from("chores")
      .update({ last_completed: dt.toISOString() })
      .eq("id", id);
    setDoneOnId(null);
    fetchChores();
  }

  async function removeChore(id: string) {
    await supabase.from("chores").delete().eq("id", id);
    fetchChores();
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    const id = crypto.randomUUID();
    await supabase.from("chores").insert({
      id,
      name: newName.trim(),
      interval_days: newInterval,
      last_completed: null,
    });
    setNewName("");
    setNewInterval(7);
    setShowAdd(false);
    fetchChores();
  }

  function openEdit(chore: Chore) {
    setEditId(chore.id);
    setEditName(chore.name);
    setEditInterval(chore.intervalDays);
    // Convert stored ISO to YYYY-MM-DD for date input
    if (chore.lastCompleted) {
      const d = new Date(chore.lastCompleted);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      setEditLastCompleted(`${y}-${m}-${day}`);
    } else {
      setEditLastCompleted("");
    }
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    let lastCompletedIso: string | null = null;
    if (editLastCompleted) {
      const [y, m, d] = editLastCompleted.split("-").map(Number);
      lastCompletedIso = new Date(y, m - 1, d, 12, 0, 0).toISOString();
    }
    await supabase
      .from("chores")
      .update({
        name: editName.trim(),
        interval_days: editInterval,
        ...(editLastCompleted ? { last_completed: lastCompletedIso } : {}),
      })
      .eq("id", id);
    setEditId(null);
    fetchChores();
  }

  if (loading) {
    return <div className="card animate-pulse h-48" />;
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">🧹 Chore Countdowns</h2>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="text-xs font-semibold text-blue-600"
        >
          {showAdd ? "Cancel" : "+ Add chore"}
        </button>
      </div>

      <div className="space-y-3">
        {chores.map((chore) => {
          const { status, daysLeft, nextDue } = choreStatus(chore);
          const isEditing = editId === chore.id;
          const isDoneOnOpen = doneOnId === chore.id;

          return (
            <div
              key={chore.id}
              className={`rounded-2xl p-4 border ${STATUS_CARD[status]}`}
            >
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    className="input text-sm"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Chore name"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <label className="label whitespace-nowrap text-xs">Min interval</label>
                    <input
                      type="number"
                      min={1}
                      className="input w-20 text-center text-sm"
                      value={editInterval}
                      onChange={(e) => setEditInterval(Math.max(1, Number(e.target.value)))}
                    />
                    <span className="text-xs text-slate-500">days</span>
                  </div>
                  <div>
                    <label className="label text-xs">Last completed (backdate)</label>
                    <input
                      type="date"
                      className="input text-sm"
                      value={editLastCompleted}
                      max={todayStr()}
                      onChange={(e) => setEditLastCompleted(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(chore.id)}
                      className="btn-primary text-xs py-1 px-3"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Name + badge */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold text-slate-800">{chore.name}</p>
                      <span className={`text-xs font-bold ${STATUS_TEXT[status]}`}>
                        {STATUS_BADGE[status]}
                      </span>
                    </div>

                    {/* Detail */}
                    {chore.lastCompleted ? (
                      <>
                        <p className="text-xs text-slate-500">
                          Last done:{" "}
                          {new Date(chore.lastCompleted).toLocaleDateString("en-AU", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                          {nextDue && (
                            <>
                              {" · "}Next:{" "}
                              {nextDue.toLocaleDateString("en-AU", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                              })}
                            </>
                          )}
                        </p>
                        <p className={`text-xs font-semibold mt-1 ${STATUS_TEXT[status]}`}>
                          {daysLeft < 0
                            ? `${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? "s" : ""} overdue`
                            : daysLeft === 0
                            ? "Due today — get it done!"
                            : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} to go`}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-red-400">Never done — mark complete to start tracking</p>
                    )}

                    {/* Done-on-date picker */}
                    {isDoneOnOpen && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <input
                          type="date"
                          className="input text-xs py-1 w-auto"
                          value={doneOnDate}
                          max={todayStr()}
                          onChange={(e) => setDoneOnDate(e.target.value)}
                        />
                        <button
                          onClick={() => markDoneOn(chore.id, doneOnDate)}
                          className="btn-primary text-xs py-1 px-3"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDoneOnId(null)}
                          className="text-xs text-slate-400 hover:text-slate-600"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 flex-shrink-0 items-end">
                    <button
                      onClick={() => markDone(chore.id)}
                      className="px-3 py-1.5 bg-white rounded-xl text-xs font-semibold text-slate-700 shadow-sm border border-white hover:bg-slate-50 transition-colors"
                    >
                      Done ✓
                    </button>
                    <button
                      onClick={() => {
                        setDoneOnId(isDoneOnOpen ? null : chore.id);
                        setDoneOnDate(todayStr());
                      }}
                      className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Done on date…
                    </button>
                    <button
                      onClick={() => openEdit(chore)}
                      className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => removeChore(chore.id)}
                      className="text-xs text-slate-300 hover:text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add chore form */}
      {showAdd && (
        <div className="mt-4 border border-slate-100 rounded-2xl p-4 space-y-3 bg-slate-50/50">
          <div>
            <label className="label">Chore name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. 🪟 Clean windows"
              className="input"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              autoFocus
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="label whitespace-nowrap">Min interval</label>
            <input
              type="number"
              value={newInterval}
              min={1}
              onChange={(e) => setNewInterval(Math.max(1, Number(e.target.value)))}
              className="input w-20 text-center"
            />
            <span className="text-xs text-slate-500">days</span>
          </div>
          <p className="text-xs text-slate-400">Next due will always be a Sunday, at least this many days away.</p>
          <button onClick={handleAdd} className="btn-primary w-full">
            Add Chore
          </button>
        </div>
      )}
    </div>
  );
}
