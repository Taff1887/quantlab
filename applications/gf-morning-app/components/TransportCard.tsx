"use client";
import { useEffect, useState } from "react";
import type { TransportOption, PrimaryMode, WharfName } from "@/types";
import {
  fetchTransportOptions,
  leaveByWalking,
  leaveByDriving,
} from "@/lib/transportService";

const FERRY_WHARVES: { label: string; value: WharfName | "all" }[] = [
  { label: "All wharves", value: "all" },
  { label: "Taronga Zoo", value: "Taronga Zoo" },
  { label: "South Mosman", value: "South Mosman" },
  { label: "Mosman Bay", value: "Mosman Bay" },
  { label: "Cremorne Point", value: "Cremorne Point" },
];

const BUS_ROUTES: { label: string; value: string }[] = [
  { label: "All buses", value: "all" },
  { label: "Route 144 · Military Rd", value: "bus-144" },
  { label: "Route 178 · Spit Rd", value: "bus-178" },
];

function formatDist(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`;
}

export default function TransportCard() {
  const [options, setOptions] = useState<TransportOption[]>([]);
  const [mode, setMode] = useState<PrimaryMode>("all");
  const [ferryWharf, setFerryWharf] = useState<WharfName | "all">("all");
  const [busRoute, setBusRoute] = useState<string>("all");

  useEffect(() => {
    fetchTransportOptions().then(setOptions);
  }, []);

  const visible = options.filter((o) => {
    if (mode === "ferry") {
      if (o.mode !== "ferry") return false;
      return ferryWharf === "all" || o.wharf === ferryWharf;
    }
    if (mode === "bus") {
      if (o.mode !== "bus") return false;
      return busRoute === "all" || o.id === busRoute;
    }
    return true; // "all"
  });

  return (
    <div className="card">
      {/* Header */}
      <div className="mb-4">
        <h2 className="section-title">Commute</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          1 Rickard Ave, Mosman → 1 Farrer Place, Sydney
        </p>
      </div>

      {/* Primary mode toggle */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl mb-4">
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

      {/* Secondary wharf/route filter */}
      {mode === "ferry" && (
        <select
          value={ferryWharf}
          onChange={(e) => setFerryWharf(e.target.value as WharfName | "all")}
          className="input mb-4 text-sm text-slate-700"
        >
          {FERRY_WHARVES.map((w) => (
            <option key={w.value} value={w.value}>
              {w.label}
            </option>
          ))}
        </select>
      )}

      {mode === "bus" && (
        <select
          value={busRoute}
          onChange={(e) => setBusRoute(e.target.value)}
          className="input mb-4 text-sm text-slate-700"
        >
          {BUS_ROUTES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      )}

      {/* Option cards */}
      <div className="space-y-3">
        {visible.map((opt) => {
          const walkLeave = leaveByWalking(opt.departureTime, opt.walkMins);
          const driveLeave = leaveByDriving(opt.departureTime, opt.driveMins);

          return (
            <div
              key={opt.id}
              className={`rounded-2xl border overflow-hidden ${
                opt.isBest
                  ? "border-blue-200 bg-gradient-to-b from-blue-50/80 to-white"
                  : "border-slate-100 bg-slate-50/50"
              }`}
            >
              {/* Card header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <div className="flex items-center gap-2.5">
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
                {opt.isBest && (
                  <span className="flex-shrink-0 text-xs font-bold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-full">
                    Best
                  </span>
                )}
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

              {/* Divider */}
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

              {/* Divider */}
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

        {visible.length === 0 && (
          <p className="text-center text-slate-400 text-sm py-8">
            No options for this filter
          </p>
        )}
      </div>

      <p className="text-xs text-slate-300 text-center mt-4">
        Mock data · TfNSW + Google Maps APIs coming soon
      </p>
    </div>
  );
}
