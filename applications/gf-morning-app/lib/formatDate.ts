/**
 * Format a date as "Friday 20 March 2026" (no commas).
 * en-AU locale adds a comma after the weekday — this builds the string manually.
 */

const WEEKDAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS   = ["January","February","March","April","May","June",
                  "July","August","September","October","November","December"];

/** Format a Date object → "Friday 20 March 2026" */
export function fmtDate(d: Date): string {
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Format a YYYY-MM-DD string → "Friday 20 March 2026" (parsed as local date) */
export function fmtYMD(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return fmtDate(new Date(y, m - 1, d));
}

/** Format a YYYY-MM-DD string → "20 March 2026" (no weekday) */
export function fmtYMDShort(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}

/** Format an ISO/RFC date string (e.g. RSS pubDate) → "Friday 20 March 2026" */
export function fmtISO(iso: string): string {
  try {
    return fmtDate(new Date(iso));
  } catch {
    return iso;
  }
}
