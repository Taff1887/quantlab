"use client";
import { useEffect, useState } from "react";
import type { TransportOption, WharfName } from "../types";
import { fetchTransportOptions, leaveByWalking, leaveByDriving } from "../lib/transportService";

type SortKey = "departure" | "arrival" | "total";

const FERRY_WHARVES: { label: string; value: WharfName }[] = [
  { label: "Taronga Zoo", value: "Taronga Zoo" },
  { label: "South Mosman", value: "South Mosman" },
  { label: "Mosman Bay", value: "Mosman Bay" },
  { label: "Cremorne Point", value: "Cremorne Point" },
  { label: "Old Cremorne", value: "Old Cremorne" },
];

function timeToMins(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function nowSydneyMins(): number {
  const t = new Date().toLocaleTimeString("en-AU", {
    timeZone: "Australia/Sydney",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return timeToMins(t);
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
  const [driveIsRealtime, setDriveIsRealtime] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedWharves, setSelectedWharves] = useState<WharfName[]>([
    "Taronga Zoo", "South Mosman", "Mosman Bay", "Cremorne Point", "Old Cremorne",
  ]);
  const [sort, setSort] = useState<SortKey>("departure");
  const [expanded, setExpanded] = useState(false);

  function refresh() {
    fetchTransportOptions().then(({ options, isRealtime, driveIsRealtime }) => {
      setOptions(options);
      setIsRealtime(isRealtime);
      setDriveIsRealtime(driveIsRealtime ?? false);
      setLastUpdated(new Date());
    });
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { setExpanded(false); }, [sort, selectedWharves]);

  function toggleWharf(w: WharfName) {
    setSelectedWharves((prev) =>
      prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]
    );
    setExpanded(false);
  }

  const nowMins = nowSydneyMins();
  const filtered = options.filter((o) => {
    if (o.mode !== "ferry") return false;
    const depMins = timeToMins(o.departureTime);
    if (depMins < nowMins - 1) return false;
    if (depMins > nowMins + 60) return false;
    return selectedWharves.length === 0 || selectedWharves.includes(o.wharf as WharfName);
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "departure") return timeToMins(a.departureTime) - timeToMins(b.departureTime);
    if (sort === "arrival") return timeToMins(a.arrivalTime) - timeToMins(b.arrivalTime);
    return a.totalMins - b.totalMins;
  });

  const INITIAL_SHOW = 3;
  const visible = expanded ? sorted : sorted.slice(0, INITIAL_SHOW);
  const hasMore = sorted.length > INITIAL_SHOW;

  const timeStr = lastUpdated?.toLocaleTimeString("en-AU", {
    timeZone: "Australia/Sydney", hour: "2-digit", minute: "2-digit", hour12: false,
  });

  return (
    <div className="card">
      {/* Grey header */}
      <div className="bg-gradient-to-r from-slate-500 to-slate-700 -mx-5 -mt-5 px-5 pt-4 pb-3 mb-4 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⛴️</span>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wide">Commute</p>
              <p className="text-xs text-slate-300">Mosman → Circular Quay → 1 Farrer Place</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {timeStr && <span className="text-[10px] text-slate-400">{timeStr}</span>}
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isRealtime
                ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/30"
                : "bg-white/10 text-white/50"
            }`}>
              {isRealtime ? "🟢 Live" : "Schedule"}
            </span>
          </div>
        </div>
      </div>

      {/* Wharf filter chips */}
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

      {/* Sort pills */}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <span className="text-xs text-slate-400 self-center">Sort:</span>
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
              <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
                <span className="text-2xl">⛴️</span>
                <div>
                  <p className="text-sm font-bold text-slate-800 leading-tight">{opt.stopName}</p>
                  {opt.notes && <p className="text-xs text-slate-400 mt-0.5">{opt.notes}</p>}
                </div>
              </div>

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
                  {driveIsRealtime && <span className="text-[9px] text-emerald-600 font-bold">🚦</span>}
                  <span className="text-slate-300">·</span>
                  <span>{formatDist(opt.driveDistanceM)}</span>
                </div>
              </div>

              <div className="mx-4 border-t border-slate-100" />

              <div className="grid grid-cols-3 gap-0 px-4 py-3">
                {[
                  { label: "Departs", value: opt.departureTime },
                  { label: "→ Circ. Quay", value: opt.arrivalTime },
                  { label: "Total", value: `${opt.totalMins} min` },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                    <p className="text-sm font-bold text-slate-800">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mx-4 border-t border-slate-100" />

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
            No ferries in the next 60 min for the selected wharves
          </p>
        )}

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
