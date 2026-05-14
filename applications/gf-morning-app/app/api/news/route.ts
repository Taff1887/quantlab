export const revalidate = 1800; // refresh every 30 min

// Gittins Gospel — only Ross Gittins articles from SMH
// Try his author RSS first, then filter the business RSS as a fallback
const GITTINS_AUTHOR_RSS =
  "https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.smh.com.au%2Fby%2Fross-gittins.rss&count=3";
const SMH_BUSINESS_RSS =
  "https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.smh.com.au%2Frss%2Fbusiness.xml&count=30";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface RssItem {
  title?: string;
  link?: string;
  description?: string;
  pubDate?: string;
  author?: string;
  creator?: string;
}

function isGittins(item: RssItem): boolean {
  const hay = [item.author ?? "", item.creator ?? "", item.title ?? ""]
    .join(" ")
    .toLowerCase();
  return hay.includes("gittins");
}

function formatItem(item: RssItem) {
  const rawDesc = item.description ?? "";
  const clean   = stripHtml(rawDesc);
  const description = clean.length > 300 ? clean.slice(0, 297).trimEnd() + "…" : clean;
  return {
    found: true,
    title: item.title ?? "",
    link: item.link ?? "https://www.smh.com.au/by/ross-gittins",
    description,
    pubDate: item.pubDate ?? new Date().toISOString(),
  };
}

async function fetchFeed(url: string): Promise<RssItem[]> {
  try {
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.items ?? []) as RssItem[];
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    // Try author-specific RSS first (most targeted)
    const authorItems = await fetchFeed(GITTINS_AUTHOR_RSS);
    if (authorItems.length > 0) {
      return Response.json(formatItem(authorItems[0]));
    }

    // Fall back to business RSS, filter for Gittins by author field
    const businessItems = await fetchFeed(SMH_BUSINESS_RSS);
    const gittins = businessItems.find(isGittins);
    if (gittins) {
      return Response.json(formatItem(gittins));
    }

    // No article found today
    return Response.json({ found: false });
  } catch {
    return Response.json({ found: false });
  }
}
