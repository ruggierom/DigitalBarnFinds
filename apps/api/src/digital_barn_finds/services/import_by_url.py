from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urlparse
from uuid import UUID

from sqlalchemy.orm import Session

from digital_barn_finds.models import CarSource, Source
from digital_barn_finds.services.ingest import upsert_scraped_car
from digital_barn_finds.services.scrapers.registry import detect_scraper_key_for_url, get_scraper


@dataclass(slots=True)
class ImportByUrlResult:
    scraper_key: str
    source_name: str
    source_url: str
    car_id: UUID
    serial_number: str
    make: str
    model: str
    source_count: int
    media_count: int
    already_known_url: bool


def import_car_from_url(db: Session, url: str) -> ImportByUrlResult:
    normalized_url = url.strip()
    if not normalized_url:
        raise ValueError("URL is required.")

    scraper_key = detect_scraper_key_for_url(normalized_url)
    if scraper_key is None:
        raise ValueError(_unsupported_site_message(normalized_url))

    source = db.query(Source).filter(Source.scraper_key == scraper_key).one_or_none()
    if source is None:
        raise ValueError(f"No seeded source found for scraper_key={scraper_key!r}.")

    already_known_url = (
        db.query(CarSource.id)
        .filter(CarSource.source_id == source.id, CarSource.source_url == normalized_url)
        .one_or_none()
        is not None
    )

    scraper = get_scraper(scraper_key)
    record = scraper.parse_detail_page(normalized_url)
    car = upsert_scraped_car(db, source, record)

    return ImportByUrlResult(
        scraper_key=scraper_key,
        source_name=source.name,
        source_url=record.source_url,
        car_id=car.id,
        serial_number=car.display_serial_number,
        make=car.make,
        model=car.model,
        source_count=car.source_count,
        media_count=len(car.media_items),
        already_known_url=already_known_url,
    )


def _unsupported_site_message(url: str) -> str:
    hostname = (urlparse(url).hostname or "").lower().removeprefix("www.")
    if hostname:
        return (
            f"We don't support {hostname} yet. We'll consider adding support for that site."
        )
    return "We don't support that site yet. We'll consider adding support for it."
