"use client";
import { useEffect, useState } from "react";
import { getGreeting } from "../lib/greetingService";

export default function Header() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return <div className="h-40" />;

  const tz = "Australia/Sydney";

  const sydneyHour = parseInt(
    now.toLocaleTimeString("en-AU", { hour: "2-digit", hour12: false, timeZone: tz })
  );
  const sydneyMinute = parseInt(
    now.toLocaleTimeString("en-AU", { minute: "2-digit", hour12: false, timeZone: tz })
  );

  const time = now.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  });
  const day = now.toLocaleDateString("en-AU", { weekday: "long", timeZone: tz });
  const date = now.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: tz,
  });

  const greeting = getGreeting(sydneyHour, sydneyMinute);

  return (
    <header className="px-4 pt-10 pb-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
        {day}
      </p>
      <h1 className="text-5xl font-bold text-slate-800 tracking-tight">{time}</h1>
      <p className="text-slate-400 text-sm mt-2">{date}</p>
      <p className="text-2xl font-semibold text-slate-700 mt-5 leading-snug">
        {greeting}
      </p>
    </header>
  );
}
