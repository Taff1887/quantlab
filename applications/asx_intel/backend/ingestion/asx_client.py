"""
Real ASX announcement client.

Data sources:
  1. ASX Listed Companies CSV — https://www.asx.com.au/asx/research/ASXListedCompanies.csv
     Returns all ~2,200 ASX-listed tickers with company name and GICS industry group.

  2. ASX Announcements JSON API (per ticker) —
     https://www.asx.com.au/asx/1/company/{TICKER}/announcements?count=20&market_sensitive=false
     Public, no auth required. Returns announcements with date, title, PDF URL, page count.

Fetching strategy:
  - Download the company list once per day (cached in data/)
  - Fetch announcements for all tickers concurrently (configurable workers)
  - Rate-limit to avoid 429s (default: 0.05s delay between requests)
  - For a full ASX run (~2,200 tickers at 20 workers) expect ~2-4 minutes

*** SWAP-OUT POINT ***
  Replace _fetch_company_announcements() body to use a paid provider
  (Refinitiv, Bloomberg, Iress) without changing anything else.
"""

import csv
import io
import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# --- Config -----------------------------------------------------------------
ASX_COMPANY_LIST_URL = "https://www.asx.com.au/asx/research/ASXListedCompanies.csv"
ASX_ANNOUNCEMENTS_URL = "https://www.asx.com.au/asx/1/company/{ticker}/announcements"
ASX_PDF_BASE = "https://www.asx.com.au"

# Concurrent workers — increase carefully to avoid rate limiting
MAX_WORKERS = 15
REQUEST_DELAY = 0.05   # seconds between each request per worker
REQUEST_TIMEOUT = 15   # seconds

# Cache company list for the day so we don't re-download on every run
_CACHE_DIR = Path(__file__).parent.parent.parent / "data"
_COMPANY_CACHE_FILE = _CACHE_DIR / "asx_companies_cache.csv"

