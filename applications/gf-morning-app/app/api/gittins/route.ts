export const dynamic = "force-dynamic";

const GOOGLE_NEWS_URL =
  "https://news.google.com/rss/search?q=%22Ross+Gittins%22+site%3Asmh.com.au&hl=en-AU&gl=AU&ceid=AU:en";

const NO_CACHE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

function json(data: unknown) {
  return new Response(JSON.stringify(data), { headers: NO_CACHE_HEADERS });
}

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
  const debug: Record<string, unknown> = {};
  try {
    const res = await fetch(GOOGLE_NEWS_URL, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RSS reader)" },
    });

    debug.status = res.status;
    if (!res.ok) return json({ found: false, debug });

    const xml = await res.text();
    debug.xmlLength = xml.length;
    debug.preview = xml.slice(0, 300);

    const items = parseItems(xml);
    debug.itemCount = items.length;
    debug.firstTitle = items[0]?.title ?? null;

    const authored = items.filter(it =>
      it.title.toLowerCase().includes("gittins") ||
      it.description.toLowerCase().includes("ross gittins")
    );
    const candidates = authored.length > 0 ? authored : items;

    if (candidates.length === 0) return json({ found: false, debug });

    candidates.sort((a, b) =>
      (b.pubDate ? new Date(b.pubDate).getTime() : 0) -
      (a.pubDate ? new Date(a.pubDate).getTime() : 0)
    );

    const best = candidates[0];
    const desc = best.description.length > 300
      ? best.description.slice(0, 297).trimEnd() + "…"
      : best.description;

    return json({
      found: true,
      title: best.title,
      link: best.link || "https://www.smh.com.au/by/ross-gittins",
      description: desc,
      pubDate: best.pubDate,
    });
  } catch (err) {
    debug.error = String(err);
    return json({ found: false, debug });
  }
}
