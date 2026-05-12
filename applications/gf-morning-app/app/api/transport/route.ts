// TfNSW Trip Planner API — origin/destination as coordinates, no stop IDs needed.
// This avoids the stop-ID guessing problem entirely and gives real journey options.

export const revalidate = 30;

const TRIP_URL = "https://api.transport.nsw.gov.au/v1/tp/trip";
const SYD_TZ = "Australia/Sydney";

// Home: 1 Rickard Ave, Mosman  (TfNSW coord format = lon:lat:EPSG:4326)
const HOME_COORD = "151.2273:-33.8274:EPSG:4326";
// Office: 1 Farrer Place, Sydney CBD
const OFFICE_COORD = "151.2095:-33.8660:EPSG:4326";

const OFFICE_WALK_MINS = 3; // Circular Quay → 1 Farrer Place

// Hardcoded walk/drive times from home to each wharf / bus stop
const FERRY_INFO: Record<string, { walkMins: number; walkDistanceM: number; driveMins: number; driveDistanceM: number }> = {
  "Taronga Zoo":    { walkMins: 10, walkDistanceM: 700,  driveMins: 4, driveDistanceM: 500  },
  "South Mosman":   { walkMins: 18, walkDistanceM: 1200, driveMins: 6, driveDistanceM: 900  },
  "Mosman Bay":     { walkMins: 22, walkDistanceM: 1550, driveMins: 7, driveDistanceM: 1100 },
  "Cremorne Point": { walkMins: 25, walkDistanceM: 1700, driveMins: 8, driveDistanceM: 1400 },
};

const BUS_INFO: Record<string, { stopName: string; walkMins: number; walkDistanceM: number; driveMins: number; driveDistanceM: number; destStop: string }> = {
  "144": { stopName: "Military Rd (Route 144)", walkMins: 6, walkDistanceM: 380, driveMins: 3, driveDistanceM: 280, destStop: "Wynyard" },
  "178": { stopName: "Spit Rd (Route 178)",     walkMins: 7, walkDistanceM: 480, driveMins: 3, driveDistanceM: 350, destStop: "Wynyard" },
};

function pad(n: number) { return String(n).padStart(2, "0"); }

