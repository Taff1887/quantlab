"use client";
import { useEffect, useState } from "react";
import type { FerryDeparture, WharfName } from "../types";
import { fetchFerryDepartures } from "../lib/transportService";

type WharfFilter = "all" | WharfName;

const WHARF_FILTERS: { label: string; value: WharfFilter }[] = [
  { label: "All Wharves", value: "all" },
  { label: "Taronga Zoo", value: "Taronga Zoo" },
  { label: "South Mosman", value: "South Mosman" },
  { label: "Mosman Bay", value: "Mosman Bay" },
  { label: "Cremorne Point", value: "Cremorne Point" },
];

export default function FerrySchedule() {
  const [departures, setDepartures] = useState<FerryDeparture[]>([]);
  const [filter, setFilter] = useState<WharfFilter>("all");

  useEffect(() => {
    fetchFerryDepartures().then(setDepartures);
  }, []);

  const visible =
    filter === "all" ? departures : departures.filter((d) => d.wharf === filter);

  return (
    <div className="card">
      <div className="mb-4">
        <h2 className="section-title">⛴️ Ferry Schedule</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Next departures → Circular Quay
        </p>
      </div>

      {/* Wharf filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1 no-scrollbar">
        {WHARF_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === f.value
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Departure list */}
      <div className="space-y-2">
        {visible.slice(0, 8).map((dep, i) => (
          <div
            key={dep.id}
            className={`flex items-center gap-3 rounded-xl px-3 py-3 ${
              i === 0 ? "bg-blue-50 border border-blue-100" : "bg-slate-50"
            }`}
          >
            {/* Index / next indicator */}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                i === 0
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-400 border border-slate-200"
              }`}
            >
              {i === 0 ? "→" : i + 1}
            </div>

            {/* Wharf + walk info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">
                {dep.wharf} Wharf
              </p>
              <p className="text-xs text-slate-400">
                {dep.walkMinsFromHome} min walk · {dep.totalMins} min total journey
              </p>
            </div>

            {/* Times */}
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-slate-800">{dep.departureTime}</p>
              <p className="text-xs text-slate-400">arr {dep.arrivalTime}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-300 text-center mt-4">
        Mock data · TfNSW Open Data API coming soon
      </p>
    </div>
  );
}
