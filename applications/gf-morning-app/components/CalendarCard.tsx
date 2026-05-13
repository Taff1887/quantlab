"use client";

import { useEffect, useState } from "react";
import { supabase, SUPABASE_ENABLED } from "../lib/supabase";

const LS_KEY = "calendar_events_local";

interface CalEvent {
  id: string;
  title: string;
  startDate: string;
  endDate?: string;
}

// DB row uses snake_case
function rowToEvent(row: Record<string, unknown>): CalEvent {
  return {
    id: row.id as string,
    title: row.title as string,
    startDate: row.start_date as string,
    endDate: (row.end_date as string | null) ?? undefined,
  };
}

const SEED_EVENTS: CalEvent[] = [
  { id: "seed-baptism", title: "Maisie's baptism — bring camera 📷", startDate: "2026-05-16" },
  { id: "seed-surgery", title: "Pray boyf not die in Surgery 🙏", startDate: "2026-05-18" },
  { id: "seed-tavvy",   title: "Look after Tavvy 🐾", startDate: "2026-05-22", endDate: "2026-05-24" },
];

function lsLoad(): CalEvent[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CalEvent[];
  } catch { return null; }
}

function lsSave(events: CalEvent[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(events)); } catch { /* ignore */ }
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function toYMD(date: Date): string { return date.toISOString().split("T")[0]; }
function dateFromYMD(ymd: string): Date { return new Date(ymd + "T00:00:00"); }

function isInRange(date: string, start: string, end?: string): boolean {
  if (!end) return date === start;
  return date >= start && date <= end;
}

const PALETTE = ["bg-violet-500","bg-emerald-500","bg-rose-500","bg-amber-500","bg-sky-500","bg-pink-500"];
function eventColor(idx: number) { return PALETTE[idx % PALETTE.length]; }

