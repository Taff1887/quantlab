"use client";

import { useEffect, useState } from "react";

const LS_KEY = "calendar_events_local";

interface CalEvent {
  id: string;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;  // YYYY-MM-DD (inclusive), only set for multi-day
}

const SEED_EVENTS: CalEvent[] = [
  {
    id: "seed-baptism",
    title: "Maisie's baptism — bring camera 📷",
    startDate: "2026-05-16",
  },
  {
    id: "seed-surgery",
    title: "Pray boyf not die in Surgery 🙏",
    startDate: "2026-05-18",
  },
  {
    id: "seed-tavvy",
    title: "Look after Tavvy 🐾",
    startDate: "2026-05-22",
    endDate: "2026-05-24",
  },
];

function lsLoad(): CalEvent[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null as unknown as CalEvent[];
    return JSON.parse(raw) as CalEvent[];
  } catch { return null as unknown as CalEvent[]; }
}

function lsSave(events: CalEvent[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(events)); } catch { /* ignore */ }
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toYMD(date: Date): string {
  return date.toISOString().split("T")[0];
}

function dateFromYMD(ymd: string): Date {
  return new Date(ymd + "T00:00:00");
}

/** Returns true if `date` (YYYY-MM-DD) falls within [start, end] inclusive */
function isInRange(date: string, start: string, end?: string): boolean {
  if (!end) return date === start;
  return date >= start && date <= end;
}

/** Colour palette for events (cycles) */
const PALETTE = [
  "bg-violet-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-sky-500",
  "bg-pink-500",
];

function eventColor(idx: number) {
  return PALETTE[idx % PALETTE.length];
}

