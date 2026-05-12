// TfNSW Departure Monitor — ferries + Bradleys Head Rd buses
// Step 1: Stop Finder resolves exact stop ID (cached 24 h)
// Step 2: Departure Monitor returns departures — inbound to city only

export const revalidate = 30;

const STOP_FINDER = "https://api.transport.nsw.gov.au/v1/tp/stop_finder";
const DEP_MON     = "https://api.transport.nsw.gov.au/v1/tp/departure_mon";
const SYD_TZ      = "Australia/Sydney";

// Walk from Circular Quay ferry wharf → 1 Farrer Place
const FERRY_OFFICE_WALK_MINS = 8;
// Walk from Wynyard bus stop → 1 Farrer Place
const BUS_OFFICE_WALK_MINS = 10;

// ── Ferry wharves ─────────────────────────────────────────────────────────────

const FERRY_WHARVES = [
  {
    searchName:     "Taronga Zoo Ferry Wharf",
    wharfKey:       "Taronga Zoo",
    walkMins:       10,
    walkDistanceM:  700,
    driveMins:      4,
    driveDistanceM: 500,
    crossingMins:   15,
  },
  {
    searchName:     "South Mosman Ferry Wharf",
    wharfKey:       "South Mosman",
    walkMins:       18,
    walkDistanceM:  1200,
    driveMins:      6,
    driveDistanceM: 900,
    crossingMins:   25,
  },
  {
    searchName:     "Mosman Bay Ferry Wharf",
    wharfKey:       "Mosman Bay",
    walkMins:       22,
    walkDistanceM:  1550,
    driveMins:      7,
    driveDistanceM: 1100,
    crossingMins:   22,
  },
  {
    searchName:     "Cremorne Point Ferry Wharf",
    wharfKey:       "Cremorne Point",
    walkMins:       25,
    walkDistanceM:  1700,
    driveMins:      8,
    driveDistanceM: 1400,
    crossingMins:   18,
  },
  {
    searchName:     "Old Cremorne Wharf",
    wharfKey:       "Old Cremorne",
    walkMins:       27,
    walkDistanceM:  1850,
    driveMins:      9,
    driveDistanceM: 1550,
    crossingMins:   20,
  },
];

// ── Bus stops ─────────────────────────────────────────────────────────────────
// Route 100: Bradleys Head Rd at Whiting Beach Rd (stop code 208858).
// Uses type_dm=any in Departure Monitor to accept raw TfNSW stop codes directly.

