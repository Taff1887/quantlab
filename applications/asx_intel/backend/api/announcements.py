"""Announcement API endpoints."""

from datetime import datetime, date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Announcement
from backend.schemas import AnnouncementOut, AnnouncementDetail

router = APIRouter()


@router.get("", response_model=list[AnnouncementOut])
def list_announcements(
    date: Optional[str] = Query(None, description="Filter by date YYYY-MM-DD"),
    ticker: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    announcement_type: Optional[str] = Query(None),
    min_importance: Optional[float] = Query(None),
    search: Optional[str] = Query(None, description="Search in title"),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    db: Session = Depends(get_db),
):
    q = db.query(Announcement)

    if date:
        try:
            target = datetime.strptime(date, "%Y-%m-%d").date()
            q = q.filter(
                Announcement.announcement_datetime >= datetime(target.year, target.month, target.day),
                Announcement.announcement_datetime < datetime(target.year, target.month, target.day, 23, 59, 59),
            )
        except ValueError:
            raise HTTPException(400, "date must be YYYY-MM-DD")

    if ticker:
        q = q.filter(Announcement.ticker.ilike(ticker))

    if sector:
        q = q.filter(Announcement.sector.ilike(f"%{sector}%"))

    if announcement_type:
        q = q.filter(Announcement.announcement_type.ilike(f"%{announcement_type}%"))

    if min_importance is not None:
        q = q.filter(Announcement.importance_score >= min_importance)

    if search:
        q = q.filter(Announcement.title.ilike(f"%{search}%"))

    q = q.order_by(Announcement.importance_score.desc(), Announcement.announcement_datetime.desc())

    return q.offset(offset).limit(limit).all()


@router.get("/{id}", response_model=AnnouncementDetail)
def get_announcement(id: int, db: Session = Depends(get_db)):
    ann = db.query(Announcement).filter_by(id=id).first()
    if not ann:
        raise HTTPException(404, f"Announcement {id} not found")
    return ann
