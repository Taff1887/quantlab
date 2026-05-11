"use client";
import { useEffect, useState } from "react";
import type { TransportOption, PrimaryMode, WharfName } from "../types";
import { fetchTransportOptions, leaveByWalking, leaveByDriving } from "../lib/transportService";

type SortKey = "departure" | "arrival" | "total";

const FERRY_WHARVES: { label: string; value: WharfName }[] = [
  { label: "Taronga Zoo", value: "Taronga Zoo" },
  { label: "South Mosman", value: "South Mosman" },
  { label: "Mosman Bay", value: "Mosman Bay" },
  { label: "Cremorne Point", value: "Cremorne Point" },
];

const BUS_ROUTES: { label: string; value: string }[] = [
  { label: "Route 144 · Military Rd", value: "bus-144" },
  { label: "Route 178 · Spit Rd", value: "bus-178" },
];

function timeToMins(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatDist(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`;
}

const SORT_LABELS: Record<SortKey, string> = {
  departure: "Departure",
  arrival: "Arrival",
  total: "Total time",
};

export default function TransportCard() {
  const [options, setOptions] = useState<TransportOption[]>([]);
  const [isRealtime, setIsRealtime] = useState(false);
  const [mode, setMode] = useState<PrimaryMode>("all");
  const [selectedWharves, setSelectedWharves] = useState<WharfName[]>([
    "Taronga Zoo", "South Mosman", "Mosman Bay", "Cremorne Point",
  ]);
  const [selectedBuses, setSelectedBuses] = useState<string[]>(["bus-144", "bus-178"]);
  const [sort, setSort] = useState<SortKey>("departure");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchTransportOptions().then(({ options, isRealtime }) => {
      setOptions(options);
      setIsRealtime(isRealtime);
    });
  }, []);

  // Reset expanded when filters change
  useEffect(() => { setExpanded(false); }, [mode, sort]);

  function toggleWharf(w: WharfName) {
    setSelectedWharves((prev) =>
      prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]
    );
    setExpanded(false);
  }

  function toggleBus(b: string) {
    setSelectedBuses((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]
    );
    setExpanded(false);
  }

  const filtered = options.filter((o) => {
    if (mode === "ferry") {
      if (o.mode !== "ferry") return false;
      return selectedWharves.length === 0 || selectedWharves.includes(o.wharf as WharfName);
    }
    if (mode === "bus") {
      if (o.mode !== "bus") return false;
      return selectedBuses.length === 0 || selectedBuses.includes(o.id);
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "departure") return timeToMins(a.departureTime) - timeToMins(b.departureTime);
    if (sort === "arrival") return timeToMins(a.arrivalTime) - timeToMins(b.arrivalTime);
    return a.totalMins - b.totalMins;
  });

  const INITIAL_SHOW = 3;
  const visible = expanded ? sorted : sorted.slice(0, INITIAL_SHOW);
  const hasMore = sorted.length > INITIAL_SHOW;

  return (
    <div className="card">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Commute</h2>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isRealtime ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
            {isRealtime ? "🟢 Live" : "Schedule"}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          1 Rickard Ave, Mosman → 1 Farrer Place, Sydney
        </p>
      </div>

      {/* Primary mode toggle */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl mb-3">
        {(["all", "bus", "ferry"] as PrimaryMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${
              mode === m
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {m === "all" ? "All" : m === "bus" ? "🚌 Bus" : "⛴️ Ferry"}
          </button>
        ))}
      </div>

      {/* Sort pills */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <span className="text-xs text-slate-400 self-center mr-1">Sort:</span>
        {(["departure", "arrival", "total"] as SortKey[]).map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              sort === s
                ? "bg-slate-800 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {SORT_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Multi-select wharf chips */}
      {mode === "ferry" && (
        <div className="flex flex-wrap gap-2 mb-3">
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
      )}

      {/* Multi-select bus chips */}
      {mode === "bus" && (
        <div className="flex flex-wrap gap-2 mb-3">
          {BUS_ROUTES.map((r) => {
            const active = selectedBuses.includes(r.value);
            return (
              <button
                key={r.value}
                onClick={() => toggleBus(r.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Option cards */}
      <div className="space-y-3">
        {visible.map((opt) => {
          const walkLeave = leaveByWalking(opt.departureTime, opt.walkMins);
          const driveLeave = leaveByDriving(opt.departureTime, opt.driveMins);

          return (
            <div
              key={opt.id}
              className="rounded-2xl border border-slate-100 bg-slate-50/50 overflow-hidden"
            >
              {/* Card header */}
              <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
                <span className="text-2xl">
                  {opt.mode === "ferry" ? "⛴️" : "🚌"}
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-800 leading-tight">
                    {opt.stopName}
                  </p>
                  {opt.notes && (
                    <p className="text-xs text-slate-400 mt-0.5">{opt.notes}</p>
                  )}
                </div>
              </div>

              {/* Walk + drive row */}
              <div className="flex gap-3 px-4 pb-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span>🚶</span>
                  <span className="font-semibold text-slate-700">{opt.walkMins} min</span>
                  <span className="text-slate-300">·</span>
                  <span>{formatDist(opt.walkDistanceM)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span>🚗</span>
                  <span className="font-semibold text-slate-700">{opt.driveMins} min</span>
                  <span className="text-slate-300">·</span>
                  <span>{formatDist(opt.driveDistanceM)}</span>
                </div>
              </div>

              <div className="mx-4 border-t border-slate-100" />

              {/* Times grid */}
              <div className="grid grid-cols-3 gap-0 px-4 py-3">
                {[
                  { label: "Departs", value: opt.departureTime },
                  { label: "Arrives", value: opt.arrivalTime },
                  { label: "Total", value: `${opt.totalMins} min` },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                    <p className="text-sm font-bold text-slate-800">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mx-4 border-t border-slate-100" />

              {/* Leave by times */}
              <div className="px-4 py-3 space-y-1.5">
                <p className="text-xs text-slate-400 mb-2 font-medium">Leave by</p>
                <div className="flex items-center gap-2 text-xs">
                  <span>🚶</span>
                  <span className="font-bold text-slate-700">{walkLeave}</span>
                  <span className="text-slate-400">if walking</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span>🚗</span>
                  <span className="font-bold text-slate-700">{driveLeave}</span>
                  <span className="text-slate-400">if driving</span>
                </div>
              </div>
            </div>
          );
        })}

        {sorted.length === 0 && (
          <p className="text-center text-slate-400 text-sm py-8">
            No options for this filter
          </p>
        )}

        {/* Show more / less */}
        {hasMore && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full py-2.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            {expanded
              ? "▲ Show less"
              : `▼ Show ${sorted.length - INITIAL_SHOW} more option${sorted.length - INITIAL_SHOW !== 1 ? "s" : ""}`}
          </button>
        )}
      </div>

      <p className="text-xs text-slate-300 text-center mt-4">
        {isRealtime ? "Live TfNSW data" : "TfNSW schedule · add TFNSW_API_KEY for live times"}
      </p>
    </div>
  );
}