const BUS_STOPS = [
  {
    stopCode:          "208858",   // raw TfNSW stop code — used with type_dm=any
    stopKey:           "bus-100-whiting",
    stopName:          "Bradleys Head Rd at Whiting Beach Rd",
    departureOffsetMins: 0,
    routeFilter:       ["100"],
    walkMins:          10,
    walkDistanceM:     700,
    driveMins:         3,
    driveDistanceM:    450,
    transitMins:       40,   // Bradleys Head Rd → City QVB (~40 min)
    destinationStop:   "City QVB",
    walkToOfficeMins:  11,   // City QVB → 1 Farrer Place
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function nowMinsSydney(): number {
  const t = new Date().toLocaleTimeString("en-AU", {
    timeZone: SYD_TZ, hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minsUntil(depHHMM: string, nowMins: number): number {
  const [h, m] = depHHMM.split(":").map(Number);
  const depMins = h * 60 + m;
  return depMins >= nowMins ? depMins - nowMins : depMins + 1440 - nowMins;
}

// ── Direction filters ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isInboundFerry(ev: any): boolean {
  const desc = (ev.transportation?.description ?? "").toLowerCase();
  if (desc.includes("to circular quay")) return true;
  if (desc.includes("circular quay to ")) return false;
  const destName = (ev.transportation?.destination?.name ?? "").toLowerCase();
  if (destName.includes("circular quay") || destName.includes("quay")) return true;
  if (destName && !destName.includes("quay")) return false;
  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isInboundBus(ev: any, routeFilter: string[]): boolean {
  const routeNum = (ev.transportation?.number ?? "").trim().toUpperCase();
  // Must be one of our allowed routes (case-insensitive)
  if (routeFilter.length > 0 && !routeFilter.map((r) => r.toUpperCase()).includes(routeNum)) return false;

  const desc    = (ev.transportation?.description ?? "").toLowerCase();
  const dest    = (ev.transportation?.destination?.name ?? "").toLowerCase();

  // City-bound keywords
  const cityKeywords = ["wynyard", "city", "circular quay", "central", "cbd", "town hall"];
  const isCityBound  = cityKeywords.some((kw) => desc.includes(kw) || dest.includes(kw));
  if (isCityBound) return true;

  // Outbound keywords — drop these
  const outboundKeywords = ["taronga zoo", "balmoral", "manly", "chatswood", "mosman junction"];
  const isOutbound = outboundKeywords.some((kw) => desc.includes(kw) || dest.includes(kw));
  if (isOutbound) return false;

  // Unknown — include rather than drop
  return true;
}

// ── Stop Finder ───────────────────────────────────────────────────────────────

async function resolveStopId(
  searchName: string,
  apiKey: string,
  preferBus = false
): Promise<string | null> {
  const url = new URL(STOP_FINDER);
  url.searchParams.set("outputFormat",      "rapidJSON");
  url.searchParams.set("coordOutputFormat", "EPSG:4326");
  url.searchParams.set("type_sf",           "any");
  url.searchParams.set("name_sf",           searchName);
  url.searchParams.set("TfNSWSF",           "true");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `apikey ${apiKey}` },
    next: { revalidate: 86400 },
  });
  if (!res.ok) { console.warn(`Stop Finder ${res.status} for "${searchName}"`); return null; }
  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const locations: any[] = data?.locations ?? [];

  console.log(
    `StopFinder "${searchName}": ${locations.length} results — ` +
    locations.slice(0, 3).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (l: any) => `"${l.name}" id=${l.id} classes=${JSON.stringify(l.productClasses)}`
    ).join(" | ")
  );

  if (preferBus) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const busStop = locations.find((l: any) =>
      (l.productClasses as number[] ?? []).includes(5)
    );
    return (busStop ?? locations[0])?.id ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ferryStop = locations.find((l: any) =>
    (l.productClasses as number[] ?? []).includes(9)
  );
  return (ferryStop ?? locations[0])?.id ?? null;
}

// Resolve a stop by its TfNSW stop code (e.g. "208858") using type_sf=stop.
// This bypasses name-matching ambiguity and returns the EFA internal ID directly.
async function resolveStopByCode(stopCode: string, apiKey: string): Promise<string | null> {
  const url = new URL(STOP_FINDER);
  url.searchParams.set("outputFormat",      "rapidJSON");
  url.searchParams.set("coordOutputFormat", "EPSG:4326");
  url.searchParams.set("type_sf",           "stop");
  url.searchParams.set("name_sf",           stopCode);
  url.searchParams.set("TfNSWSF",           "true");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `apikey ${apiKey}` },
    next: { revalidate: 86400 },
  });
  if (!res.ok) { console.warn(`StopFinder(stop) ${res.status} for code "${stopCode}"`); return null; }
  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const locations: any[] = data?.locations ?? [];

  console.log(
    `StopFinder(stop) code="${stopCode}": ${locations.length} results — ` +
    locations.slice(0, 3).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (l: any) => `"${l.name}" id=${l.id} classes=${JSON.stringify(l.productClasses)}`
    ).join(" | ")
  );

  return locations[0]?.id ?? null;
}

// ── Departure Monitor helper ──────────────────────────────────────────────────

