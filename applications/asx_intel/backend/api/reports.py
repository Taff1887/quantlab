"""
Reports, ingestion trigger, and daily report generation endpoints.
"""

import json
import logging
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.ingestion.announcement_ingestor import ingest_date
from backend.market.price_fetcher import fetch_and_save_prices
from backend.models import Announcement, DailyReport, PriceData
from backend.processing.classifier import classify_announcement
from backend.processing.importance_scorer import score_importance
from backend.processing.summariser import generate_daily_report, summarise_announcement
from backend.schemas import DailyReportOut, IngestResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/daily-report", response_model=DailyReportOut)
def get_daily_report(
    date: Optional[str] = Query(None, description="YYYY-MM-DD, defaults to today"),
    db: Session = Depends(get_db),
):
    if date:
        try:
            target = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(400, "date must be YYYY-MM-DD")
    else:
        target = datetime.utcnow().date()

    report = db.query(DailyReport).filter(
        DailyReport.date >= datetime(target.year, target.month, target.day),
        DailyReport.date < datetime(target.year, target.month, target.day, 23, 59, 59),
    ).first()

    if not report:
        raise HTTPException(404, f"No daily report found for {target}. Run POST /generate-daily-report first.")
    return report


@router.post("/ingest", response_model=IngestResponse)
def trigger_ingest(
    date: Optional[str] = Query(None, description="YYYY-MM-DD, defaults to today"),
    mock: bool = Query(False, description="Force use of mock data"),
    db: Session = Depends(get_db),
):
    if date:
        try:
            target = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(400, "date must be YYYY-MM-DD")
    else:
        target = datetime.utcnow().date()

    logger.info("Starting ingestion for %s (mock=%s)", target, mock)
    result = ingest_date(target, db, use_mock=mock)
    return IngestResponse(**result)


@router.post("/summarise")
def trigger_summarise(
    date: Optional[str] = Query(None, description="YYYY-MM-DD, defaults to today"),
    db: Session = Depends(get_db),
):
    """Run LLM summarisation + importance scoring on all unsummarised announcements for a date."""
    if date:
        try:
            target = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(400, "date must be YYYY-MM-DD")
    else:
        target = datetime.utcnow().date()

    anns = (
        db.query(Announcement)
        .filter(
            Announcement.announcement_datetime >= datetime(target.year, target.month, target.day),
            Announcement.announcement_datetime < datetime(target.year, target.month, target.day, 23, 59, 59),
            Announcement.summary_short.is_(None),
        )
        .all()
    )

    processed = 0
    for ann in anns:
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

            # Classify if not already done
            if not ann.announcement_type or ann.announcement_type == "Other":
                ann.announcement_type = classify_announcement(text, meta)
                meta["announcement_type"] = ann.announcement_type

            # Price data for context
            price_rec = (
                db.query(PriceData)
                .filter_by(ticker=ann.ticker)
                .order_by(PriceData.date.desc())
                .first()
            )
            price_data = {
                "daily_move_pct": price_rec.daily_move_pct if price_rec else None,
            }

            # Summarise
            summary = summarise_announcement(text, meta, price_data)
            ann.summary_short = summary.get("summary_short", "")
            ann.summary_detailed = summary.get("summary_detailed", "")
            ann.why_it_matters = summary.get("why_it_matters", "")
            ann.market_impact = summary.get("market_impact", "")
            ann.key_numbers = json.dumps(summary.get("key_numbers", []))
            ann.risks_caveats = summary.get("risks_caveats", "")

            # Score importance
            score, reason = score_importance(text, meta, price_data)
            ann.importance_score = score
            ann.importance_reason = reason

            db.commit()
            processed += 1
        except Exception as exc:
            logger.error("Summarise error for announcement %d: %s", ann.id, exc)
            db.rollback()

    return {"date": str(target), "processed": processed}


