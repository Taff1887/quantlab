"""
ASX Intel — Daily Trading Scheduler

Runs automatically on ASX trading days (Mon–Fri, excluding public holidays):

  10:00 AEST  — First announcement fetch of the day
  11:00 AEST  — Hourly re-fetch (picks up new announcements released since last run)
  12:00 AEST  —  "
  13:00 AEST  —  "
  14:00 AEST  —  "
  15:00 AEST  —  "
  16:00 AEST  —  "
  16:30 AEST  — End-of-day: final price fetch, importance scoring, daily report

Each run:
  1. Fetches all new ASX announcements for today (duplicates skipped automatically)
  2. Classifies each: sector, announcement type, importance score
  3. Fetches live share prices for every company that announced
  4. Updates the daily report

Usage:
  python scripts/scheduler.py              # run the scheduler
  python scripts/scheduler.py --now        # run the pipeline immediately then schedule
  python scripts/scheduler.py --dry-run    # print the schedule without running anything

Auto-start on Windows login:
  Run scripts/setup_autostart.bat as Administrator (one time only)
"""

import argparse
import json
import logging
import sys
from datetime import date, datetime
from pathlib import Path

import pytz

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(ROOT / "data" / "scheduler.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger("asx_scheduler")

AEST = pytz.timezone("Australia/Sydney")

# ASX public holidays (update annually or use the `holidays` package)
# Format: set of (month, day) tuples — approximate; add exact dates each year
ASX_HOLIDAYS_2026: set[date] = {
    date(2026, 1, 1),   # New Year's Day
    date(2026, 1, 26),  # Australia Day
    date(2026, 4, 3),   # Good Friday
    date(2026, 4, 6),   # Easter Monday
    date(2026, 4, 25),  # Anzac Day
    date(2026, 6, 8),   # King's Birthday (QLD — ASX follows NSW/ACT)
    date(2026, 12, 25), # Christmas Day
    date(2026, 12, 26), # Boxing Day
}

ASX_HOLIDAYS_2027: set[date] = {
    date(2027, 1, 1),
    date(2027, 1, 26),
    date(2027, 3, 26),  # Good Friday
    date(2027, 3, 29),  # Easter Monday
    date(2027, 4, 25),
    date(2027, 6, 14),
    date(2027, 12, 25),
    date(2027, 12, 26),
}

ALL_HOLIDAYS = ASX_HOLIDAYS_2026 | ASX_HOLIDAYS_2027


def is_trading_day(d: date | None = None) -> bool:
    """Return True if d (defaults to today AEST) is an ASX trading day."""
    if d is None:
        d = datetime.now(AEST).date()
    return d.weekday() < 5 and d not in ALL_HOLIDAYS


def run_pipeline(target_date: date, is_final: bool = False, use_mock: bool = False) -> None:
    """
    Execute the full ingestion + analysis pipeline for a given date.
    is_final=True triggers the EOD price fetch and report generation.
    """
    from backend.database import SessionLocal, init_db
    from backend.ingestion.announcement_ingestor import ingest_date
    from backend.market.price_fetcher import fetch_and_save_prices
    from backend.models import Announcement, DailyReport, PriceData
    from backend.processing.classifier import classify_announcement
    from backend.processing.importance_scorer import score_importance
    from backend.processing.summariser import generate_daily_report, summarise_announcement

    label = "EOD" if is_final else "INTRADAY"
    logger.info("=" * 60)
    logger.info("PIPELINE START [%s] %s", label, target_date)
    logger.info("=" * 60)

    init_db()
    db = SessionLocal()

    try:
        # ── 1. Fetch new announcements ───────────────────────────────
        logger.info("[1/4] Fetching announcements…")
        result = ingest_date(target_date, db, use_mock=use_mock)
        logger.info(
            "      %d fetched, %d new saved, %d errors",
            result["announcements_fetched"],
            result["announcements_saved"],
            len(result["errors"]),
        )

        # ── 2. Classify + score all unsummarised announcements ───────
        logger.info("[2/4] Classifying and scoring new announcements…")
        unsummarised = (
            db.query(Announcement)
            .filter(
                Announcement.announcement_datetime >= datetime(target_date.year, target_date.month, target_date.day),
                Announcement.announcement_datetime < datetime(target_date.year, target_date.month, target_date.day, 23, 59, 59),
                Announcement.summary_short.is_(None),
            )
            .all()
        )
        processed = 0
        for ann in unsummarised:
            try:
                text = ann.cleaned_text or ann.raw_text or ""
                meta = {
                    "ticker": ann.ticker,
                    "company_name": ann.company_name,
                    "sector": ann.sector,
                    "title": ann.title,
                    "announcement_type": ann.announcement_type,
                    "page_count": ann.page_count,
                }
                if not ann.announcement_type or ann.announcement_type == "Other":
                    ann.announcement_type = classify_announcement(text, meta)
                    meta["announcement_type"] = ann.announcement_type

                price_rec = db.query(PriceData).filter_by(ticker=ann.ticker).order_by(PriceData.date.desc()).first()
                price_data = {"daily_move_pct": price_rec.daily_move_pct if price_rec else None}

                summary = summarise_announcement(text, meta, price_data)
                ann.summary_short = summary.get("summary_short", "")
                ann.summary_detailed = summary.get("summary_detailed", "")
                ann.why_it_matters = summary.get("why_it_matters", "")
                ann.market_impact = summary.get("market_impact", "")
                ann.key_numbers = json.dumps(summary.get("key_numbers", []))
                ann.risks_caveats = summary.get("risks_caveats", "")

                score, reason = score_importance(text, meta, price_data)
                ann.importance_score = score
                ann.importance_reason = reason

                db.commit()
                processed += 1
            except Exception as exc:
                logger.error("      Error processing ann %d: %s", ann.id, exc)
                db.rollback()
        logger.info("      Processed %d new announcements", processed)

        # ── 3. Fetch prices ──────────────────────────────────────────
        logger.info("[3/4] Fetching share prices…")
        tickers = [
            row[0]
            for row in db.query(Announcement.ticker)
            .filter(
                Announcement.announcement_datetime >= datetime(target_date.year, target_date.month, target_date.day),
            )
            .distinct()
            .all()
        ]
        if tickers:
            prices = fetch_and_save_prices(tickers, target_date, db)
            logger.info("      Fetched prices for %d tickers", len(prices))

            # Link price moves back to announcements
            for ticker, p in prices.items():
                db.query(Announcement).filter(
                    Announcement.ticker == ticker,
                    Announcement.announcement_datetime >= datetime(target_date.year, target_date.month, target_date.day),
                    Announcement.announcement_datetime < datetime(target_date.year, target_date.month, target_date.day, 23, 59, 59),
                ).update({"price_move_pct": p.get("daily_move_pct"), "abnormal_move_pct": p.get("abnormal_move_pct")})
            db.commit()
        else:
            logger.info("      No tickers to fetch yet")

        # ── 4. Generate daily report (every run, updated incrementally) ──
        logger.info("[4/4] Generating daily report…")
        anns_all = (
            db.query(Announcement)
            .filter(
                Announcement.announcement_datetime >= datetime(target_date.year, target_date.month, target_date.day),
                Announcement.announcement_datetime < datetime(target_date.year, target_date.month, target_date.day, 23, 59, 59),
            )
            .order_by(Announcement.importance_score.desc())
            .limit(50)
            .all()
        )
        prices_all = (
            db.query(PriceData)
            .filter(
                PriceData.date >= datetime(target_date.year, target_date.month, target_date.day),
                PriceData.date < datetime(target_date.year, target_date.month, target_date.day, 23, 59, 59),
            )
            .order_by(PriceData.daily_move_pct.desc())
            .limit(30)
            .all()
        )

        ann_dicts = [
            {"ticker": a.ticker, "company_name": a.company_name, "title": a.title,
             "announcement_type": a.announcement_type, "importance_score": a.importance_score,
             "summary_short": a.summary_short, "why_it_matters": a.why_it_matters,
             "price_move_pct": a.price_move_pct, "sector": a.sector}
            for a in anns_all
        ]
        price_dicts = [
            {"ticker": p.ticker, "company_name": p.ticker, "daily_move_pct": p.daily_move_pct}
            for p in prices_all
        ]

        report_data = generate_daily_report(target_date, ann_dicts, price_dicts)

        existing = db.query(DailyReport).filter(
            DailyReport.date >= datetime(target_date.year, target_date.month, target_date.day),
            DailyReport.date < datetime(target_date.year, target_date.month, target_date.day, 23, 59, 59),
        ).first()
        if not existing:
            existing = DailyReport(date=datetime(target_date.year, target_date.month, target_date.day))
            db.add(existing)

        existing.executive_summary = report_data.get("executive_summary", "")
        existing.top_announcements_json = json.dumps(report_data.get("top_announcements", []))
        existing.top_movers_json = json.dumps(price_dicts[:10])
        existing.sector_themes = json.dumps(report_data.get("sector_themes", {}))
        existing.unusual_moves = report_data.get("unusual_moves", "")
        existing.watchlist_tomorrow = json.dumps(report_data.get("watchlist_tomorrow", []))
        existing.full_report_text = report_data.get("full_report_text", "")
        db.commit()

        logger.info("=" * 60)
        logger.info("PIPELINE DONE [%s] %s — %d announcements, %d priced",
                    label, target_date, len(anns_all), len(prices_all))
        logger.info("=" * 60)

        if report_data.get("executive_summary"):
            logger.info("\n--- MARKET WRAP ---\n%s\n---\n", report_data["executive_summary"])

    except Exception as exc:
        logger.exception("Pipeline failed for %s: %s", target_date, exc)
    finally:
        db.close()


def print_schedule() -> None:
    now_aest = datetime.now(AEST)
    logger.info("ASX Intel Scheduler — current time: %s", now_aest.strftime("%A %d %b %Y %H:%M AEST"))
    logger.info("")
    logger.info("Daily schedule (AEST, Mon–Fri, excluding ASX public holidays):")
    logger.info("  10:00  — Morning: first announcement fetch of the day")
    logger.info("  11:00  — Hourly re-fetch")
    logger.info("  12:00  — Hourly re-fetch")
    logger.info("  13:00  — Hourly re-fetch")
    logger.info("  14:00  — Hourly re-fetch")
    logger.info("  15:00  — Hourly re-fetch")
    logger.info("  16:00  — Hourly re-fetch")
    logger.info("  16:30  — EOD: final price close + daily report generation")
    logger.info("")
    today = now_aest.date()
    logger.info("Today (%s) is %s",
                today,
                "a TRADING DAY ✓" if is_trading_day(today) else "NOT a trading day (weekend/holiday)")
    logger.info("")


def main() -> None:
    parser = argparse.ArgumentParser(description="ASX Intel daily scheduler")
    parser.add_argument("--now", action="store_true", help="Run the pipeline immediately for today, then start the schedule")
    parser.add_argument("--dry-run", action="store_true", help="Print schedule and exit without running anything")
    parser.add_argument("--mock", action="store_true", help="Use mock data (for testing without a real ASX connection)")
    args = parser.parse_args()

    # Ensure data dir exists for log file
    (ROOT / "data").mkdir(exist_ok=True)

    print_schedule()

    if args.dry_run:
        logger.info("Dry run — exiting.")
        return

    if args.now:
        today = datetime.now(AEST).date()
        logger.info("--now flag: running pipeline immediately for %s", today)
        run_pipeline(today, is_final=False, use_mock=args.mock)

    # ── Build and start the scheduler ──────────────────────────────────────
    try:
        from apscheduler.schedulers.blocking import BlockingScheduler
        from apscheduler.triggers.cron import CronTrigger
    except ImportError:
        logger.error("APScheduler not installed. Run: pip install apscheduler pytz")
        sys.exit(1)

    scheduler = BlockingScheduler(timezone=AEST)

    def _guard(fn, **kwargs):
        """Wrap a job so it only runs on trading days."""
        def wrapper():
            today = datetime.now(AEST).date()
            if not is_trading_day(today):
                logger.info("Not a trading day (%s) — skipping.", today)
                return
            fn(today, **kwargs)
        return wrapper

    # 10:00am — morning open (first fetch of the day)
    scheduler.add_job(
        _guard(run_pipeline, is_final=False, use_mock=args.mock),
        CronTrigger(day_of_week="mon-fri", hour=10, minute=0, timezone=AEST),
        id="morning_open",
        name="Morning open — first fetch",
        misfire_grace_time=300,
    )

    # 11:00 → 16:00 — hourly intraday re-fetch
    for hour in range(11, 17):
        scheduler.add_job(
            _guard(run_pipeline, is_final=False, use_mock=args.mock),
            CronTrigger(day_of_week="mon-fri", hour=hour, minute=0, timezone=AEST),
            id=f"hourly_{hour:02d}00",
            name=f"Hourly re-fetch {hour:02d}:00",
            misfire_grace_time=300,
        )

    # 16:30 — end of day: final prices + report
    scheduler.add_job(
        _guard(run_pipeline, is_final=True, use_mock=args.mock),
        CronTrigger(day_of_week="mon-fri", hour=16, minute=30, timezone=AEST),
        id="eod_close",
        name="EOD — final prices + daily report",
        misfire_grace_time=300,
    )

    logger.info("Scheduler started. Waiting for next trading window…")
    logger.info("Press Ctrl+C to stop.")
    logger.info("")

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Scheduler stopped.")


if __name__ == "__main__":
    main()
