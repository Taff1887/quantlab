"use client";
import { useEffect, useState } from "react";
import type { DayForecast } from "../types";
import {
  fetchForecast,
  getClothingRec,
  getUmbrellaRec,
  CLOTHING_LABEL,
  CONDITION_EMOJI,
} from "../lib/weatherService";

export default function WeatherCard() {
  const [forecast, setForecast] = useState<DayForecast[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    fetchForecast().then(setForecast);
  }, []);

  if (forecast.length === 0) {
    return <div className="card animate-pulse h-56" />;
  }

  const day = forecast[selectedIdx];
  const clothing = getClothingRec(day.morningTemp, day.eveningTemp);
  const umbrella = getUmbrellaRec(day.morningRainChance, day.eveningRainChance);
  const emoji = CONDITION_EMOJI[day.condition] ?? "🌤️";

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Sydney Weather</h2>
        <span className="text-xs text-slate-400">Live · Mosman</span>
      </div>

      {/* Day tabs */}
      <div className="flex gap-1 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
        {forecast.map((d, i) => (
          <button
            key={d.date}
            onClick={() => setSelectedIdx(i)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              selectedIdx === i
                ? "bg-slate-800 text-white underline underline-offset-2"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {d.dayShort}
          </button>
        ))}
      </div>

      {/* Temp + condition */}
      <div className="flex items-center gap-4 mb-5">
        <span className="text-6xl">{emoji}</span>
        <div>
          <p className="text-5xl font-bold text-slate-800 leading-none">
            {day.temperature}°
          </p>
          <p className="text-slate-400 text-sm mt-1">
            Feels like {day.feelsLike}° · {day.condition}
          </p>
          {selectedIdx > 0 && (
            <p className="text-xs font-semibold text-blue-500 mt-0.5">{day.label}</p>
          )}
        </div>
      </div>

      {/* Morning / Evening breakdown */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-50 rounded-2xl p-3">
          <p className="text-xs font-semibold text-slate-500 mb-2">🌅 Morning (7–9am)</p>
          <p className="text-2xl font-bold text-slate-800">{day.morningTemp}°</p>
          <p className={`text-xs font-semibold mt-1 ${day.morningRainChance > 40 ? "text-blue-500" : "text-slate-400"}`}>
            💧 {day.morningRainChance}% rain
          </p>
        </div>
        <div className="bg-slate-50 rounded-2xl p-3">
          <p className="text-xs font-semibold text-slate-500 mb-2">🌆 Evening (5–8pm)</p>
          <p className="text-2xl font-bold text-slate-800">{day.eveningTemp}°</p>
          <p className={`text-xs font-semibold mt-1 ${day.eveningRainChance > 40 ? "text-blue-500" : "text-slate-400"}`}>
            💧 {day.eveningRainChance}% rain
          </p>
        </div>
      </div>

      {/* Recommendations */}
      <div className="space-y-2">
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium ${
            umbrella === "bring"
              ? "bg-blue-50 text-blue-700"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          <span className="text-lg">{umbrella === "bring" ? "☂️" : "✅"}</span>
          <span>
            {umbrella === "bring"
              ? `Bring your umbrella${selectedIdx > 0 ? ` on ${day.label}` : ""}`
              : "No umbrella needed"}
          </span>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium bg-amber-50 text-amber-700">
          <span className="text-lg">👗</span>
          <span>{CLOTHING_LABEL[clothing]}</span>
        </div>
      </div>
    </div>
  );
}