function isoToHHMM(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-AU", {
    timeZone: SYD_TZ, hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function addMins(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const t = h * 60 + m + mins;
  return `${pad(Math.floor(t / 60) % 24)}:${pad(t % 60)}`;
}

function subMins(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  let t = h * 60 + m - mins;
  if (t < 0) t += 24 * 60;
  return `${pad(Math.floor(t / 60) % 24)}:${pad(t % 60)}`;
}

function matchWharf(name: string): string | null {
  const n = name.toLowerCase();
  if (n.includes("taronga"))       return "Taronga Zoo";
  if (n.includes("south mosman"))  return "South Mosman";
  if (n.includes("mosman bay"))    return "Mosman Bay";
  if (n.includes("cremorne"))      return "Cremorne Point";
  return null;
}

function matchBus(routeNum: string): string | null {
  if (routeNum.includes("144")) return "144";
  if (routeNum.includes("178")) return "178";
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseJourneys(journeys: any[]): any[] {
  const trips: any[] = [];

  for (const journey of journeys) {
    const legs: any[] = journey.legs ?? [];

    // Find all transit legs (not walking, class 99/100)
    const transitLegs = legs.filter((leg) => {
      const cls = leg.transportation?.product?.class;
      return cls !== undefined && cls !== 99 && cls !== 100;
    });

    // Only want single-leg journeys (no transfers)
    if (transitLegs.length !== 1) continue;

    const leg = transitLegs[0];
    const productClass: number = leg.transportation?.product?.class ?? 0;
    const routeNum: string = leg.transportation?.number ?? "";

    const depIso: string | undefined = leg.origin?.departureTimeEstimated ?? leg.origin?.departureTimePlanned;
    const arrIso: string | undefined = leg.destination?.arrivalTimeEstimated ?? leg.destination?.arrivalTimePlanned;
    if (!depIso || !arrIso) continue;

    const departureTime    = isoToHHMM(depIso);
    const destinationArrival = isoToHHMM(arrIso);
    const officeArrival    = addMins(destinationArrival, OFFICE_WALK_MINS);
    const isRealtime       = !!(leg.origin?.departureTimeEstimated);
    const crossingMins     = Math.round((new Date(arrIso).getTime() - new Date(depIso).getTime()) / 60_000);

    // ── Ferry (product class 9, or route starts with F) ──────────────────
    if (productClass === 9 || routeNum.startsWith("F")) {
      const originName = leg.origin?.name ?? "";
      const wharfKey = matchWharf(originName);
      if (!wharfKey) continue;

      const info = FERRY_INFO[wharfKey];
      trips.push({
        id: `${wharfKey.toLowerCase().replace(/\s+/g, "-")}-${departureTime}`,
        mode: "ferry",
        wharf: wharfKey,
        routeName: `${routeNum} ${leg.transportation?.description ?? ""}`.trim() || "Ferry to Circular Quay",
        stopName: `${wharfKey} Ferry Wharf`,
        ...info,
        departureTime,
        destinationStop: "Circular Quay",
        destinationArrival,
        officeArrival,
        totalMins: info.walkMins + crossingMins + OFFICE_WALK_MINS,
        leaveByWalking: subMins(departureTime, info.walkMins + 2),
        leaveByDriving: subMins(departureTime, info.driveMins + 2),
        isRealtime,
      });
    }

    // ── Bus (product class 5, route matches 144 or 178) ──────────────────
    else if (productClass === 5) {
      const busKey = matchBus(routeNum);
      if (!busKey) continue;

      const info = BUS_INFO[busKey];
      trips.push({
        id: `bus-${busKey}-${departureTime}`,
        mode: "bus",
        wharf: undefined,
        routeName: `Route ${busKey}`,
        stopName: info.stopName,
        walkMins: info.walkMins,
        walkDistanceM: info.walkDistanceM,
        driveMins: info.driveMins,
        driveDistanceM: info.driveDistanceM,
        departureTime,
        destinationStop: info.destStop,
        destinationArrival,
        officeArrival,
        totalMins: info.walkMins + crossingMins + OFFICE_WALK_MINS,
        leaveByWalking: subMins(departureTime, info.walkMins + 2),
        leaveByDriving: subMins(departureTime, info.driveMins + 2),
        isRealtime,
      });
    }
  }

  return trips;
}

export async function GET() {
  const apiKey = process.env.TFNSW_API_KEY;
  if (!apiKey) return Response.json({ error: "NO_KEY", trips: [] }, { status: 200 });

  try {
    // Current Sydney date + time for the query
    const sydStr = new Date().toLocaleString("sv-SE", { timeZone: SYD_TZ }); // "YYYY-MM-DD HH:MM:SS"
    const [dateStr, timeStr] = sydStr.split(" ");
    const itdDate = dateStr.replace(/-/g, "");      // YYYYMMDD
    const itdTime = timeStr.slice(0, 5).replace(":", ""); // HHMM

    const url = new URL(TRIP_URL);
    url.searchParams.set("outputFormat",       "rapidJSON");
    url.searchParams.set("coordOutputFormat",  "EPSG:4326");
    url.searchParams.set("depArrMacro",        "dep");
    url.searchParams.set("type_origin",        "coord");
    url.searchParams.set("name_origin",        HOME_COORD);
    url.searchParams.set("type_destination",   "coord");
    url.searchParams.set("name_destination",   OFFICE_COORD);
    url.searchParams.set("itdDate",            itdDate);
    url.searchParams.set("itdTime",            itdTime);
    url.searchParams.set("calcNumberOfTrips",  "12");
    url.searchParams.set("TfNSWTR",            "true");
    url.searchParams.set("version",            "10.2.1.42");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `apikey ${apiKey}` },
      next: { revalidate: 30 },
    });

    if (!res.ok) throw new Error(`TfNSW ${res.status}`);
    const data = await res.json();

    const trips = parseJourneys(data?.journeys ?? []);
    return Response.json({ trips, isRealtime: true });
  } catch (err) {
    console.error("TfNSW Trip API error:", err);
    return Response.json({ error: "API_ERROR", trips: [] }, { status: 200 });
  }
}
