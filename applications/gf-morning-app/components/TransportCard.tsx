"use client";
import { useEffect, useState } from "react";
import type { TransportOption, TransportFilter } from "@/types";
import { fetchTransportOptions } from "@/lib/transportService";

const FILTERS: { label: string; value: TransportFilter }[] = [
  { label: "All", value: "all" },
  { label: "🚌 Bus", value: "bus" },
  { label: "⛴️ Ferry", value: "ferry" },
  { label: "Taronga Zoo", value: "Taronga Zoo" },
  { label: "South Mosman", value: "South Mosman" },
  { label: "Mosman Bay", value: "Mosman Bay" },
  { label: "Cremorne Pt", value: "Cremorne Point" },
];

export default function TransportCard() {
  const [options, setOptions] = useState<TransportOption[]>([]);
  const [filter, setFilter] = useState<TransportFilter>("all");

  useEffect(() => {
    fetchTransportOptions().then(setOptions);
  }, []);

  const visible = options.filter((o) => {
    if (filter === "all") return true;
    if (filter === "ferry") return o.mode === "ferry";
    if (filter === "bus") return o.mode === "bus";
    return o.wharf === filter;
  });

  return (
    <div className="card">
      <div className="mb-4">
        <h2 className="section-title">Commute</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          1 Rickard Ave, Mosman → 1 Farrer Place, Sydney
        </p>
      </div>

      {/* Scrollable filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1 no-scrollbar">
        {FILTERS.map((f) => (
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

      <div className="space-y-3">
        {visible.map((opt) => (
          <div
            key={opt.id}
            className={`rounded-2xl p-4 border transition-all ${
              opt.isBest
                ? "border-blue-200 bg-blue-50/60"
                : "border-slate-100 bg-slate-50/60"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{opt.mode === "ferry" ? "⛴️" : "🚌"}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {opt.stopName}
                  </p>
                  <p className="text-xs text-slate-400">
                    {opt.walkMins} min walk from home
                  </p>
                </div>
              </div>
              {opt.isBest && (
                <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-full flex-shrink-0">
                  Best
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Departs", value: opt.departureTime },
                { label: "Arrives", value: opt.arrivalTime },
                { label: "Total", value: `${opt.totalMins} min` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/70 rounded-xl py-2 px-1">
                  <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                  <p className="text-sm font-bold text-slate-800">{value}</p>
                </div>
              ))}
            </div>

            {opt.notes && (
              <p className="text-xs text-slate-400 mt-2.5 italic">{opt.notes}</p>
            )}
          </div>
        ))}

        {visible.length === 0 && (
          <p className="text-center text-slate-400 text-sm py-6">
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
