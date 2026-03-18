from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import date
from io import StringIO
import uuid

from sqlalchemy import func
from sqlalchemy.orm import Session

from digital_barn_finds.models import ChassisSeed, VehicleModel


@dataclass(frozen=True, slots=True)
class ChassisSeedImportResult:
    requested: int
    imported: int
    updated_existing: int
    skipped_duplicates: int
    errors: list[str]


def parse_csv_rows(raw_text: str) -> list[dict[str, str]]:
    reader = csv.DictReader(StringIO(raw_text))
    rows: list[dict[str, str]] = []
    for row in reader:
        rows.append({str(key or "").strip(): str(value or "").strip() for key, value in row.items()})
    return rows


def import_chassis_seed_rows(db: Session, rows: list[dict[str, str]]) -> ChassisSeedImportResult:
    imported = 0
    updated_existing = 0
    skipped_duplicates = 0
    errors: list[str] = []
    existing_by_number = {
        seed.chassis_number: seed
        for seed in db.query(ChassisSeed).all()
    }
    seen_in_file: set[str] = set()

    for index, raw_row in enumerate(rows, start=2):
        row = {_normalize_key(key): value for key, value in raw_row.items()}
        chassis_number = _row_value(row, "chassis_number")
        if not chassis_number:
            errors.append(f"row {index}: missing chassis_number")
            continue

        if chassis_number in seen_in_file:
            skipped_duplicates += 1
            continue

        try:
            vehicle_model = _resolve_or_create_vehicle_model(db, row)
            existing_seed = existing_by_number.get(chassis_number)
            if existing_seed is not None:
                if _update_existing_seed_from_row(existing_seed, row, vehicle_model):
                    updated_existing += 1
                else:
                    skipped_duplicates += 1
                seen_in_file.add(chassis_number)
                continue

            seed = ChassisSeed(
                vehicle_model_id=vehicle_model.id if vehicle_model else _parse_uuid(_row_value(row, "vehicle_model_id")),
                chassis_number=chassis_number,
                engine_number=_row_value(row, "engine_number"),
                production_number=_row_value(row, "production_number"),
                color_ext=_row_value(row, "color_ext"),
                color_int=_row_value(row, "color_int"),
                delivery_date=_parse_date(_row_value(row, "delivery_date")),
                dealer=_row_value(row, "dealer"),
                destination_country=_row_value(row, "destination_country"),
                destination_region=_row_value(row, "destination_region"),
                us_spec=_parse_bool(_row_value(row, "us_spec"), default=False),
                split_sump=_parse_bool(_row_value(row, "split_sump"), default=False),
                ac_factory=_parse_bool(_row_value(row, "ac_factory"), default=False),
                last_known_location=_row_value(row, "last_known_location"),
                last_known_owner=_row_value(row, "last_known_owner"),
                dark_pct_est=_parse_int(_row_value(row, "dark_pct_est")),
                notes=_row_value(row, "notes"),
                seed_source=_row_value(row, "seed_source"),
                seed_date=_parse_date(_row_value(row, "seed_date")) or date.today(),
                confidence=_row_value(row, "confidence") or "probable",
                status=_row_value(row, "status") or "active",
                car_id=_parse_uuid(_row_value(row, "car_id")),
            )
            db.add(seed)
            seen_in_file.add(chassis_number)
            existing_by_number[chassis_number] = seed
            imported += 1
        except Exception as exc:
            errors.append(f"row {index}: {exc}")

    if imported or updated_existing:
        db.commit()
    else:
        db.rollback()

    return ChassisSeedImportResult(
        requested=len(rows),
        imported=imported,
        updated_existing=updated_existing,
        skipped_duplicates=skipped_duplicates,
        errors=errors,
    )