async function getDepartures(stopId: string, apiKey: string, typeMode: "stop" | "any" = "stop") {
  const url = new URL(DEP_MON);
  url.searchParams.set("outputFormat",          "rapidJSON");
  url.searchParams.set("coordOutputFormat",     "EPSG:4326");
  url.searchParams.set("type_dm",               typeMode);
  url.searchParams.set("name_dm",               stopId);
  url.searchParams.set("mode",                  "direct");
  url.searchParams.set("departureMonitorMacro", "true");
  url.searchParams.set("TfNSWDM",               "true");
  url.searchParams.set("version",               "10.2.1.42");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `apikey ${apiKey}` },
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`TfNSW ${res.status} stopId=${stopId}`);
  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data?.stopEvents ?? []) as any[];
}

// ── Fetch ferry wharf ─────────────────────────────────────────────────────────

async function fetchWharf(wharf: typeof FERRY_WHARVES[0], apiKey: string) {
  const stopId = await resolveStopId(wharf.searchName, apiKey, false);
  if (!stopId) throw new Error(`No stop found for ${wharf.wharfKey}`);

  const events = await getDepartures(stopId, apiKey);
  const now = nowMinsSydney();

  const sample = events.slice(0, 4).map((e) =>
    `${e.transportation?.number} "${e.transportation?.description}"`
  ).join(" | ");
  console.log(`${wharf.wharfKey} [${stopId}]: ${events.length} events. ${sample}`);

  const inbound = events.filter((ev) => {
    if (!isInboundFerry(ev)) return false;
    const depIso: string = ev.departureTimeEstimated ?? ev.departureTimePlanned ?? "";
    if (!depIso) return false;
    const mins = minsUntil(isoToHHMM(depIso), now);
    return mins >= 0 && mins <= 120;
  });

  const trips = [];
  for (const ev of inbound) {
    const depIso: string = ev.departureTimeEstimated ?? ev.departureTimePlanned;
    if (!depIso) continue;
    const departureTime      = isoToHHMM(depIso);
    const destinationArrival = addMins(departureTime, wharf.crossingMins);
    const officeArrival      = addMins(destinationArrival, FERRY_OFFICE_WALK_MINS);
    const totalMins          = wharf.walkMins + wharf.crossingMins + FERRY_OFFICE_WALK_MINS;
    const routeNum           = (ev.transportation?.number ?? "").trim();
    const routeName          = routeNum ? `${routeNum} to Circular Quay` : "Ferry to Circular Quay";

    trips.push({
      id:                `${wharf.wharfKey.toLowerCase().replace(/\s+/g, "-")}-${departureTime}`,
      mode:              "ferry" as const,
      wharf:             wharf.wharfKey,
      routeName,
      stopName:          `${wharf.wharfKey} Ferry Wharf`,
      walkMins:          wharf.walkMins,
      walkDistanceM:     wharf.walkDistanceM,
      driveMins:         wharf.driveMins,
      driveDistanceM:    wharf.driveDistanceM,
      departureTime,
      destinationStop:   "Circular Quay",
      destinationArrival,
      officeArrival,
      totalMins,
      leaveByWalking:    subMins(departureTime, wharf.walkMins + 2),
      leaveByDriving:    subMins(departureTime, wharf.driveMins + 2),
      isRealtime:        !!ev.departureTimeEstimated,
    });
  }
  return trips;
}

// ── Fetch bus stop ────────────────────────────────────────────────────────────

