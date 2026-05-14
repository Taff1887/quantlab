"""
ASX announcement source client.

*** PLUG-IN POINT ***
This module is the single place where real ASX data is wired in.
The rest of the pipeline (ingestor, summariser, price_fetcher, API) is
fully functional with mock data and will work unchanged once you replace
`fetch_announcements_for_date` with a real implementation.

Options for a real source:
  1. ASX Company Announcements API (asx.com.au) — requires account/scrape
     Base URL: https://www.asx.com.au/asx/1/company/{ticker}/announcements
     Listing:  https://www.asx.com.au/markets/trade-our-cash-market/todays-announcements
  2. Refinitiv / LSEG Data & Analytics (paid)
  3. Bloomberg B-PIPE (paid)
  4. Market Index announcements RSS/scrape (fragile but free)
     https://www.marketindex.com.au/asx-announcements
  5. Morningstar / Iress (paid, broker-grade)
"""

import logging
from datetime import date
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# --- Configuration ----------------------------------------------------------
# Replace these with real values when wiring in a live source.
ASX_BASE_URL = "https://www.asx.com.au/asx/1/company"   # example — verify before use
ASX_ANNOUNCEMENTS_URL = "https://www.asx.com.au/markets/trade-our-cash-market/todays-announcements"
# If your data provider needs an API key, add it to .env as ASX_API_KEY.
# ---------------------------------------------------------------------------


def fetch_announcements_for_date(target_date: date) -> list[dict[str, Any]]:
    """
    Fetch raw announcement metadata for all ASX companies on a given date.

    Returns a list of dicts with at minimum:
        ticker, company_name, title, announcement_datetime,
        announcement_type, source_url, page_count (optional)

    *** REPLACE THIS FUNCTION with your real data source. ***
    Until then it raises NotImplementedError so the ingestor falls back
    to mock data automatically.
    """
    raise NotImplementedError(
        "Real ASX data source not yet wired in. "
        "Implement fetch_announcements_for_date() in asx_client.py. "
        "See module docstring for source options."
    )


def fetch_announcement_document(source_url: str) -> bytes | None:
    """
    Download the raw bytes of an announcement PDF or HTML document.
    Returns None on failure.

    *** Wire in authentication headers / cookies here if required. ***
    """
    try:
        with httpx.Client(timeout=30, follow_redirects=True) as client:
            resp = client.get(source_url)
            resp.raise_for_status()
            return resp.content
    except Exception as exc:
        logger.warning("Failed to download document from %s: %s", source_url, exc)
        return None
