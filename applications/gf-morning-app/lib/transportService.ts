import type { TransportOption, FerryDeparture } from "../types";

// Real-time data comes from /api/transport (TfNSW Open Data API)
// Set TFNSW_API_KEY in Vercel env vars to enable real-time departures.
// Sign up free at: https://opendata.transport.nsw.gov.au/

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function addMins(h: number, m: number, add: number): [number, number] {
  const t = h * 60 + m + add;
  return [Math.floor(t / 60) % 24, t % 60];
}

function toTime(h: number, m: number) {
  return `${pad(h)}:${pad(m)}`;
}

function nowHM(): [number, number] {
  const n = new Date();
  return [n.getHours(), n.getMinutes()];
}

function subtractMins(timeStr: string, mins: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  let total = h * 60 + m - mins;
  if (total < 0) total += 24 * 60;
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

// Returns "leave by HH:MM" times with a 2-min comfort buffer
export function leaveByWalking(departureTime: string, walkMins: number): string {
  return subtractMins(departureTime, walkMins + 2);
}

export function leaveByDriving(departureTime: string, driveMins: number): string {
  return subtractMins(departureTime, driveMins + 2);
}

export async function fetchTransportOptions(): Promise<{ options: TransportOption[]; isRealtime: boolean; driveIsRealtime?: boolean }> {
  // Try real-time TfNSW data first
  try {
    const res = await fetch("/api/transport");
    if (res.ok) {
      const data = await res.json();
      if (data.trips && data.trips.length > 0) {
        // Map ScheduleTrip → TransportOption
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const options: TransportOption[] = data.trips.map((t: any) => ({
          id: t.id,
          mode: t.mode,
          wharf: t.wharf,
          stopName: t.stopName,
          walkMins: t.walkMins,
          walkDistanceM: t.walkDistanceM,
          driveMins: t.driveMins,
          driveDistanceM: t.driveDistanceM,
          departureTime: t.departureTime,
          arrivalTime: t.destinationArrival,
          totalMins: t.totalMins,
          notes: t.isRealtime ? "Real-time" : "Scheduled",
          isBest: false,
        }));
        return {
          options,
          isRealtime: data.isRealtime ?? false,
          driveIsRealtime: data.driveIsRealtime ?? false,
        };
      }
    }
  } catch { /* fall through to schedule */ }

  // Fallback: schedule-based estimates
  const [bh, bm] = nowHM();
  return { options: buildScheduleOptions(bh, bm), isRealtime: false, driveIsRealtime: false };
}

function buildScheduleOptions(bh: number, bm: number): TransportOption[] {

  return [
    {
      id: "taronga-ferry",
      mode: "ferry",
      wharf: "Taronga Zoo",
      stopName: "Taronga Zoo Ferry Wharf",
      walkMins: 10,
      walkDistanceM: 700,
      driveMins: 4,
      driveDistanceM: 500,
      departureTime: toTime(...addMins(bh, bm, 12)),
      arrivalTime: toTime(...addMins(bh, bm, 36)),
      totalMins: 36,
      notes: "Shortest walk, fast Manly Ferry crossing",
      isBest: true,
    },
    {
      id: "south-mosman-ferry",
      mode: "ferry",
      wharf: "South Mosman",
      stopName: "South Mosman Ferry Wharf",
      walkMins: 18,
      walkDistanceM: 1200,
      driveMins: 6,
      driveDistanceM: 900,
      departureTime: toTime(...addMins(bh, bm, 18)),
      arrivalTime: toTime(...addMins(bh, bm, 50)),
      totalMins: 50,
      notes: "Scenic route via Musgrave St",
    },
    {
      id: "mosman-bay-ferry",
      mode: "ferry",
      wharf: "Mosman Bay",
      stopName: "Mosman Bay Ferry Wharf",
      walkMins: 22,
      walkDistanceM: 1550,
      driveMins: 7,
      driveDistanceM: 1100,
      departureTime: toTime(...addMins(bh, bm, 28)),
      arrivalTime: toTime(...addMins(bh, bm, 58)),
      totalMins: 58,
      notes: "Quiet wharf, less frequent service",
    },
    {
      id: "cremorne-ferry",
      mode: "ferry",
      wharf: "Cremorne Point",
      stopName: "Cremorne Point Ferry Wharf",
      walkMins: 25,
      walkDistanceM: 1700,
      driveMins: 8,
      driveDistanceM: 1400,
      departureTime: toTime(...addMins(bh, bm, 25)),
      arrivalTime: toTime(...addMins(bh, bm, 55)),
      totalMins: 55,
      notes: "Longer walk, faster harbour crossing",
    },
    {
      id: "bus-b100",
      mode: "bus",
      stopName: "Bradleys Head Rd at Whiting Beach Rd",
      walkMins: 10,
      walkDistanceM: 700,
      driveMins: 3,
      driveDistanceM: 450,
      departureTime: toTime(...addMins(bh, bm, 10)),
      arrivalTime: toTime(...addMins(bh, bm, 54)),
      totalMins: 54,
      notes: "Route 100 to Lang Park, York St",
      isBest: false,
    },
  ];
}

export async function fetchFerryDepartures(): Promise<FerryDeparture[]> {
  const [bh, bm] = nowHM();

  const schedule = [
    { wharf: "Taronga Zoo" as const, walk: 9, crossing: 15, interval: 30 },
    { wharf: "South Mosman" as const, walk: 16, crossing: 25, interval: 30 },
    { wharf: "Mosman Bay" as const, walk: 20, crossing: 22, interval: 60 },
    { wharf: "Cremorne Point" as const, walk: 22, crossing: 18, interval: 60 },
  ];

  const departures: FerryDeparture[] = [];

  schedule.forEach(({ wharf, walk, crossing, interval }) => {
    for (let i = 0; i < 5; i++) {
      const offset = i * interval + 5;
      const [dh, dm] = addMins(bh, bm, offset);
      const [ah, am] = addMins(dh, dm, crossing);
      departures.push({
        id: `${wharf}-${i}`,
        wharf,
        departureTime: toTime(dh, dm),
        arrivalTime: toTime(ah, am),
        destination: "Circular Quay",
        walkMinsFromHome: walk,
        totalMins: walk + crossing,
      });
    }
  });

  return departures.sort((a, b) => a.walkMinsFromHome - b.walkMinsFromHome);
}
