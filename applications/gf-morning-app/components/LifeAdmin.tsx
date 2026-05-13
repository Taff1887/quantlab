"use client";

import { useEffect, useRef, useState } from "react";
import { supabase, SUPABASE_ENABLED } from "../lib/supabase";
import type { Task } from "../types";

const LS_KEY = "tasks_local";

function lsLoad(): Task[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]") as Task[];
  } catch { return []; }
}

function lsSave(tasks: Task[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(tasks)); } catch { /* ignore */ }
}

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
  return new Date(dueDate + "T00:00:00").toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}

// Map DB row → Task
function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    completed: row.completed as boolean,
    dueDate: (row.due_date as string | null) ?? undefined,
    createdAt: row.created_at as string,
  };
}

export default function LifeAdmin() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [useLocal, setUseLocal] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  // Inline edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDue, setEditDue] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  async function fetchTasks() {
    setLoading(true);
    if (!SUPABASE_ENABLED) {
      setUseLocal(true);
      setTasks(lsLoad());
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      setTasks((data ?? []).map(rowToTask));
      setUseLocal(false);
    } catch {
      setUseLocal(true);
      setTasks(lsLoad());
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  async function handleAdd() {
    const trimmed = title.trim();
    if (!trimmed) return;
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const newTask: Task = {
      id,
      title: trimmed,
      completed: false,
      dueDate: dueDate || undefined,
      createdAt,
    };

    if (useLocal || !SUPABASE_ENABLED) {
      const updated = [...tasks, newTask];
      setTasks(updated);
      lsSave(updated);
    } else {
      try {
        await supabase.from("tasks").insert({
          id,
          title: trimmed,
          completed: false,
          due_date: dueDate || null,
          created_at: createdAt,
        });
        fetchTasks();
      } catch {
        setUseLocal(true);
        const updated = [...tasks, newTask];
        setTasks(updated);
        lsSave(updated);
      }
    }
    setTitle("");
    setDueDate("");
    inputRef.current?.focus();
  }

  async function toggleTask(id: string, current: boolean) {
    if (useLocal || !SUPABASE_ENABLED) {
      const updated = tasks.map((t) => t.id === id ? { ...t, completed: !current } : t);
      setTasks(updated);
      lsSave(updated);
    } else {
      try {
        await supabase.from("tasks").update({ completed: !current }).eq("id", id);
        fetchTasks();
      } catch {
        setUseLocal(true);
        const updated = tasks.map((t) => t.id === id ? { ...t, completed: !current } : t);
        setTasks(updated);
        lsSave(updated);
      }
    }
  }

  async function deleteTask(id: string) {
    if (useLocal || !SUPABASE_ENABLED) {
      const updated = tasks.filter((t) => t.id !== id);
      setTasks(updated);
      lsSave(updated);
    } else {
      try {
        await supabase.from("tasks").delete().eq("id", id);
        fetchTasks();
      } catch {
        setUseLocal(true);
        const updated = tasks.filter((t) => t.id !== id);
        setTasks(updated);
        lsSave(updated);
      }
    }
  }

  function openEdit(task: Task) {
    setEditId(task.id);
    setEditTitle(task.title);
    setEditDue(task.dueDate ?? "");
  }

  async function saveEdit(id: string) {
    const trimmed = editTitle.trim();
    if (!trimmed) return;

    if (useLocal || !SUPABASE_ENABLED) {
      const updated = tasks.map((t) =>
        t.id === id ? { ...t, title: trimmed, dueDate: editDue || undefined } : t
      );
      setTasks(updated);
      lsSave(updated);
    } else {
      try {
        await supabase
          .from("tasks")
          .update({ title: trimmed, due_date: editDue || null })
          .eq("id", id);
        fetchTasks();
      } catch {
        setUseLocal(true);
        const updated = tasks.map((t) =>
          t.id === id ? { ...t, title: trimmed, dueDate: editDue || undefined } : t
        );
        setTasks(updated);
        lsSave(updated);
      }
    }
    setEditId(null);
  }

  if (loading) {
    return <div className="card animate-pulse h-36" />;
  }

  const active = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);

  return (
    <div className="card">
      <div className="bg-gradient-to-r from-sky-400 to-blue-500 -mx-5 -mt-5 px-5 pt-4 pb-3 mb-4 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">✅</span>
            <p className="text-xs font-bold text-white uppercase tracking-wide">Life Admin</p>
            {useLocal && <span className="text-[10px] text-sky-200">local only</span>}
          </div>
          {active.length > 0 && (
            <span className="text-xs font-bold bg-white/20 text-white px-2.5 py-1 rounded-full">
              {active.length} active
            </span>
          )}
        </div>
      </div>

      {/* Add task row */}
      <div className="flex gap-2 mb-2">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add a task…"
          className="input flex-1"
        />
        <button
          onClick={handleAdd}
          className="btn-primary px-4 text-base leading-none"
        >
          +
        </button>
      </div>

      {/* Optional due date */}
      <div className="mb-4 flex items-center gap-2">
        <label className="text-xs text-slate-400 whitespace-nowrap">
          Due date (optional)
        </label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="input flex-1 text-xs"
        />
      </div>

      {/* Empty states */}
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

      {/* Active tasks */}
      <div className="space-y-1">
        {active.map((task) => (
          <div key={task.id} className="group">
            {editId === task.id ? (
              /* Inline edit form */
              <div className="flex flex-col gap-2 py-2 px-3 rounded-xl bg-slate-50 border border-slate-100">
                <input
                  className="input text-sm"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEdit(task.id)}
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <label className="label text-xs whitespace-nowrap">Due</label>
                  <input
                    type="date"
                    className="input flex-1 text-xs"
                    value={editDue}
                    onChange={(e) => setEditDue(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(task.id)}
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
              <div className="flex items-start gap-3 py-2.5">
                {/* Toggle complete */}
                <button
                  onClick={() => toggleTask(task.id, task.completed)}
                  className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0 mt-0.5 hover:border-emerald-500 transition-colors"
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${
                      isOverdue(task.dueDate)
                        ? "text-red-600"
                        : isDueSoon(task.dueDate)
                        ? "text-amber-600"
                        : "text-slate-800"
                    }`}
                  >
                    {task.title}
                  </p>
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
                {/* Edit pencil */}
                <button
                  onClick={() => openEdit(task)}
                  className="text-slate-200 hover:text-slate-500 transition-colors opacity-0 group-hover:opacity-100 text-xs flex-shrink-0"
                  title="Edit"
                >
                  ✏️
                </button>
                {/* Delete */}
                <button
                  onClick={() => deleteTask(task.id)}
                  className="text-slate-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-sm flex-shrink-0"
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Completed section */}
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
                    onClick={() => toggleTask(task.id, task.completed)}
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
