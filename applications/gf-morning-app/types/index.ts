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
  | "Cremorne Point";

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
