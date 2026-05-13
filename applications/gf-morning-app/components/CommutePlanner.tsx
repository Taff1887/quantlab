"use client";
import { useState } from "react";
import type { WharfName } from "../types";
import {
  filterTrips,
  toMins,
  type ScheduleTrip,
} from "../lib/scheduleService";

const FERRY_WHARVES: { label: string; value: WharfName }[] = [
  { label: "Taronga Zoo", value: "Taronga Zoo" },
  { label: "South Mosman", value: "South Mosman" },
  { label: "Mosman Bay", value: "Mosman Bay" },
  { label: "Cremorne Point", value: "Cremorne Point" },
  { label: "Old Cremorne", value: "Old Cremorne" },
];

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

/** Format YYYY-MM-DD → "Friday 20 March 2026" */
function formatDateLong(isoDate: string): string {
  // Parse as local date to avoid UTC offset shifting the day
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-AU", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function TripRow({ trip }: { trip: ScheduleTrip }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/40 overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-2">
        <span className="text-xl">⛴️</span>
        <div>
          <p className="text-sm font-bold text-slate-800">{trip.stopName}</p>
          <p className="text-xs text-slate-400">{trip.routeName}</p>
        </div>
      </div>

      <div className="mx-4 border-t border-slate-100" />

      <div className="grid grid-cols-3 px-4 py-3 text-center">
        {[
          { label: "Departs", value: trip.departureTime },
          { label: "→ Circular Quay", value: trip.destinationArrival },
          { label: "Crossing", value: `${trip.totalMins} min` },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs text-slate-400">{label}</p>
            <p className="text-sm font-bold text-slate-800">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CommutePlanner() {
  const [arrivalTime, setArrivalTime] = useState("09:00");
  const [date, setDate] = useState(tomorrowStr());
  const [selectedWharves, setSelectedWharves] = useState<WharfName[]>([
    "Taronga Zoo", "South Mosman", "Mosman Bay", "Cremorne Point", "Old Cremorne",
  ]);
  const [results, setResults] = useState<ScheduleTrip[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);

  function toggleWharf(w: WharfName) {
    setSelectedWharves((prev) =>
      prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]
    );
    setResults(null);
  }

  async function handlePlan() {
    setExpanded(false);
    setLoading(true);

    const fromMins = Math.max(0, toMins(arrivalTime) - 120);
    const fromH = String(Math.floor(fromMins / 60)).padStart(2, "0");
    const fromM = String(fromMins % 60).padStart(2, "0");
    const from = `${fromH}:${fromM}`;

    const url = `/api/transport?date=${date}&from=${from}`;
    let allTrips: ScheduleTrip[] = [];
    try {
      const res = await fetch(url);
      const data = res.ok ? await res.json() : null;
      allTrips = (data?.trips ?? []) as ScheduleTrip[];
      setIsLive(data?.isRealtime ?? false);
    } catch { /* leave allTrips empty */ }

    setLoading(false);

    // Ferry only — filter by mode then by selected wharves
    const ferryTrips = filterTrips(allTrips, { mode: "ferry", wharf: "all" });

    const wharfFiltered = selectedWharves.length === 0 || selectedWharves.length === FERRY_WHARVES.length
      ? ferryTrips
      : ferryTrips.filter((t) => selectedWharves.some((w) => t.stopName.includes(w)));

    // Include ferries arriving at CQ up to 5 mins after desired time
    const byMins = toMins(arrivalTime);
    const main = wharfFiltered
      .filter((t) => toMins(t.destinationArrival) <= byMins + 5)
      .sort((a, b) => toMins(b.destinationArrival) - toMins(a.destinationArrival)); // latest arrival first

    setResults(main);
  }

  const dateLabel = (() => {
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = tomorrowStr();
    if (date === today) return "Today";
    if (date === tomorrow) return "Tomorrow";
    return new Date(date).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "short" });
  })();

  const INITIAL_SHOW = 3;
  const visible = results ? (expanded ? results : results.slice(0, INITIAL_SHOW)) : [];
  const hasMore = results ? results.length > INITIAL_SHOW : false;

  return (
    <div className="card">
      {/* Grey header */}
      <div className="bg-gradient-to-r from-slate-500 to-slate-700 -mx-5 -mt-5 px-5 pt-4 pb-3 mb-4 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🗓️</span>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wide">Ferry Schedule</p>
              <p className="text-xs text-slate-300">Mosman → Circular Quay</p>
            </div>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            isLive
              ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/30"
              : "bg-white/10 text-white/50"
          }`}>
            {isLive ? "🟢 Live" : "Schedule"}
          </span>
        </div>
      </div>

      {/* Arrive by + Date */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="label">Arrive by</label>
          <input
            type="time"
            value={arrivalTime}
            onChange={(e) => { setArrivalTime(e.target.value); setResults(null); }}
            className="input text-sm font-semibold"
          />
        </div>
        <div>
          <label className="label">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setResults(null); }}
            className="input text-sm"
          />
        </div>
      </div>

      {/* Wharf filter chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {FERRY_WHARVES.map((w) => {
          const active = selectedWharves.includes(w.value);
          return (
            <button
              key={w.value}
              onClick={() => toggleWharf(w.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {w.label}
            </button>
          );
        })}
      </div>

      <button onClick={handlePlan} disabled={loading} className="btn-primary w-full mb-4">
        {loading ? "Loading…" : `Show options for ${dateLabel}`}
      </button>

      {/* Results */}
      {results !== null && (
        <div className="space-y-3">
          {results.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-6">
              No ferries arrive by {arrivalTime} for the selected wharves.
            </p>
          ) : (
            <>
              <p className="text-xs text-slate-400 font-medium text-center">
                {results.length} option{results.length !== 1 ? "s" : ""} · {formatDateLong(date)}
              </p>

              {visible.map((t) => <TripRow key={t.id} trip={t} />)}

              {hasMore && (
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="w-full py-2 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  {expanded
                    ? "▲ Show less"
                    : `▼ Show ${results.length - INITIAL_SHOW} more option${results.length - INITIAL_SHOW !== 1 ? "s" : ""}`}
                </button>
              )}
            </>
          )}

          <p className="text-xs text-slate-300 text-center mt-2">
            {isLive ? "Live TfNSW data" : "TfNSW schedule · add TFNSW_API_KEY for live times"}
          </p>
        </div>
      )}
    </div>
  );
}
