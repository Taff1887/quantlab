"use client";
import { useMemo, useState } from "react";
import type { WharfName, PrimaryMode } from "../types";
import {
  generateAllTrips,
  filterTrips,
  tripsArrivingBy,
  formatDist,
  toMins,
  type ScheduleTrip,
} from "../lib/scheduleService";

type SortKey = "arrival" | "commute";

const FERRY_WHARVES: { label: string; value: WharfName | "all" }[] = [
  { label: "All wharves", value: "all" },
  { label: "Taronga Zoo", value: "Taronga Zoo" },
  { label: "South Mosman", value: "South Mosman" },
  { label: "Mosman Bay", value: "Mosman Bay" },
  { label: "Cremorne Point", value: "Cremorne Point" },
];

const BUS_ROUTES = [
  { label: "All buses", value: "all" },
  { label: "Route 144 — Military Rd", value: "bus-144" },
  { label: "Route 178 — Spit Rd", value: "bus-178" },
];

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

// Compact trip row — used for greyed/black nearby rows
function TripRow({
  trip,
  dim,
}: {
  trip: ScheduleTrip;
  dim?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all ${
        dim ? "border-slate-100 bg-white opacity-40" : "border-slate-100 bg-slate-50/40"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{trip.mode === "ferry" ? "⛴️" : "🚌"}</span>
          <div>
            <p className="text-sm font-bold text-slate-800">{trip.stopName}</p>
            <p className="text-xs text-slate-400">{trip.routeName}</p>
          </div>
        </div>
      </div>

      {/* Walk / Drive chips */}
      <div className="flex gap-4 px-4 pb-2">
        <span className="text-xs text-slate-500 flex items-center gap-1">
          🚶 <span className="font-semibold text-slate-700">{trip.walkMins} min</span>
          <span className="text-slate-300">·</span> {formatDist(trip.walkDistanceM)}
        </span>
        <span className="text-xs text-slate-500 flex items-center gap-1">
          🚗 <span className="font-semibold text-slate-700">{trip.driveMins} min</span>
          <span className="text-slate-300">·</span> {formatDist(trip.driveDistanceM)}
        </span>
      </div>

      <div className="mx-4 border-t border-slate-100" />

      {/* Departure → Arrival grid */}
      <div className="grid grid-cols-3 px-4 py-2.5 text-center">
        {[
          { label: "Departs", value: trip.departureTime },
          { label: trip.destinationStop, value: trip.destinationArrival },
          { label: "Office", value: trip.officeArrival },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs text-slate-400">{label}</p>
            <p className="text-sm font-bold text-slate-800">{value}</p>
          </div>
        ))}
      </div>

      <div className="mx-4 border-t border-slate-100" />

      {/* Leave by */}
      <div className="px-4 py-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
          Leave home by
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-xl px-3 py-2 text-center border border-slate-100">
            <p className="text-xs text-slate-400 mb-0.5">🚶 Walking</p>
            <p className="text-base font-bold text-slate-800">{trip.leaveByWalking}</p>
          </div>
          <div className="bg-white rounded-xl px-3 py-2 text-center border border-slate-100">
            <p className="text-xs text-slate-400 mb-0.5">🚗 Driving</p>
            <p className="text-base font-bold text-slate-800">{trip.leaveByDriving}</p>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-2 text-center">
          Total journey: {trip.totalMins} min
        </p>
      </div>
    </div>
  );
}

interface Results {
  main: ScheduleTrip[];
  justLate: ScheduleTrip[];   // arrives target+1 → target+5  (shown in black, slightly dim)
  nearlyLate: ScheduleTrip[]; // arrives target+6 → target+15 (greyed out)
}

