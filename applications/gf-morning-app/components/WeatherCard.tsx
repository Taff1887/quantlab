"use client";
import { useEffect, useState } from "react";
import type { WeatherData } from "../types";
import {
  fetchWeather,
  getClothingRec,
  getUmbrellaRec,
  CLOTHING_LABEL,
  CONDITION_EMOJI,
} from "../lib/weatherService";

export default function WeatherCard() {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    fetchWeather().then(setWeather);
  }, []);

  if (!weather) {
    return <div className="card animate-pulse h-56" />;
  }

  const clothing = getClothingRec(weather.temperature);
  const umbrella = getUmbrellaRec(weather.morningRainChance, weather.eveningRainChance);
  const emoji = CONDITION_EMOJI[weather.condition] ?? "🌤️";
  const updated = new Date(weather.lastUpdated).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="card">
      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="section-title">Sydney Weather</h2>
        <span className="text-xs text-slate-400">Updated {updated}</span>
      </div>

      {/* Temp + condition */}
      <div className="flex items-center gap-4 mb-5">
        <span className="text-6xl">{emoji}</span>
        <div>
          <p className="text-5xl font-bold text-slate-800 leading-none">
            {weather.temperature}°
          </p>
          <p className="text-slate-400 text-sm mt-1">
            Feels like {weather.feelsLike}° · {weather.condition}
          </p>
        </div>
      </div>

      {/* Rain chances */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-50 rounded-2xl p-3">
          <p className="text-xs text-slate-400 mb-1">Morning rain</p>
          <p className="text-xs text-slate-400 mb-1">7am – 9am</p>
          <p
            className={`text-2xl font-bold ${
              weather.morningRainChance > 40 ? "text-blue-500" : "text-slate-700"
            }`}
          >
            {weather.morningRainChance}%
          </p>
        </div>
        <div className="bg-slate-50 rounded-2xl p-3">
          <p className="text-xs text-slate-400 mb-1">Evening rain</p>
          <p className="text-xs text-slate-400 mb-1">5pm – 10pm</p>
          <p
            className={`text-2xl font-bold ${
              weather.eveningRainChance > 40 ? "text-blue-500" : "text-slate-700"
            }`}
          >
            {weather.eveningRainChance}%
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
            {umbrella === "bring" ? "Bring your umbrella" : "No umbrella needed"}
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
