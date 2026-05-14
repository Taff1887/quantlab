export const revalidate = 1800; // refresh every 30 min

// Google News RSS — searches for Ross Gittins articles on SMH.
// Google's RSS is publicly accessible from any server (no CORS / blocking issues).
const GOOGLE_NEWS_URL =
  "https://news.google.com/rss/search?q=%22Ross+Gittins%22+site%3Asmh.com.au&hl=en-AU&gl=AU&ceid=AU:en";

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

function extractTag(body: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = re.exec(body);
  if (!m) return "";
  return stripHtml(m[1].trim());
}

interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

function parseItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const parts = xml.split(/<item[\s>]/i);
  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i];
    const end = chunk.indexOf("</item>");
    const body = end >= 0 ? chunk.slice(0, end) : chunk;

    // Prefer <link> text content; Google News also uses <link> not <atom:link>
    let link = "";
    const linkMatch = /<link>([^<]+)<\/link>/i.exec(body);
    if (linkMatch) link = linkMatch[1].trim();
    if (!link) link = extractTag(body, "link");

    items.push({
      title:       extractTag(body, "title"),
      link,
      description: extractTag(body, "description"),
      pubDate:     extractTag(body, "pubDate"),
    });
  }
  return items;
}

export async function GET() {
  try {
    const res = await fetch(GOOGLE_NEWS_URL, {
      next: { revalidate: 1800 },
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RSS reader)" },
    });

    if (!res.ok) return Response.json({ found: false });

    const xml = await res.text();
    const items = parseItems(xml);

    // Filter to items most likely authored by Gittins
    // (search is already specific but "expert roundup" articles can sneak in)
    const authored = items.filter(it =>
      it.title.toLowerCase().includes("gittins") ||
      it.description.toLowerCase().includes("ross gittins")
    );

    // Use filtered list if any match; otherwise trust the search ranking
    const candidates = authored.length > 0 ? authored : items;

    if (candidates.length === 0) return Response.json({ found: false });

    // Most recent first (Google usually returns them sorted, but be explicit)
    candidates.sort((a, b) => {
      const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return db - da;
    });

    const best = candidates[0];
    const clean = best.description;
    const description = clean.length > 300 ? clean.slice(0, 297).trimEnd() + "…" : clean;

    return Response.json({
      found: true,
      title: best.title,
      link: best.link || "https://www.smh.com.au/by/ross-gittins",
      description,
      pubDate: best.pubDate,
    });
  } catch {
    return Response.json({ found: false });
  }
}
