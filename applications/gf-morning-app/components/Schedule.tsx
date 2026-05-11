"use client";
import { useMemo, useState } from "react";
import type { WharfName, PrimaryMode } from "@/types";
import {
  generateAllTrips,
  filterTrips,
  tripsLeavingAt,
  tripsArrivingBy,
  formatDist,
  type ScheduleTrip,
} from "@/lib/scheduleService";

type SearchMode = "leaving" | "arriving";

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

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function nowTimeStr() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
}

function TripCard({ trip, index }: { trip: ScheduleTrip; index: number }) {
  return (
    <div
      className={`rounded-2xl border overflow-hidden ${
        index === 0 ? "border-blue-200 bg-blue-50/40" : "border-slate-100 bg-slate-50/40"
      }`}
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{trip.mode === "ferry" ? "⛴️" : "🚌"}</span>
          <div>
            <p className="text-sm font-bold text-slate-800">{trip.stopName}</p>
            <p className="text-xs text-slate-400">{trip.routeName}</p>
          </div>
        </div>
        {index === 0 && (
          <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
            Best match
          </span>
        )}
      </div>

      {/* Walk / Drive */}
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

      {/* Times */}
      <div className="grid grid-cols-3 px-4 py-2 text-center">
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
      <div className="px-4 py-2.5 space-y-1">
        <p className="text-xs font-semibold text-slate-400 mb-1">Leave home by</p>
        <p className="text-xs flex gap-2">
          <span>🚶</span>
          <span className="font-bold text-slate-700">{trip.leaveByWalking}</span>
          <span className="text-slate-400">if walking</span>
        </p>
        <p className="text-xs flex gap-2">
          <span>🚗</span>
          <span className="font-bold text-slate-700">{trip.leaveByDriving}</span>
          <span className="text-slate-400">if driving</span>
        </p>
        <p className="text-xs text-slate-400 mt-1">Total journey: {trip.totalMins} min</p>
      </div>
    </div>
  );
}

export default function Schedule() {
  const [mode, setMode] = useState<PrimaryMode>("ferry");
  const [ferryWharf, setFerryWharf] = useState<WharfName | "all">("all");
  const [busRoute, setBusRoute] = useState("all");
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState(nowTimeStr());
  const [searchMode, setSearchMode] = useState<SearchMode>("leaving");
  const [results, setResults] = useState<ScheduleTrip[] | null>(null);

  const allTrips = useMemo(() => generateAllTrips(), []);

  function handleSearch() {
    const filtered = filterTrips(allTrips, {
      mode: mode === "all" ? undefined : mode,
      wharf: mode === "ferry" ? ferryWharf : undefined,
      busRoute: mode === "bus" ? busRoute : undefined,
    });
    const sorted =
      searchMode === "leaving"
        ? tripsLeavingAt(filtered, time)
        : tripsArrivingBy(filtered, time);
    setResults(sorted.slice(0, 6));
  }

  return (
    <div className="card">
      <div className="mb-4">
        <h2 className="section-title">Schedule</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Mosman → 1 Farrer Place, Sydney
        </p>
      </div>

      {/* Transport toggle */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl mb-3">
        {(["ferry", "bus"] as PrimaryMode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setResults(null); }}
            className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${
              mode === m
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {m === "ferry" ? "⛴️ Ferry" : "🚌 Bus"}
          </button>
        ))}
      </div>

      {/* Secondary stop/wharf filter */}
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

      {/* Date + time */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="label">Date</label>
          <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setResults(null); }} className="input text-sm" />
        </div>
        <div>
          <label className="label">Time</label>
          <input type="time" value={time} onChange={(e) => { setTime(e.target.value); setResults(null); }} className="input text-sm" />
        </div>
      </div>

      {/* Search mode */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl mb-4">
        {(["leaving", "arriving"] as SearchMode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setSearchMode(m); setResults(null); }}
            className={`py-2 rounded-xl text-xs font-semibold transition-all ${
              searchMode === m
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {m === "leaving" ? "Leaving at" : "Arriving by"}
          </button>
        ))}
      </div>

      <button onClick={handleSearch} className="btn-primary w-full mb-4">
        Search
      </button>

      {/* Results */}
      {results !== null && (
        <div className="space-y-3">
          {results.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-6">
              No trips found for this time. Try adjusting your search.
            </p>
          ) : (
            <>
              <p className="text-xs text-slate-400 font-medium">
                {results.length} option{results.length !== 1 ? "s" : ""} found
              </p>
              {results.map((t, i) => (
                <TripCard key={t.id} trip={t} index={i} />
              ))}
            </>
          )}
          <p className="text-xs text-slate-300 text-center pt-1">
            Mock data · TfNSW API coming soon
          </p>
        </div>
      )}
    </div>
  );
}
