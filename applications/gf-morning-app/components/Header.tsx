"use client";
import { useEffect, useState } from "react";

export default function Header() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return <div className="h-36" />;

  const tz = "Australia/Sydney";
  const hour = parseInt(
    now.toLocaleTimeString("en-AU", { hour: "2-digit", hour12: false, timeZone: tz })
  );
  const greeting =
    hour < 12 ? "Good morning, pookie" : hour < 17 ? "Good afternoon, pookie" : "Good evening, pookie";
  const emoji = hour < 12 ? "🌅" : hour < 17 ? "☀️" : "🌙";

  const time = now.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  });
  const day = now.toLocaleDateString("en-AU", {
    weekday: "long",
    timeZone: tz,
  });
  const date = now.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: tz,
  });

  return (
    <header className="px-4 pt-10 pb-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
        {day}
      </p>
      <h1 className="text-5xl font-bold text-slate-800 tracking-tight">{time}</h1>
      <p className="text-slate-400 text-sm mt-2">{date}</p>
      <div className="mt-4 inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-slate-100 shadow-sm rounded-full px-5 py-2">
        <span className="text-lg">{emoji}</span>
        <span className="text-slate-700 font-medium text-sm">{greeting}!</span>
      </div>
    </header>
  );
}
