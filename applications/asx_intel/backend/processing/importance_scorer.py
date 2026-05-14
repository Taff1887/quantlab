"""
Importance scoring — 1 (noise) to 10 (market-moving).

Rules-based baseline + optional LLM refinement.
"""

import logging
import re
from typing import Any

from backend.processing import llm_client

logger = logging.getLogger(__name__)

# High-weight keywords add to score
_HIGH_WEIGHT_KEYWORDS = [
    "guidance upgrade", "guidance downgrade", "material", "strategic review",
    "placement", "entitlement offer", "capital raising", "takeover",
    "binding agreement", "scheme of arrangement", "downgrade", "upgrade",
    "administration", "insolvency", "suspension", "class action",
    "earnings surprise", "trading halt", "solvency", "liquidity",
    "large contract", "major contract", "transformative", "acquisition",
    "merger", "divest", "asset sale",
]

# Low-weight keywords reduce score
_LOW_WEIGHT_KEYWORDS = [
    "appendix 3y", "appendix 3g", "appendix 2a", "appendix 3b",
    "cleansing notice", "change of registered office", "change of address",
    "director's interest notice", "director interest notice",
    "routine", "administrative", "no change", "in line with",
]

# High-importance announcement types
_HIGH_IMPORTANCE_TYPES = {
    "Guidance Upgrade": 3.0,
    "Guidance Downgrade": 3.5,
    "M&A / Takeover": 4.0,
    "Capital Raising": 2.5,
    "Asset Sale / Acquisition": 2.5,
    "Contract Win": 2.0,
    "Regulatory / Legal": 2.0,
    "Management Change": 1.5,
    "Earnings / Trading Update": 1.5,
    "Exploration / Drilling Results": 1.5,
}

_LOW_IMPORTANCE_TYPES = {
    "Appendix / Administrative": -3.0,
    "Investor Presentation": -1.0,
}


def score_by_rules(text: str, metadata: dict[str, Any], price_move_pct: float | None = None) -> float:
    """
    Compute a rules-based importance score in [1, 10].
    """
    ann_type: str = metadata.get("announcement_type", "Other")
    title: str = metadata.get("title", "")
    page_count: int | None = metadata.get("page_count")
    combined = (title + " " + text).lower()

    score = 4.0  # baseline

    # Announcement type adjustment
    score += _HIGH_IMPORTANCE_TYPES.get(ann_type, 0.0)
    score += _LOW_IMPORTANCE_TYPES.get(ann_type, 0.0)

    # Keyword scanning
    for kw in _HIGH_WEIGHT_KEYWORDS:
        if kw in combined:
            score += 0.5

    for kw in _LOW_WEIGHT_KEYWORDS:
        if kw in combined:
            score -= 1.0

    # Longer, detailed announcements tend to be more material
    if page_count:
        if page_count >= 20:
            score += 1.0
        elif page_count >= 10:
            score += 0.5
        elif page_count <= 2:
            score -= 0.5

    # Significant price moves amplify importance
    if price_move_pct is not None:
        move = abs(price_move_pct)
        if move >= 15:
            score += 3.0
        elif move >= 10:
            score += 2.0
        elif move >= 5:
            score += 1.0
        elif move >= 2:
            score += 0.5

    return max(1.0, min(10.0, round(score, 1)))


def score_importance(
    text: str,
    metadata: dict[str, Any],
    price_data: dict[str, Any] | None = None,
) -> tuple[float, str]:
    """
    Return (importance_score, importance_reason).

    Tries LLM first for a nuanced score; falls back to rules-based.
    """
    price_move = price_data.get("daily_move_pct") if price_data else None
    rules_score = score_by_rules(text, metadata, price_move)

    system = (
        "You are a senior Australian equities analyst. "
        "Score the importance of this ASX announcement from 1 (irrelevant noise) to 10 (major market mover). "
        "Consider: size of capital impact, guidance changes, M&A materiality, regulatory risk, price movement. "
        "Respond in JSON with exactly two keys: 'score' (number 1-10) and 'reason' (one sentence). "
        "Example: {\"score\": 8, \"reason\": \"Material guidance downgrade with solvency implications.\"}"
    )
    price_context = f"\nPrice move on announcement day: {price_move:.1f}%" if price_move is not None else ""
    user = (
        f"Ticker: {metadata.get('ticker')}\n"
        f"Title: {metadata.get('title')}\n"
        f"Type: {metadata.get('announcement_type')}\n"
        f"Sector: {metadata.get('sector')}{price_context}\n\n"
        f"Announcement text (excerpt):\n{text[:2000]}"
    )

    llm_result = llm_client.complete(system, user, max_tokens=150)

    if llm_result:
        import json
        try:
            parsed = json.loads(llm_result)
            score = float(parsed.get("score", rules_score))
            reason = str(parsed.get("reason", ""))
            score = max(1.0, min(10.0, score))
            return round(score, 1), reason
        except Exception:
            logger.debug("Could not parse LLM score response: %s", llm_result)

    # Rules-based fallback reason
    ann_type = metadata.get("announcement_type", "Other")
    if rules_score >= 8:
        reason = f"High-impact {ann_type} with multiple material indicators."
    elif rules_score >= 6:
        reason = f"Moderately important {ann_type}."
    elif rules_score <= 3:
        reason = "Routine administrative announcement with minimal market relevance."
    else:
        reason = f"Standard {ann_type} — monitor for follow-up."

    return rules_score, reason
