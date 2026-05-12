// TfNSW — ferries via Departure Monitor, buses via Trip Planner

export const revalidate = 30;

const STOP_FINDER   = "https://api.transport.nsw.gov.au/v1/tp/stop_finder";
const DEP_MON       = "https://api.transport.nsw.gov.au/v1/tp/departure_mon";
const TRIP_PLANNER  = "https://api.transport.nsw.gov.au/v1/tp/trip";
const SYD_TZ        = "Australia/Sydney";

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
    stopKey:          "bus-b100",
    stopName:         "Bradleys Head Rd at Whiting Beach Rd",
    routeFilter:      ["100"],
    walkMins:         10,
    walkDistanceM:    700,
    driveMins:        3,
    driveDistanceM:   450,
    transitMins:      34,
    destinationStop:  "Lang Park, York St",
    walkToOfficeMins: 11,
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
  // Product class 9 = ferry. Reject buses (5), trains (1), etc. that share the stop.
  const productClass = ev.transportation?.product?.class;
  if (productClass !== undefined && productClass !== 9 && productClass !== 10) return false;

  const destName = (ev.transportation?.destination?.name ?? "").toLowerCase();
  const desc    = (ev.transportation?.description    ?? "").toLowerCase();

  // Explicit inbound signals
  if (destName.includes("circular quay") || destName.includes("quay")) return true;
  if (desc.includes("to circular quay")) return true;

  // Explicit outbound signals — drop these
  const outbound = ["manly", "balmoral", "parramatta", "homebush", "cockatoo", "drummoyne"];
  if (outbound.some((kw) => destName.includes(kw) || desc.includes(kw))) return false;

  // No clear signal — include by default. We query FROM Mosman-area wharves so almost
  // all departures head towards Circular Quay. Dropping ambiguous trips loses real ferries.
  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isInboundBus(ev: any, routeFilter: string[]): boolean {
  const routeNum = (ev.transportation?.number ?? "").trim().toUpperCase();
  if (routeFilter.length > 0 && !routeFilter.map((r) => r.toUpperCase()).includes(routeNum)) return false;

  const dest = (ev.transportation?.destination?.name ?? "").toLowerCase();
  const desc = (ev.transportation?.description ?? "").toLowerCase();

  // Drop outbound (Taronga Zoo-bound) — the return leg of the Route 100 loop
  if (dest.includes("taronga") || desc.includes("taronga zoo")) return false;

  return true;
}

// ── Stop Finder ───────────────────────────────────────────────────────────────

async function resolveStopId(
  searchName: string,
  apiKey: string,
  preferBus = false,
  cacheSeconds = 86400
): Promise<string | null> {
  const url = new URL(STOP_FINDER);
  url.searchParams.set("outputFormat",      "rapidJSON");
  url.searchParams.set("coordOutputFormat", "EPSG:4326");
  url.searchParams.set("type_sf",           "any");
  url.searchParams.set("name_sf",           searchName);
  url.searchParams.set("TfNSWSF",           "true");

  const fetchOpts = cacheSeconds > 0
    ? { headers: { Authorization: `apikey ${apiKey}` }, next: { revalidate: cacheSeconds } }
    : { headers: { Authorization: `apikey ${apiKey}` }, cache: "no-store" as const };

  const res = await fetch(url.toString(), fetchOpts);
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

// ── Departure Monitor helper ──────────────────────────────────────────────────

async function getDepartures(
  stopId: string,
  apiKey: string,
  opts: { itdDate?: string; itdTime?: string; typeDm?: string } = {}
) {
  const url = new URL(DEP_MON);
  url.searchParams.set("outputFormat",          "rapidJSON");
  url.searchParams.set("coordOutputFormat",     "EPSG:4326");
  url.searchParams.set("type_dm",               opts.typeDm ?? "stop");
  url.searchParams.set("name_dm",               stopId);
  url.searchParams.set("mode",                  "direct");
  url.searchParams.set("departureMonitorMacro", "true");
  url.searchParams.set("TfNSWDM",               "true");
  url.searchParams.set("version",               "10.2.1.42");
  if (opts.itdDate) url.searchParams.set("itdDate", opts.itdDate);
  if (opts.itdTime) url.searchParams.set("itdTime", opts.itdTime);

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

async function fetchWharf(
  wharf: typeof FERRY_WHARVES[0],
  apiKey: string,
  dtOpts: { itdDate?: string; itdTime?: string; fromMins?: number } = {}
) {
  const stopId = await resolveStopId(wharf.searchName, apiKey, false);
  if (!stopId) throw new Error(`No stop found for ${wharf.wharfKey}`);

  const events = await getDepartures(stopId, apiKey, dtOpts);
  const now = dtOpts.fromMins ?? nowMinsSydney();

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

// ── Departure Monitor — name-based search ────────────────────────────────────
// type_dm=any lets the DM resolve by stop name directly (no Stop Finder needed).

async function getDeparturesByName(
  stopName: string,
  apiKey: string,
  dtOpts: { itdDate?: string; itdTime?: string } = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  const url = new URL(DEP_MON);
  url.searchParams.set("outputFormat",          "rapidJSON");
  url.searchParams.set("coordOutputFormat",     "EPSG:4326");
  url.searchParams.set("type_dm",               "any");
  url.searchParams.set("name_dm",               stopName);
  url.searchParams.set("mode",                  "direct");
  url.searchParams.set("departureMonitorMacro", "true");
  url.searchParams.set("TfNSWDM",               "true");
  url.searchParams.set("version",               "10.2.1.42");
  if (dtOpts.itdDate) url.searchParams.set("itdDate", dtOpts.itdDate);
  if (dtOpts.itdTime) url.searchParams.set("itdTime", dtOpts.itdTime);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `apikey ${apiKey}` },
    cache: "no-store" as const,
  });
  if (!res.ok) throw new Error(`DM/any ${res.status} for "${stopName}"`);
  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data?.stopEvents ?? []) as any[];
}

