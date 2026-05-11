"use client";
import { useEffect, useRef, useState } from "react";
import type { Task } from "@/types";
import { getItem, setItem } from "@/lib/storage";

const STORAGE_KEY = "mcc_life_admin";

function isOverdue(dueDate?: string) {
  if (!dueDate) return false;
  return new Date(dueDate + "T23:59:59").getTime() < Date.now();
}

function isDueSoon(dueDate?: string) {
  if (!dueDate) return false;
  const ms = new Date(dueDate + "T23:59:59").getTime() - Date.now();
  return ms >= 0 && ms <= 2 * 86_400_000;
}

function formatDue(dueDate: string) {
  return new Date(dueDate).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}

export default function LifeAdmin() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [showDue, setShowDue] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTasks(getItem<Task[]>(STORAGE_KEY, []));
  }, []);

  function save(updated: Task[]) {
    setTasks(updated);
    setItem(STORAGE_KEY, updated);
  }

  function handleAdd() {
    const trimmed = title.trim();
    if (!trimmed) return;
    save([
      ...tasks,
      {
        id: Date.now().toString(),
        title: trimmed,
        completed: false,
        dueDate: dueDate || undefined,
        createdAt: new Date().toISOString(),
      },
    ]);
    setTitle("");
    setDueDate("");
    setShowDue(false);
    inputRef.current?.focus();
  }

  function toggleTask(id: string) {
    save(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  }

  function deleteTask(id: string) {
    save(tasks.filter((t) => t.id !== id));
  }

  const active = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Life Admin</h2>
        {active.length > 0 && (
          <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">
            {active.length} active
          </span>
        )}
      </div>

      {/* Add task input */}
      <div className="flex gap-2 mb-2">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          onFocus={() => setShowDue(true)}
          placeholder="Add a task…"
          className="input flex-1"
        />
        <button onClick={handleAdd} className="btn-primary px-4 text-base leading-none">
          +
        </button>
      </div>

      {/* Optional due date — slides in on focus */}
      {showDue && (
        <div className="mb-4 flex items-center gap-2">
          <label className="text-xs text-slate-400 whitespace-nowrap">Due date (optional)</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="input flex-1 text-xs"
          />
        </div>
      )}

      {/* Active tasks */}
      {active.length === 0 && completed.length === 0 && (
        <p className="text-slate-400 text-sm text-center py-6">
          Nothing here — add your first task ✨
        </p>
      )}

      {active.length === 0 && completed.length > 0 && (
        <p className="text-slate-400 text-sm text-center py-4">
          All tasks done! 🎉
        </p>
      )}

      <div className="space-y-1">
        {active.map((task) => (
          <div key={task.id} className="flex items-start gap-3 py-2.5 group">
            <button
              onClick={() => toggleTask(task.id)}
              className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0 mt-0.5 hover:border-blue-500 transition-colors"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-800">{task.title}</p>
              {task.dueDate && (
                <p
                  className={`text-xs mt-0.5 font-medium ${
                    isOverdue(task.dueDate)
                      ? "text-red-500"
                      : isDueSoon(task.dueDate)
                      ? "text-amber-500"
                      : "text-slate-400"
                  }`}
                >
                  {isOverdue(task.dueDate)
                    ? `⚠️ Overdue · ${formatDue(task.dueDate)}`
                    : isDueSoon(task.dueDate)
                    ? `⏰ Due soon · ${formatDue(task.dueDate)}`
                    : `Due ${formatDue(task.dueDate)}`}
                </p>
              )}
            </div>
            <button
              onClick={() => deleteTask(task.id)}
              className="text-slate-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-sm flex-shrink-0"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Completed tasks */}
      {completed.length > 0 && (
        <div className="mt-3 border-t border-slate-50 pt-3">
          <button
            onClick={() => setShowCompleted((v) => !v)}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium"
          >
            {showCompleted ? "▾" : "▸"} {completed.length} completed
          </button>

          {showCompleted && (
            <div className="mt-2 space-y-1">
              {completed.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 py-2 opacity-50 group"
                >
                  <button
                    onClick={() => toggleTask(task.id)}
                    className="w-5 h-5 rounded-full bg-emerald-400 flex-shrink-0 mt-0.5 flex items-center justify-center"
                  >
                    <span className="text-white text-xs leading-none">✓</span>
                  </button>
                  <p className="text-sm text-slate-500 line-through flex-1">
                    {task.title}
                  </p>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-slate-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-sm flex-shrink-0"
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
