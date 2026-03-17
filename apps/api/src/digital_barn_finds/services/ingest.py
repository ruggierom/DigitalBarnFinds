from __future__ import annotations

from dataclasses import dataclass
import html
import re
from datetime import UTC, date, datetime

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
from digital_barn_finds.services.darkness import compute_score_for_car
from digital_barn_finds.services.media_storage import persist_media_items
from digital_barn_finds.services.scrapers.auction_helpers import extract_drive_side, infer_body_style
from digital_barn_finds.services.scrapers.base import NormalizedCar, ScrapedCarRecord

SOURCE_PRIORITY = {
    "barchetta": 100,
    "aguttes": 70,
    "artcurial": 70,
    "bat": 70,
    "historics": 70,
    "iconic": 70,
    "mecum": 70,
    "osenat": 70,
    "gooding": 70,
    "rm_sothebys": 70,
    "current": 35,
}

DATE_PRECISION_RANK = {
    "unknown": 0,
    None: 0,
    "year": 1,
    "month": 2,
    "day": 3,
}

PLACEHOLDER_SERIAL_PATTERNS = (
    re.compile(r"^mecum-lot-\d+$", re.IGNORECASE),
    re.compile(r"^sale-\d+-lot-\d+$", re.IGNORECASE),
    re.compile(r"^osenat-sale-\d+-item-\d+$", re.IGNORECASE),
    re.compile(r".*-rec\d{3,}.*", re.IGNORECASE),
)

BOILERPLATE_NOTE_PATTERNS = (
    re.compile(r"^Parsed from .* page\.?$", re.IGNORECASE),
    re.compile(r"^Parsed from saved .* page\.?$", re.IGNORECASE),
)


@dataclass(frozen=True)
class SourceCanonicalCandidate:
    source_key: str
    display_serial_number: str | None = None
    make: str | None = None
    model: str | None = None
    variant: str | None = None
    year_built: int | None = None
    build_date: date | None = None
    build_date_precision: str | None = None
    body_style: str | None = None
    drive_side: str | None = None
    original_color: str | None = None
    notes: str | None = None


def normalize_serial(serial_number: str) -> str:
    return "".join(character for character in serial_number.lower() if character.isalnum())


def upsert_scraped_car(db: Session, source: Source, record: ScrapedCarRecord) -> Car:
    normalized_serial = normalize_serial(record.car.serial_number)
    now = datetime.now(UTC)
    source_fields = _fit_car_fields(record.car)

    source_record = (
        db.query(CarSource)
        .filter(CarSource.source_id == source.id, CarSource.source_url == record.source_url)
        .one_or_none()
    )
    car = source_record.car if source_record is not None else None
    if car is None:
        car = db.query(Car).filter(Car.normalized_serial_number == normalized_serial).one_or_none()

    if car is None:
        car = Car(
            normalized_serial_number=normalized_serial,
            display_serial_number=source_fields["display_serial_number"],
            make=source_fields["make"],
            model=source_fields["model"],
            variant=source_fields["variant"],
            year_built=record.car.year_built,
            build_date=record.car.build_date,
            build_date_precision=record.car.build_date_precision,
            body_style=source_fields["body_style"],
            drive_side=source_fields["drive_side"],
            original_color=source_fields["original_color"],
            notes=source_fields["notes"],
        )
        db.add(car)
        db.flush()

    if source_record is None:
        source_record = CarSource(
            car_id=car.id,
            source_id=source.id,
            source_url=record.source_url,
            source_serial_number=record.car.serial_number,
            scraped_at=now,
        )
        source_record.source = source
        db.add(source_record)
        db.flush()

    source_record.car_id = car.id
    source_record.source = source
    source_record.source_url = record.source_url
    source_record.source_serial_number = source_fields["display_serial_number"]
    source_record.source_make = source_fields["make"]
    source_record.source_model = source_fields["model"]
    source_record.source_variant = source_fields["variant"]
    source_record.source_payload = _build_source_payload(record.car, source_fields)
    source_record.scraped_at = now
    db.flush()

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

    db.flush()
    _recompute_canonical_car(db, car)
    car.source_count = db.query(CarSource).filter(CarSource.car_id == car.id).count()
    compute_score_for_car(db, car, commit=False)
    source.last_scraped_at = now
    db.commit()
    db.refresh(car)
    return car


