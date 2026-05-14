export const dynamic = "force-dynamic";

const GOOGLE_NEWS_URL =
  "https://news.google.com/rss/search?q=%22Ross+Gittins%22+site%3Asmh.com.au&hl=en-AU&gl=AU&ceid=AU:en";

const NO_CACHE: HeadersInit = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

function json(data: unknown) {
  return new Response(JSON.stringify(data), { headers: NO_CACHE });
}

function stripHtml(raw: string): string {
  return raw
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

function extractLink(body: string): string {
  const m = /<link>([^<]+)<\/link>/i.exec(body);
  return m ? m[1].trim() : extractTag(body, "link");
}

interface Item { title: string; link: string; pubDate: string }

function parseItems(xml: string): Item[] {
  const items: Item[] = [];
  const parts = xml.split(/<item[\s>]/i);
  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i];
    const end = chunk.indexOf("</item>");
    const body = end >= 0 ? chunk.slice(0, end) : chunk;
    items.push({
      title:   extractTag(body, "title"),
      link:    extractLink(body),
      pubDate: extractTag(body, "pubDate"),
    });
  }
  return items;
}

export async function GET() {
  try {
    const res = await fetch(GOOGLE_NEWS_URL, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RSS reader)" },
    });
    if (!res.ok) return json({ found: false });

    const xml  = await res.text();
    const all  = parseItems(xml);

    // Prefer items where "gittins" is in the title; fall back to full list
    const byGittins = all.filter(it => it.title.toLowerCase().includes("gittins"));
    const candidates = byGittins.length > 0 ? byGittins : all;
    if (candidates.length === 0) return json({ found: false });

    // Most recent first
    candidates.sort((a, b) =>
      (b.pubDate ? new Date(b.pubDate).getTime() : 0) -
      (a.pubDate ? new Date(a.pubDate).getTime() : 0)
    );

    const best = candidates[0];
    // Strip " - SMH.com.au" suffix Google appends to titles
    const title = best.title.replace(/\s*[-–]\s*SMH\.com\.au\s*$/i, "").trim();

    return json({
      found:   true,
      title,
      link:    best.link || "https://www.smh.com.au/by/ross-gittins",
      pubDate: best.pubDate,
    });
  } catch {
    return json({ found: false });
  }
}
