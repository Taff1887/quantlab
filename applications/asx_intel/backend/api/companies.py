"""Company API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Announcement, Company, PriceData
from backend.schemas import AnnouncementOut, CompanyOut, PriceDataOut

router = APIRouter()


@router.get("", response_model=list[CompanyOut])
def list_companies(db: Session = Depends(get_db)):
    return db.query(Company).order_by(Company.ticker).all()


@router.get("/{ticker}", response_model=CompanyOut)
def get_company(ticker: str, db: Session = Depends(get_db)):
    company = db.query(Company).filter_by(ticker=ticker.upper()).first()
    if not company:
        raise HTTPException(404, f"Company {ticker} not found")
    return company


@router.get("/{ticker}/announcements", response_model=list[AnnouncementOut])
def company_announcements(ticker: str, limit: int = 50, db: Session = Depends(get_db)):
    return (
        db.query(Announcement)
        .filter(Announcement.ticker.ilike(ticker))
        .order_by(Announcement.announcement_datetime.desc())
        .limit(limit)
        .all()
    )


@router.get("/{ticker}/prices", response_model=list[PriceDataOut])
def company_prices(ticker: str, limit: int = 60, db: Session = Depends(get_db)):
    return (
        db.query(PriceData)
        .filter(PriceData.ticker.ilike(ticker))
        .order_by(PriceData.date.desc())
        .limit(limit)
        .all()
    )