def select_canonical_car_fields(
    *,
    existing_fields: dict[str, object] | None,
    candidates: list[SourceCanonicalCandidate],
) -> dict[str, object | None]:
    display_serial_number, normalized_serial_number = _select_best_identifier(
        candidates,
        fallback_display=_string_value((existing_fields or {}).get("display_serial_number")),
    )
    build_date, build_date_precision = _select_best_build_date(
        candidates,
        fallback_build_date=(existing_fields or {}).get("build_date"),
        fallback_precision=(existing_fields or {}).get("build_date_precision"),
    )

    selected = {
        "display_serial_number": display_serial_number or "unknown",
        "normalized_serial_number": normalized_serial_number or normalize_serial(display_serial_number or "unknown"),
        "make": _select_best_text_value(
            candidates,
            "make",
            fallback=_string_value((existing_fields or {}).get("make")) or "Unknown make",
        )
        or "Unknown make",
        "model": _select_best_text_value(
            candidates,
            "model",
            fallback=_string_value((existing_fields or {}).get("model")) or "Unknown model",
        )
        or "Unknown model",
        "variant": _select_best_text_value(
            candidates,
            "variant",
            fallback=_string_value((existing_fields or {}).get("variant")),
        ),
        "year_built": _select_best_year(
            candidates,
            build_date=build_date,
            fallback_year=(existing_fields or {}).get("year_built"),
        ),
        "build_date": build_date,
        "build_date_precision": build_date_precision,
        "body_style": _select_best_text_value(
            candidates,
            "body_style",
            fallback=_string_value((existing_fields or {}).get("body_style")),
        ),
        "drive_side": _select_best_text_value(
            candidates,
            "drive_side",
            fallback=_string_value((existing_fields or {}).get("drive_side")),
        ),
        "original_color": _select_best_text_value(
            candidates,
            "original_color",
            fallback=_string_value((existing_fields or {}).get("original_color")),
        ),
        "notes": _select_best_notes(
            candidates,
            fallback=_string_value((existing_fields or {}).get("notes")),
        ),
    }
    return selected


def _recompute_canonical_car(db: Session, car: Car) -> None:
    source_records = db.query(CarSource).filter(CarSource.car_id == car.id).all()
    source_candidates = [_candidate_from_source_record(source_record) for source_record in source_records]
    existing_candidate = SourceCanonicalCandidate(
        source_key="current",
        display_serial_number=car.display_serial_number,
        make=car.make,
        model=car.model,
        variant=car.variant,
        year_built=car.year_built,
        build_date=car.build_date,
        build_date_precision=car.build_date_precision,
        body_style=car.body_style,
        drive_side=car.drive_side,
        original_color=car.original_color,
        notes=car.notes,
    )
    selected = select_canonical_car_fields(
        existing_fields={
            "display_serial_number": car.display_serial_number,
            "make": car.make,
            "model": car.model,
            "variant": car.variant,
            "year_built": car.year_built,
            "build_date": car.build_date,
            "build_date_precision": car.build_date_precision,
            "body_style": car.body_style,
            "drive_side": car.drive_side,
            "original_color": car.original_color,
            "notes": car.notes,
        },
        candidates=[existing_candidate, *source_candidates],
    )

    next_normalized = str(selected["normalized_serial_number"])
    if next_normalized and next_normalized != car.normalized_serial_number:
        duplicate = (
            db.query(Car)
            .filter(Car.normalized_serial_number == next_normalized, Car.id != car.id)
            .one_or_none()
        )
        if duplicate is None:
            car.normalized_serial_number = next_normalized
            car.display_serial_number = str(selected["display_serial_number"])

    car.make = str(selected["make"])
    car.model = str(selected["model"])
    car.variant = _string_value(selected["variant"])
    car.year_built = _int_value(selected["year_built"])
    car.build_date = _date_value(selected["build_date"])
    car.build_date_precision = _string_value(selected["build_date_precision"])
    car.body_style = _string_value(selected["body_style"])
    car.drive_side = _trim(_string_value(selected["drive_side"]), 3)
    car.original_color = _string_value(selected["original_color"])
    car.notes = _string_value(selected["notes"])