export default function CommutePlanner() {
  const [arrivalTime, setArrivalTime] = useState("09:00");
  const [date, setDate] = useState(tomorrowStr());
  const [mode, setMode] = useState<PrimaryMode>("all");
  const [ferryWharf, setFerryWharf] = useState<WharfName | "all">("all");
  const [busRoute, setBusRoute] = useState("all");
  const [sort, setSort] = useState<SortKey>("arrival");
  const [results, setResults] = useState<Results | null>(null);
  const [expanded, setExpanded] = useState(false);

  const allTrips = useMemo(() => generateAllTrips(), []);

  function handlePlan() {
    setExpanded(false);
    const filtered = filterTrips(allTrips, {
      mode: mode === "all" ? undefined : mode,
      wharf: mode === "ferry" ? ferryWharf : undefined,
      busRoute: mode === "bus" ? busRoute : undefined,
    });

    const byMins = toMins(arrivalTime);

    // Main: arrives ≤ target AND ≥ target - 45min
    const onTime = tripsArrivingBy(filtered, arrivalTime).filter(
      (t) => toMins(t.officeArrival) >= byMins - 45
    );

    // Just late: arrives target+1 → target+5 (shown in black)
    const justLate = filtered
      .filter((t) => {
        const a = toMins(t.officeArrival);
        return a > byMins && a <= byMins + 5;
      })
      .sort((a, b) => toMins(a.officeArrival) - toMins(b.officeArrival));

    // Nearly late: arrives target+6 → target+15 (greyed)
    const nearlyLate = filtered
      .filter((t) => {
        const a = toMins(t.officeArrival);
        return a > byMins + 5 && a <= byMins + 15;
      })
      .sort((a, b) => toMins(a.officeArrival) - toMins(b.officeArrival));

    // Sort main results — arrival = latest first (closest to target at top), commute = shortest first
    const sortFn = sort === "arrival"
      ? (a: ScheduleTrip, b: ScheduleTrip) => toMins(b.officeArrival) - toMins(a.officeArrival)
      : (a: ScheduleTrip, b: ScheduleTrip) => a.totalMins - b.totalMins;

    setResults({ main: onTime.sort(sortFn), justLate, nearlyLate });
  }

  const dateLabel = (() => {
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = tomorrowStr();
    if (date === today) return "Today";
    if (date === tomorrow) return "Tomorrow";
    return new Date(date).toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "short",
    });
  })();

  const INITIAL_SHOW = 3;
  const visibleMain = results
    ? expanded
      ? results.main
      : results.main.slice(0, INITIAL_SHOW)
    : [];
  const hasMore = results ? results.main.length > INITIAL_SHOW : false;

  return (
    <div className="card">
      <div className="mb-4">
        <h2 className="section-title">🗓️ Commute Planner</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Plan ahead — what time do you need to be at the office?
        </p>
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

      {/* Sort pills */}
      <div className="flex gap-2 mb-3 items-center flex-wrap">
        <span className="text-xs text-slate-400">Sort:</span>
        {([
          { key: "arrival", label: "Arrival" },
          { key: "commute", label: "Commute time" },
        ] as { key: SortKey; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setSort(key); setResults(null); }}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              sort === key
                ? "bg-slate-800 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Mode toggle */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl mb-3">
        {(["all", "ferry", "bus"] as PrimaryMode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setResults(null); }}
            className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${
              mode === m
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {m === "all" ? "All" : m === "ferry" ? "⛴️ Ferry" : "🚌 Bus"}
          </button>
        ))}
      </div>

      {/* Secondary filter */}
      {mode === "ferry" && (
        <select
          value={ferryWharf}
          onChange={(e) => { setFerryWharf(e.target.value as WharfName | "all"); setResults(null); }}
          className="input mb-3 text-sm"
        >
          {FERRY_WHARVES.map((w) => (
            <option key={w.value} value={w.value}>{w.label}</option>
          ))}
        </select>
      )}
      {mode === "bus" && (
        <select
          value={busRoute}
          onChange={(e) => { setBusRoute(e.target.value); setResults(null); }}
          className="input mb-3 text-sm"
        >
          {BUS_ROUTES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      )}

      <button onClick={handlePlan} className="btn-primary w-full mb-4">
        Show options for {dateLabel}
      </button>

      {/* Results */}
      {results !== null && (
        <div className="space-y-3">
          {results.main.length === 0 && results.justLate.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-6">
              No options arrive within 45 min of {arrivalTime}. Try a later time.
            </p>
          ) : (
            <>
              {/* Just late — arrives target+1 to target+5 — shown first, in black */}
              {results.justLate.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 border-t border-slate-100" />
                    <span className="text-xs text-slate-400 font-medium flex-shrink-0">
                      Just after — up to 5 min late
                    </span>
                    <div className="flex-1 border-t border-slate-100" />
                  </div>
                  <div className="space-y-3">
                    {results.justLate.map((t) => (
                      <TripRow key={t.id} trip={t} dim={false} />
                    ))}
                  </div>
                </div>
              )}

              {results.main.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 border-t border-slate-100" />
                  <span className="text-xs text-slate-400 font-medium flex-shrink-0">
                    On time — {results.main.length} option{results.main.length !== 1 ? "s" : ""}
                  </span>
                  <div className="flex-1 border-t border-slate-100" />
                </div>
              )}

              {/* On-time results — latest arrival first */}
              {visibleMain.map((t) => (
                <TripRow key={t.id} trip={t} />
              ))}

              {/* Show more / less */}
              {hasMore && (
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="w-full py-2 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  {expanded
                    ? "▲ Show less"
                    : `▼ Show ${results.main.length - INITIAL_SHOW} more option${results.main.length - INITIAL_SHOW !== 1 ? "s" : ""}`}
                </button>
              )}

              {/* Nearly late — arrives target+6 to target+15 — greyed */}
              {results.nearlyLate.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 border-t border-slate-100" />
                    <span className="text-xs text-slate-400 font-medium flex-shrink-0">
                      6–15 min late
                    </span>
                    <div className="flex-1 border-t border-slate-100" />
                  </div>
                  <div className="space-y-3">
                    {results.nearlyLate.map((t) => (
                      <TripRow key={t.id} trip={t} dim />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <p className="text-xs text-slate-300 text-center mt-2">
            Based on TfNSW published timetable
          </p>
        </div>
      )}
    </div>
  );
}