@router.post("/generate-daily-report", response_model=DailyReportOut)
def trigger_daily_report(
    date: Optional[str] = Query(None, description="YYYY-MM-DD, defaults to today"),
    db: Session = Depends(get_db),
):
    if date:
        try:
            target = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(400, "date must be YYYY-MM-DD")
    else:
        target = datetime.utcnow().date()

    anns = (
        db.query(Announcement)
        .filter(
            Announcement.announcement_datetime >= datetime(target.year, target.month, target.day),
            Announcement.announcement_datetime < datetime(target.year, target.month, target.day, 23, 59, 59),
        )
        .order_by(Announcement.importance_score.desc())
        .limit(50)
        .all()
    )

    prices = (
        db.query(PriceData)
        .filter(
            PriceData.date >= datetime(target.year, target.month, target.day),
            PriceData.date < datetime(target.year, target.month, target.day, 23, 59, 59),
        )
        .order_by(PriceData.daily_move_pct.desc())
        .limit(30)
        .all()
    )

    ann_dicts = [
        {
            "ticker": a.ticker,
            "company_name": a.company_name,
            "title": a.title,
            "announcement_type": a.announcement_type,
            "importance_score": a.importance_score,
            "summary_short": a.summary_short,
            "why_it_matters": a.why_it_matters,
            "price_move_pct": a.price_move_pct,
            "sector": a.sector,
        }
        for a in anns
    ]

    price_dicts = [
        {
            "ticker": p.ticker,
            "company_name": db.query(Announcement).filter_by(ticker=p.ticker).first().company_name
            if db.query(Announcement).filter_by(ticker=p.ticker).first()
            else p.ticker,
            "daily_move_pct": p.daily_move_pct,
            "sector": None,
        }
        for p in prices
    ]

    report_data = generate_daily_report(target, ann_dicts, price_dicts)

    # Upsert daily report
    existing = db.query(DailyReport).filter(
        DailyReport.date >= datetime(target.year, target.month, target.day),
        DailyReport.date < datetime(target.year, target.month, target.day, 23, 59, 59),
    ).first()

    if not existing:
        existing = DailyReport(date=datetime(target.year, target.month, target.day))
        db.add(existing)

    existing.executive_summary = report_data.get("executive_summary", "")
    existing.top_announcements_json = json.dumps(report_data.get("top_announcements", []))
    existing.top_movers_json = json.dumps(price_dicts[:10])
    existing.sector_themes = json.dumps(report_data.get("sector_themes", {}))
    existing.unusual_moves = report_data.get("unusual_moves", "")
    existing.watchlist_tomorrow = json.dumps(report_data.get("watchlist_tomorrow", []))
    existing.full_report_text = report_data.get("full_report_text", "")

    db.commit()
    db.refresh(existing)
    return existing


@router.get("/prices/movers")
def get_price_movers(
    date: Optional[str] = Query(None, description="YYYY-MM-DD, defaults to today"),
    limit: int = Query(20, description="Number of movers to return"),
    db: Session = Depends(get_db),
):
    """Return biggest price movers for a date, directly from PriceData table."""
    if date:
        try:
            target = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(400, "date must be YYYY-MM-DD")
    else:
        target = datetime.utcnow().date()

    prices = (
        db.query(PriceData)
        .filter(
            PriceData.date >= datetime(target.year, target.month, target.day),
            PriceData.date < datetime(target.year, target.month, target.day, 23, 59, 59),
            PriceData.daily_move_pct.isnot(None),
        )
        .order_by(PriceData.daily_move_pct.desc())
        .limit(limit * 2)  # fetch extra so we can split gainers/losers
        .all()
    )

    # Also get biggest losers
    losers = (
        db.query(PriceData)
        .filter(
            PriceData.date >= datetime(target.year, target.month, target.day),
            PriceData.date < datetime(target.year, target.month, target.day, 23, 59, 59),
            PriceData.daily_move_pct.isnot(None),
        )
        .order_by(PriceData.daily_move_pct.asc())
        .limit(limit)
        .all()
    )

    def price_to_dict(p: PriceData) -> dict:
        # Try to find company name from announcements
        ann = db.query(Announcement.company_name).filter_by(ticker=p.ticker).first()
        return {
            "ticker": p.ticker,
            "company_name": ann[0] if ann else p.ticker,
            "daily_move_pct": p.daily_move_pct,
            "open": p.open,
            "close": p.close,
            "volume": p.volume,
        }

    return {
        "date": str(target),
        "gainers": [price_to_dict(p) for p in prices[:limit] if (p.daily_move_pct or 0) > 0],
        "losers": [price_to_dict(p) for p in losers[:limit] if (p.daily_move_pct or 0) < 0],
        "all": [price_to_dict(p) for p in prices[:limit]],
    }


@router.post("/fetch-prices")
def trigger_price_fetch(
    date: Optional[str] = Query(None, description="YYYY-MM-DD, defaults to today"),
    db: Session = Depends(get_db),
):
    """Fetch and save price data for all tickers that have announcements on a given date."""
    if date:
        try:
            target = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(400, "date must be YYYY-MM-DD")
    else:
        target = datetime.utcnow().date()

    tickers = [
        row[0]
        for row in db.query(Announcement.ticker)
        .filter(
            Announcement.announcement_datetime >= datetime(target.year, target.month, target.day),
        )
        .distinct()
        .all()
    ]

    if not tickers:
        return {"message": "No tickers found for date", "date": str(target)}

    results = fetch_and_save_prices(tickers, target, db)

    # Link price moves back to announcements
    for ticker, price in results.items():
        move = price.get("daily_move_pct")
        abnormal = price.get("abnormal_move_pct")
        db.query(Announcement).filter(
            Announcement.ticker == ticker,
            Announcement.announcement_datetime >= datetime(target.year, target.month, target.day),
            Announcement.announcement_datetime < datetime(target.year, target.month, target.day, 23, 59, 59),
        ).update({"price_move_pct": move, "abnormal_move_pct": abnormal})
    db.commit()

    return {"date": str(target), "tickers_fetched": len(results), "tickers": list(results.keys())}
