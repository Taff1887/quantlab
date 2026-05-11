// =============================================================================
// Weather
// =============================================================================
export interface WeatherData {
  temperature: number;
  feelsLike: number;
  condition: string;
  morningRainChance: number; // 7am–9am %
  eveningRainChance: number; // 5pm–10pm %
  lastUpdated: string;
}

export type ClothingRec = "warmer" | "light-layer" | "cooler";
export type UmbrellaRec = "bring" | "not-needed";

// =============================================================================
// Transport
// =============================================================================
export type TransportMode = "ferry" | "bus";
export type WharfName =
  | "Taronga Zoo"
  | "South Mosman"
  | "Mosman Bay"
  | "Cremorne Point";

export type TransportFilter =
  | "all"
  | "ferry"
  | "bus"
  | WharfName;

export interface TransportOption {
  id: string;
  mode: TransportMode;
  wharf?: WharfName;
  stopName: string;
  walkMins: number;
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
  | "Pilates"
  | "Weights"
  | "Cardio"
  | "Walk"
  | "Class"
  | "Other";

export interface GymSession {
  id: string;
  date: string; // YYYY-MM-DD
  type: WorkoutType;
  notes: string;
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
