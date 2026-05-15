"""
LLM-powered announcement summarisation and daily report generation.
Falls back to rule-based extraction when no LLM key is set.
"""

import json
import logging
import re
from datetime import date
from typing import Any

from backend.processing import llm_client
from backend.processing.classifier import classify_announcement
from backend.processing.importance_scorer import score_importance

logger = logging.getLogger(__name__)

_SYSTEM_SUMMARISE = """\
You are an expert Australian equities analyst summarising ASX company announcements.
Your summaries must be accurate, concise, and useful to a professional investor.
Respond in valid JSON only — no markdown fences, no extra text.
"""

_USER_SUMMARISE_TMPL = """\
Ticker: {ticker}
Company: {company}
Sector: {sector}
Announcement type: {ann_type}
Title: {title}
Price move today: {price_move}

Full announcement text:
{text}

Produce a JSON object with these keys:
- "summary_short": one sentence (max 30 words) summarising what happened
- "summary_detailed": 3-5 bullet points (plain text, each starting with "• ") covering key facts and numbers
- "why_it_matters": one sentence on market significance
- "market_impact": likely short-term market reaction and why
- "key_numbers": list of key figures extracted (e.g. "Revenue: $1.2B", "Guidance: 10-12% growth")
- "risks_caveats": any caveats, conditions, or risks mentioned
"""


