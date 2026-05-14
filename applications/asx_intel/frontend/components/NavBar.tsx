"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/announcements", label: "Announcements" },
  { href: "/sectors", label: "Sectors" },
];

export default function NavBar() {
  const path = usePathname();
  return (
    <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-8 h-14">
        <Link href="/" className="flex items-center gap-2 font-bold text-emerald-400 text-lg tracking-tight">
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
        <div className="ml-auto">
          <span className="text-xs text-gray-500">ASX Market Intelligence</span>
        </div>
      </div>
    </nav>
  );
}
