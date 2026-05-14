export const revalidate = 1800; // refresh every 30 min

// Fetch SMH RSS feeds directly (server-side — no CORS needed)
// Priority: author feed first (most targeted), then section feeds
const FEEDS = [
  "https://www.smh.com.au/by/ross-gittins.rss",
  "https://www.smh.com.au/rss/business.xml",
  "https://www.smh.com.au/rss/politics.xml",
  "https://www.smh.com.au/rss/economy.xml",
  "https://www.smh.com.au/rss/feed.xml",
];

function stripHtml(html: string): string {
  return html
    .replace(/<!\[CDATA\[|\]\]>/g, "")
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

function extractTag(xml: string, tag: string): string {
  // Handle both <tag>value</tag> and <tag><![CDATA[value]]></tag>
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = re.exec(xml);
  if (!m) return "";
  return stripHtml(m[1].trim());
}

interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  author: string;
  creator: string;
}

function parseItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  // Split on <item> boundaries
  const parts = xml.split(/<item[\s>]/i);
  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i];
    const end = chunk.indexOf("</item>");
    const body = end >= 0 ? chunk.slice(0, end) : chunk;

    // Extract link — prefer raw text inside <link> (not <atom:link>)
    let link = "";
    const linkMatch = /<link>([^<]+)<\/link>/i.exec(body);
    if (linkMatch) link = linkMatch[1].trim();
    if (!link) link = extractTag(body, "link");

    items.push({
      title:       extractTag(body, "title"),
      link,
      description: extractTag(body, "description"),
      pubDate:     extractTag(body, "pubDate"),
      author:      extractTag(body, "author") || extractTag(body, "dc:creator"),
      creator:     extractTag(body, "dc:creator"),
    });
  }
  return items;
}

function isGittins(item: RssItem): boolean {
  const hay = [item.author, item.creator, item.title, item.link]
    .join(" ")
    .toLowerCase();
  return hay.includes("gittins");
}

async function fetchFeed(url: string): Promise<RssItem[]> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 1800 },
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RSS reader)",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
    });
    if (!res.ok) return [];
    const text = await res.text();
    return parseItems(text);
  } catch {
    return [];
  }
}

function formatItem(item: RssItem) {
  const clean = item.description;
  const description = clean.length > 300 ? clean.slice(0, 297).trimEnd() + "…" : clean;
  return {
    found: true,
    title: item.title,
    link: item.link || "https://www.smh.com.au/by/ross-gittins",
    description,
    pubDate: item.pubDate,
  };
}

export async function GET() {
  try {
    const allItems = await Promise.all(FEEDS.map(fetchFeed));

    const seen = new Set<string>();
    const gittinsArticles: RssItem[] = [];

    for (let fi = 0; fi < allItems.length; fi++) {
      for (const item of allItems[fi]) {
        const key = item.link || item.title;
        if (seen.has(key)) continue;
        seen.add(key);

        // For the author-specific feed (index 0), trust all items
        // For section feeds, filter by author name
        if (fi === 0 || isGittins(item)) {
          gittinsArticles.push(item);
        }
      }
    }

    if (gittinsArticles.length === 0) {
      return Response.json({ found: false });
    }

    // Most recent first
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