def recompute_all_canonical_cars(db: Session, *, limit: int | None = None) -> int:
    query = db.query(Car).order_by(Car.updated_at.desc())
    if limit is not None:
        query = query.limit(limit)

    cars = query.all()
    for car in cars:
        _recompute_canonical_car(db, car)
        car.source_count = db.query(CarSource).filter(CarSource.car_id == car.id).count()
        compute_score_for_car(db, car, commit=False)

    db.commit()
    return len(cars)


def _candidate_from_source_record(source_record: CarSource) -> SourceCanonicalCandidate:
    payload = source_record.source_payload or {}
    attributes = _source_attribute_map(source_record)
    source_heading = _string_value(attributes.get("source_heading"))
    highlights = _string_value(attributes.get("highlights"))
    coachwork = _string_value(attributes.get("coachwork"))
    notes = _string_value(payload.get("notes")) or highlights
    model = _string_value(payload.get("model")) or _string_value(source_record.source_model)
    variant = _string_value(payload.get("variant")) or _string_value(source_record.source_variant)
    descriptor_text = " ".join(part for part in [model, variant, source_heading, notes, highlights] if part)
    body_style = _string_value(payload.get("body_style")) or infer_body_style(
        model,
        variant,
        source_heading,
        coachwork,
        notes,
    )
    drive_side = _trim(payload.get("drive_side"), 3) or extract_drive_side(descriptor_text)
    original_color = (
        _string_value(payload.get("original_color"))
        or _string_value(attributes.get("exterior_color"))
        or _extract_color_from_notes(descriptor_text)
    )

    return SourceCanonicalCandidate(
        source_key=(source_record.source.scraper_key if source_record.source else "unknown"),
        display_serial_number=_trim(payload.get("display_serial_number"), 80)
        or _trim(source_record.source_serial_number, 80),
        make=_trim(payload.get("make"), 50) or _trim(source_record.source_make, 50),
        model=model,
        variant=variant,
        year_built=_int_value(payload.get("year_built")),
        build_date=_parse_payload_date(payload.get("build_date")),
        build_date_precision=_string_value(payload.get("build_date_precision")),
        body_style=body_style,
        drive_side=drive_side,
        original_color=original_color,
        notes=notes,
    )


def _build_source_payload(
    car: NormalizedCar,
    canonical_fields: dict[str, str | None],
) -> dict[str, str | int | None]:
    return {
        "display_serial_number": canonical_fields["display_serial_number"],
        "make": canonical_fields["make"],
        "model": canonical_fields["model"],
        "variant": canonical_fields["variant"],
        "year_built": car.year_built,
        "build_date": car.build_date.isoformat() if car.build_date else None,
        "build_date_precision": _string_value(car.build_date_precision),
        "body_style": canonical_fields["body_style"],
        "drive_side": canonical_fields["drive_side"],
        "original_color": canonical_fields["original_color"],
        "notes": canonical_fields["notes"],
    }


def _select_best_identifier(
    candidates: list[SourceCanonicalCandidate],
    *,
    fallback_display: str | None,
) -> tuple[str | None, str | None]:
    best_by_key: dict[str, tuple[float, str]] = {}
    for candidate in candidates:
        value = _trim(candidate.display_serial_number, 80)
        if not value:
            continue
        normalized = normalize_serial(value)
        if not normalized:
            continue
        score = _identifier_score(candidate.source_key, value)
        current = best_by_key.get(normalized)
        if current is None or score > current[0] or (score == current[0] and len(value) > len(current[1])):
            best_by_key[normalized] = (score, value)

    if best_by_key:
        normalized, (_, display_serial_number) = max(
            best_by_key.items(),
            key=lambda item: (item[1][0], len(item[1][1])),
        )
        return display_serial_number, normalized

    if fallback_display:
        return fallback_display, normalize_serial(fallback_display)
    return None, None


