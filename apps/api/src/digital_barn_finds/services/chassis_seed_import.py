from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import date
from io import StringIO
import uuid

from sqlalchemy.orm import Session

from digital_barn_finds.models import ChassisSeed, VehicleModel


@dataclass(frozen=True, slots=True)
class ChassisSeedImportResult:
    requested: int
    imported: int
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
    skipped_duplicates = 0
    errors: list[str] = []
    existing_numbers = {
        row[0]
        for row in db.query(ChassisSeed.chassis_number).all()
    }
    seen_in_file: set[str] = set()

    for index, raw_row in enumerate(rows, start=2):
        row = {_normalize_key(key): value for key, value in raw_row.items()}
        chassis_number = _row_value(row, "chassis_number")
        if not chassis_number:
            errors.append(f"row {index}: missing chassis_number")
            continue

        if chassis_number in existing_numbers or chassis_number in seen_in_file:
            skipped_duplicates += 1
            continue

        try:
            vehicle_model = _resolve_vehicle_model(db, row)
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
            imported += 1
        except Exception as exc:
            errors.append(f"row {index}: {exc}")

    if imported:
        db.commit()
    else:
        db.rollback()

    return ChassisSeedImportResult(
        requested=len(rows),
        imported=imported,
        skipped_duplicates=skipped_duplicates,
        errors=errors,
    )


def _resolve_vehicle_model(db: Session, row: dict[str, str]) -> VehicleModel | None:
    explicit_id = _parse_uuid(_row_value(row, "vehicle_model_id"))
    if explicit_id is not None:
        return db.query(VehicleModel).filter(VehicleModel.id == explicit_id).one_or_none()

    make = _row_value(row, "make")
    model = _row_value(row, "model")
    variant = _row_value(row, "variant")
    if not make or not model:
        return None

    query = db.query(VehicleModel).filter(
        VehicleModel.make.ilike(make),
        VehicleModel.model.ilike(model),
    )
    if variant:
        return query.filter(VehicleModel.variant.ilike(variant)).one_or_none()
    return query.filter(VehicleModel.variant.is_(None)).one_or_none() or query.first()


def _normalize_key(value: str) -> str:
    return value.strip().lower().replace(" ", "_")


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
