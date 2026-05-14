"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Announcement, DailyReport } from "@/lib/api";
import ImportanceBadge from "./ImportanceBadge";
import AnnouncementTypeBadge from "./AnnouncementTypeBadge";
import Sparkline from "./Sparkline";
import LivePriceChart from "./LivePriceChart";

interface LiveQuote {
  ticker: string;
  price: number | null;
  daily_move_pct: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  last_updated: string | null;
}

interface Props {
  top10: Announcement[];
  allAnnouncements: Announcement[];
  report: DailyReport | null;
}

function fmt(n: number | null | undefined, decimals = 3) {
  if (n == null) return "—";
  return `$${n.toFixed(decimals)}`;
}

function MoveChip({ pct }: { pct: number | null | undefined }) {
  if (pct == null) return <span className="text-gray-500 text-xs font-mono">—</span>;
  const up = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 font-mono text-sm font-bold ${
        up ? "text-emerald-400" : "text-red-400"
      }`}
    >
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
    </span>
  );
}

export default function DashboardClient({ top10, allAnnouncements, report }: Props) {
  const [quotes, setQuotes] = useState<Record<string, LiveQuote>>({});
  const [selectedTicker, setSelectedTicker] = useState<string>(top10[0]?.ticker ?? "");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const tickers = Array.from(new Set(top10.map((a) => a.ticker)));

  const fetchQuotes = useCallback(async () => {
    if (tickers.length === 0) return;
    try {
      const res = await fetch(
        `http://localhost:8000/companies/quotes/batch?tickers=${tickers.join(",")}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setQuotes(data);
      setLastRefresh(new Date());
    } catch {
      // market closed / offline — silently retain last values
    }
  }, [tickers.join(",")]);

  useEffect(() => {
    fetchQuotes();
    const id = setInterval(fetchQuotes, 60_000);
    return () => clearInterval(id);
  }, [fetchQuotes]);

  const watchlist = report?.watchlist_tomorrow ? JSON.parse(report.watchlist_tomorrow) : [];
  const sectorThemes = report?.sector_themes ? JSON.parse(report.sector_themes) : {};
  const topMoversData = report?.top_movers_json ? JSON.parse(report.top_movers_json) : [];

  return (
    <div className="space-y-6">
      {/* ─── TOP 10 ANNOUNCEMENTS ─────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest">
            Top 10 Announcements
          </h2>
          {lastRefresh && (
            <span className="text-xs text-gray-500">
              Prices live · refreshed {format(lastRefresh, "HH:mm:ss")} · auto-updates every 60s
            </span>
          )}
        </div>

        <div className="space-y-1">
          {top10.map((ann, i) => {
            const q = quotes[ann.ticker];
            const move = q?.daily_move_pct ?? ann.price_move_pct;
            const price = q?.price;
            const isUp = (move ?? 0) >= 0;
            const isSelected = ann.ticker === selectedTicker;

            return (
              <div
                key={ann.id}
                onClick={() => setSelectedTicker(ann.ticker)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all ${
                  isSelected
                    ? "bg-gray-800 ring-1 ring-emerald-500/40"
                    : "hover:bg-gray-800/60"
                }`}
              >
                {/* Rank */}
                <span className="text-gray-600 font-mono text-sm w-5 shrink-0 text-right">
                  {i + 1}
                </span>

                {/* Score */}
                <ImportanceBadge score={ann.importance_score} />

                {/* Ticker */}
                <Link
                  href={`/company/${ann.ticker}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-mono font-bold text-emerald-400 hover:text-emerald-300 w-12 shrink-0 text-sm"
                >
                  {ann.ticker}
                </Link>

                {/* Title + summary */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/announcement/${ann.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm text-gray-100 hover:text-white line-clamp-1 font-medium"
                  >
                    {ann.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-0.5">
                    <AnnouncementTypeBadge type={ann.announcement_type} />
                    {ann.summary_short && (
                      <span className="text-xs text-gray-500 line-clamp-1 hidden lg:block">
                        {ann.summary_short}
                      </span>
                    )}
                  </div>
                </div>

                {/* Sparkline */}
                <div className="hidden xl:block shrink-0">
                  <Sparkline ticker={ann.ticker} positive={isUp} />
                </div>

                {/* Live price */}
                <div className="text-right shrink-0 min-w-[90px]">
                  {price != null ? (
                    <div className="font-mono text-sm font-bold text-white">
                      {fmt(price)}
                    </div>
                  ) : (
                    <div className="font-mono text-sm text-gray-600">—</div>
                  )}
                  <MoveChip pct={move} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── LIVE INTRADAY CHART ──────────────────────────────────────── */}
      {selectedTicker && (
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest">
              Live Price Chart
            </h2>
            <Link
              href={`/company/${selectedTicker}`}
              className="font-mono text-emerald-400 hover:text-emerald-300 font-bold text-lg"
            >
              {selectedTicker}
            </Link>
            <span className="text-xs text-gray-500">· click any row above to switch</span>
          </div>
          <LivePriceChart
            key={selectedTicker}
            ticker={selectedTicker}
            refreshSeconds={60}
          />
          <p className="text-xs text-gray-600 mt-2">
            Click any announcement above to switch the chart · Data via Yahoo Finance
          </p>
        </div>
      )}

      {/* ─── BOTTOM ROW: movers + sector themes + watchlist ───────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Price movers */}
        <div className="card xl:col-span-1">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Biggest Movers
          </h2>
          {topMoversData.length === 0 ? (
            <p className="text-gray-500 text-xs">Run fetch-prices after ingestion.</p>
          ) : (
            <div className="space-y-1.5">
              {topMoversData.slice(0, 8).map((m: any) => {
                const liveQ = quotes[m.ticker];
                const move = liveQ?.daily_move_pct ?? m.daily_move_pct;
                return (
                  <div key={m.ticker} className="flex items-center gap-2">
                    <Link
                      href={`/company/${m.ticker}`}
                      className="font-mono text-xs font-bold text-emerald-400 hover:text-emerald-300 w-12 shrink-0"
                    >
                      {m.ticker}
                    </Link>
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${(move ?? 0) >= 0 ? "bg-emerald-500" : "bg-red-500"}`}
                        style={{ width: `${Math.min(100, Math.abs(move ?? 0) * 5)}%` }}
                      />
                    </div>
                    <MoveChip pct={move} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sector themes */}
        <div className="card xl:col-span-1">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Sector Themes
          </h2>
          {Object.keys(sectorThemes).length === 0 ? (
            <p className="text-gray-500 text-xs">Generate daily report to see themes.</p>
          ) : (
            <div className="space-y-2.5">
              {Object.entries(sectorThemes).map(([sector, theme]) => (
                <div key={sector}>
                  <Link
                    href={`/sector/${encodeURIComponent(sector)}`}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-wide"
                  >
                    {sector}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{String(theme)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Watchlist */}
        <div className="card xl:col-span-1">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Watchlist Tomorrow
          </h2>
          {watchlist.length === 0 ? (
            <p className="text-gray-500 text-xs">Generate daily report to populate.</p>
          ) : (
            <ul className="space-y-2">
              {watchlist.map((item: any, i: number) => (
                <li key={i} className="flex gap-2 text-xs text-gray-300">
                  <span className="text-emerald-500 shrink-0 mt-0.5">→</span>
                  <span>{typeof item === "string" ? item : JSON.stringify(item)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ─── ALL TODAY'S ANNOUNCEMENTS (compact table) ────────────────── */}
      {allAnnouncements.length > 10 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              All Announcements Today ({allAnnouncements.length})
            </h2>
            <Link href="/announcements" className="text-xs text-emerald-400 hover:text-emerald-300">
              Full table with filters →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-800">
                  <th className="px-3 pb-2">Time</th>
                  <th className="px-3 pb-2">Ticker</th>
                  <th className="px-3 pb-2 hidden md:table-cell">Title</th>
                  <th className="px-3 pb-2 hidden lg:table-cell">Type</th>
                  <th className="px-3 pb-2 text-center">Score</th>
                  <th className="px-3 pb-2 text-right">Move</th>
                </tr>
              </thead>
              <tbody>
                {allAnnouncements.map((ann) => {
                  const q = quotes[ann.ticker];
                  const move = q?.daily_move_pct ?? ann.price_move_pct;
                  return (
                    <tr
                      key={ann.id}
                      className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                        {format(new Date(ann.announcement_datetime), "HH:mm")}
                      </td>
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/company/${ann.ticker}`}
                          className="font-mono font-bold text-emerald-400 hover:text-emerald-300 text-sm"
                        >
                          {ann.ticker}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 max-w-sm hidden md:table-cell">
                        <Link
                          href={`/announcement/${ann.id}`}
                          className="text-sm text-gray-200 hover:text-white line-clamp-1"
                        >
                          {ann.title}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 hidden lg:table-cell">
                        <AnnouncementTypeBadge type={ann.announcement_type} />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <ImportanceBadge score={ann.importance_score} />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <MoveChip pct={move} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
