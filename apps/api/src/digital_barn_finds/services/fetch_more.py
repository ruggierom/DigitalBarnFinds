from __future__ import annotations

import random
from dataclasses import dataclass

from sqlalchemy.orm import Session

from digital_barn_finds.models import CarSource, Source
from digital_barn_finds.services.fixture_pool import discover_barchetta_fixture_pages
from digital_barn_finds.services.ingest import upsert_scraped_car
from digital_barn_finds.services.scrapers.barchetta import BarchettaScraper

RENDERABLE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".bmp", ".jfif")


@dataclass(slots=True)
class FetchMoreResult:
    requested: int
    discovered: int
    imported: int
    skipped_existing: int
    skipped_without_images: int
    source_name: str
    mode_used: str
    errors: list[str]


def fetch_random_cars(db: Session, limit: int, ignore_without_images: bool = False) -> FetchMoreResult:
    source = db.query(Source).filter(Source.scraper_key == "barchetta").one()
    scraper = BarchettaScraper()
    existing_urls = {
        row[0]
        for row in db.query(CarSource.source_url).filter(CarSource.source_url.is_not(None)).all()
    }

    try:
        discovered_urls = scraper.crawl(full=True)
        return _import_from_live(
            db,
            source,
            scraper,
            discovered_urls,
            existing_urls,
            limit,
            ignore_without_images=ignore_without_images,
        )
    except Exception as exc:  # pragma: no cover - operational path
        return _import_from_fixtures(
            db,
            source,
            scraper,
            existing_urls,
            limit,
            ignore_without_images=ignore_without_images,
            initial_error=f"Live discovery failed: {exc}",
        )


def _import_from_live(
    db: Session,
    source: Source,
    scraper: BarchettaScraper,
    discovered_urls: list[str],
    existing_urls: set[str],
    limit: int,
    ignore_without_images: bool,
) -> FetchMoreResult:
    unseen_urls = [url for url in discovered_urls if url not in existing_urls]
    selected_urls = random.sample(unseen_urls, k=min(limit, len(unseen_urls))) if unseen_urls else []
    imported = 0
    skipped_without_images = 0
    errors: list[str] = []

    for url in selected_urls:
        try:
            record = scraper.parse_detail_page(url)
            if ignore_without_images and not _has_renderable_media(record.media):
                skipped_without_images += 1
                continue
            upsert_scraped_car(db, source, record)
            imported += 1
        except Exception as exc:  # pragma: no cover - operational path
            db.rollback()
            errors.append(f"{url}: {exc}")

    return FetchMoreResult(
        requested=limit,
        discovered=len(discovered_urls),
        imported=imported,
        skipped_existing=max(0, len(discovered_urls) - len(unseen_urls)),
        skipped_without_images=skipped_without_images,
        source_name=source.name,
        mode_used="live",
        errors=errors,
    )


def _import_from_fixtures(
    db: Session,
    source: Source,
    scraper: BarchettaScraper,
    existing_urls: set[str],
    limit: int,
    ignore_without_images: bool,
    initial_error: str | None = None,
) -> FetchMoreResult:
    fixture_files = discover_barchetta_fixture_pages()

    parsed_records = [scraper.parse_detail_file(path) for path in fixture_files]
    unseen_records = [record for record in parsed_records if record.source_url not in existing_urls]
    selected_records = (
        random.sample(unseen_records, k=min(limit, len(unseen_records))) if unseen_records else []
    )

    imported = 0
    skipped_without_images = 0
    errors = [initial_error] if initial_error else []

    for record in selected_records:
        try:
            if ignore_without_images and not _has_renderable_media(record.media):
                skipped_without_images += 1
                continue
            upsert_scraped_car(db, source, record)
            imported += 1
        except Exception as exc:  # pragma: no cover - operational path
            db.rollback()
            errors.append(f"{record.source_url}: {exc}")

    return FetchMoreResult(
        requested=limit,
        discovered=len(parsed_records),
        imported=imported,
        skipped_existing=max(0, len(parsed_records) - len(unseen_records)),
        skipped_without_images=skipped_without_images,
        source_name=source.name,
        mode_used="fixtures",
        errors=errors,
    )


def _has_renderable_media(media: list[dict[str, str | None]]) -> bool:
    for item in media:
        url = str(item.get("url") or "").lower()
        media_type = str(item.get("media_type") or "").lower()
        if media_type.startswith("image/") or any(ext in url for ext in RENDERABLE_EXTENSIONS):
            return True
    return False