export default function CalendarCard() {
  const today = toYMD(new Date());
  const todayDate = new Date();

  const [year, setYear] = useState(todayDate.getFullYear());
  const [month, setMonth] = useState(todayDate.getMonth());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [useLocal, setUseLocal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addStart, setAddStart] = useState("");
  const [addEnd, setAddEnd] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  // ── Fetch ──────────────────────────────────────────────────────────────────

  async function fetchEvents() {
    if (!SUPABASE_ENABLED) {
      setUseLocal(true);
      const stored = lsLoad();
      setEvents(stored ?? SEED_EVENTS);
      if (!stored) lsSave(SEED_EVENTS);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .order("start_date", { ascending: true });
      if (error) throw error;
      const mapped = ((data ?? []) as Record<string, unknown>[]).map(rowToEvent);
      setEvents(mapped);
      setUseLocal(false);
    } catch {
      setUseLocal(true);
      const stored = lsLoad();
      setEvents(stored ?? SEED_EVENTS);
      if (!stored) lsSave(SEED_EVENTS);
    }
  }

  useEffect(() => { fetchEvents(); }, []);

  // ── Month navigation ───────────────────────────────────────────────────────

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  // ── Calendar grid ──────────────────────────────────────────────────────────

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = new Date(year, month, 1).getDay();
  const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;

  const cells: (string | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startDow + 1;
    if (dayNum < 1 || dayNum > daysInMonth) { cells.push(null); continue; }
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(dayNum).padStart(2, "0");
    cells.push(`${year}-${mm}-${dd}`);
  }

  function eventsOnDay(ymd: string) {
    return events.filter((e) => isInRange(ymd, e.startDate, e.endDate));
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  async function handleAddSubmit() {
    if (!addTitle.trim() || !addStart) return;
    const newEvent: CalEvent = {
      id: crypto.randomUUID(),
      title: addTitle.trim(),
      startDate: addStart,
      endDate: addEnd && addEnd > addStart ? addEnd : undefined,
    };

    if (useLocal || !SUPABASE_ENABLED) {
      const updated = [...events, newEvent].sort((a, b) => a.startDate.localeCompare(b.startDate));
      setEvents(updated);
      lsSave(updated);
    } else {
      try {
        await supabase.from("calendar_events").insert({
          id: newEvent.id,
          title: newEvent.title,
          start_date: newEvent.startDate,
          end_date: newEvent.endDate ?? null,
        });
        fetchEvents();
      } catch {
        setUseLocal(true);
        const updated = [...events, newEvent].sort((a, b) => a.startDate.localeCompare(b.startDate));
        setEvents(updated);
        lsSave(updated);
      }
    }

    setShowAdd(false);
    setAddTitle(""); setAddStart(""); setAddEnd("");
    setSelectedDay(addStart);
  }

  async function deleteEvent(id: string) {
    if (useLocal || !SUPABASE_ENABLED) {
      const updated = events.filter((e) => e.id !== id);
      setEvents(updated);
      lsSave(updated);
    } else {
      try {
        await supabase.from("calendar_events").delete().eq("id", id);
        fetchEvents();
      } catch {
        setUseLocal(true);
        const updated = events.filter((e) => e.id !== id);
        setEvents(updated);
        lsSave(updated);
      }
    }
  }

  function openEdit(ev: CalEvent) {
    setEditId(ev.id);
    setEditTitle(ev.title);
    setEditStart(ev.startDate);
    setEditEnd(ev.endDate ?? "");
  }

  async function saveEdit() {
    if (!editTitle.trim() || !editStart) return;
    const updated: CalEvent = {
      id: editId!,
      title: editTitle.trim(),
      startDate: editStart,
      endDate: editEnd && editEnd > editStart ? editEnd : undefined,
    };

    if (useLocal || !SUPABASE_ENABLED) {
      const updatedList = events.map((e) => e.id === editId ? updated : e);
      setEvents(updatedList);
      lsSave(updatedList);
    } else {
      try {
        await supabase.from("calendar_events").update({
          title: updated.title,
          start_date: updated.startDate,
          end_date: updated.endDate ?? null,
        }).eq("id", editId!);
        fetchEvents();
      } catch {
        setUseLocal(true);
        const updatedList = events.map((e) => e.id === editId ? updated : e);
        setEvents(updatedList);
        lsSave(updatedList);
      }
    }
    setEditId(null);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const selectedEvents = selectedDay ? eventsOnDay(selectedDay) : [];

  // Next upcoming event (today or future, sorted by start date)
  const nextEvent = [...events]
    .filter((e) => e.startDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0] ?? null;

  function daysUntil(dateStr: string): number {
    return Math.round(
      (dateFromYMD(dateStr).getTime() - dateFromYMD(today).getTime()) / 86_400_000
    );
  }

  return (
    <div className="card">
      <div className="bg-gradient-to-r from-sky-400 to-blue-500 -mx-5 -mt-5 px-5 pt-4 pb-3 mb-4 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📅</span>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wide">Calendar</p>
              {useLocal && <p className="text-[10px] text-sky-200">local only</p>}
            </div>
          </div>
          <button
            onClick={() => { setShowAdd(true); setAddStart(selectedDay ?? today); }}
            className="text-xs font-semibold bg-white/20 text-white px-3 py-1.5 rounded-full hover:bg-white/30 transition-colors"
          >
            + Add event
          </button>
        </div>
      </div>

      {/* Next upcoming event */}
      {nextEvent && (
        <div
          className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 mb-4 cursor-pointer hover:bg-blue-100/60 transition-colors"
          onClick={() => {
            setSelectedDay(nextEvent.startDate);
            setYear(dateFromYMD(nextEvent.startDate).getFullYear());
            setMonth(dateFromYMD(nextEvent.startDate).getMonth());
          }}
        >
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wide mb-1">Next up</p>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-800 leading-snug flex-1">{nextEvent.title}</p>
            <div className="text-right flex-shrink-0">
              {daysUntil(nextEvent.startDate) === 0 ? (
                <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Today</span>
              ) : daysUntil(nextEvent.startDate) === 1 ? (
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Tomorrow</span>
              ) : (
                <span className="text-xs font-bold text-slate-500">
                  in {daysUntil(nextEvent.startDate)} days
                </span>
              )}
              <p className="text-xs text-slate-400 mt-0.5">
                {dateFromYMD(nextEvent.startDate).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Month navigator */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">‹</button>
        <span className="text-sm font-bold text-slate-800">{MONTH_NAMES[month]} {year}</span>
        <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">›</button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-slate-400 py-1">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((ymd, i) => {
          if (!ymd) return <div key={`empty-${i}`} className="h-10" />;
          const dayEvs = eventsOnDay(ymd);
          const isToday2 = ymd === today;
          const isSelected = ymd === selectedDay;
          return (
            <button
              key={ymd}
              onClick={() => setSelectedDay(ymd === selectedDay ? null : ymd)}
              className={`relative flex flex-col items-center justify-start pt-1 h-10 rounded-xl transition-colors ${
                isSelected ? "bg-slate-800 text-white"
                : isToday2 ? "bg-blue-50 text-blue-700 font-bold"
                : "hover:bg-slate-50 text-slate-700"
              }`}
            >
              <span className="text-xs font-semibold leading-none">{parseInt(ymd.split("-")[2], 10)}</span>
              {dayEvs.length > 0 && (
                <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center px-0.5">
                  {dayEvs.slice(0, 3).map((ev) => (
                    <span key={ev.id} className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white/80" : eventColor(events.indexOf(ev))}`} />
                  ))}
                  {dayEvs.length > 3 && (
                    <span className={`text-[8px] leading-none ${isSelected ? "text-white/70" : "text-slate-400"}`}>+{dayEvs.length - 3}</span>
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
              {dateFromYMD(selectedDay).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <button onClick={() => { setShowAdd(true); setAddStart(selectedDay); }} className="text-xs text-blue-600 hover:text-blue-700 font-semibold transition-colors">+ Add</button>
          </div>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-3">No events</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((ev) => (
                <div key={ev.id}>
                  {editId === ev.id ? (
                    <div className="flex flex-col gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                      <input className="input text-sm" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEdit()} autoFocus />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="label text-xs">Start date</label>
                          <input type="date" className="input text-xs" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
                        </div>
                        <div>
                          <label className="label text-xs">End date (optional)</label>
                          <input type="date" className="input text-xs" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
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
                      <button onClick={() => openEdit(ev)} className="text-slate-200 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-all text-xs flex-shrink-0" title="Edit">✏️</button>
                      <button onClick={() => deleteEvent(ev.id)} className="text-slate-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-sm flex-shrink-0" title="Delete">✕</button>
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
            <input className="input text-sm" placeholder="Event title…" value={addTitle} onChange={(e) => setAddTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddSubmit()} autoFocus />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label text-xs">Start date</label>
                <input type="date" className="input text-xs" value={addStart} onChange={(e) => setAddStart(e.target.value)} />
              </div>
              <div>
                <label className="label text-xs">End date (optional)</label>
                <input type="date" className="input text-xs" value={addEnd} onChange={(e) => setAddEnd(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 mt-1">
              <button onClick={handleAddSubmit} className="btn-primary text-sm py-2 flex-1">Save event</button>
              <button onClick={() => { setShowAdd(false); setAddTitle(""); setAddStart(""); setAddEnd(""); }} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
