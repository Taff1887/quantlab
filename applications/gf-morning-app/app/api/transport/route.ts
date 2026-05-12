// TfNSW Departure Monitor
// Step 1: Stop Finder resolves the exact ferry-wharf stop ID (cached 24 h)
// Step 2: Departure Monitor fetches departures for that stop ID
// Step 3: Keep only ferries heading TOWARDS Circular Quay (inbound)

export const revalidate = 30;

const STOP_FINDER = "https://api.transport.nsw.gov.au/v1/tp/stop_finder";
const DEP_MON     = "https://api.transport.nsw.gov.au/v1/tp/departure_mon";
const SYD_TZ      = "Australia/Sydney";

const FERRY_WHARVES = [
  {
    searchName:     "Taronga Zoo Wharf",
    wharfKey:       "Taronga Zoo",
    walkMins:       10,
    walkDistanceM:  700,
    driveMins:      4,
    driveDistanceM: 500,
    crossingMins:   12,
  },
  {
    searchName:     "South Mosman Wharf",
    wharfKey:       "South Mosman",
    walkMins:       18,
    walkDistanceM:  1200,
    driveMins:      6,
    driveDistanceM: 900,
    crossingMins:   25,
  },
  {
    searchName:     "Mosman Bay Wharf",
    wharfKey:       "Mosman Bay",
    walkMins:       22,
    walkDistanceM:  1550,
    driveMins:      7,
    driveDistanceM: 1100,
    crossingMins:   22,
  },
  {
    searchName:     "Cremorne Point Wharf",
    wharfKey:       "Cremorne Point",
    walkMins:       25,
    walkDistanceM:  1700,
    driveMins:      8,
    driveDistanceM: 1400,
    crossingMins:   18,
  },
];

const OFFICE_WALK_MINS = 3;

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

// ── Helpers ──────────────────────────────────────────────────────────────────

function isFerryService(ev: Record<string, unknown>): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t: any = ev.transportation ?? {};
  const cls: number  = t?.product?.class ?? 0;
  const route: string = (t?.number ?? "").toUpperCase();
  // Product class 9 = ferry; also match F* routes (F2, F4…) and CC* (CCTZ fast ferry)
  return cls === 9 || route.startsWith("F") || route.startsWith("CC");
}

function isInboundToCity(ev: Record<string, unknown>): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t: any = ev.transportation ?? {};
  const dest: string = (t?.destination?.name ?? "").toLowerCase();
  // If destination info is absent, don't discard the event
  if (!dest) return true;
  // Keep only services terminating at Circular Quay
  return dest.includes("circular quay") || dest.includes("quay");
}

// ── Step 1: resolve ferry-wharf stop ID via Stop Finder ───────────────────────

async function resolveStopId(searchName: string, apiKey: string): Promise<string | null> {
  const url = new URL(STOP_FINDER);
  url.searchParams.set("outputFormat",      "rapidJSON");
  url.searchParams.set("coordOutputFormat", "EPSG:4326");
  url.searchParams.set("type_sf",           "stop");   // PT stops only — no streets / POIs
  url.searchParams.set("name_sf",           searchName);
  url.searchParams.set("TfNSWSF",           "true");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `apikey ${apiKey}` },
    next: { revalidate: 86400 },                       // cache 24 h — stop IDs never change
  });
  if (!res.ok) {
    console.warn(`Stop Finder ${res.status} for "${searchName}"`);
    return null;
  }
  const data = await res.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const locations: any[] = data?.locations ?? [];

  // Prefer a stop that explicitly serves ferry (product class 9)
  const ferryStop = locations.find((loc) =>
    (loc.productClasses as number[] ?? []).includes(9)
  );
  const chosen = ferryStop ?? locations[0];
  if (!chosen) {
    console.warn(`Stop Finder: no results for "${searchName}"`);
    return null;
  }
  console.log(`Stop Finder resolved "${searchName}" → id=${chosen.id} name="${chosen.name}"`);
  return chosen.id ?? null;
}

// ── Step 2: fetch departures by stop ID, filter to inbound city-bound ferries ─

async function fetchWharf(wharf: typeof FERRY_WHARVES[0], apiKey: string) {
  const stopId = await resolveStopId(wharf.searchName, apiKey);
  if (!stopId) throw new Error(`Stop not found for ${wharf.wharfKey}`);

  const url = new URL(DEP_MON);
  url.searchParams.set("outputFormat",          "rapidJSON");
  url.searchParams.set("coordOutputFormat",     "EPSG:4326");
  url.searchParams.set("type_dm",               "stop");   // exact stop ID
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

  // Keep ferry services heading TOWARDS Circular Quay only
  const inboundFerries = events.filter(
    (ev) => isFerryService(ev) && isInboundToCity(ev)
  );

  // Log a summary so Vercel logs show what the API returned
  console.log(
    `${wharf.wharfKey}: ${events.length} total events, ` +
    `${inboundFerries.length} inbound ferry events. ` +
    `Sample destinations: ${[...new Set(events.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (e: any) => e.transportation?.destination?.name
    ))].slice(0, 5).join(", ")}`
  );

  const trips = [];
  for (const ev of inboundFerries.slice(0, 3)) {
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
      console.error(`[${FERRY_WHARVES[i].wharfKey}] fetch failed:`, r.reason);
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
