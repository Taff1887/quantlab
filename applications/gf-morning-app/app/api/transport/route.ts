// Real-time departures from TfNSW Open Data API
// Sign up free at https://opendata.transport.nsw.gov.au/
// Add API key to Vercel: TFNSW_API_KEY=your_key_here

export const revalidate = 60;

const TFNSW_BASE = "https://api.transport.nsw.gov.au/v1/tp/departure_mon";

const FERRY_WHARVES = [
  {
    id: "taronga",
    wharf: "Taronga Zoo",
    stopId: "2000259",
    walkMins: 10,
    walkDistanceM: 700,
    driveMins: 4,
    driveDistanceM: 500,
    crossingMins: 12,
    destinationStop: "Circular Quay",
    officeWalkMins: 3,
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
    destinationStop: "Circular Quay",
    officeWalkMins: 3,
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
    destinationStop: "Circular Quay",
    officeWalkMins: 3,
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
    destinationStop: "Circular Quay",
    officeWalkMins: 3,
  },
];

// Bus stops near 1 Rickard Ave, Mosman
// Route 144: Military Rd near Spofforth St (~380m walk)
// Route 178: Spit Rd near Mosman (~480m walk)
const BUS_STOPS = [
  {
    id: "bus-144",
    stopId: "209237",
    routeFilter: "144",
    stopName: "Military Rd (Route 144)",
    walkMins: 6,
    walkDistanceM: 380,
    driveMins: 3,
    driveDistanceM: 280,
    journeyMins: 30,  // Military Rd → Wynyard
    destinationStop: "Wynyard",
    officeWalkMins: 5, // Wynyard → 1 Farrer Place
  },
  {
    id: "bus-178",
    stopId: "209281",
    routeFilter: "178",
    stopName: "Spit Rd (Route 178)",
    walkMins: 7,
    walkDistanceM: 480,
    driveMins: 3,
    driveDistanceM: 350,
    journeyMins: 32,  // Spit Rd → City
    destinationStop: "Wynyard",
    officeWalkMins: 5,
  },
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// TfNSW returns ISO strings like "2026-05-12T10:19:00+10:00"
// We extract HH:MM directly from the string to avoid UTC conversion on Vercel servers
function isoToHHMM(isoStr: string): string {
  const match = isoStr.match(/T(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "??:??";
}

function addMinsToTime(timeStr: string, mins: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

function subtractMins(timeStr: string, mins: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  let total = h * 60 + m - mins;
  if (total < 0) total += 24 * 60;
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

function addMinsToIso(isoStr: string, mins: number): string {
  // Extract local time from ISO string (avoids UTC timezone issue on Vercel)
  const match = isoStr.match(/T(\d{2}):(\d{2})/);
  if (!match) return "??:??";
  const total = parseInt(match[1]) * 60 + parseInt(match[2]) + mins;
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

async function fetchDepartures(stopId: string, apiKey: string) {
  const url = new URL(TFNSW_BASE);
  url.searchParams.set("outputFormat", "rapidJSON");
  url.searchParams.set("coordOutputFormat", "EPSG:4326");
  url.searchParams.set("mode", "direct");
  url.searchParams.set("type_dm", "stop");
  url.searchParams.set("name_dm", stopId);
  url.searchParams.set("departureMonitorMacro", "true");
  url.searchParams.set("TfNSWDM", "true");
  url.searchParams.set("version", "10.2.1.42");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `apikey ${apiKey}` },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`TfNSW ${res.status} for stop ${stopId}`);
  const data = await res.json();
  return data?.stopEvents ?? [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseFerryEvents(events: any[], wharf: typeof FERRY_WHARVES[0]) {
  const trips = [];
  for (const ev of events.slice(0, 3)) {
    const depIso: string = ev.departureTimeEstimated ?? ev.departureTimePlanned;
    if (!depIso) continue;
    const departureTime = isoToHHMM(depIso);
    const destinationArrival = addMinsToIso(depIso, wharf.crossingMins);
    const officeArrival = addMinsToIso(depIso, wharf.crossingMins + wharf.officeWalkMins);
    const totalMins = wharf.walkMins + wharf.crossingMins + wharf.officeWalkMins;
    trips.push({
      id: `${wharf.id}-${departureTime}`,
      mode: "ferry" as const,
      wharf: wharf.wharf,
      routeName: ev.transportation?.description ?? "Ferry to Circular Quay",
      stopName: `${wharf.wharf} Ferry Wharf`,
      walkMins: wharf.walkMins,
      walkDistanceM: wharf.walkDistanceM,
      driveMins: wharf.driveMins,
      driveDistanceM: wharf.driveDistanceM,
      departureTime,
      destinationStop: wharf.destinationStop,
      destinationArrival,
      officeArrival,
      totalMins,
      leaveByWalking: subtractMins(departureTime, wharf.walkMins + 2),
      leaveByDriving: subtractMins(departureTime, wharf.driveMins + 2),
      isRealtime: !!ev.departureTimeEstimated,
    });
  }
  return trips;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseBusEvents(events: any[], bus: typeof BUS_STOPS[0]) {
  const trips = [];
  // Filter to the specific route number
  const relevant = events.filter((ev) => {
    const routeNum: string = ev.transportation?.number ?? ev.transportation?.disassembledName ?? "";
    return routeNum.includes(bus.routeFilter);
  });
  for (const ev of relevant.slice(0, 3)) {
    const depIso: string = ev.departureTimeEstimated ?? ev.departureTimePlanned;
    if (!depIso) continue;
    const departureTime = isoToHHMM(depIso);
    const destinationArrival = addMinsToTime(departureTime, bus.journeyMins);
    const officeArrival = addMinsToTime(departureTime, bus.journeyMins + bus.officeWalkMins);
    const totalMins = bus.walkMins + bus.journeyMins + bus.officeWalkMins;
    trips.push({
      id: `${bus.id}-${departureTime}`,
      mode: "bus" as const,
      wharf: undefined,
      routeName: `Route ${bus.routeFilter}`,
      stopName: bus.stopName,
      walkMins: bus.walkMins,
      walkDistanceM: bus.walkDistanceM,
      driveMins: bus.driveMins,
      driveDistanceM: bus.driveDistanceM,
      departureTime,
      destinationStop: bus.destinationStop,
      destinationArrival,
      officeArrival,
      totalMins,
      leaveByWalking: subtractMins(departureTime, bus.walkMins + 2),
      leaveByDriving: subtractMins(departureTime, bus.driveMins + 2),
      isRealtime: !!ev.departureTimeEstimated,
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
    const [ferryResults, busResults] = await Promise.all([
      Promise.allSettled(
        FERRY_WHARVES.map(async (wharf) => {
          const events = await fetchDepartures(wharf.stopId, apiKey);
          return parseFerryEvents(events, wharf);
        })
      ),
      Promise.allSettled(
        BUS_STOPS.map(async (bus) => {
          const events = await fetchDepartures(bus.stopId, apiKey);
          return parseBusEvents(events, bus);
        })
      ),
    ]);

    const ferryTrips = ferryResults
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => (r as PromiseFulfilledResult<ReturnType<typeof parseFerryEvents>>).value);

    const busTrips = busResults
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => (r as PromiseFulfilledResult<ReturnType<typeof parseBusEvents>>).value);

    const trips = [...ferryTrips, ...busTrips];
    return Response.json({ trips, isRealtime: true });
  } catch (err) {
    console.error("TfNSW API error:", err);
    return Response.json({ error: "API_ERROR", trips: [] }, { status: 200 });
  }
}