export default function CalendarCard() {
  const today = toYMD(new Date());
  const todayDate = new Date();

  const [year, setYear] = useState(todayDate.getFullYear());
  const [month, setMonth] = useState(todayDate.getMonth()); // 0-based
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Add-event form state
  const [showAdd, setShowAdd] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addStart, setAddStart] = useState("");
  const [addEnd, setAddEnd] = useState("");

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  useEffect(() => {
    const stored = lsLoad();
    if (stored === null || stored === undefined) {
      // First load — seed default events
      setEvents(SEED_EVENTS);
      lsSave(SEED_EVENTS);
    } else {
      setEvents(stored);
    }
  }, []);

  // ── Month navigation ────────────────────────────────────────────────────────

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  // ── Calendar grid ───────────────────────────────────────────────────────────

  // Days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Day-of-week of the 1st (0 = Sun)
  const startDow = new Date(year, month, 1).getDay();
  // Total cells (fill to complete weeks)
  const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;

  const cells: (string | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startDow + 1;
    if (dayNum < 1 || dayNum > daysInMonth) {
      cells.push(null);
    } else {
      const mm = String(month + 1).padStart(2, "0");
      const dd = String(dayNum).padStart(2, "0");
      cells.push(`${year}-${mm}-${dd}`);
    }
  }

  // Events on a given day
  function eventsOnDay(ymd: string) {
    return events.filter((e) => isInRange(ymd, e.startDate, e.endDate));
  }

  // ── Event CRUD ──────────────────────────────────────────────────────────────

  function handleAddSubmit() {
    if (!addTitle.trim() || !addStart) return;
    const newEvent: CalEvent = {
      id: crypto.randomUUID(),
      title: addTitle.trim(),
      startDate: addStart,
      endDate: addEnd && addEnd > addStart ? addEnd : undefined,
    };
    const updated = [...events, newEvent];
    setEvents(updated);
    lsSave(updated);
    setShowAdd(false);
    setAddTitle("");
    setAddStart("");
    setAddEnd("");
    setSelectedDay(addStart);
  }

  function deleteEvent(id: string) {
    const updated = events.filter((e) => e.id !== id);
    setEvents(updated);
    lsSave(updated);
  }

  function openEdit(ev: CalEvent) {
    setEditId(ev.id);
    setEditTitle(ev.title);
    setEditStart(ev.startDate);
    setEditEnd(ev.endDate ?? "");
  }

  function saveEdit() {
    if (!editTitle.trim() || !editStart) return;
    const updated = events.map((e) =>
      e.id === editId
        ? {
            ...e,
            title: editTitle.trim(),
            startDate: editStart,
            endDate: editEnd && editEnd > editStart ? editEnd : undefined,
          }
        : e
    );
    setEvents(updated);
    lsSave(updated);
    setEditId(null);
  }

  // ── Selected day events ─────────────────────────────────────────────────────

  const selectedEvents = selectedDay ? eventsOnDay(selectedDay) : [];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">📅 Calendar</h2>
        <button
          onClick={() => {
            setShowAdd(true);
            setAddStart(selectedDay ?? today);
          }}
          className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-800 text-white hover:bg-slate-700 transition-colors"
        >
          + Add event
        </button>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
        >
          ‹
        </button>
        <span className="text-sm font-bold text-slate-800">
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
        >
          ›
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-slate-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((ymd, i) => {
          if (!ymd) {
            return <div key={`empty-${i}`} className="h-10" />;
          }
          const dayEvs = eventsOnDay(ymd);
          const isToday2 = ymd === today;
          const isSelected = ymd === selectedDay;

          return (
            <button
              key={ymd}
              onClick={() => setSelectedDay(ymd === selectedDay ? null : ymd)}
              className={`relative flex flex-col items-center justify-start pt-1 h-10 rounded-xl transition-colors ${
                isSelected
                  ? "bg-slate-800 text-white"
                  : isToday2
                  ? "bg-blue-50 text-blue-700 font-bold"
                  : "hover:bg-slate-50 text-slate-700"
              }`}
            >
              <span className={`text-xs font-semibold leading-none ${isToday2 && !isSelected ? "" : ""}`}>
                {parseInt(ymd.split("-")[2], 10)}
              </span>
              {/* Event dots */}
              {dayEvs.length > 0 && (
                <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center px-0.5">
                  {dayEvs.slice(0, 3).map((ev, idx) => (
                    <span
                      key={ev.id}
                      className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white/80" : eventColor(events.indexOf(ev))}`}
                    />
                  ))}
                  {dayEvs.length > 3 && (
                    <span className={`text-[8px] leading-none ${isSelected ? "text-white/70" : "text-slate-400"}`}>
                      +{dayEvs.length - 3}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day panel */}
      {selectedDay && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-slate-700">
              {dateFromYMD(selectedDay).toLocaleDateString("en-AU", {
                weekday: "long", day: "numeric", month: "long",
              })}
            </p>
            <button
              onClick={() => { setShowAdd(true); setAddStart(selectedDay); }}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold transition-colors"
            >
              + Add
            </button>
          </div>

          {selectedEvents.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-3">No events</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((ev, idx) => (
                <div key={ev.id}>
                  {editId === ev.id ? (
                    /* Edit form */
                    <div className="flex flex-col gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                      <input
                        className="input text-sm"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                        autoFocus
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="label text-xs">Start date</label>
                          <input
                            type="date"
                            className="input text-xs"
                            value={editStart}
                            onChange={(e) => setEditStart(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="label text-xs">End date (optional)</label>
                          <input
                            type="date"
                            className="input text-xs"
                            value={editEnd}
                            onChange={(e) => setEditEnd(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveEdit} className="btn-primary text-xs py-1 px-3">Save</button>
                        <button onClick={() => setEditId(null)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 px-3 py-2 rounded-xl bg-slate-50 group">
                      <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${eventColor(events.indexOf(ev))}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 leading-snug">{ev.title}</p>
                        {ev.endDate && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {dateFromYMD(ev.startDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                            {" → "}
                            {dateFromYMD(ev.endDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => openEdit(ev)}
                        className="text-slate-200 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-all text-xs flex-shrink-0"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteEvent(ev.id)}
                        className="text-slate-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-sm flex-shrink-0"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add event form */}
      {showAdd && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-sm font-bold text-slate-700 mb-3">New event</p>
          <div className="flex flex-col gap-2">
            <input
              className="input text-sm"
              placeholder="Event title…"
              value={addTitle}
              onChange={(e) => setAddTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddSubmit()}
              autoFocus
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label text-xs">Start date</label>
                <input
                  type="date"
                  className="input text-xs"
                  value={addStart}
                  onChange={(e) => setAddStart(e.target.value)}
                />
              </div>
              <div>
                <label className="label text-xs">End date (optional)</label>
                <input
                  type="date"
                  className="input text-xs"
                  value={addEnd}
                  onChange={(e) => setAddEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-1">
              <button onClick={handleAddSubmit} className="btn-primary text-sm py-2 flex-1">
                Save event
              </button>
              <button
                onClick={() => { setShowAdd(false); setAddTitle(""); setAddStart(""); setAddEnd(""); }}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
