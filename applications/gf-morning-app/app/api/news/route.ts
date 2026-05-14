export const revalidate = 1800; // refresh every 30 min

// Gittins Gospel — only Ross Gittins articles from SMH
// He writes across Business, Politics, Economy & Analysis — check all feeds
const FEEDS = [
  // Author-specific RSS first (most targeted — may or may not exist)
  "https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.smh.com.au%2Fby%2Fross-gittins.rss&count=5",
  // Section feeds — Gittins writes across all of these
  "https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.smh.com.au%2Frss%2Fbusiness.xml&count=50",
  "https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.smh.com.au%2Frss%2Fpolitics.xml&count=50",
  "https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.smh.com.au%2Frss%2Feconomy.xml&count=50",
  // Broader main feed as last resort
  "https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.smh.com.au%2Frss%2Ffeed.xml&count=50",
];

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
  const hay = [item.author ?? "", item.creator ?? "", item.title ?? "", item.link ?? ""]
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
    // Fetch all feeds concurrently, then find the most recent Gittins article
    const allItems = await Promise.all(FEEDS.map(fetchFeed));

    // Flatten, deduplicate by link, filter to Gittins only
    const seen = new Set<string>();
    const gittinsArticles: RssItem[] = [];

    for (const items of allItems) {
      for (const item of items) {
        const key = item.link ?? item.title ?? "";
        if (!seen.has(key) && isGittins(item)) {
          seen.add(key);
          gittinsArticles.push(item);
        }
      }
    }

    if (gittinsArticles.length === 0) {
      return Response.json({ found: false });
    }

    // Sort by pubDate descending — most recent first
    gittinsArticles.sort((a, b) => {
      const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return db - da;
    });

    return Response.json(formatItem(gittinsArticles[0]));
  } catch {
    return Response.json({ found: false });
  }
}
