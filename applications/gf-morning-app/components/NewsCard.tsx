"use client";

import { useEffect, useState } from "react";

interface GittinsArticle {
  found: boolean;
  title?: string;
  link?: string;
  description?: string;
  pubDate?: string;
}

function formatPubDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-AU", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function NewsCard() {
  const [data, setData]       = useState<GittinsArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    fetch("/api/news")
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then((d: GittinsArticle) => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 -mx-4 -mt-4 px-4 pt-4 pb-3 mb-4 rounded-t-2xl">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">📰</span>
          <div>
            <p className="text-xs font-bold text-white uppercase tracking-wide">
              Gittins Gospel
            </p>
            <p className="text-xs text-emerald-100">Ross Gittins · Sydney Morning Herald</p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="space-y-2 animate-pulse">
          <div className="h-4 bg-slate-100 rounded w-full" />
          <div className="h-4 bg-slate-100 rounded w-5/6" />
          <div className="h-3 bg-slate-100 rounded w-4/6 mt-1" />
          <div className="h-3 bg-slate-100 rounded w-3/6" />
        </div>
      )}

      {error && !loading && (
        <p className="text-sm text-slate-400 text-center py-4">
          Could not load right now — check back soon.
        </p>
      )}

      {data && !loading && !data.found && (
        <div className="py-4 text-center">
          <p className="text-2xl mb-2">🕰️</p>
          <p className="text-sm font-semibold text-slate-500">No new article yet</p>
          <p className="text-xs text-slate-400 mt-1">
            We&apos;ll update as soon as Ross drops something.
          </p>
        </div>
      )}

      {data?.found && !loading && (
        <div className="space-y-2">
          <p className="font-semibold text-slate-800 leading-snug text-sm">
            {data.title}
          </p>
          {data.description && (
            <p className="text-xs text-slate-500 leading-relaxed italic">
              {data.description}
            </p>
          )}
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-slate-400">
              {data.pubDate ? formatPubDate(data.pubDate) : ""}
            </p>
            <a
              href={data.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition-colors"
            >
              Read → SMH
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