async function fetchBusStop(stop: typeof BUS_STOPS[0], apiKey: string) {
  // Use type_sf=stop to resolve the TfNSW stop code → EFA internal ID
  const stopId = await resolveStopByCode(stop.stopCode, apiKey);
  if (!stopId) throw new Error(`Could not resolve stop code ${stop.stopCode}`);
  console.log(`BUS ${stop.stopKey}: code ${stop.stopCode} → EFA id ${stopId}`);

  const events = await getDepartures(stopId, apiKey, "stop");
  const now = nowMinsSydney();

  const sample = events.slice(0, 4).map((e) =>
    `${e.transportation?.number} "${e.transportation?.description}" dest="${e.transportation?.destination?.name}"`
  ).join(" | ");
  console.log(`BUS ${stop.stopKey} [${stopId}]: ${events.length} events. ${sample}`);

  // Log ALL route numbers from this stop so we can identify the correct filter value
  const allRouteNums = [...new Set(events.map((e) => (e.transportation?.number ?? "?").trim()))];
  console.log(`BUS ${stop.stopKey} route numbers seen: ${JSON.stringify(allRouteNums)}`);

  // No direction filter — this stop is physically on the city-bound side of the road.
  // Just match route number (case-insensitive) and time window.
  const inbound = events.filter((ev) => {
    const depIso: string = ev.departureTimeEstimated ?? ev.departureTimePlanned ?? "";
    if (!depIso) return false;
    const mins = minsUntil(isoToHHMM(depIso), now);
    if (mins < 0 || mins > 120) return false;
    // Route filter — empty array means accept all
    if (stop.routeFilter.length > 0) {
      const routeNum = (ev.transportation?.number ?? "").trim().toUpperCase();
      if (!stop.routeFilter.map((r) => r.toUpperCase()).includes(routeNum)) return false;
    }
    return true;
  });

  console.log(`BUS ${stop.stopKey}: ${inbound.length}/${events.length} matched within 2 h`);

  const trips = [];
  for (const ev of inbound) {
    const depIso: string = ev.departureTimeEstimated ?? ev.departureTimePlanned;
    if (!depIso) continue;
    // Offset from terminus to displayed stop (e.g. Taronga Zoo → Whiting Beach Rd = +2 min)
    const terminusDep        = isoToHHMM(depIso);
    const departureTime      = addMins(terminusDep, stop.departureOffsetMins ?? 0);
    const walkToOffice       = stop.walkToOfficeMins ?? BUS_OFFICE_WALK_MINS;
    const destinationArrival = addMins(departureTime, stop.transitMins);
    const officeArrival      = addMins(destinationArrival, walkToOffice);
    const totalMins          = stop.walkMins + stop.transitMins + walkToOffice;
    const routeNum           = (ev.transportation?.number ?? "").trim();
    const routeName          = routeNum ? `Route ${routeNum} to ${stop.destinationStop}` : `Bus to ${stop.destinationStop}`;

    trips.push({
      id:                `${stop.stopKey}-${departureTime}`,
      mode:              "bus" as const,
      routeName,
      stopName:          stop.stopName,
      walkMins:          stop.walkMins,
      walkDistanceM:     stop.walkDistanceM,
      driveMins:         stop.driveMins,
      driveDistanceM:    stop.driveDistanceM,
      departureTime,
      destinationStop:   stop.destinationStop,
      destinationArrival,
      officeArrival,
      totalMins,
      leaveByWalking:    subMins(departureTime, stop.walkMins + 2),
      leaveByDriving:    subMins(departureTime, stop.driveMins + 2),
      isRealtime:        !!ev.departureTimeEstimated,
    });
  }
  return trips;
}



// ── GET handler ───────────────────────────────────────────────────────────────

export async function GET() {
  const apiKey = process.env.TFNSW_API_KEY;
  if (!apiKey) return Response.json({ error: "NO_KEY", trips: [] }, { status: 200 });

  const [ferryResults, busResults] = await Promise.all([
    Promise.allSettled(FERRY_WHARVES.map((w) => fetchWharf(w, apiKey))),
    Promise.allSettled(BUS_STOPS.map((s) => fetchBusStop(s, apiKey))),
  ]);

  ferryResults.forEach((r, i) => {
    if (r.status === "rejected") console.error(`[${FERRY_WHARVES[i].wharfKey}] failed:`, r.reason);
  });
  busResults.forEach((r, i) => {
    if (r.status === "rejected") console.error(`[${BUS_STOPS[i].stopKey}] failed:`, r.reason);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trips: any[] = [
    ...ferryResults.filter((r) => r.status === "fulfilled").flatMap((r) => (r as any).value),
    ...busResults.filter((r) => r.status === "fulfilled").flatMap((r) => (r as any).value),
  ];

  trips.sort((a, b) => a.departureTime.localeCompare(b.departureTime));

  return Response.json({ trips, isRealtime: true });
}