def _select_best_build_date(
    candidates: list[SourceCanonicalCandidate],
    *,
    fallback_build_date: object | None,
    fallback_precision: object | None,
) -> tuple[date | None, str | None]:
    best_by_key: dict[str, tuple[float, date, str | None]] = {}
    for candidate in candidates:
        if candidate.build_date is None:
            continue
        precision = _string_value(candidate.build_date_precision)
        score = _source_priority(candidate.source_key) + 20 + DATE_PRECISION_RANK.get(precision, 0) * 10
        key = candidate.build_date.isoformat()
        current = best_by_key.get(key)
        if current is None or score > current[0]:
            best_by_key[key] = (score, candidate.build_date, precision)

    if best_by_key:
        _, selected_date, selected_precision = max(
            best_by_key.values(),
            key=lambda item: (item[0], DATE_PRECISION_RANK.get(item[2], 0)),
        )
        return selected_date, selected_precision

    return _date_value(fallback_build_date), _string_value(fallback_precision)


def _select_best_year(
    candidates: list[SourceCanonicalCandidate],
    *,
    build_date: date | None,
    fallback_year: object | None,
) -> int | None:
    if build_date is not None:
        return build_date.year

    scores: dict[int, float] = {}
    for candidate in candidates:
        if candidate.year_built is None:
            continue
        scores[candidate.year_built] = scores.get(candidate.year_built, 0) + _source_priority(candidate.source_key) + 10

    if scores:
        return max(scores.items(), key=lambda item: item[1])[0]
    return _int_value(fallback_year)


def _select_best_text_value(
    candidates: list[SourceCanonicalCandidate],
    field_name: str,
    *,
    fallback: str | None,
) -> str | None:
    scores: dict[str, float] = {}
    display_values: dict[str, str] = {}

    for candidate in candidates:
        raw_value = getattr(candidate, field_name)
        value = _normalize_candidate_text(field_name, raw_value)
        if not value:
            continue
        key = _normalize_match_key(field_name, value)
        scores[key] = scores.get(key, 0) + _field_score(candidate.source_key, field_name, value)
        current_display = display_values.get(key)
        if current_display is None or len(value) > len(current_display):
            display_values[key] = value

    if scores:
        best_key = max(scores.items(), key=lambda item: (item[1], len(display_values[item[0]])))[0]
        return display_values[best_key]

    return _normalize_candidate_text(field_name, fallback)


def _select_best_notes(
    candidates: list[SourceCanonicalCandidate],
    *,
    fallback: str | None,
) -> str | None:
    best: tuple[float, str] | None = None
    for candidate in candidates:
        value = _string_value(candidate.notes)
        if not value or _is_boilerplate_note(value):
            continue
        score = _source_priority(candidate.source_key) + min(len(value), 800) / 6
        if ". " in value or "; " in value:
            score += 10
        if best is None or score > best[0]:
            best = (score, value)

    if best is not None:
        return best[1]
    return None if _is_boilerplate_note(fallback or "") else _string_value(fallback)


def _normalize_candidate_text(field_name: str, value: object) -> str | None:
    text = _string_value(value)
    if not text:
        return None
    if field_name in {"make", "model"} and text.lower().startswith("unknown "):
        return None
    if field_name == "drive_side":
        return text.upper() if text.upper() in {"LHD", "RHD"} else None
    if field_name == "original_color" and _looks_like_sentence(text):
        return None
    if field_name == "notes" and _is_boilerplate_note(text):
        return None
    return text


def _normalize_match_key(field_name: str, value: str) -> str:
    key = " ".join(value.lower().split())
    if field_name == "drive_side":
        return value.upper()
    return key


