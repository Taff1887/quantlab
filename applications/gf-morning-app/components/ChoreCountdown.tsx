"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Chore, ChoreStatus } from "../types";

const DEFAULT_CHORES = [
  { id: "sheets", name: "🛏️ Bed sheets", interval_days: 14 },
  { id: "clothes", name: "👕 General clothes", interval_days: 14 },
  { id: "towels", name: "🏊 Towels", interval_days: 7 },
];

// Map DB row → Chore
function rowToChore(row: Record<string, unknown>): Chore {
  return {
    id: row.id as string,
    name: row.name as string,
    intervalDays: row.interval_days as number,
    lastCompleted: (row.last_completed as string | null) ?? null,
  };
}

function choreStatus(chore: Chore): {
  status: ChoreStatus;
  daysLeft: number;
  nextDue: Date | null;
} {
  if (!chore.lastCompleted) {
    return { status: "overdue", daysLeft: 0, nextDue: null };
  }
  const nextDue = new Date(
    new Date(chore.lastCompleted).getTime() + chore.intervalDays * 86_400_000
  );
  const daysLeft = Math.ceil((nextDue.getTime() - Date.now()) / 86_400_000);

  let status: ChoreStatus;
  if (daysLeft < 0) status = "overdue";
  else if (daysLeft === 0) status = "due-today";
  else if (daysLeft <= 2) status = "due-soon";
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
  "due-today": "text-amber-700",
  overdue: "text-red-600",
};

const STATUS_BADGE: Record<ChoreStatus, string> = {
  ok: "On track ✓",
  "due-soon": "Due soon",
  "due-today": "Due today!",
  overdue: "Overdue",
};

export default function ChoreCountdown() {
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newInterval, setNewInterval] = useState(7);

  // Edit form (inline per-chore)
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editInterval, setEditInterval] = useState(7);

  async function fetchChores() {
    const { data } = await supabase.from("chores").select("*");
    const rows = (data ?? []) as Record<string, unknown>[];

    if (rows.length === 0) {
      // Insert defaults
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

  async function markDone(id: string) {
    const now = new Date().toISOString();
    await supabase
      .from("chores")
      .update({ last_completed: now })
      .eq("id", id);
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
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    await supabase
      .from("chores")
      .update({ name: editName.trim(), interval_days: editInterval })
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
        <h2 className="section-title">Chore Countdowns</h2>
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

          return (
            <div
              key={chore.id}
              className={`rounded-2xl p-4 border ${STATUS_CARD[status]}`}
            >
              {isEditing ? (
                /* Inline edit form */
                <div className="space-y-2">
                  <input
                    className="input text-sm"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Chore name"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <label className="label whitespace-nowrap text-xs">Every</label>
                    <input
                      type="number"
                      min={1}
                      className="input w-20 text-center text-sm"
                      value={editInterval}
                      onChange={(e) =>
                        setEditInterval(Math.max(1, Number(e.target.value)))
                      }
                    />
                    <span className="text-xs text-slate-500">days</span>
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
                      <p className="text-sm font-semibold text-slate-800">
                        {chore.name}
                      </p>
                      <span className={`text-xs font-bold ${STATUS_TEXT[status]}`}>
                        {STATUS_BADGE[status]}
                      </span>
                    </div>

                    {/* Detail rows */}
                    {chore.lastCompleted ? (
                      <>
                        <p className="text-xs text-slate-500">
                          Last done:{" "}
                          {new Date(chore.lastCompleted).toLocaleDateString("en-AU", {
                            day: "numeric",
                            month: "short",
                          })}
                          {nextDue && (
                            <>
                              {" · "}Next:{" "}
                              {nextDue.toLocaleDateString("en-AU", {
                                day: "numeric",
                                month: "short",
                              })}
                            </>
                          )}
                        </p>
                        <p
                          className={`text-xs font-semibold mt-1 ${STATUS_TEXT[status]}`}
                        >
                          {status === "overdue"
                            ? `${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? "s" : ""} overdue`
                            : status === "due-today"
                            ? "Do it today!"
                            : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining`}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-red-400">
                        Never done — mark complete to start tracking
                      </p>
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
            <label className="label whitespace-nowrap">Every</label>
            <input
              type="number"
              value={newInterval}
              min={1}
              onChange={(e) =>
                setNewInterval(Math.max(1, Number(e.target.value)))
              }
              className="input w-20 text-center"
            />
            <span className="text-xs text-slate-500">days</span>
          </div>
          <button onClick={handleAdd} className="btn-primary w-full">
            Add Chore
          </button>
        </div>
      )}
    </div>
  );
}