def summarise_announcement(
    text: str,
    metadata: dict[str, Any],
    price_data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Return a dict with: summary_short, summary_detailed, why_it_matters,
    market_impact, key_numbers, risks_caveats.
    """
    price_move = price_data.get("daily_move_pct") if price_data else None
    price_str = f"{price_move:+.1f}%" if price_move is not None else "unknown"

    user = _USER_SUMMARISE_TMPL.format(
        ticker=metadata.get("ticker", ""),
        company=metadata.get("company_name", ""),
        sector=metadata.get("sector", ""),
        ann_type=metadata.get("announcement_type", ""),
        title=metadata.get("title", ""),
        price_move=price_str,
        text=text[:4000],
    )

    raw = llm_client.complete(_SYSTEM_SUMMARISE, user, max_tokens=800)

    if raw:
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            logger.warning("LLM returned non-JSON for %s — attempting extraction", metadata.get("ticker"))
            return _extract_partial(raw)

    # Fallback — rule-based stub from raw text
    return _rule_based_summary(text, metadata)


def _extract_partial(raw: str) -> dict[str, Any]:
    """Try to salvage partial JSON or key-value pairs from a malformed LLM response."""
    result: dict[str, Any] = {}
    for key in ["summary_short", "summary_detailed", "why_it_matters", "market_impact", "key_numbers", "risks_caveats"]:
        match = re.search(rf'"{key}"\s*:\s*"([^"]+)"', raw)
        if match:
            result[key] = match.group(1)
    return result


def _rule_based_summary(text: str, metadata: dict[str, Any]) -> dict[str, Any]:
    """
    Template-based summary generated from title + metadata alone.
    Works without LLM and without PDF text.
    """
    title = metadata.get("title", "")
    ticker = metadata.get("ticker", "")
    company = metadata.get("company_name", ticker)
    ann_type = metadata.get("announcement_type", "Other")
    sector = metadata.get("sector", "")

    # Extract dollar/number figures from the title
    amounts = re.findall(
        r"\$[\d,]+\.?\d*\s*(?:billion|million|bn|m\b)?|[\d,]+\.?\d+\s*(?:billion|million|bn|%)",
        title, re.IGNORECASE
    )
    amount_str = amounts[0] if amounts else ""

    # Build a plain-English one-liner from type + title
    templates = {
        "Capital Raising": (
            f"{company} ({ticker}) is raising capital"
            + (f" of {amount_str}" if amount_str else "")
            + f". {title}."
        ),
        "Earnings / Trading Update": (
            f"{company} ({ticker}) has released a {ann_type.lower()}: {title}."
        ),
        "Dividend / Buyback": (
            f"{company} ({ticker}) has announced a dividend or share buyback. {title}."
        ),
        "M&A / Takeover": (
            f"{company} ({ticker}) has announced M&A activity"
            + (f" involving {amount_str}" if amount_str else "")
            + f". {title}."
        ),
        "Exploration / Drilling Results": (
            f"{company} ({ticker}) has reported exploration or drilling results. {title}."
        ),
        "Management Change": (
            f"{company} ({ticker}) has announced a change in management or board composition. {title}."
        ),
        "Guidance Downgrade": (
            f"{company} ({ticker}) has revised guidance downward. {title}."
        ),
        "Guidance Upgrade": (
            f"{company} ({ticker}) has upgraded its guidance. {title}."
        ),
        "Contract Win": (
            f"{company} ({ticker}) has won a new contract"
            + (f" valued at {amount_str}" if amount_str else "")
            + f". {title}."
        ),
        "Regulatory / Legal": (
            f"{company} ({ticker}) has a regulatory or legal update. {title}."
        ),
        "Appendix / Administrative": (
            f"{company} ({ticker}) has lodged an administrative filing: {title}."
        ),
    }

    short = templates.get(ann_type, f"{company} ({ticker}) has released an announcement: {title}.")
    # Cap at 200 chars
    short = short[:200]

    # If we have raw text, try to pull a sentence from it
    if text and len(text) > 50:
        sentences = re.split(r"(?<=[.!?])\s+", text.strip())
        if sentences and len(sentences[0]) > 20:
            short = sentences[0][:200]

    # Extract numbers from title + text
    numbers = re.findall(
        r"[\$A-Z]{0,3}[\d,]+\.?\d*\s*(?:billion|million|bn|m|%|mt|kt|dmt)?",
        (title + " " + text[:500]), re.IGNORECASE
    )
    key_numbers = list(dict.fromkeys(n.strip() for n in numbers[:8] if len(n.strip()) > 1))

    why = {
        "Capital Raising": f"New capital dilutes existing shareholders but may fund growth for {company}.",
        "Earnings / Trading Update": f"Financial results directly affect {company}'s valuation and investor expectations.",
        "M&A / Takeover": "M&A activity can be a significant catalyst for both acquirer and target share prices.",
        "Exploration / Drilling Results": f"Drill results are key value catalysts for {sector} companies like {company}.",
        "Guidance Downgrade": f"Lowered guidance from {company} typically triggers a sell-off.",
        "Guidance Upgrade": f"Upgraded guidance from {company} is a positive catalyst.",
        "Contract Win": f"New contracts provide revenue visibility for {company}.",
        "Dividend / Buyback": f"Capital returns signal management confidence in {company}'s cash position.",
    }.get(ann_type, f"Monitoring this {ann_type} announcement from {ticker} for market impact.")

    return {
        "summary_short": short,
        "summary_detailed": f"• {title}\n• Type: {ann_type}\n• Sector: {sector}\n• Add an LLM API key for detailed AI-powered summaries.",
        "why_it_matters": why,
        "market_impact": "Add OPENAI_API_KEY or ANTHROPIC_API_KEY to .env for AI market impact analysis.",
        "key_numbers": key_numbers,
        "risks_caveats": "Full analysis requires LLM configuration.",
    }


_SYSTEM_DAILY_REPORT = """\
You are a senior Australian equities strategist writing a daily market wrap for a professional hedge fund.
Be analytical, specific, and concise. Respond in valid JSON only.
"""


def generate_daily_report(
    report_date: date,
    announcements: list[dict[str, Any]],
    price_movers: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Generate the daily market intelligence report.

    announcements: list of dicts with announcement metadata + summary fields
    price_movers: list of {ticker, company_name, daily_move_pct, sector, ...}
    """
    ann_summary = json.dumps(
        [
            {
                "ticker": a.get("ticker"),
                "company": a.get("company_name"),
                "type": a.get("announcement_type"),
                "importance": a.get("importance_score"),
                "title": a.get("title"),
                "summary": a.get("summary_short"),
                "why_it_matters": a.get("why_it_matters"),
                "price_move": a.get("price_move_pct"),
            }
            for a in announcements[:30]
        ],
        indent=2,
    )

    movers_summary = json.dumps(
        [
            {
                "ticker": m.get("ticker"),
                "company": m.get("company_name"),
                "move_pct": m.get("daily_move_pct"),
                "sector": m.get("sector"),
            }
            for m in price_movers[:20]
        ],
        indent=2,
    )

    user = f"""\
Date: {report_date.strftime("%A, %d %B %Y")}

Top announcements (sorted by importance):
{ann_summary}

Top price movers:
{movers_summary}

Produce a JSON object with these keys:
- "executive_summary": 2-3 paragraph narrative of today's most important market developments
- "top_announcements": list of 5 most important items, each with "ticker", "headline", "why_it_matters"
- "sector_themes": dict mapping sector names to 1-2 sentence theme descriptions
- "unusual_moves": describe any large price moves without obvious announcements
- "watchlist_tomorrow": list of 3-5 tickers/themes to watch tomorrow and why
"""

    raw = llm_client.complete(_SYSTEM_DAILY_REPORT, user, max_tokens=1500)

    if raw:
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            logger.warning("Daily report LLM response not valid JSON — returning raw text")
            return {"full_report_text": raw}

    # Fallback — structured stub
    top5 = sorted(announcements, key=lambda x: x.get("importance_score") or 0, reverse=True)[:5]
    top_movers_str = ", ".join(
        f"{m['ticker']} ({m['daily_move_pct']:+.1f}%)"
        for m in price_movers[:5]
        if m.get("daily_move_pct") is not None
    )

    return {
        "executive_summary": (
            f"Daily ASX market wrap for {report_date.strftime('%d %B %Y')}. "
            f"Top price movers: {top_movers_str or 'data not yet available'}. "
            "Configure LLM (OPENAI_API_KEY or ANTHROPIC_API_KEY) for full narrative."
        ),
        "top_announcements": [
            {"ticker": a["ticker"], "headline": a["title"], "why_it_matters": a.get("why_it_matters", "")}
            for a in top5
        ],
        "sector_themes": {},
        "unusual_moves": "LLM not configured.",
        "watchlist_tomorrow": [],
    }
