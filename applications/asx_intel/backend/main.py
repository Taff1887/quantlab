"""ASX Intel — FastAPI application entrypoint."""

import logging
from datetime import datetime, timedelta

import pytz
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import init_db
from backend.api import announcements, companies, sectors, reports

AEST = pytz.timezone("Australia/Sydney")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ASX Intel API",
    description="Daily ASX announcement intelligence platform",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(announcements.router, prefix="/announcements", tags=["announcements"])
app.include_router(companies.router, prefix="/companies", tags=["companies"])
app.include_router(sectors.router, prefix="/sectors", tags=["sectors"])
app.include_router(reports.router, tags=["reports"])


@app.on_event("startup")
def on_startup() -> None:
    logger.info("Initialising database…")
    init_db()
    logger.info("ASX Intel API ready.")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/schedule/status")
def schedule_status() -> dict:
    """
    Returns the current AEST time, whether today is a trading day,
    and what the next scheduled pipeline run is.
    """
    now = datetime.now(AEST)
    today = now.date()
    is_weekday = today.weekday() < 5

    # Trading windows: 10:00, 11:00 … 16:00, 16:30
    run_hours = [10, 11, 12, 13, 14, 15, 16]
    run_times = [now.replace(hour=h, minute=0, second=0, microsecond=0) for h in run_hours]
    run_times.append(now.replace(hour=16, minute=30, second=0, microsecond=0))  # EOD
    run_times.sort()

    next_run = None
    for rt in run_times:
        if rt > now:
            next_run = rt
            break

    # If past 16:30, next run is 10:00 next trading day
    if next_run is None:
        tomorrow = today + timedelta(days=1)
        while tomorrow.weekday() >= 5:
            tomorrow += timedelta(days=1)
        next_run = AEST.localize(
            datetime(tomorrow.year, tomorrow.month, tomorrow.day, 10, 0, 0)
        )

    market_open = is_weekday and now.hour >= 10 and (now.hour < 16 or (now.hour == 16 and now.minute <= 12))

    return {
        "aest_now": now.strftime("%A %d %b %Y %H:%M:%S AEST"),
        "is_trading_day": is_weekday,
        "market_open": market_open,
        "next_run": next_run.strftime("%H:%M AEST") if next_run.date() == today else next_run.strftime("%a %d %b %H:%M AEST"),
        "next_run_iso": next_run.isoformat(),
        "schedule": "10:00 → 16:00 hourly + 16:30 EOD (Mon–Fri AEST)",
    }
