import type { DayForecast, ClothingRec, UmbrellaRec } from "../types";

// Open-Meteo API — free, no API key
// Fetches both Mosman and CBD then averages to reflect the full commute corridor
function makeUrl(lat: number, lon: number) {
  return (
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${lat}&longitude=${lon}` +
    "&hourly=temperature_2m,precipitation_probability,apparent_temperature,weathercode" +
    "&daily=weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max" +
    "&timezone=Australia%2FSydney" +
    "&forecast_days=5"
  );
}

const MOSMAN_URL = makeUrl(-33.8274, 151.2273);
const CBD_URL    = makeUrl(-33.8688, 151.2093);

let _cache: { data: DayForecast[]; at: number } | null = null;
const CACHE_MS = 30 * 60 * 1000; // 30 min

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function avgTwo(a: number, b: number): number {
  return Math.round((a + b) / 2);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseForecast(mosman: any, cbd: any): DayForecast[] {
  const days: DayForecast[] = [];

  for (let i = 0; i < 5; i++) {
    const dateStr: string = mosman.daily.time[i];
    const dt = new Date(dateStr + "T12:00:00");
    const dow = dt.getDay();

    // Average Mosman + CBD daily values
    const tempHigh  = avgTwo(Math.round(mosman.daily.temperature_2m_max[i]), Math.round(cbd.daily.temperature_2m_max[i]));
    const feelsLike = avgTwo(Math.round(mosman.daily.apparent_temperature_max[i]), Math.round(cbd.daily.apparent_temperature_max[i]));
    const dailyCode: number = mosman.daily.weathercode[i]; // use Mosman as primary

    const base = i * 24;
    const morningHours = [7, 8];
    const eveningHours = [17, 18, 19, 20];

    // Average hourly temps across both locations
    const morningTemp = avgTwo(
      avg(morningHours.map((h) => mosman.hourly.temperature_2m[base + h])),
      avg(morningHours.map((h) => cbd.hourly.temperature_2m[base + h]))
    );
    const eveningTemp = avgTwo(
      avg(eveningHours.map((h) => mosman.hourly.temperature_2m[base + h])),
      avg(eveningHours.map((h) => cbd.hourly.temperature_2m[base + h]))
    );

    // Rain chance: use the higher of the two locations (conservative)
    const morningRainChance = Math.max(
      ...morningHours.map((h) => Math.max(
        mosman.hourly.precipitation_probability[base + h] ?? 0,
        cbd.hourly.precipitation_probability[base + h] ?? 0
      ))
    );
    const eveningRainChance = Math.max(
      ...eveningHours.map((h) => Math.max(
        mosman.hourly.precipitation_probability[base + h] ?? 0,
        cbd.hourly.precipitation_probability[base + h] ?? 0
      ))
    );

    days.push({
      date: dateStr,
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : DAY_NAMES[dow],
      dayShort: i === 0 ? "Today" : i === 1 ? "Tmrw" : DAY_SHORT[dow],
      temperature: tempHigh,
      feelsLike,
      condition: wmoToCondition(dailyCode),
      morningTemp,
      eveningTemp,
      morningRainChance,
      eveningRainChance,
    });
  }

  return days;
}

export async function fetchForecast(): Promise<DayForecast[]> {
  if (_cache && Date.now() - _cache.at < CACHE_MS) return _cache.data;

  try {
    const [mosmanRes, cbdRes] = await Promise.all([
      fetch(MOSMAN_URL),
      fetch(CBD_URL),
    ]);
    if (!mosmanRes.ok || !cbdRes.ok) throw new Error("Open-Meteo fetch failed");
    const [mosmanJson, cbdJson] = await Promise.all([mosmanRes.json(), cbdRes.json()]);
    const data = parseForecast(mosmanJson, cbdJson);
    _cache = { data, at: Date.now() };
    return data;
  } catch (err) {
    console.error("Weather fetch failed:", err);
    if (_cache) return _cache.data;
    return FALLBACK;
  }
}

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

// Clothing based on the coldest part of the day
// Below 14 → very cold (2 jumpers pookie)
// 14–20 → cold (wear a jumper)
// 20–25 → mild (light layer)
// 25–30 → warm
// 30+  → hot
export function getClothingRec(morningTemp: number, eveningTemp: number): ClothingRec {
  const coldest = Math.min(morningTemp, eveningTemp);
  if (coldest < 14) return "very-cold";
  if (coldest < 20) return "cold";
  if (coldest < 25) return "mild";
  if (coldest < 30) return "warm";
  return "hot";
}

export function getUmbrellaRec(morningRain: number, eveningRain: number): UmbrellaRec {
  return morningRain > 40 || eveningRain > 40 ? "bring" : "not-needed";
}

export const CLOTHING_LABEL: Record<ClothingRec, string> = {
  "very-cold": "Very cold out — bring 2 jumpers pookie, can't be having you sick 🧥🧥",
  cold:        "Chilly — wear a jumper 🧥",
  mild:        "Mild — a light layer should do 👕",
  warm:        "Warm day — lighter clothes are fine ☀️",
  hot:         "Hot one — very light/cool clothes 🌞",
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
