import { format } from "date-fns";
import Link from "next/link";
import { api, Announcement } from "@/lib/api";
import DashboardClient from "@/components/DashboardClient";

async function getData() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [annsResult, reportResult] = await Promise.allSettled([
    api.announcements({ date: today, limit: "100" }),
    api.dailyReport(today),
  ]);
  return {
    announcements: annsResult.status === "fulfilled" ? annsResult.value : [],
    report: reportResult.status === "fulfilled" ? reportResult.value : null,
    today,
  };
}

export default async function DashboardPage() {
  const { announcements, report, today } = await getData();

  const sorted = [...announcements].sort(
    (a, b) => (b.importance_score ?? 0) - (a.importance_score ?? 0)
  );
  const top10 = sorted.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">ASX Daily Intelligence</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {format(new Date(today), "EEEE, d MMMM yyyy")} · Live market data
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`http://localhost:8000/ingest?mock=true&date=${today}`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 text-xs font-medium bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
          >
            Ingest mock data
          </a>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 text-xs font-medium bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
          >
            API docs ↗
          </a>
        </div>
      </div>

      {/* Executive summary */}
      {report?.executive_summary && (
        <div className="card border-l-4 border-l-emerald-500">
          <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">
            Market Wrap
          </h2>
          <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-line">
            {report.executive_summary}
          </p>
        </div>
      )}

      {/* No data state */}
      {announcements.length === 0 && (
        <div className="card text-center py-16 border-dashed border-2 border-gray-700">
          <p className="text-gray-300 text-lg font-medium mb-2">No announcements loaded yet</p>
          <p className="text-gray-500 text-sm mb-4">
            Click <strong className="text-gray-300">Ingest mock data</strong> above, or run:
          </p>
          <code className="bg-gray-800 px-3 py-1.5 rounded text-sm text-emerald-400">
            python scripts/run_daily_ingestion.py --mock --skip-prices
          </code>
        </div>
      )}

      {/* Main content — client component handles live price updates */}
      {top10.length > 0 && (
        <DashboardClient top10={top10} allAnnouncements={sorted} report={report} />
      )}
    </div>
  );
}
