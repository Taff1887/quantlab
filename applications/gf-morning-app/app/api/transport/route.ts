// TfNSW Departure Monitor
// Step 1: Stop Finder resolves exact ferry-wharf stop ID (cached 24 h)
// Step 2: Departure Monitor returns departures — filter to INBOUND (→ Circular Quay) only
// Direction detection: TfNSW description is "[Route] [Origin] to [Destination]"
//   e.g. "Mosman Bay Mosman Bay to Circular Quay"  → inbound  ✓
//        "Mosman Bay Circular Quay to Mosman Bay"   → outbound ✗

export const revalidate = 30;

const STOP_FINDER = "https://api.transport.nsw.gov.au/v1/tp/stop_finder";
const DEP_MON     = "https://api.transport.nsw.gov.au/v1/tp/departure_mon";
const SYD_TZ      = "Australia/Sydney";

// Walk from Circular Quay ferry wharf → 1 Farrer Place
const OFFICE_WALK_MINS = 8;

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

// ── Direction filter ──────────────────────────────────────────────────────────
// TfNSW description field is "[Route Name] [Origin] to [Destination]"
// We keep only departures heading TO Circular Quay.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isInboundToCity(ev: any): boolean {
  const desc = (ev.transportation?.description ?? "").toLowerCase();

  // Definitive: description ends in "to circular quay" → inbound ✓
  if (desc.includes("to circular quay")) return true;
  // Definitive: description says "circular quay to [somewhere]" → outbound ✗
  if (desc.includes("circular quay to ")) return false;

  // Fallback: check the destination stop name
  const destName = (ev.transportation?.destination?.name ?? "").toLowerCase();
  if (destName.includes("circular quay") || destName.includes("quay")) return true;
  if (destName && !destName.includes("quay")) return false;

  // No info — include rather than drop
  return true;
}

// ── Stop Finder (cached 24 h) ─────────────────────────────────────────────────

async function resolveStopId(searchName: string, apiKey: string): Promise<string | null> {
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
  if (!res.ok) {
    console.warn(`Stop Finder ${res.status} for "${searchName}"`);
    return null;
  }
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

  // Prefer ferry stops (product class 9)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ferryStop = locations.find((l: any) =>
    (l.productClasses as number[] ?? []).includes(9)
  );
  return (ferryStop ?? locations[0])?.id ?? null;
}

// ── Departure Monitor ─────────────────────────────────────────────────────────

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

  // Log a sample of what came back for debugging
  const sample = events.slice(0, 6).map((e) =>
    `${e.transportation?.number} "${e.transportation?.description}" → dest="${e.transportation?.destination?.name}"`
  ).join(" | ");
  console.log(`${wharf.wharfKey} [${stopId}]: ${events.length} events. ${sample}`);

  // Keep ferry services (product class 9, F* or CC* prefix) heading inbound to Circular Quay
  const inbound = events.filter((ev) => {
    const cls: number   = ev.transportation?.product?.class ?? 0;
    const route: string = (ev.transportation?.number ?? "").toUpperCase();
    const isFerry = cls === 9 || route.startsWith("F") || route.startsWith("CC");
    return isFerry && isInboundToCity(ev);
  });

  console.log(`${wharf.wharfKey}: ${inbound.length}/${events.length} kept after ferry+direction filter`);

  const trips = [];
  for (const ev of inbound.slice(0, 6)) {
    const depIso: string = ev.departureTimeEstimated ?? ev.departureTimePlanned;
    if (!depIso) continue;

    const departureTime      = isoToHHMM(depIso);
    const destinationArrival = addMins(departureTime, wharf.crossingMins);
    const officeArrival      = addMins(destinationArrival, OFFICE_WALK_MINS);
    const totalMins          = wharf.walkMins + wharf.crossingMins + OFFICE_WALK_MINS;

    // Clean route name — just the number, not the verbose TfNSW direction description
    const routeNum = (ev.transportation?.number ?? "").toUpperCase();
    const routeName = routeNum ? `${routeNum} to Circular Quay` : "Ferry to Circular Quay";

    trips.push({
      id:               `${wharf.wharfKey.toLowerCase().replace(/\s+/g, "-")}-${departureTime}`,
      mode:             "ferry" as const,
      wharf:            wharf.wharfKey,
      routeName,
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
