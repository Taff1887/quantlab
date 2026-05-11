"use client";

import { useEffect, useState } from "react";

interface NewsArticle {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  isRossGittins: boolean;
}

function formatPubDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

export default function NewsCard() {
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/news")
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then((data: NewsArticle) => {
        setArticle(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  return (
    <div className="card overflow-hidden">
      {/* Gradient header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 -mx-4 -mt-4 px-4 pt-4 pb-3 mb-4 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <span className="text-xl">📈</span>
          <div>
            <p className="text-xs font-bold text-white uppercase tracking-wide">
              Economy News
            </p>
            <p className="text-xs text-emerald-100">Australia · Markets &amp; Policy</p>
          </div>
        </div>
      </div>

      {/* Ross Gittins special banner */}
      {article?.isRossGittins && (
        <div className="mb-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5 flex items-center gap-2">
          <span className="text-lg">🎉</span>
          <p className="text-sm font-bold text-amber-800">
            babe, new Ross Gittins article dropped
          </p>
        </div>
      )}

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
          Could not load news right now.
        </p>
      )}

      {article && !loading && (
        <div className="space-y-2">
          <p className="font-semibold text-slate-800 leading-snug">
            {article.title}
          </p>
          <p className="text-xs italic text-slate-500 leading-relaxed">
            {article.description}
          </p>
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-xs text-slate-400">{formatPubDate(article.pubDate)}</p>
              {article.source && (
                <p className="text-xs text-slate-300">{article.source}</p>
              )}
            </div>
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 underline hover:text-blue-800 transition-colors"
            >
              Read more →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
