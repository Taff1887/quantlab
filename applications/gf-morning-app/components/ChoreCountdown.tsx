"use client";
import { useEffect, useState } from "react";
import type { Chore, ChoreStatus } from "../types";
import { getItem, setItem } from "../lib/storage";

const STORAGE_KEY = "mcc_chores";

const DEFAULT_CHORES: Chore[] = [
  { id: "sheets", name: "🛏️ Bed sheets", intervalDays: 14, lastCompleted: null },
  { id: "clothes", name: "👕 General clothes", intervalDays: 14, lastCompleted: null },
  { id: "towels", name: "🏊 Towels", intervalDays: 7, lastCompleted: null },
];

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
  const [chores, setChores] = useState<Chore[]>(DEFAULT_CHORES);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newInterval, setNewInterval] = useState(7);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = getItem<Chore[] | null>(STORAGE_KEY, null);
    if (saved) setChores(saved);
    setHydrated(true);
  }, []);

  function save(updated: Chore[]) {
    setChores(updated);
    setItem(STORAGE_KEY, updated);
  }

  function markDone(id: string) {
    save(
      chores.map((c) =>
        c.id === id ? { ...c, lastCompleted: new Date().toISOString() } : c
      )
    );
  }

  function removeChore(id: string) {
    save(chores.filter((c) => c.id !== id));
  }

  function handleAdd() {
    if (!newName.trim()) return;
    save([
      ...chores,
      {
        id: Date.now().toString(),
        name: newName.trim(),
        intervalDays: newInterval,
        lastCompleted: null,
      },
    ]);
    setNewName("");
    setNewInterval(7);
    setShowAdd(false);
  }

  if (!hydrated) return <div className="card animate-pulse h-48" />;

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
          return (
            <div
              key={chore.id}
              className={`rounded-2xl p-4 border ${STATUS_CARD[status]}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  {/* Name + badge */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-semibold text-slate-800">
                      {chore.name}
                    </p>
                    <span
                      className={`text-xs font-bold ${STATUS_TEXT[status]}`}
                    >
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
                            {" "}· Next:{" "}
                            {nextDue.toLocaleDateString("en-AU", {
                              day: "numeric",
                              month: "short",
                            })}
                          </>
                        )}
                      </p>
                      <p className={`text-xs font-semibold mt-1 ${STATUS_TEXT[status]}`}>
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
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => markDone(chore.id)}
                    className="px-3 py-1.5 bg-white rounded-xl text-xs font-semibold text-slate-700 shadow-sm border border-white hover:bg-slate-50 transition-colors"
                  >
                    Done ✓
                  </button>
                  <button
                    onClick={() => removeChore(chore.id)}
                    className="text-xs text-slate-300 hover:text-red-400 transition-colors text-center"
                  >
                    remove
                  </button>
                </div>
              </div>
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
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="label whitespace-nowrap">Every</label>
            <input
              type="number"
              value={newInterval}
              min={1}
              onChange={(e) => setNewInterval(Math.max(1, Number(e.target.value)))}
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
