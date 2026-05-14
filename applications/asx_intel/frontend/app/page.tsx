import { format } from "date-fns";
import Link from "next/link";
import { api, Announcement, DailyReport } from "@/lib/api";
import ImportanceBadge from "@/components/ImportanceBadge";
import PriceMove from "@/components/PriceMove";
import AnnouncementTypeBadge from "@/components/AnnouncementTypeBadge";

async function getData() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [announcements, report] = await Promise.allSettled([
    api.announcements({ date: today, limit: "50" }),
    api.dailyReport(today),
  ]);
  return {
    announcements: announcements.status === "fulfilled" ? announcements.value : [],
    report: report.status === "fulfilled" ? report.value : null,
    today,
  };
}

export default async function DashboardPage() {
  const { announcements, report, today } = await getData();

  const sorted = [...announcements].sort((a, b) => (b.importance_score ?? 0) - (a.importance_score ?? 0));
  const topAnns = sorted.slice(0, 10);
  const topMovers = [...announcements]
    .filter((a) => a.price_move_pct !== null)
    .sort((a, b) => Math.abs(b.price_move_pct!) - Math.abs(a.price_move_pct!))
    .slice(0, 10);

  const topMoversJson = report?.top_movers_json ? JSON.parse(report.top_movers_json) : topMovers;
  const watchlist = report?.watchlist_tomorrow ? JSON.parse(report.watchlist_tomorrow) : [];
  const sectorThemes = report?.sector_themes ? JSON.parse(report.sector_themes) : {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Daily Market Intelligence</h1>
          <p className="text-gray-400 text-sm mt-0.5">{format(new Date(today), "EEEE, d MMMM yyyy")} · ASX</p>
        </div>
        <IngestControls date={today} />
      </div>

      {/* Executive Summary */}
      {report?.executive_summary && (
        <div className="card border-l-4 border-l-emerald-500">
          <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-2">Market Wrap</h2>
          <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-line">{report.executive_summary}</p>
        </div>
      )}

      {!report && announcements.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-gray-400 text-lg mb-2">No data for today yet.</p>
          <p className="text-gray-500 text-sm">
            Use the <strong className="text-gray-300">Ingest</strong> button above, or run{" "}
            <code className="bg-gray-800 px-1 rounded text-xs">python scripts/run_daily_ingestion.py</code>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top Announcements */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
            Top Announcements by Importance
          </h2>
          {topAnns.length === 0 ? (
            <p className="text-gray-500 text-sm">No announcements yet.</p>
          ) : (
            <div className="space-y-2">
              {topAnns.map((ann) => (
                <Link
                  key={ann.id}
                  href={`/announcement/${ann.id}`}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors group"
                >
                  <ImportanceBadge score={ann.importance_score} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-emerald-400">{ann.ticker}</span>
                      <AnnouncementTypeBadge type={ann.announcement_type} />
                    </div>
                    <p className="text-sm text-gray-200 group-hover:text-white mt-0.5 line-clamp-1">{ann.title}</p>
                    {ann.summary_short && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{ann.summary_short}</p>
                    )}
                  </div>
                  <PriceMove pct={ann.price_move_pct} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Top Movers */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
            Biggest Price Movers
          </h2>
          {topMoversJson.length === 0 ? (
            <p className="text-gray-500 text-sm">No price data yet. Run fetch-prices after ingestion.</p>
          ) : (
            <div className="space-y-2">
              {topMoversJson.slice(0, 10).map((m: any) => (
                <Link
                  key={m.ticker}
                  href={`/company/${m.ticker}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <span className="font-mono text-sm font-bold text-emerald-400 w-14">{m.ticker}</span>
                  <div className="flex-1">
                    <span className="text-sm text-gray-300">{m.company_name ?? m.ticker}</span>
                    {m.sector && <span className="ml-2 text-xs text-gray-500">{m.sector}</span>}
                  </div>
                  <PriceMove pct={m.daily_move_pct ?? m.move_pct} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Sector Themes */}
        {Object.keys(sectorThemes).length > 0 && (
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">Sector Themes</h2>
            <div className="space-y-3">
              {Object.entries(sectorThemes).map(([sector, theme]) => (
                <div key={sector}>
                  <Link href={`/sector/${encodeURIComponent(sector)}`} className="text-xs font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-wide">
                    {sector}
                  </Link>
                  <p className="text-sm text-gray-400 mt-0.5">{String(theme)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Watchlist */}
        {watchlist.length > 0 && (
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">Watchlist Tomorrow</h2>
            <ul className="space-y-1.5">
              {watchlist.map((item: any, i: number) => (
                <li key={i} className="text-sm text-gray-300 flex gap-2">
                  <span className="text-emerald-500 mt-0.5">→</span>
                  <span>{typeof item === "string" ? item : JSON.stringify(item)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* All today's announcements mini-table */}
      {announcements.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
              All Announcements Today ({announcements.length})
            </h2>
            <Link href="/announcements" className="text-xs text-emerald-400 hover:text-emerald-300">
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto">
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
                </tr>
              </thead>
              <tbody>
                {sorted.slice(0, 20).map((ann) => (
                  <AnnouncementRowCompact key={ann.id} ann={ann} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function AnnouncementRowCompact({ ann }: { ann: Announcement }) {
  return (
    <tr className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
      <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">
        {format(new Date(ann.announcement_datetime), "HH:mm")}
      </td>
      <td className="px-3 py-2.5">
        <Link href={`/company/${ann.ticker}`} className="font-mono font-bold text-emerald-400 hover:text-emerald-300 text-sm">
          {ann.ticker}
        </Link>
      </td>
      <td className="px-3 py-2.5 text-sm text-gray-300 hidden md:table-cell">{ann.company_name}</td>
      <td className="px-3 py-2.5 max-w-xs">
        <Link href={`/announcement/${ann.id}`} className="text-sm text-gray-200 hover:text-white line-clamp-1">
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
        <PriceMove pct={ann.price_move_pct} />
      </td>
    </tr>
  );
}

function IngestControls({ date }: { date: string }) {
  return (
    <div className="flex gap-2">
      <form action={`http://localhost:8000/ingest?date=${date}&mock=true`} method="post" target="_blank">
        <button
          type="submit"
          className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
        >
          Ingest (mock)
        </button>
      </form>
    </div>
  );
}
