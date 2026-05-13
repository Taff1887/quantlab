// =============================================================================
// Weather
// =============================================================================
export interface DayForecast {
  date: string;          // YYYY-MM-DD
  label: string;         // "Today", "Tomorrow", "Wednesday" …
  dayShort: string;      // "Today", "Tmrw", "Wed" …
  temperature: number;
  feelsLike: number;
  condition: string;
  morningTemp: number;
  eveningTemp: number;
  morningRainChance: number;
  eveningRainChance: number;
  dailyPeakHour?: number;
}

export interface WeatherData {
  temperature: number;    // current / daytime
  feelsLike: number;
  condition: string;
  morningTemp: number;    // ~7am–9am
  eveningTemp: number;    // ~5pm–8pm
  morningRainChance: number; // 7am–9am %
  eveningRainChance: number; // 5pm–10pm %
  lastUpdated: string;
}

export type ClothingRec = "very-cold" | "cold" | "mild" | "warm" | "hot";
export type UmbrellaRec = "bring" | "not-needed";

// =============================================================================
// Transport
// =============================================================================
export type TransportMode = "ferry" | "bus";
export type PrimaryMode = "all" | "bus" | "ferry";
export type WharfName =
  | "Taronga Zoo"
  | "South Mosman"
  | "Mosman Bay"
  | "Cremorne Point"
  | "Old Cremorne";

export interface TransportOption {
  id: string;
  mode: TransportMode;
  wharf?: WharfName;
  stopName: string;
  // Walking to stop
  walkMins: number;
  walkDistanceM: number;
  // Driving to stop
  driveMins: number;
  driveDistanceM: number;
  departureTime: string;
  arrivalTime: string;
  totalMins: number;
  notes?: string;
  isBest?: boolean;
}

export interface FerryDeparture {
  id: string;
  wharf: WharfName;
  departureTime: string;
  arrivalTime: string;
  destination: string;
  walkMinsFromHome: number;
  totalMins: number;
}

// =============================================================================
// Gym
// =============================================================================
export type WorkoutType =
  | "Legs"
  | "Upper Body"
  | "Run"
  | "Stairmaster";

export interface ExerciseSet {
  weight?: number; // kg, optional (e.g. pull ups have no weight)
  reps: number;
  sets: number;
}

export interface FreeExercise {
  name: string;
  weight?: number;
  reps?: number;
  sets?: number;
  na?: boolean;
}

export interface GymDetails {
  // Free-form exercise list (Legs, Upper Body)
  exercises?: FreeExercise[];
  // Stairmaster
  flights?: number;
  minutes?: number;
  // Run
  distance?: number; // km
  runTime?: number;  // minutes
}

export interface GymSession {
  id: string;
  date: string; // YYYY-MM-DD
  type: WorkoutType;
  notes: string;
  details?: GymDetails;
}

// =============================================================================
// Life Admin
// =============================================================================
export interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string; // YYYY-MM-DD
  createdAt: string;
}

// =============================================================================
// Chores
// =============================================================================
export interface Chore {
  id: string;
  name: string;
  intervalDays: number;
  lastCompleted: string | null; // ISO timestamp
}

export type ChoreStatus = "ok" | "due-soon" | "due-today" | "overdue";

// =============================================================================
// Date Nights
// =============================================================================
export interface DateNight {
  id: string;
  date: string; // YYYY-MM-DD
  note: string;
  createdAt: string;
}
