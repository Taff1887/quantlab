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

// ── Bus stops — Bradleys Head Rd only ─────────────────────────────────────────
// B100: Bradleys Head Rd → Wynyard Station

const BUS_STOPS = [
  {
    // Try several TfNSW stop name variants — Stop Finder picks the best match
    searchNames:     [
      "Bradleys Head Rd opp Thompson St",
      "Bradleys Head Rd after Thompson St",
      "Bradleys Head Rd Mosman",
      "Bradleys Head Road Mosman",
    ],
    stopKey:         "bus-b100-thompson",
    stopName:        "Bradleys Head Rd (Thompson St)",
    routeFilter:     ["B100"],   // case-insensitive match applied in isInboundBus
    walkMins:        10,
    walkDistanceM:   700,
    driveMins:       3,
    driveDistanceM:  450,
    transitMins:     34,   // Bradleys Head Rd → Wynyard
    destinationStop: "Wynyard",
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
    // Prefer bus stops (product class 5)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const busStop = locations.find((l: any) =>
      (l.productClasses as number[] ?? []).includes(5)
    );
    return (busStop ?? locations[0])?.id ?? null;
  }

  // Prefer ferry stops (product class 9)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ferryStop = locations.find((l: any) =>
    (l.productClasses as number[] ?? []).includes(9)
  );
  return (ferryStop ?? locations[0])?.id ?? null;
}

// ── Departure Monitor helper ──────────────────────────────────────────────────

async function getDepartures(stopId: string, apiKey: string) {
  const url = new URL(DEP_MON);
  url.searchParams.set("outputFormat",          "rapidJSON");
  url.searchParams.set("coordOutputFormat",     "EPSG:4326");
  url.searchParams.set("type_dm",               "stop");
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
  // Try each search name variant until we find a valid stop
  let stopId: string | null = null;
  for (const name of stop.searchNames) {
    stopId = await resolveStopId(name, apiKey, true);
    if (stopId) { console.log(`BUS ${stop.stopKey}: resolved via "${name}" → ${stopId}`); break; }
    console.warn(`BUS ${stop.stopKey}: no match for "${name}", trying next...`);
  }
  if (!stopId) throw new Error(`No stop found for ${stop.stopKey} (tried all name variants)`);

  const events = await getDepartures(stopId, apiKey);
  const now = nowMinsSydney();

  const sample = events.slice(0, 4).map((e) =>
    `${e.transportation?.number} "${e.transportation?.description}" dest="${e.transportation?.destination?.name}"`
  ).join(" | ");
  console.log(`BUS ${stop.stopKey} [${stopId}]: ${events.length} events. ${sample}`);

  const inbound = events.filter((ev) => {
    if (!isInboundBus(ev, stop.routeFilter)) return false;
    const depIso: string = ev.departureTimeEstimated ?? ev.departureTimePlanned ?? "";
    if (!depIso) return false;
    const mins = minsUntil(isoToHHMM(depIso), now);
    return mins >= 0 && mins <= 120;
  });

  console.log(`BUS ${stop.stopKey}: ${inbound.length}/${events.length} inbound within 2 h`);

  const trips = [];
  for (const ev of inbound) {
    const depIso: string = ev.departureTimeEstimated ?? ev.departureTimePlanned;
    if (!depIso) continue;
    const departureTime      = isoToHHMM(depIso);
    const destinationArrival = addMins(departureTime, stop.transitMins);
    const officeArrival      = addMins(destinationArrival, BUS_OFFICE_WALK_MINS);
    const totalMins          = stop.walkMins + stop.transitMins + BUS_OFFICE_WALK_MINS;
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
