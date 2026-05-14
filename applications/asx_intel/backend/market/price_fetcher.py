"""
Share price data fetcher using yfinance.

ASX tickers must be suffixed with .AX (e.g. BHP → BHP.AX).

Modular design: swap out _fetch_ohlcv() to use a paid provider
(Refinitiv, Bloomberg, Iress) without changing anything else.
"""

import logging
from datetime import date, timedelta
from typing import Any

import pandas as pd
import yfinance as yf
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.models import PriceData

logger = logging.getLogger(__name__)

# XJO = ASX 200 benchmark for abnormal move calculation
_BENCHMARK_TICKER = "^AXJO"
_VOLUME_LOOKBACK_DAYS = 30


def _to_asx_ticker(ticker: str) -> str:
    """Append .AX suffix if not already present."""
    ticker = ticker.upper().strip()
    if not ticker.endswith(".AX"):
        ticker = ticker + ".AX"
    return ticker


def _fetch_ohlcv(ticker: str, start: date, end: date) -> pd.DataFrame:
    """
    Download OHLCV from yfinance.

    *** SWAP-OUT POINT ***
    Replace this function body to use a different market data provider.
    The caller expects a DataFrame with columns: Open, High, Low, Close, Volume
    indexed by date. Return an empty DataFrame on failure.
    """
    try:
        asx_ticker = _to_asx_ticker(ticker)
        df = yf.download(
            asx_ticker,
            start=start,
            end=end + timedelta(days=1),  # yfinance end is exclusive
            progress=False,
            auto_adjust=True,
        )
        if df.empty:
            logger.warning("No price data from yfinance for %s", asx_ticker)
        return df
    except Exception as exc:
        logger.error("yfinance error for %s: %s", ticker, exc)
        return pd.DataFrame()


def fetch_price_for_date(ticker: str, target_date: date) -> dict[str, Any] | None:
    """
    Fetch OHLCV + derived metrics for a single ticker on a single date.
    Returns None if no data available.
    """
    # Fetch enough history for average volume calculation
    lookback_start = target_date - timedelta(days=_VOLUME_LOOKBACK_DAYS + 5)
    df = _fetch_ohlcv(ticker, lookback_start, target_date)

    if df.empty:
        return None

    # Flatten MultiIndex columns yfinance may return
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    # Normalise date index
    df.index = pd.to_datetime(df.index).normalize()
    target_ts = pd.Timestamp(target_date)

    if target_ts not in df.index:
        logger.warning("No trading data for %s on %s (market closed?)", ticker, target_date)
        return None

    row = df.loc[target_ts]
    close = float(row["Close"])
    open_ = float(row["Open"])
    high = float(row["High"])
    low = float(row["Low"])
    volume = float(row["Volume"])

    # Previous close
    prev_idx = df.index.get_loc(target_ts)
    if prev_idx > 0:
        prev_close = float(df.iloc[prev_idx - 1]["Close"])
    else:
        prev_close = open_

    daily_move_pct = ((close - prev_close) / prev_close * 100) if prev_close else None
    open_to_close_pct = ((close - open_) / open_ * 100) if open_ else None

    # Average daily volume over lookback window (excluding target date)
    hist = df[df.index < target_ts]["Volume"]
    avg_volume = float(hist.mean()) if not hist.empty else None
    volume_spike = (volume / avg_volume) if avg_volume and avg_volume > 0 else None

    return {
        "ticker": ticker.upper(),
        "date": target_date,
        "open": open_,
        "high": high,
        "low": low,
        "close": close,
        "prev_close": prev_close,
        "volume": volume,
        "avg_volume_20d": avg_volume,
        "daily_move_pct": daily_move_pct,
        "open_to_close_pct": open_to_close_pct,
        "volume_spike_ratio": volume_spike,
    }


def fetch_benchmark_move(target_date: date) -> float | None:
    """Return the XJO (ASX 200) daily move % for the date."""
    lookback = target_date - timedelta(days=5)
    df = _fetch_ohlcv(_BENCHMARK_TICKER, lookback, target_date)
    if df.empty:
        return None

    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    df.index = pd.to_datetime(df.index).normalize()
    target_ts = pd.Timestamp(target_date)

    if target_ts not in df.index:
        return None

    idx = df.index.get_loc(target_ts)
    if idx == 0:
        return None

    close = float(df.iloc[idx]["Close"])
    prev_close = float(df.iloc[idx - 1]["Close"])
    return ((close - prev_close) / prev_close * 100) if prev_close else None


def save_price_data(price: dict[str, Any], db: Session) -> None:
    """Upsert price data record."""
    existing = (
        db.query(PriceData)
        .filter_by(ticker=price["ticker"], date=price["date"])
        .first()
    )
    if existing:
        for k, v in price.items():
            setattr(existing, k, v)
        db.commit()
        return

    record = PriceData(**price)
    try:
        db.add(record)
        db.commit()
    except IntegrityError:
        db.rollback()


def fetch_and_save_prices(tickers: list[str], target_date: date, db: Session) -> dict[str, Any]:
    """
    Fetch prices for all tickers, compute abnormal moves vs benchmark,
    save to DB, and return a summary dict keyed by ticker.
    """
    benchmark_move = fetch_benchmark_move(target_date)
    logger.info("Benchmark (XJO) move for %s: %s%%", target_date, benchmark_move)

    results: dict[str, Any] = {}
    for ticker in tickers:
        try:
            price = fetch_price_for_date(ticker, target_date)
            if price:
                if benchmark_move is not None and price.get("daily_move_pct") is not None:
                    price["abnormal_move_pct"] = price["daily_move_pct"] - benchmark_move
                save_price_data(price, db)
                results[ticker] = price
                logger.debug(
                    "%s: close=%.3f move=%+.1f%%",
                    ticker,
                    price.get("close", 0),
                    price.get("daily_move_pct") or 0,
                )
        except Exception as exc:
            logger.error("Price fetch error for %s: %s", ticker, exc)

    return results
