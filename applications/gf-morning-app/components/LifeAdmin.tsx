"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Task } from "../types";

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
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: true });
    setTasks((data ?? []).map(rowToTask));
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
    await supabase.from("tasks").insert({
      id,
      title: trimmed,
      completed: false,
      due_date: dueDate || null,
      created_at: createdAt,
    });
    setTitle("");
    setDueDate("");
    inputRef.current?.focus();
    fetchTasks();
  }

  async function toggleTask(id: string, current: boolean) {
    await supabase.from("tasks").update({ completed: !current }).eq("id", id);
    fetchTasks();
  }

  async function deleteTask(id: string) {
    await supabase.from("tasks").delete().eq("id", id);
    fetchTasks();
  }

  function openEdit(task: Task) {
    setEditId(task.id);
    setEditTitle(task.title);
    setEditDue(task.dueDate ?? "");
  }

  async function saveEdit(id: string) {
    const trimmed = editTitle.trim();
    if (!trimmed) return;
    await supabase
      .from("tasks")
      .update({ title: trimmed, due_date: editDue || null })
      .eq("id", id);
    setEditId(null);
    fetchTasks();
  }

  if (loading) {
    return <div className="card animate-pulse h-36" />;
  }

  const active = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">✅ Life Admin</h2>
        {active.length > 0 && (
          <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">
            {active.length} active
          </span>
        )}
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