# Browser-like headers to avoid 403s
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/html, */*",
    "Accept-Language": "en-AU,en;q=0.9",
    "Referer": "https://www.asx.com.au/",
}
# ---------------------------------------------------------------------------


def get_asx_company_list(force_refresh: bool = False) -> list[dict[str, str]]:
    """
    Return list of {ticker, name, gics_group} for all ASX-listed companies.
    Cached daily in data/asx_companies_cache.csv.
    """
    _CACHE_DIR.mkdir(exist_ok=True)

    # Use cache if it exists and was written today
    if not force_refresh and _COMPANY_CACHE_FILE.exists():
        mtime = datetime.fromtimestamp(_COMPANY_CACHE_FILE.stat().st_mtime).date()
        if mtime == date.today():
            return _read_company_cache()

    logger.info("Downloading ASX company list from %s", ASX_COMPANY_LIST_URL)
    try:
        with httpx.Client(timeout=30, headers=_HEADERS) as client:
            resp = client.get(ASX_COMPANY_LIST_URL)
            resp.raise_for_status()
            content = resp.text

        companies = _parse_company_csv(content)
        _write_company_cache(companies)
        logger.info("Downloaded %d ASX-listed companies", len(companies))
        return companies

    except Exception as exc:
        logger.error("Failed to download company list: %s", exc)
        if _COMPANY_CACHE_FILE.exists():
            logger.info("Falling back to cached company list")
            return _read_company_cache()
        raise


def _parse_company_csv(content: str) -> list[dict[str, str]]:
    """Parse the ASX Listed Companies CSV (has 3 header rows to skip)."""
    companies = []
    reader = csv.reader(io.StringIO(content))
    rows = list(reader)

    # Find the header row (contains "ASX code")
    header_idx = 0
    for i, row in enumerate(rows):
        if row and "ASX code" in row[0]:
            header_idx = i
            break

    for row in rows[header_idx + 1:]:
        if len(row) < 2 or not row[0].strip():
            continue
        companies.append({
            "ticker": row[0].strip().upper(),
            "name": row[1].strip() if len(row) > 1 else "",
            "gics_group": row[2].strip() if len(row) > 2 else "",
        })

    return companies


def _write_company_cache(companies: list[dict[str, str]]) -> None:
    with open(_COMPANY_CACHE_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["ticker", "name", "gics_group"])
        writer.writeheader()
        writer.writerows(companies)


def _read_company_cache() -> list[dict[str, str]]:
    companies = []
    with open(_COMPANY_CACHE_FILE, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            companies.append(dict(row))
    return companies


def fetch_announcements_for_date(target_date: date) -> list[dict[str, Any]]:
    """
    Fetch all ASX announcements for a given date across all listed companies.

    Returns list of dicts with:
        ticker, company_name, title, announcement_datetime,
        announcement_type, source_url, page_count, market_sensitive
    """
    companies = get_asx_company_list()
    logger.info(
        "Fetching announcements for %d companies on %s (workers=%d)",
        len(companies), target_date, MAX_WORKERS,
    )

    all_announcements: list[dict[str, Any]] = []
    errors: list[str] = []

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(_fetch_company_announcements, c["ticker"], c["name"], target_date): c["ticker"]
            for c in companies
        }
        completed = 0
        for future in as_completed(futures):
            ticker = futures[future]
            completed += 1
            if completed % 200 == 0:
                logger.info("Progress: %d/%d companies checked", completed, len(companies))
            try:
                anns = future.result()
                all_announcements.extend(anns)
            except Exception as exc:
                errors.append(f"{ticker}: {exc}")

    logger.info(
        "Fetched %d announcements for %s (%d errors)",
        len(all_announcements), target_date, len(errors),
    )
    if errors[:5]:
        logger.debug("Sample errors: %s", errors[:5])

    return all_announcements


def _fetch_company_announcements(
    ticker: str, company_name: str, target_date: date
) -> list[dict[str, Any]]:
    """
    Fetch announcements for a single ticker and filter to target_date.
    Returns [] on any error.
    """
    time.sleep(REQUEST_DELAY)
    url = ASX_ANNOUNCEMENTS_URL.format(ticker=ticker)
    params = {"count": "20", "market_sensitive": "false"}

    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT, headers=_HEADERS, follow_redirects=True) as client:
            resp = client.get(url, params=params)

        if resp.status_code == 404:
            return []  # ticker delisted or no announcements
        if resp.status_code == 429:
            logger.warning("Rate limited for %s — waiting 5s", ticker)
            time.sleep(5)
            return []
        resp.raise_for_status()

        data = resp.json()
        raw_list = data.get("data", [])

    except Exception as exc:
        logger.debug("Failed to fetch %s: %s", ticker, exc)
        return []

    results = []
    for item in raw_list:
        ann_dt = _parse_asx_datetime(item.get("document_release_date", ""))
        if ann_dt is None:
            continue
        if ann_dt.date() != target_date:
            continue

        relative_url = item.get("relative_url", "") or item.get("url", "")
        source_url = (ASX_PDF_BASE + relative_url) if relative_url.startswith("/") else relative_url

        results.append({
            "ticker": ticker,
            "company_name": company_name or ticker,
            "title": item.get("header", "").strip(),
            "announcement_datetime": ann_dt,
            "announcement_type": None,  # classified later by classifier.py
            "source_url": source_url,
            "page_count": item.get("number_of_pages"),
            "market_sensitive": item.get("market_sensitive", False),
            "raw_text": "",  # downloaded separately by ingestor if needed
        })

    return results


def _parse_asx_datetime(dt_str: str) -> datetime | None:
    """Parse ASX datetime strings like '2026-05-14T09:30:00+1000'."""
    if not dt_str:
        return None
    try:
        # Python's fromisoformat handles +HH:MM but not +HHMM (no colon)
        # Normalise +1000 → +10:00
        import re
        dt_str = re.sub(r"([+-])(\d{2})(\d{2})$", r"\1\2:\3", dt_str)
        return datetime.fromisoformat(dt_str)
    except Exception:
        try:
            return datetime.strptime(dt_str[:19], "%Y-%m-%dT%H:%M:%S")
        except Exception:
            return None


def fetch_announcement_document(source_url: str) -> bytes | None:
    """Download the raw PDF/HTML bytes of an announcement. Returns None on failure."""
    if not source_url:
        return None
    try:
        with httpx.Client(timeout=30, headers=_HEADERS, follow_redirects=True) as client:
            resp = client.get(source_url)
            resp.raise_for_status()
            return resp.content
    except Exception as exc:
        logger.warning("Failed to download %s: %s", source_url, exc)
        return None
