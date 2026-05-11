import type { DayForecast, ClothingRec, UmbrellaRec } from "../types";

// Open-Meteo API — free, no API key, covers Sydney
// https://open-meteo.com/en/docs
const OPEN_METEO_URL =
  "https://api.open-meteo.com/v1/forecast" +
  "?latitude=-33.8274&longitude=151.2273" +
  "&hourly=temperature_2m,precipitation_probability,apparent_temperature,weathercode" +
  "&daily=weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max" +
  "&timezone=Australia%2FSydney" +
  "&forecast_days=5";

// In-memory cache so we don't hammer the API on every render
let _cache: { data: DayForecast[]; at: number } | null = null;
const CACHE_MS = 30 * 60 * 1000; // 30 minutes

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// WMO weather code → our condition string
function wmoToCondition(code: number): string {
  if (code === 0) return "Sunny";
  if (code <= 2) return "Partly Cloudy";
  if (code === 3) return "Cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 67) return "Rainy";
  if (code <= 77) return "Snowy";
  if (code <= 82) return "Rainy";
  if (code >= 95) return "Stormy";
  return "Partly Cloudy";
}

function avg(arr: number[]): number {
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseForecast(data: any): DayForecast[] {
  const days: DayForecast[] = [];

  for (let i = 0; i < 5; i++) {
    const dateStr: string = data.daily.time[i];
    const dt = new Date(dateStr + "T12:00:00"); // noon to avoid timezone edge cases
    const dow = dt.getDay();

    const tempHigh = Math.round(data.daily.temperature_2m_max[i]);
    const tempLow = Math.round(data.daily.temperature_2m_min[i]);
    const feelsLike = Math.round(data.daily.apparent_temperature_max[i]);
    const dailyCode: number = data.daily.weathercode[i];

    // Hourly arrays: index [i*24 + hour] for each hour of day i
    const base = i * 24;

    // Morning: 7am–9am → indices base+7, base+8
    const morningHours = [7, 8];
    const morningTemp = avg(morningHours.map((h) => data.hourly.temperature_2m[base + h]));
    const morningRainChance = Math.max(
      ...morningHours.map((h) => data.hourly.precipitation_probability[base + h] ?? 0)
    );

    // Evening: 5pm–8pm → indices base+17..base+20
    const eveningHours = [17, 18, 19, 20];
    const eveningTemp = avg(eveningHours.map((h) => data.hourly.temperature_2m[base + h]));
    const eveningRainChance = Math.max(
      ...eveningHours.map((h) => data.hourly.precipitation_probability[base + h] ?? 0)
    );

    const condition = wmoToCondition(dailyCode);

    days.push({
      date: dateStr,
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : DAY_NAMES[dow],
      dayShort: i === 0 ? "Today" : i === 1 ? "Tmrw" : DAY_SHORT[dow],
      temperature: tempHigh,
      feelsLike,
      condition,
      morningTemp,
      eveningTemp,
      morningRainChance,
      eveningRainChance,
    });

    void tempLow; // used implicitly via feelsLike
  }

  return days;
}

export async function fetchForecast(): Promise<DayForecast[]> {
  // Return cached data if still fresh
  if (_cache && Date.now() - _cache.at < CACHE_MS) {
    return _cache.data;
  }

  try {
    const res = await fetch(OPEN_METEO_URL);
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    const json = await res.json();
    const data = parseForecast(json);
    _cache = { data, at: Date.now() };
    return data;
  } catch (err) {
    console.error("Weather fetch failed, using fallback:", err);
    // Return stale cache if available, otherwise static fallback
    if (_cache) return _cache.data;
    return FALLBACK;
  }
}

// Static fallback used only if Open-Meteo fails AND no cache exists
const FALLBACK: DayForecast[] = (() => {
  const today = new Date();
  return [0, 1, 2, 3, 4].map((i) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + i);
    const dow = dt.getDay();
    return {
      date: dt.toISOString().split("T")[0],
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : DAY_NAMES[dow],
      dayShort: i === 0 ? "Today" : i === 1 ? "Tmrw" : DAY_SHORT[dow],
      temperature: 21,
      feelsLike: 19,
      condition: "Partly Cloudy",
      morningTemp: 15,
      eveningTemp: 18,
      morningRainChance: 20,
      eveningRainChance: 30,
    };
  });
})();

// Clothing is based on the coldest part of the day
export function getClothingRec(morningTemp: number, eveningTemp: number): ClothingRec {
  const coldest = Math.min(morningTemp, eveningTemp);
  if (coldest < 10) return "very-cold";
  if (coldest < 16) return "cold";
  if (coldest < 22) return "mild";
  if (coldest < 28) return "warm";
  return "hot";
}

export function getUmbrellaRec(morningRain: number, eveningRain: number): UmbrellaRec {
  return morningRain > 40 || eveningRain > 40 ? "bring" : "not-needed";
}

export const CLOTHING_LABEL: Record<ClothingRec, string> = {
  "very-cold": "Very cold — wear warm clothes and bring a jumper",
  cold: "Cold — bring a jumper",
  mild: "Mild — light layer recommended",
  warm: "Warm — lighter clothes should be fine",
  hot: "Hot — wear very light/cool clothes",
};

export const CONDITION_EMOJI: Record<string, string> = {
  Sunny: "☀️",
  "Partly Cloudy": "⛅",
  Cloudy: "☁️",
  Rainy: "🌧️",
  Stormy: "⛈️",
  Snowy: "❄️",
  Foggy: "🌫️",
  Windy: "💨",
};
