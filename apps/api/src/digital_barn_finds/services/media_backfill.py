from __future__ import annotations

from dataclasses import dataclass

import httpx
from sqlalchemy import or_
from sqlalchemy.orm import Session

from digital_barn_finds.config import get_settings
from digital_barn_finds.models import Car, CarMedia, CarSource, Source
from digital_barn_finds.services.media_storage import persist_local_media, persist_remote_media


@dataclass(slots=True)
class MediaBackfillResult:
    requested: int
    updated: int
    deduped: int
    skipped: int
    remaining_remote: int
    remaining_local: int
    remaining_unmanaged: int
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
        .filter(
            or_(
                CarMedia.url.like("http%"),
                CarMedia.url.like("file://%"),
            )
        )
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
                if media.url.startswith("http"):
                    stored = persist_remote_media(
                        media.url,
                        source_key=row_scraper_key,
                        serial_number=serial_number,
                        client=client,
                    )
                elif media.url.startswith("file://"):
                    stored = persist_local_media(
                        media.url,
                        source_key=row_scraper_key,
                        serial_number=serial_number,
                    )
                else:
                    skipped += 1
                    errors.append(f"{media.url}: unsupported media URL for backfill")
                    continue
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

    remaining_remote_query = db.query(CarMedia).filter(CarMedia.url.like("http%"))
    remaining_local_query = db.query(CarMedia).filter(CarMedia.url.like("file://%"))
    if scraper_key:
        remaining_remote_query = (
            remaining_remote_query.join(CarSource, CarMedia.car_source_id == CarSource.id)
            .join(Source, CarSource.source_id == Source.id)
            .filter(Source.scraper_key == scraper_key)
        )
        remaining_local_query = (
            remaining_local_query.join(CarSource, CarMedia.car_source_id == CarSource.id)
            .join(Source, CarSource.source_id == Source.id)
            .filter(Source.scraper_key == scraper_key)
        )

    remaining_remote = remaining_remote_query.count()
    remaining_local = remaining_local_query.count()

    return MediaBackfillResult(
        requested=len(rows),
        updated=updated,
        deduped=deduped,
        skipped=skipped,
        remaining_remote=remaining_remote,
        remaining_local=remaining_local,
        remaining_unmanaged=remaining_remote + remaining_local,
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
