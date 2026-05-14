"""ASX Intel — FastAPI application entrypoint."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import init_db
from backend.api import announcements, companies, sectors, reports

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