// ── Fetch bus stop ────────────────────────────────────────────────────────────
// Strategy A: query DM directly with type_dm=any and several stop-name variants
//   (bypasses Stop Finder name ambiguity entirely).
// Strategy B: resolve via Stop Finder → DM with type_dm=stop (existing logic).

async function fetchBusStop(
  stop: typeof BUS_STOPS[0],
  apiKey: string,
  dtOpts: { itdDate?: string; itdTime?: string; fromMins?: number } = {}
): Promise<{ trips: object[]; debug: string[] }> {
  const dbg: string[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function hasRouteMatch(evs: any[]): boolean {
    const targets = stop.routeFilter.map((r) => r.toUpperCase());
    return evs.some((ev) => {
      const cls = ev.transportation?.product?.class;
      if (cls != null && cls !== 5 && cls !== 11) return false;
      return targets.includes((ev.transportation?.number ?? "").trim().toUpperCase());
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function evSummary(evs: any[]): string {
    const classes = [...new Set(evs.map((e) => `${e.transportation?.product?.class}:${e.transportation?.number ?? "?"}`))];
    return `${evs.length} events [${classes.join(",")}]`;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let events: any[] = [];

  // ── Strategy A: DM/any direct name search ────────────────────────────────
  // TfNSW DM accepts stop names with type_dm=any — no Stop Finder needed.
  // Route 100 at Bradleys Head Rd is a standalone bus stop; TfNSW internal
  // stop names often use "Before" rather than "at" for the directional suffix.
  const dmNameCandidates = [
    "Bradleys Head Rd Before Whiting Beach Rd",
    "Bradleys Head Rd at Whiting Beach Rd",
    "Bradleys Head Rd, Mosman",
    "Taronga Zoo Ferry, Bradleys Head Rd",
    "Whiting Beach Rd at Bradleys Head Rd",
    "208858",                       // public stop code — DM/any may accept it
  ];

  for (const name of dmNameCandidates) {
    if (events.length > 0) break;
    const evs = await getDeparturesByName(name, apiKey, dtOpts).catch((e: Error) => {
      dbg.push(`DM/any "${name}": ERR ${e.message}`); return [];
    });
    const summary = evSummary(evs);
    const hit = hasRouteMatch(evs);
    dbg.push(`DM/any "${name}": ${summary} hit=${hit}`);
    if (hit) events = evs;
  }

  // ── Strategy B: Stop Finder → DM/stop ────────────────────────────────────
  if (events.length === 0) {
    const sfCandidates = [
      { name: "Taronga Zoo Ferry Wharf",              preferBus: false },
      { name: "Bradleys Head Rd at Whiting Beach Rd", preferBus: true  },
      { name: "Taronga Zoo",                          preferBus: true  },
    ];
    for (const attempt of sfCandidates) {
      if (events.length > 0) break;
      const stopId = await resolveStopId(attempt.name, apiKey, attempt.preferBus, 0).catch(() => null);
      if (!stopId) { dbg.push(`SF "${attempt.name}" → null`); continue; }
      const evs = await getDepartures(stopId, apiKey, dtOpts).catch(() => []);
      const summary = evSummary(evs);
      const hit = hasRouteMatch(evs);
      dbg.push(`SF "${attempt.name}"→${stopId}: ${summary} hit=${hit}`);
      if (hit) events = evs;
    }
  }

  console.log(`BUS ${stop.stopKey}: ${dbg.join(" | ")}`);

  const now = dtOpts.fromMins ?? nowMinsSydney();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inbound = events.filter((ev: any) => {
    // Must be a bus (product class 5 or 11 school bus), not a ferry or train
    const cls = ev.transportation?.product?.class;
    if (cls != null && cls !== 5 && cls !== 11) return false;

    // Route filter
    const routeNum = (ev.transportation?.number ?? "").trim().toUpperCase();
    if (!stop.routeFilter.map((r) => r.toUpperCase()).includes(routeNum)) return false;

    // Time window — 90 min for CommutePlanner planning queries
    const depIso: string = ev.departureTimeEstimated ?? ev.departureTimePlanned ?? "";
    if (!depIso) return false;
    const mins = minsUntil(isoToHHMM(depIso), now);
    if (mins < 0 || mins > 90) return false;

    // Drop outbound (Taronga Zoo-bound) return legs
    const dest = (ev.transportation?.destination?.name ?? "").toLowerCase();
    const desc = (ev.transportation?.description ?? "").toLowerCase();
    if (dest.includes("taronga") || desc.includes("taronga zoo")) return false;

    return true;
  });

  const seen = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deduped = inbound.filter((ev: any) => {
    const key = ev.departureTimeEstimated ?? ev.departureTimePlanned ?? "";
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  dbg.push(`after filter+dedup: ${deduped.length}/${events.length}`);

  const trips = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const ev of deduped as any[]) {
    const depIso: string = ev.departureTimeEstimated ?? ev.departureTimePlanned;
    if (!depIso) continue;
    const departureTime      = isoToHHMM(depIso);
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
  return { trips, debug: dbg };
}



// ── GET handler ───────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const apiKey = process.env.TFNSW_API_KEY;
  if (!apiKey) return Response.json({ error: "NO_KEY", trips: [] }, { status: 200 });

  // Optional ?date=YYYY-MM-DD&from=HH:MM for planning future trips
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date"); // e.g. "2026-05-13"
  const fromParam = searchParams.get("from"); // e.g. "07:00"

  const itdDate = dateParam ? dateParam.replace(/-/g, "") : undefined;
  const itdTime = fromParam ? fromParam.replace(":", "") : undefined;
  const fromMins = fromParam
    ? (() => { const [h, m] = fromParam.split(":").map(Number); return h * 60 + m; })()
    : undefined;

  const dtOpts = { itdDate, itdTime, fromMins };

  const [ferryResults, busResults] = await Promise.all([
    Promise.allSettled(FERRY_WHARVES.map((w) => fetchWharf(w, apiKey, dtOpts))),
    Promise.allSettled(BUS_STOPS.map((s) => fetchBusStop(s, apiKey, dtOpts))),
  ]);

  ferryResults.forEach((r, i) => {
    if (r.status === "rejected") console.error(`[${FERRY_WHARVES[i].wharfKey}] failed:`, r.reason);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const busDebug: Record<string, string[]> = {};
  busResults.forEach((r, i) => {
    const key = BUS_STOPS[i].stopKey;
    if (r.status === "rejected") {
      console.error(`[${key}] failed:`, r.reason);
      busDebug[key] = [`rejected: ${r.reason}`];
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      busDebug[key] = (r as any).value.debug ?? [];
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trips: any[] = [
    ...ferryResults.filter((r) => r.status === "fulfilled").flatMap((r) => (r as any).value),
    ...busResults.filter((r) => r.status === "fulfilled").flatMap((r) => (r as any).value.trips ?? []),
  ];

  trips.sort((a, b) => a.departureTime.localeCompare(b.departureTime));

  return Response.json({ trips, isRealtime: true, _busDebug: busDebug });
}
