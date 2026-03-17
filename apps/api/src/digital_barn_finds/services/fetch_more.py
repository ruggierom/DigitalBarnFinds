from __future__ import annotations

import random
from dataclasses import dataclass

from sqlalchemy.orm import Session

from digital_barn_finds.models import CarSource, Source
from digital_barn_finds.config import get_settings
from digital_barn_finds.services.ingest import upsert_scraped_car
from digital_barn_finds.services.scrapers.base import BaseScraper
from digital_barn_finds.services.scrapers.fixtures import load_source_fixture_definitions
from digital_barn_finds.services.scrapers.registry import get_scraper

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


def fetch_random_cars(
    db: Session,
    limit: int,
    scraper_key: str,
    ignore_without_images: bool = False,
) -> FetchMoreResult:
    source = db.query(Source).filter(Source.scraper_key == scraper_key).one()
    scraper = get_scraper(scraper_key)
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
            scraper_key,
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
            scraper_key,
            existing_urls,
            limit,
            ignore_without_images=ignore_without_images,
            initial_error=f"Live discovery failed: {exc}",
        )


def _import_from_live(
    db: Session,
    source: Source,
    scraper: BaseScraper,
    scraper_key: str,
    discovered_urls: list[str],
    existing_urls: set[str],
    limit: int,
    ignore_without_images: bool,
) -> FetchMoreResult:
    mode_used = "live"
    if not discovered_urls:
        discovered_urls = _get_fallback_urls(scraper_key)
        if discovered_urls:
            mode_used = "seeded-live"

    unseen_urls = [url for url in discovered_urls if url not in existing_urls]
    selected_urls = random.sample(unseen_urls, k=min(limit, len(unseen_urls))) if unseen_urls else []
    imported = 0
    skipped_without_images = 0
    errors: list[str] = []

    print(
        f"FetchMore live import: mode={mode_used}, discovered={len(discovered_urls)}, "
        f"unseen={len(unseen_urls)}, selected={len(selected_urls)}"
    )

    for index, url in enumerate(selected_urls, start=1):
        print(f"FetchMore live import [{index}/{len(selected_urls)}]: {url}")
        try:
            record = scraper.parse_detail_page(url)
            if ignore_without_images and not _has_renderable_media(record.media):
                skipped_without_images += 1
                print(f"FetchMore live import skipped without images: {record.source_url}")
                continue
            upsert_scraped_car(db, source, record)
            imported += 1
            print(
                f"FetchMore live import saved {record.car.serial_number} "
                f"with {len(record.media)} media items"
            )
        except Exception as exc:  # pragma: no cover - operational path
            db.rollback()
            errors.append(f"{url}: {exc}")
            print(f"FetchMore live import error for {url}: {exc}")

    return FetchMoreResult(
        requested=limit,
        discovered=len(discovered_urls),
        imported=imported,
        skipped_existing=max(0, len(discovered_urls) - len(unseen_urls)),
        skipped_without_images=skipped_without_images,
        source_name=source.name,
        mode_used=mode_used,
        errors=errors,
    )


def _import_from_fixtures(
    db: Session,
    source: Source,
    scraper: BaseScraper,
    scraper_key: str,
    existing_urls: set[str],
    limit: int,
    ignore_without_images: bool,
    initial_error: str | None = None,
) -> FetchMoreResult:
    fixture_definitions = [
        definition
        for definition in load_source_fixture_definitions(scraper_key)
        if definition.fixture.fixture_type in scraper.manifest.supported_detail_fixture_types
    ]
    unseen_fixtures = [
        definition
        for definition in fixture_definitions
        if definition.fixture.source_url not in existing_urls
    ]
    selected_records = (
        random.sample(unseen_fixtures, k=min(limit, len(unseen_fixtures))) if unseen_fixtures else []
    )

    imported = 0
    skipped_without_images = 0
    errors = [initial_error] if initial_error else []

    for definition in selected_records:
        try:
            record = scraper.parse_record_fixture(definition.fixture)
            if ignore_without_images and not _has_renderable_media(record.media):
                skipped_without_images += 1
                continue
            upsert_scraped_car(db, source, record)
            imported += 1
        except Exception as exc:  # pragma: no cover - operational path
            db.rollback()
            errors.append(f"{definition.fixture.source_url}: {exc}")

    return FetchMoreResult(
        requested=limit,
        discovered=len(fixture_definitions),
        imported=imported,
        skipped_existing=max(0, len(fixture_definitions) - len(unseen_fixtures)),
        skipped_without_images=skipped_without_images,
        source_name=source.name,
        mode_used="fixtures",
        errors=errors,
    )


def _get_fallback_urls(scraper_key: str) -> list[str]:
    if scraper_key == "artcurial":
        return get_settings().artcurial_fallback_urls
    if scraper_key == "barchetta":
        return get_settings().barchetta_fallback_urls
    return []


def _has_renderable_media(media: list[dict[str, str | None]]) -> bool:
    for item in media:
        url = str(item.get("url") or "").lower()
        media_type = str(item.get("media_type") or "").lower()
        if media_type.startswith("image/") or any(ext in url for ext in RENDERABLE_EXTENSIONS):
            return True
    return False
