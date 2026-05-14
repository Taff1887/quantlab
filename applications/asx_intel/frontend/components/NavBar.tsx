"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/announcements", label: "Announcements" },
  { href: "/sectors", label: "Sectors" },
];

interface ScheduleStatus {
  aest_now: string;
  is_trading_day: boolean;
  market_open: boolean;
  next_run: string;
}

export default function NavBar() {
  const path = usePathname();
  const [status, setStatus] = useState<ScheduleStatus | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("http://localhost:8000/schedule/status");
        if (res.ok) setStatus(await res.json());
      } catch { /* backend offline */ }
    }
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-6 h-14">
        <Link href="/" className="flex items-center gap-2 font-bold text-emerald-400 text-lg tracking-tight shrink-0">
          <span className="text-2xl">📈</span>
          ASX Intel
        </Link>

        <div className="flex gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                path === l.href
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-gray-400 hover:text-gray-100 hover:bg-gray-800"
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Schedule status pill */}
        <div className="ml-auto flex items-center gap-3">
          {status ? (
            <div className="flex items-center gap-2 text-xs">
              {/* Market open/closed indicator */}
              <div className={clsx(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full border",
                status.market_open
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-gray-800 border-gray-700 text-gray-400"
              )}>
                <span className={clsx(
                  "w-1.5 h-1.5 rounded-full",
                  status.market_open ? "bg-emerald-400 animate-pulse" : "bg-gray-500"
                )} />
                {status.market_open ? "Market Open" : status.is_trading_day ? "Market Closed" : "Weekend"}
              </div>

              {/* Next scheduled run */}
              <div className="text-gray-500 hidden sm:block">
                Next run: <span className="text-gray-300">{status.next_run}</span>
              </div>
            </div>
          ) : (
            <span className="text-xs text-gray-600">Connecting…</span>
          )}
        </div>
      </div>
    </nav>
  );
}
