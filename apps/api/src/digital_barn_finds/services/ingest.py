from __future__ import annotations

import html
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from digital_barn_finds.models import (
    Car,
    CarAttribute,
    CarEvent,
    CarMedia,
    CarSource,
    CustodyEvent,
    Source,
)
from digital_barn_finds.services.media_storage import persist_media_items
from digital_barn_finds.services.scrapers.base import NormalizedCar, ScrapedCarRecord


def normalize_serial(serial_number: str) -> str:
    return "".join(character for character in serial_number.lower() if character.isalnum())


def upsert_scraped_car(db: Session, source: Source, record: ScrapedCarRecord) -> Car:
    normalized_serial = normalize_serial(record.car.serial_number)
    now = datetime.now(UTC)
    car = db.query(Car).filter(Car.normalized_serial_number == normalized_serial).one_or_none()
    canonical_fields = _fit_car_fields(record.car)

    if car is None:
        car = Car(
            normalized_serial_number=normalized_serial,
            display_serial_number=canonical_fields["display_serial_number"],
            make=canonical_fields["make"],
            model=canonical_fields["model"],
            variant=canonical_fields["variant"],
            year_built=record.car.year_built,
            build_date=record.car.build_date,
            build_date_precision=record.car.build_date_precision,
            body_style=canonical_fields["body_style"],
            drive_side=canonical_fields["drive_side"],
            original_color=canonical_fields["original_color"],
            notes=canonical_fields["notes"],
        )
        db.add(car)
        db.flush()
    else:
        car.display_serial_number = canonical_fields["display_serial_number"]
        car.make = canonical_fields["make"]
        car.model = canonical_fields["model"]
        car.variant = canonical_fields["variant"]
        car.year_built = record.car.year_built
        car.build_date = record.car.build_date
        car.build_date_precision = record.car.build_date_precision
        car.body_style = canonical_fields["body_style"]
        car.drive_side = canonical_fields["drive_side"]
        car.original_color = canonical_fields["original_color"]
        car.notes = canonical_fields["notes"]

    source_record = (
        db.query(CarSource)
        .filter(CarSource.car_id == car.id, CarSource.source_id == source.id)
        .one_or_none()
    )
    if source_record is None:
        source_record = CarSource(
            car_id=car.id,
            source_id=source.id,
            source_url=record.source_url,
            source_serial_number=record.car.serial_number,
            scraped_at=now,
        )
        db.add(source_record)
        db.flush()

    source_record.source_url = record.source_url
    source_record.source_serial_number = canonical_fields["display_serial_number"]
    source_record.source_make = canonical_fields["make"]
    source_record.source_model = canonical_fields["model"]
    source_record.source_variant = canonical_fields["variant"]
    source_record.scraped_at = now
    car.source_count = db.query(CarSource).filter(CarSource.car_id == car.id).count()

    db.query(CarAttribute).filter(CarAttribute.car_source_id == source_record.id).delete()
    db.query(CustodyEvent).filter(CustodyEvent.car_source_id == source_record.id).delete()
    db.query(CarEvent).filter(CarEvent.car_source_id == source_record.id).delete()
    db.query(CarMedia).filter(CarMedia.car_source_id == source_record.id).delete()
    for key, value in record.car.attributes.items():
        db.add(CarAttribute(car_source_id=source_record.id, attr_key=key, attr_value=value))

    for custody_event in record.custody_events:
        db.add(
            CustodyEvent(
                car_id=car.id,
                car_source_id=source_record.id,
                event_date=custody_event.event_date,
                event_date_precision=custody_event.event_date_precision,
                event_year=custody_event.event_year,
                owner_name=_string_value(custody_event.payload.get("owner_name")),
                location=_string_value(custody_event.payload.get("location")),
                transaction_notes=_string_value(custody_event.payload.get("transaction_notes")),
                source_reference=_string_value(custody_event.source_reference),
            )
        )

    for event in record.car_events:
        db.add(
            CarEvent(
                car_id=car.id,
                car_source_id=source_record.id,
                event_date=event.event_date,
                event_date_precision=event.event_date_precision,
                event_year=event.event_year,
                event_name=_string_value(event.payload.get("event_name")),
                event_type=_string_value(event.payload.get("event_type")),
                driver=_string_value(event.payload.get("driver")),
                car_number=_string_value(event.payload.get("car_number")),
                result=_string_value(event.payload.get("result")),
                location=_string_value(event.payload.get("location")),
                source_reference=_string_value(event.source_reference),
            )
        )

    persisted_media = persist_media_items(
        record.media,
        source_key=source.scraper_key,
        serial_number=record.car.serial_number,
    )
    for media in persisted_media:
        if not media.get("url"):
            continue
        db.add(
            CarMedia(
                car_id=car.id,
                car_source_id=source_record.id,
                media_type=_string_value(media.get("media_type")) or "photo",
                url=str(media["url"]),
                caption=_string_value(media.get("caption")),
                scraped_at=now,
            )
        )

    source.last_scraped_at = now
    db.commit()
    db.refresh(car)
    return car


def _string_value(value: object) -> str | None:
    if value is None:
        return None
    text = html.unescape(str(value)).strip()
    return text or None


def _fit_car_fields(car: NormalizedCar) -> dict[str, str | None]:
    display_serial_number = _trim(car.serial_number, 80)
    make = _trim(car.make, 50)
    model = _string_value(car.model)
    variant = _string_value(car.variant)
    body_style = _string_value(car.body_style)
    drive_side = _trim(car.drive_side, 3)
    original_color = _string_value(car.original_color)
    notes = _string_value(car.notes)

    return {
        "display_serial_number": display_serial_number,
        "make": make,
        "model": model or "Unknown model",
        "variant": variant,
        "body_style": body_style,
        "drive_side": drive_side,
        "original_color": original_color,
        "notes": notes,
    }


def _trim(value: str | None, limit: int) -> str | None:
    if value is None:
        return None
    text = html.unescape(str(value)).strip()
    return text[:limit] if text else None
