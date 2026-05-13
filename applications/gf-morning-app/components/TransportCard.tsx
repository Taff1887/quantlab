"use client";
import { useEffect, useState } from "react";
import type { TransportOption, WharfName } from "../types";
import { fetchTransportOptions } from "../lib/transportService";

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

export default function TransportCard() {
  const [options, setOptions] = useState<TransportOption[]>([]);
  const [isRealtime, setIsRealtime] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedWharves, setSelectedWharves] = useState<WharfName[]>([
    "Taronga Zoo", "South Mosman", "Mosman Bay", "Cremorne Point", "Old Cremorne",
  ]);
  const [expanded, setExpanded] = useState(false);

  function refresh() {
    fetchTransportOptions().then(({ options, isRealtime }) => {
      setOptions(options);
      setIsRealtime(isRealtime);
      setLastUpdated(new Date());
    });
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { setExpanded(false); }, [selectedWharves]);

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

  // Sort by departure time ascending
  const sorted = [...filtered].sort((a, b) => timeToMins(a.departureTime) - timeToMins(b.departureTime));

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
              <p className="text-xs font-bold text-white uppercase tracking-wide">Upcoming Ferries</p>
              <p className="text-xs text-slate-300">Mosman → Circular Quay</p>
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

      {/* Option cards */}
      <div className="space-y-3">
        {visible.map((opt) => {
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

              <div className="mx-4 border-t border-slate-100" />

              <div className="grid grid-cols-3 gap-0 px-4 py-3">
                {[
                  { label: "Departs", value: opt.departureTime },
                  { label: "→ Circular Quay", value: opt.arrivalTime },
                  { label: "Total", value: `${opt.totalMins} min` },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                    <p className="text-sm font-bold text-slate-800">{value}</p>
                  </div>
                ))}
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
