"use client";
import { useState, useEffect } from "react";
import { getDailyQuote } from "../lib/quoteService";
import type { Quote } from "../lib/quoteService";

export default function QuoteCard() {
  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => {
    setQuote(getDailyQuote());
  }, []);

  if (!quote) return null;

  return (
    <div className="mx-4 rounded-2xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-indigo-100/60 px-5 py-4">
      <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">
        ✦ Quote of the Day
      </p>
      <p className="text-slate-700 text-[15px] font-light italic leading-relaxed">
        &ldquo;{quote.text}&rdquo;
      </p>
      <p className="text-slate-400 text-xs mt-3 text-right font-medium">
        — {quote.author}
      </p>
    </div>
  );
}
