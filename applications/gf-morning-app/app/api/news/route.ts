export const revalidate = 86400;

const RSS2JSON_URL =
  "https://api.rss2json.com/v1/api.json?rss_url=https://reneweconomy.com.au/feed/&count=8";

const FALLBACK = {
  title: "Australia's Solar Boom Drives Record Renewable Investment",
  link: "https://reneweconomy.com.au",
  description:
    "Australia continues to lead the Asia-Pacific region in solar investment, with new figures showing record capacity additions driven by both utility-scale projects and rooftop installations across Queensland and New South Wales.",
  pubDate: new Date().toISOString(),
  source: "RenewEconomy",
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

function getDayOfYear(date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

export async function GET() {
  try {
    const res = await fetch(RSS2JSON_URL, {
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return Response.json(FALLBACK);
    }

    const data = await res.json();
    const items: Array<{
      title?: string;
      link?: string;
      description?: string;
      pubDate?: string;
    }> = data?.items ?? [];

    if (!items.length) {
      return Response.json(FALLBACK);
    }

    // Pick article based on day-of-year so it rotates daily
    const dayOfYear = getDayOfYear();
    const index = dayOfYear % items.length;
    const article = items[index];

    const rawDesc = article.description ?? "";
    const cleanDesc = stripHtml(rawDesc);
    const truncated =
      cleanDesc.length > 220 ? cleanDesc.slice(0, 217).trimEnd() + "…" : cleanDesc;

    return Response.json({
      title: article.title ?? FALLBACK.title,
      link: article.link ?? FALLBACK.link,
      description: truncated || FALLBACK.description,
      pubDate: article.pubDate ?? new Date().toISOString(),
      source: "RenewEconomy",
    });
  } catch {
    return Response.json(FALLBACK);
  }
}
