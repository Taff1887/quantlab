"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { api, Announcement } from "@/lib/api";
import ImportanceBadge from "@/components/ImportanceBadge";
import PriceMove from "@/components/PriceMove";
import AnnouncementTypeBadge from "@/components/AnnouncementTypeBadge";

const TYPES = [
  "All Types",
  "Earnings / Trading Update",
  "Guidance Upgrade",
  "Guidance Downgrade",
  "Capital Raising",
  "M&A / Takeover",
  "Asset Sale / Acquisition",
  "Contract Win",
  "Regulatory / Legal",
  "Management Change",
  "Exploration / Drilling Results",
  "Investor Presentation",
  "Appendix / Administrative",
  "Dividend / Buyback",
  "Other",
];

export default function AnnouncementsPage() {
  const [anns, setAnns] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [ticker, setTicker] = useState("");
  const [type, setType] = useState("All Types");
  const [minScore, setMinScore] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    const params: Record<string, string> = { date, limit: "200" };
    if (ticker) params.ticker = ticker.toUpperCase();
    if (type !== "All Types") params.announcement_type = type;
    if (minScore) params.min_importance = minScore;
    if (search) params.search = search;
    try {
      const data = await api.announcements(params);
      setAnns(data);
    } catch {
      setAnns([]);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [date, ticker, type, minScore, search]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Announcements</h1>

      {/* Filters */}
      <div className="card flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 uppercase tracking-wide">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 uppercase tracking-wide">Ticker</label>
          <input
            type="text"
            placeholder="BHP"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 w-24 focus:outline-none focus:border-emerald-500 uppercase"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 uppercase tracking-wide">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-emerald-500"
          >
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 uppercase tracking-wide">Min Score</label>
          <input
            type="number"
            min="1" max="10" step="0.5"
            placeholder="1"
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 w-20 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 uppercase tracking-wide">Search</label>
          <input
            type="text"
            placeholder="keyword…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 w-48 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-400">{anns.length} announcements</span>
        </div>
        {loading ? (
          <p className="text-gray-500 text-sm py-8 text-center">Loading…</p>
        ) : anns.length === 0 ? (
          <p className="text-gray-500 text-sm py-8 text-center">No announcements found for these filters.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-800">
                <th className="px-3 pb-2">Time</th>
                <th className="px-3 pb-2">Ticker</th>
                <th className="px-3 pb-2 hidden md:table-cell">Company</th>
                <th className="px-3 pb-2">Title</th>
                <th className="px-3 pb-2 hidden lg:table-cell">Type</th>
                <th className="px-3 pb-2 text-center">Score</th>
                <th className="px-3 pb-2 text-right">Move</th>
                <th className="px-3 pb-2 hidden xl:table-cell">Source</th>
              </tr>
            </thead>
            <tbody>
              {anns.map((ann) => (
                <tr key={ann.id} className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
                  <td className="px-3 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {format(new Date(ann.announcement_datetime), "HH:mm")}
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/company/${ann.ticker}`} className="font-mono font-bold text-emerald-400 hover:text-emerald-300 text-sm">
                      {ann.ticker}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-300 hidden md:table-cell">{ann.company_name}</td>
                  <td className="px-3 py-3 max-w-sm">
                    <Link href={`/announcement/${ann.id}`} className="text-sm text-gray-100 hover:text-white line-clamp-2">
                      {ann.title}
                    </Link>
                    {ann.summary_short && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{ann.summary_short}</p>
                    )}
                  </td>
                  <td className="px-3 py-3 hidden lg:table-cell">
                    <AnnouncementTypeBadge type={ann.announcement_type} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <ImportanceBadge score={ann.importance_score} />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <PriceMove pct={ann.price_move_pct} />
                  </td>
                  <td className="px-3 py-3 hidden xl:table-cell">
                    {ann.source_url && (
                      <a href={ann.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300">
                        PDF →
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
