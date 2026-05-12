// TfNSW Departure Monitor — direct text search, no direction filtering
// All departures from Mosman ferry wharves go to Circular Quay (either direct
// or via loop), so we only need to filter by ferry service type.

export const revalidate = 30;

const STOP_FINDER = "https://api.transport.nsw.gov.au/v1/tp/stop_finder";
const DEP_MON     = "https://api.transport.nsw.gov.au/v1/tp/departure_mon";
const SYD_TZ      = "Australia/Sydney";

// Official TfNSW stop names (with "Ferry Wharf") for reliable text matching
const FERRY_WHARVES = [
  {
    searchName:     "Taronga Zoo Ferry Wharf",
    wharfKey:       "Taronga Zoo",
    walkMins:       10,
    walkDistanceM:  700,
    driveMins:      4,
    driveDistanceM: 500,
    crossingMins:   15,  // TZ → Circular Quay
  },
  {
    searchName:     "South Mosman Ferry Wharf",
    wharfKey:       "South Mosman",
    walkMins:       18,
    walkDistanceM:  1200,
    driveMins:      6,
    driveDistanceM: 900,
    crossingMins:   25,  // South Mosman → Circular Quay
  },
  {
    searchName:     "Mosman Bay Ferry Wharf",
    wharfKey:       "Mosman Bay",
    walkMins:       22,
    walkDistanceM:  1550,
    driveMins:      7,
    driveDistanceM: 1100,
    crossingMins:   22,  // Mosman Bay → Circular Quay
  },
  {
    searchName:     "Cremorne Point Ferry Wharf",
    wharfKey:       "Cremorne Point",
    walkMins:       25,
    walkDistanceM:  1700,
    driveMins:      8,
    driveDistanceM: 1400,
    crossingMins:   18,  // Cremorne Point → Circular Quay
  },
];

// Walk from Circular Quay ferry wharf → 1 Farrer Place
const OFFICE_WALK_MINS = 8;

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

// ── Resolve stop ID via Stop Finder (cached 24 h) ─────────────────────────────

async function resolveStopId(searchName: string, apiKey: string): Promise<string | null> {
  const url = new URL(STOP_FINDER);
  url.searchParams.set("outputFormat",      "rapidJSON");
  url.searchParams.set("coordOutputFormat", "EPSG:4326");
  url.searchParams.set("type_sf",           "any");   // search all types; filter to ferry below
  url.searchParams.set("name_sf",           searchName);
  url.searchParams.set("TfNSWSF",           "true");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `apikey ${apiKey}` },
    next: { revalidate: 86400 },
  });
  if (!res.ok) {
    console.warn(`Stop Finder ${res.status} for "${searchName}"`);
    return null;
  }
  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const locations: any[] = data?.locations ?? [];

  // Log what came back so Vercel logs show which stop was chosen
  console.log(
    `Stop Finder "${searchName}": ${locations.length} results — ` +
    locations.slice(0, 3).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (l: any) => `${l.name} (id=${l.id}, classes=${JSON.stringify(l.productClasses)})`
    ).join(" | ")
  );

  // Prefer stops that explicitly serve ferry (product class 9)
  const ferryStop = locations.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (l: any) => (l.productClasses as number[] ?? []).includes(9)
  );
  return (ferryStop ?? locations[0])?.id ?? null;
}

// ── Fetch departures ──────────────────────────────────────────────────────────

async function fetchWharf(wharf: typeof FERRY_WHARVES[0], apiKey: string) {
  const stopId = await resolveStopId(wharf.searchName, apiKey);
  if (!stopId) throw new Error(`No stop found for ${wharf.wharfKey}`);

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
  if (!res.ok) throw new Error(`TfNSW ${res.status} for ${wharf.wharfKey}`);
  const data = await res.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events: any[] = data?.stopEvents ?? [];

  // Log every unique route + destination so we can see what the API returns
  const summary = [...new Map(events.map((e) => [
    e.transportation?.number,
    `${e.transportation?.number} → ${e.transportation?.destination?.name} (class ${e.transportation?.product?.class})`,
  ])).values()].join(" | ");
  console.log(`${wharf.wharfKey} [stop=${stopId}]: ${events.length} events. ${summary}`);

  // Keep ferry services only — product class 9, or route prefix F or CC (CCTZ fast ferry)
  // No direction filter: all departures from these wharves head to Circular Quay
  const ferryEvents = events.filter((ev) => {
    const cls: number   = ev.transportation?.product?.class ?? 0;
    const route: string = (ev.transportation?.number ?? "").toUpperCase();
    return cls === 9 || route.startsWith("F") || route.startsWith("CC");
  });

  const trips = [];
  for (const ev of ferryEvents.slice(0, 6)) {
    const depIso: string = ev.departureTimeEstimated ?? ev.departureTimePlanned;
    if (!depIso) continue;

    const departureTime      = isoToHHMM(depIso);
    const destinationArrival = addMins(departureTime, wharf.crossingMins);
    const officeArrival      = addMins(destinationArrival, OFFICE_WALK_MINS);
    const totalMins          = wharf.walkMins + wharf.crossingMins + OFFICE_WALK_MINS;
    const routeNum           = ev.transportation?.number ?? "";
    const routeDesc          = ev.transportation?.description ?? "";

    trips.push({
      id:               `${wharf.wharfKey.toLowerCase().replace(/\s+/g, "-")}-${departureTime}`,
      mode:             "ferry" as const,
      wharf:            wharf.wharfKey,
      routeName:        `${routeNum} ${routeDesc}`.trim() || "Ferry to Circular Quay",
      stopName:         `${wharf.wharfKey} Ferry Wharf`,
      walkMins:         wharf.walkMins,
      walkDistanceM:    wharf.walkDistanceM,
      driveMins:        wharf.driveMins,
      driveDistanceM:   wharf.driveDistanceM,
      departureTime,
      destinationStop:  "Circular Quay",
      destinationArrival,
      officeArrival,
      totalMins,
      leaveByWalking:   subMins(departureTime, wharf.walkMins + 2),
      leaveByDriving:   subMins(departureTime, wharf.driveMins + 2),
      isRealtime:       !!ev.departureTimeEstimated,
    });
  }
  return trips;
}

export async function GET() {
  const apiKey = process.env.TFNSW_API_KEY;
  if (!apiKey) return Response.json({ error: "NO_KEY", trips: [] }, { status: 200 });

  const results = await Promise.allSettled(
    FERRY_WHARVES.map((w) => fetchWharf(w, apiKey))
  );

  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`[${FERRY_WHARVES[i].wharfKey}] failed:`, r.reason);
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trips: any[] = results
    .filter((r) => r.status === "fulfilled")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .flatMap((r) => (r as any).value);

  trips.sort((a, b) => a.departureTime.localeCompare(b.departureTime));

  return Response.json({ trips, isRealtime: true });
}