def _field_score(source_key: str, field_name: str, value: str) -> float:
    score = float(_source_priority(source_key))
    if field_name in {"make", "model", "variant", "body_style"}:
        score += min(len(value), 60) / 3
    if field_name == "drive_side":
        score += 25
    if field_name == "original_color":
        score += 20 if not _looks_like_sentence(value) else -40
    return score


def _identifier_score(source_key: str, value: str) -> float:
    normalized = normalize_serial(value)
    score = float(_source_priority(source_key))
    if _is_placeholder_serial(value):
        score -= 120
    else:
        score += 40

    if re.fullmatch(r"[A-HJ-NPR-Z0-9]{17}", normalized.upper()):
        score += 80
    elif 11 <= len(normalized) <= 16:
        score += 35
    elif 6 <= len(normalized) <= 10:
        score += 20
    elif len(normalized) >= 4:
        score += 10

    if any(character.isalpha() for character in normalized) and any(character.isdigit() for character in normalized):
        score += 20
    return score


def _is_placeholder_serial(value: str) -> bool:
    return any(pattern.match(value.strip()) for pattern in PLACEHOLDER_SERIAL_PATTERNS)


def _is_boilerplate_note(value: str) -> bool:
    return any(pattern.match(value.strip()) for pattern in BOILERPLATE_NOTE_PATTERNS)


def _looks_like_sentence(value: str) -> bool:
    words = value.split()
    return len(words) > 6 or value.endswith(".")


def _source_priority(source_key: str) -> int:
    return SOURCE_PRIORITY.get(source_key, 50)


def _parse_payload_date(value: object) -> date | None:
    if value is None:
        return None
    if isinstance(value, date):
        return value
    text = _string_value(value)
    if not text:
        return None
    try:
        return date.fromisoformat(text)
    except ValueError:
        return None


def _date_value(value: object) -> date | None:
    if value is None or isinstance(value, date):
        return value
    return _parse_payload_date(value)


def _int_value(value: object) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _string_value(value: object) -> str | None:
    if value is None:
        return None
    text = html.unescape(str(value)).strip()
    return text or None


def _source_attribute_map(source_record: CarSource) -> dict[str, str]:
    attributes: dict[str, str] = {}
    for attribute in source_record.attributes:
        if attribute.attr_key not in attributes and attribute.attr_value:
            attributes[attribute.attr_key] = attribute.attr_value
    return attributes


def _extract_color_from_notes(notes: str | None) -> str | None:
    if not notes:
        return None

    patterns = (
        re.compile(r"finished in (?:bespoke )?(?P<color>[A-Z][A-Za-zÀ-ÿ' -]{2,40}?)(?: with| over|,|;|\.|$)", re.IGNORECASE),
        re.compile(r"presented in (?:as-delivered )?(?P<color>[A-Z][A-Za-zÀ-ÿ' -]{2,40}?)(?: with| over|,|;|\.|$)", re.IGNORECASE),
        re.compile(r"painted (?P<color>[A-Z][A-Za-zÀ-ÿ' -]{2,40}?)(?: with| over|,|;|\.|$)", re.IGNORECASE),
        re.compile(r"colour \"(?P<color>[A-Za-zÀ-ÿ' -]{2,40})\"", re.IGNORECASE),
        re.compile(r"color \"(?P<color>[A-Za-zÀ-ÿ' -]{2,40})\"", re.IGNORECASE),
        re.compile(r"as-delivered (?P<color>[A-Z][A-Za-zÀ-ÿ' -]{2,40}?) over", re.IGNORECASE),
    )

    for pattern in patterns:
        match = pattern.search(notes)
        if not match:
            continue
        value = _string_value(match.group("color"))
        if value and not _looks_like_sentence(value):
            return value
    return None


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


def _trim(value: object | None, limit: int) -> str | None:
    if value is None:
        return None
    text = html.unescape(str(value)).strip()
    return text[:limit] if text else None
