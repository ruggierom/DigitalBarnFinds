from __future__ import annotations

from dataclasses import dataclass

import httpx
from sqlalchemy.orm import Session

from digital_barn_finds.config import get_settings
from digital_barn_finds.models import Car, CarMedia, CarSource, Source
from digital_barn_finds.services.media_storage import persist_remote_media


@dataclass(slots=True)
class MediaBackfillResult:
    requested: int
    updated: int
    deduped: int
    skipped: int
    remaining_remote: int
    scraper_key: str | None = None
    errors: list[str] | None = None


def cache_existing_media(
    db: Session,
    *,
    limit: int,
    scraper_key: str | None = None,
    commit_interval: int = 25,
) -> MediaBackfillResult:
    query = (
        db.query(CarMedia, Car.display_serial_number, Source.scraper_key)
        .join(Car, CarMedia.car_id == Car.id)
        .join(CarSource, CarMedia.car_source_id == CarSource.id)
        .join(Source, CarSource.source_id == Source.id)
        .filter(CarMedia.url.like("http%"))
        .order_by(CarMedia.scraped_at.desc())
    )
    if scraper_key:
        query = query.filter(Source.scraper_key == scraper_key)

    rows = query.limit(limit).all()
    errors: list[str] = []
    updated = 0
    deduped = 0
    skipped = 0
    pending_updates = 0
    seen_targets: set[tuple[object, str]] = set()

    client = _build_media_client()
    try:
        for media, serial_number, row_scraper_key in rows:
            try:
                stored = persist_remote_media(
                    media.url,
                    source_key=row_scraper_key,
                    serial_number=serial_number,
                    client=client,
                )
            except Exception as exc:  # noqa: BLE001
                skipped += 1
                errors.append(f"{media.url}: {exc}")
                continue
            target_key = (media.car_source_id, stored.url)
            if target_key in seen_targets:
                db.delete(media)
                deduped += 1
                pending_updates += 1
                if pending_updates >= commit_interval:
                    db.commit()
                    pending_updates = 0
                continue
            duplicate = (
                db.query(CarMedia.id)
                .filter(
                    CarMedia.car_source_id == media.car_source_id,
                    CarMedia.url == stored.url,
                    CarMedia.id != media.id,
                )
                .one_or_none()
            )
            if duplicate is not None:
                db.delete(media)
                deduped += 1
                seen_targets.add(target_key)
            else:
                media.url = stored.url
                updated += 1
                seen_targets.add(target_key)
            pending_updates += 1
            if pending_updates >= commit_interval:
                db.commit()
                pending_updates = 0
        if pending_updates:
            db.commit()
    finally:
        client.close()

    remaining_query = db.query(CarMedia).filter(CarMedia.url.like("http%"))
    if scraper_key:
        remaining_query = (
            remaining_query.join(CarSource, CarMedia.car_source_id == CarSource.id)
            .join(Source, CarSource.source_id == Source.id)
            .filter(Source.scraper_key == scraper_key)
        )

    return MediaBackfillResult(
        requested=len(rows),
        updated=updated,
        deduped=deduped,
        skipped=skipped,
        remaining_remote=remaining_query.count(),
        scraper_key=scraper_key,
        errors=errors,
    )


def _build_media_client() -> httpx.Client:
    settings = get_settings()
    return httpx.Client(
        follow_redirects=True,
        timeout=settings.media_download_timeout_seconds,
        headers={"User-Agent": settings.effective_user_agent},
    )
