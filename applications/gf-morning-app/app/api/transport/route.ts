// Real-time ferry departures from TfNSW Open Data API
// Sign up free at https://opendata.transport.nsw.gov.au/
// Add API key to Vercel: TFNSW_API_KEY=your_key_here

export const revalidate = 60; // cache 1 minute — real-time data

const TFNSW_BASE = "https://api.transport.nsw.gov.au/v1/tp/departure_mon";

// Ferry wharf stop Global IDs (TfNSW GTFS)
const FERRY_WHARVES = [
  {
    id: "taronga",
    wharf: "Taronga Zoo",
    stopId: "2000259",
    walkMins: 10,
    walkDistanceM: 700,
    driveMins: 4,
    driveDistanceM: 500,
    crossingMins: 12,   // ferry travel time to Circular Quay
  },
  {
    id: "south-mosman",
    wharf: "South Mosman",
    stopId: "2000255",
    walkMins: 18,
    walkDistanceM: 1200,
    driveMins: 6,
    driveDistanceM: 900,
    crossingMins: 25,
  },
  {
    id: "mosman-bay",
    wharf: "Mosman Bay",
    stopId: "2000254",
    walkMins: 22,
    walkDistanceM: 1550,
    driveMins: 7,
    driveDistanceM: 1100,
    crossingMins: 22,
  },
  {
    id: "cremorne",
    wharf: "Cremorne Point",
    stopId: "2000252",
    walkMins: 25,
    walkDistanceM: 1700,
    driveMins: 8,
    driveDistanceM: 1400,
    crossingMins: 18,
  },
];

const OFFICE_WALK_MINS = 3; // Circular Quay → 1 Farrer Place

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function addMinsToIso(isoStr: string, mins: number): string {
  const d = new Date(isoStr);
  d.setMinutes(d.getMinutes() + mins);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function subtractMins(timeStr: string, mins: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  let total = h * 60 + m - mins;
  if (total < 0) total += 24 * 60;
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

function isoToHHMM(isoStr: string): string {
  const d = new Date(isoStr);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseStopEvents(events: any[], wharf: typeof FERRY_WHARVES[0]) {
  const trips = [];

  for (const ev of events.slice(0, 3)) {
    // Use estimated time if available (real-time), otherwise planned
    const depIso: string = ev.departureTimeEstimated ?? ev.departureTimePlanned;
    if (!depIso) continue;

    const departureTime = isoToHHMM(depIso);
    const destinationArrival = addMinsToIso(depIso, wharf.crossingMins);
    const officeArrival = addMinsToIso(depIso, wharf.crossingMins + OFFICE_WALK_MINS);
    const totalMins = wharf.walkMins + wharf.crossingMins + OFFICE_WALK_MINS;
    const isRealtime = !!ev.departureTimeEstimated;

    trips.push({
      id: `${wharf.id}-${departureTime}`,
      mode: "ferry" as const,
      wharf: wharf.wharf,
      routeName: ev.transportation?.description ?? `Ferry to Circular Quay`,
      stopName: `${wharf.wharf} Ferry Wharf`,
      walkMins: wharf.walkMins,
      walkDistanceM: wharf.walkDistanceM,
      driveMins: wharf.driveMins,
      driveDistanceM: wharf.driveDistanceM,
      departureTime,
      destinationStop: "Circular Quay",
      destinationArrival,
      officeArrival,
      totalMins,
      leaveByWalking: subtractMins(departureTime, wharf.walkMins + 2),
      leaveByDriving: subtractMins(departureTime, wharf.driveMins + 2),
      isRealtime,
    });
  }

  return trips;
}

export async function GET() {
  const apiKey = process.env.TFNSW_API_KEY;

  if (!apiKey) {
    return Response.json({ error: "NO_KEY", trips: [] }, { status: 200 });
  }

  try {
    // Fetch next departures from all 4 ferry wharves in parallel
    const results = await Promise.allSettled(
      FERRY_WHARVES.map(async (wharf) => {
        const url = new URL(TFNSW_BASE);
        url.searchParams.set("outputFormat", "rapidJSON");
        url.searchParams.set("coordOutputFormat", "EPSG:4326");
        url.searchParams.set("mode", "direct");
        url.searchParams.set("type_dm", "stop");
        url.searchParams.set("name_dm", wharf.stopId);
        url.searchParams.set("departureMonitorMacro", "true");
        url.searchParams.set("TfNSWDM", "true");
        url.searchParams.set("version", "10.2.1.42");

        const res = await fetch(url.toString(), {
          headers: { Authorization: `apikey ${apiKey}` },
          next: { revalidate: 60 },
        });

        if (!res.ok) throw new Error(`TfNSW ${res.status} for ${wharf.wharf}`);
        const data = await res.json();
        const events = data?.stopEvents ?? [];
        return parseStopEvents(events, wharf);
      })
    );

    const trips = results
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => (r as PromiseFulfilledResult<ReturnType<typeof parseStopEvents>>).value);

    return Response.json({ trips, isRealtime: true });
  } catch (err) {
    console.error("TfNSW API error:", err);
    return Response.json({ error: "API_ERROR", trips: [] }, { status: 200 });
  }
}
