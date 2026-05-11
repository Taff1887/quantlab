export const revalidate = 3600; // refresh hourly

// Australian economy news sources
// SMH Business is primary because Ross Gittins writes there
const SMH_BUSINESS =
  "https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.smh.com.au%2Frss%2Fbusiness.xml&count=20";
const ABC_BUSINESS =
  "https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.abc.net.au%2Fnews%2Ffeed%2F2942578%2Frss.xml&count=10";

const FALLBACK = {
  title: "RBA holds rates as inflation edges toward target",
  link: "https://www.smh.com.au/business/economy",
  description:
    "The Reserve Bank of Australia has held the cash rate steady as headline inflation continues its gradual decline toward the 2–3 per cent target band, with the board signalling it remains data-dependent on the timing of any future cuts.",
  pubDate: new Date().toISOString(),
  source: "SMH Business",
  isRossGittins: false,
};

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

function isRossGittins(item: RssItem): boolean {
  const haystack = [item.author ?? "", item.creator ?? "", item.title ?? ""]
    .join(" ")
    .toLowerCase();
  return haystack.includes("gittins");
}

function formatItem(item: RssItem, source: string, rossGittins: boolean) {
  const rawDesc = item.description ?? "";
  const clean = stripHtml(rawDesc);
  const description =
    clean.length > 220 ? clean.slice(0, 217).trimEnd() + "…" : clean;
  return {
    title: item.title ?? FALLBACK.title,
    link: item.link ?? FALLBACK.link,
    description: description || FALLBACK.description,
    pubDate: item.pubDate ?? new Date().toISOString(),
    source,
    isRossGittins: rossGittins,
  };
}

async function fetchFeed(url: string): Promise<RssItem[]> {
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.items ?? []) as RssItem[];
}

export async function GET() {
  try {
    // Fetch SMH first (contains Ross Gittins), ABC as backup
    const [smhItems, abcItems] = await Promise.allSettled([
      fetchFeed(SMH_BUSINESS),
      fetchFeed(ABC_BUSINESS),
    ]);

    const smh = smhItems.status === "fulfilled" ? smhItems.value : [];
    const abc = abcItems.status === "fulfilled" ? abcItems.value : [];

    // Priority 1: Latest Ross Gittins article in SMH
    const gittins = smh.find(isRossGittins);
    if (gittins) {
      return Response.json(formatItem(gittins, "Ross Gittins · SMH", true));
    }

    // Priority 2: Most recent SMH Business article
    if (smh.length > 0) {
      return Response.json(formatItem(smh[0], "SMH Business", false));
    }

    // Priority 3: Most recent ABC Business article
    if (abc.length > 0) {
      return Response.json(formatItem(abc[0], "ABC Business", false));
    }

    return Response.json(FALLBACK);
  } catch {
    return Response.json(FALLBACK);
  }
}
