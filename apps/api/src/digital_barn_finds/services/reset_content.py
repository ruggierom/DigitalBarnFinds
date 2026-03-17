from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from digital_barn_finds.models import (
    Car,
    CarAttribute,
    CarEvent,
    CarMedia,
    CarSource,
    CustodyEvent,
    DarknessScore,
    ScrapeLog,
    Source,
    WatchlistEntry,
)


@dataclass(slots=True)
class ResetContentResult:
    deleted_car_media: int
    deleted_car_events: int
    deleted_custody_events: int
    deleted_car_attributes: int
    deleted_watchlist: int
    deleted_darkness_scores: int
    deleted_car_sources: int
    deleted_cars: int
    deleted_scrape_logs: int
    reset_sources: int


def reset_content(db: Session, *, include_watchlist: bool = True) -> ResetContentResult:
    deleted_car_media = db.query(CarMedia).delete(synchronize_session=False)
    deleted_car_events = db.query(CarEvent).delete(synchronize_session=False)
    deleted_custody_events = db.query(CustodyEvent).delete(synchronize_session=False)
    deleted_car_attributes = db.query(CarAttribute).delete(synchronize_session=False)
    deleted_watchlist = 0
    if include_watchlist:
        deleted_watchlist = db.query(WatchlistEntry).delete(synchronize_session=False)
    deleted_darkness_scores = db.query(DarknessScore).delete(synchronize_session=False)
    deleted_car_sources = db.query(CarSource).delete(synchronize_session=False)
    deleted_cars = db.query(Car).delete(synchronize_session=False)
    deleted_scrape_logs = db.query(ScrapeLog).delete(synchronize_session=False)
    reset_sources = db.query(Source).update({Source.last_scraped_at: None}, synchronize_session=False)
    db.commit()

    return ResetContentResult(
        deleted_car_media=deleted_car_media,
        deleted_car_events=deleted_car_events,
        deleted_custody_events=deleted_custody_events,
        deleted_car_attributes=deleted_car_attributes,
        deleted_watchlist=deleted_watchlist,
        deleted_darkness_scores=deleted_darkness_scores,
        deleted_car_sources=deleted_car_sources,
        deleted_cars=deleted_cars,
        deleted_scrape_logs=deleted_scrape_logs,
        reset_sources=reset_sources,
    )