def _resolve_or_create_vehicle_model(db: Session, row: dict[str, str]) -> VehicleModel | None:
    explicit_id = _parse_uuid(_row_value(row, "vehicle_model_id"))
    if explicit_id is not None:
        return db.query(VehicleModel).filter(VehicleModel.id == explicit_id).one_or_none()

    make, model, variant = _normalize_vehicle_model_fields(
        _row_value(row, "make"),
        _row_value(row, "model"),
        _row_value(row, "variant"),
    )
    if not make or not model:
        return None

    query = db.query(VehicleModel).filter(
        VehicleModel.make.ilike(make),
        VehicleModel.model.ilike(model),
    )
    vehicle_model: VehicleModel | None
    if variant:
        vehicle_model = query.filter(VehicleModel.variant.ilike(variant)).one_or_none()
    else:
        vehicle_model = query.filter(VehicleModel.variant.is_(None)).one_or_none() or query.first()

    if vehicle_model is not None:
        return vehicle_model

    highest_order = db.query(func.max(VehicleModel.sort_order)).scalar()
    vehicle_model = VehicleModel(
        make=make,
        model=model,
        variant=variant,
        sort_order=(highest_order + 1) if highest_order is not None else 0,
        seed_source=_row_value(row, "seed_source") or "chassis-seed-import",
        in_scope=True,
        designated_by="chassis-seed-import",
        notes="Auto-created from chassis seed CSV import.",
    )
    db.add(vehicle_model)
    db.flush()
    return vehicle_model


def _normalize_key(value: str) -> str:
    return value.strip().lower().replace(" ", "_")


def _normalize_vehicle_model_fields(
    make: str | None,
    model: str | None,
    variant: str | None,
) -> tuple[str | None, str | None, str | None]:
    normalized_make = make.strip() if make else None
    normalized_model = model.strip() if model else None
    normalized_variant = variant.strip() if variant else None

    if not normalized_make or not normalized_model:
        return normalized_make, normalized_model, normalized_variant

    if normalized_make.startswith("Lamborghini "):
        series = normalized_make.removeprefix("Lamborghini ").strip()
        if series:
            return "Lamborghini", series, normalized_variant or normalized_model

    if normalized_make.startswith("Ferrari "):
        series = normalized_make.removeprefix("Ferrari ").strip()
        if series and series[0].isdigit():
            if normalized_model.startswith("Daytona "):
                return "Ferrari", series, normalized_variant or normalized_model
            return "Ferrari", f"{series} {normalized_model}".strip(), normalized_variant

    return normalized_make, normalized_model, normalized_variant


def _update_existing_seed_from_row(
    seed: ChassisSeed,
    row: dict[str, str],
    vehicle_model: VehicleModel | None,
) -> bool:
    changed = False

    if seed.vehicle_model_id is None and vehicle_model is not None:
        seed.vehicle_model_id = vehicle_model.id
        changed = True

    updates = {
        "engine_number": _row_value(row, "engine_number"),
        "production_number": _row_value(row, "production_number"),
        "color_ext": _row_value(row, "color_ext"),
        "color_int": _row_value(row, "color_int"),
        "delivery_date": _parse_date(_row_value(row, "delivery_date")),
        "dealer": _row_value(row, "dealer"),
        "destination_country": _row_value(row, "destination_country"),
        "destination_region": _row_value(row, "destination_region"),
        "last_known_location": _row_value(row, "last_known_location"),
        "last_known_owner": _row_value(row, "last_known_owner"),
        "dark_pct_est": _parse_int(_row_value(row, "dark_pct_est")),
        "notes": _row_value(row, "notes"),
        "seed_source": _row_value(row, "seed_source"),
        "seed_date": _parse_date(_row_value(row, "seed_date")),
        "confidence": _row_value(row, "confidence"),
        "status": _row_value(row, "status"),
        "car_id": _parse_uuid(_row_value(row, "car_id")),
    }

    for field_name, value in updates.items():
        current = getattr(seed, field_name)
        if current in {None, ""} and value not in {None, ""}:
            setattr(seed, field_name, value)
            changed = True

    for field_name in ("us_spec", "split_sump", "ac_factory"):
        value = _parse_bool(_row_value(row, field_name), default=False)
        if value and not getattr(seed, field_name):
            setattr(seed, field_name, True)
            changed = True

    return changed


def _row_value(row: dict[str, str], key: str) -> str | None:
    value = row.get(key)
    if value is None:
        return None
    trimmed = value.strip()
    return trimmed or None


def _parse_bool(value: str | None, *, default: bool) -> bool:
    if value is None:
        return default
    normalized = value.strip().lower()
    if normalized in {"1", "true", "yes", "y"}:
        return True
    if normalized in {"0", "false", "no", "n"}:
        return False
    return default


def _parse_int(value: str | None) -> int | None:
    if value is None:
        return None
    cleaned = value.replace(",", "").strip()
    return int(cleaned) if cleaned else None


def _parse_date(value: str | None) -> date | None:
    if value is None:
        return None
    return date.fromisoformat(value)


def _parse_uuid(value: str | None) -> uuid.UUID | None:
    if value is None:
        return None
    return uuid.UUID(value)
