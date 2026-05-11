import type { WharfName, TransportMode, PrimaryMode } from "../types";

// =============================================================================
// TODO: Replace with live Transport for NSW API
//   https://opendata.transport.nsw.gov.au/
//   Trip Planner API — arrival/departure monitor
//   GET https://api.transport.nsw.gov.au/v1/tp/trip
//       ?outputFormat=rapidJSON
//       &coordOutputFormat=EPSG%3A4326
//       &depArrMacro=arr          ← or "dep" for leaving-at mode
//       &itdDate=20260511
//       &itdTime=0900
//       &type_origin=stop&name_origin=1+Rickard+Ave+Mosman
//       &type_destination=stop&name_destination=1+Farrer+Place+Sydney
//
// TODO: Walking/driving times — replace with Google Maps Distance Matrix API
// =============================================================================

export interface ScheduleTrip {
  id: string;
  mode: TransportMode;
  wharf?: WharfName;
  routeName: string;
  stopName: string;
  walkMins: number;
  walkDistanceM: number;
  driveMins: number;
  driveDistanceM: number;
  departureTime: string;       // departs Mosman stop
  destinationStop: string;     // "Circular Quay" or "Wynyard"
  destinationArrival: string;  // arrives at CQ/Wynyard
  officeArrival: string;       // arrives at 1 Farrer Place
  totalMins: number;           // home (walking) → office
  leaveByWalking: string;
  leaveByDriving: string;
  notes?: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function fromMins(total: number): string {
  const h = Math.floor(((total % (24 * 60)) + 24 * 60) / 60) % 24;
  const m = ((total % 60) + 60) % 60;
  return `${pad(h)}:${pad(m)}`;
}

function addMin(t: string, n: number) {
  return fromMins(toMins(t) + n);
}

function subMin(t: string, n: number) {
  return fromMins(toMins(t) - n);
}

// ─── route config ─────────────────────────────────────────────────────────────

interface RouteConfig {
  id: string;
  mode: TransportMode;
  wharf?: WharfName;
  routeName: string;
  stopName: string;
  walkMins: number;
  walkDistanceM: number;
  driveMins: number;
  driveDistanceM: number;
  transitMins: number;          // stop → Circular Quay / Wynyard
  destinationStop: string;
  walkToOfficeMins: number;     // CQ/Wynyard → 1 Farrer Place
  intervalMins: number;
  firstDep: string;
  lastDep: string;
}

// Add ~10% buffer to travel times so she's never cutting it fine
function buffer(n: number) { return Math.ceil(n * 1.1); }

const ROUTES: RouteConfig[] = [
  {
    id: "taronga-ferry",
    mode: "ferry",
    wharf: "Taronga Zoo",
    routeName: "F9 Zoo Ferry",
    stopName: "Taronga Zoo Ferry Wharf",
    walkMins: buffer(9), walkDistanceM: 700,
    driveMins: buffer(3), driveDistanceM: 500,
    transitMins: 15,
    destinationStop: "Circular Quay",
    walkToOfficeMins: 8,
    intervalMins: 30,
    firstDep: "05:30", lastDep: "22:30",
  },
  {
    id: "south-mosman-ferry",
    mode: "ferry",
    wharf: "South Mosman",
    routeName: "F3 Balmain Ferry",
    stopName: "South Mosman Ferry Wharf",
    walkMins: buffer(16), walkDistanceM: 1200,
    driveMins: buffer(5), driveDistanceM: 900,
    transitMins: 25,
    destinationStop: "Circular Quay",
    walkToOfficeMins: 8,
    intervalMins: 30,
    firstDep: "06:00", lastDep: "22:00",
  },
  {
    id: "mosman-bay-ferry",
    mode: "ferry",
    wharf: "Mosman Bay",
    routeName: "F3 Balmain Ferry",
    stopName: "Mosman Bay Ferry Wharf",
    walkMins: buffer(20), walkDistanceM: 1550,
    driveMins: buffer(6), driveDistanceM: 1100,
    transitMins: 22,
    destinationStop: "Circular Quay",
    walkToOfficeMins: 8,
    intervalMins: 60,
    firstDep: "06:30", lastDep: "21:30",
  },
  {
    id: "cremorne-ferry",
    mode: "ferry",
    wharf: "Cremorne Point",
    routeName: "F5 Neutral Bay Ferry",
    stopName: "Cremorne Point Ferry Wharf",
    walkMins: buffer(22), walkDistanceM: 1700,
    driveMins: buffer(7), driveDistanceM: 1400,
    transitMins: 18,
    destinationStop: "Circular Quay",
    walkToOfficeMins: 8,
    intervalMins: 60,
    firstDep: "06:00", lastDep: "22:00",
  },
  {
    id: "bus-144",
    mode: "bus",
    routeName: "Route 144",
    stopName: "Military Rd (Route 144)",
    walkMins: buffer(5), walkDistanceM: 380,
    driveMins: buffer(2), driveDistanceM: 280,
    transitMins: 30,
    destinationStop: "Wynyard",
    walkToOfficeMins: 6,
    intervalMins: 15,
    firstDep: "05:30", lastDep: "23:00",
  },
  {
    id: "bus-178",
    mode: "bus",
    routeName: "Route 178",
    stopName: "Spit Rd (Route 178)",
    walkMins: buffer(6), walkDistanceM: 480,
    driveMins: buffer(2), driveDistanceM: 350,
    transitMins: 35,
    destinationStop: "Wynyard",
    walkToOfficeMins: 8,
    intervalMins: 20,
    firstDep: "06:00", lastDep: "22:30",
  },
];

// ─── trip generation ──────────────────────────────────────────────────────────

function tripsForRoute(r: RouteConfig): ScheduleTrip[] {
  const trips: ScheduleTrip[] = [];
  let depMins = toMins(r.firstDep);
  const lastMins = toMins(r.lastDep);
  let i = 0;

  while (depMins <= lastMins) {
    const depStr = fromMins(depMins);
    const cqArr = addMin(depStr, r.transitMins);
    const officeArr = addMin(cqArr, r.walkToOfficeMins);
    const total = r.walkMins + r.transitMins + r.walkToOfficeMins;

    trips.push({
      id: `${r.id}-${i}`,
      mode: r.mode,
      wharf: r.wharf,
      routeName: r.routeName,
      stopName: r.stopName,
      walkMins: r.walkMins,
      walkDistanceM: r.walkDistanceM,
      driveMins: r.driveMins,
      driveDistanceM: r.driveDistanceM,
      departureTime: depStr,
      destinationStop: r.destinationStop,
      destinationArrival: cqArr,
      officeArrival: officeArr,
      totalMins: total,
      leaveByWalking: subMin(depStr, r.walkMins + 2),
      leaveByDriving: subMin(depStr, r.driveMins + 2),
    });

    depMins += r.intervalMins;
    i++;
  }
  return trips;
}

export function generateAllTrips(): ScheduleTrip[] {
  return ROUTES.flatMap(tripsForRoute);
}

// ─── filter helpers ───────────────────────────────────────────────────────────

export function filterTrips(
  trips: ScheduleTrip[],
  opts: {
    mode?: PrimaryMode;
    wharf?: WharfName | "all";
    busRoute?: string;
  }
): ScheduleTrip[] {
  return trips.filter((t) => {
    if (opts.mode && opts.mode !== "all" && t.mode !== opts.mode) return false;
    if (opts.wharf && opts.wharf !== "all" && t.wharf !== opts.wharf) return false;
    if (opts.busRoute && opts.busRoute !== "all" && t.id.split("-").slice(0, 2).join("-") !== opts.busRoute) return false;
    return true;
  });
}

export function tripsLeavingAt(trips: ScheduleTrip[], fromTime: string): ScheduleTrip[] {
  const from = toMins(fromTime);
  return trips.filter((t) => toMins(t.departureTime) >= from)
    .sort((a, b) => toMins(a.departureTime) - toMins(b.departureTime));
}

export function tripsArrivingBy(trips: ScheduleTrip[], byTime: string): ScheduleTrip[] {
  const by = toMins(byTime);
  return trips.filter((t) => toMins(t.officeArrival) <= by)
    .sort((a, b) => toMins(b.departureTime) - toMins(a.departureTime)); // latest dep first
}

// Trips arriving just AFTER byTime (within windowMins) — shown greyed out as "nearby"
export function tripsArrivingNear(trips: ScheduleTrip[], byTime: string, windowMins = 30): ScheduleTrip[] {
  const by = toMins(byTime);
  return trips
    .filter((t) => toMins(t.officeArrival) > by && toMins(t.officeArrival) <= by + windowMins)
    .sort((a, b) => toMins(a.officeArrival) - toMins(b.officeArrival))
    .slice(0, 3);
}

export function formatDist(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`;
}
