from __future__ import annotations

import os
import sys
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

API_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = API_ROOT / "src"

os.environ.setdefault("DBF_DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("DBF_ADMIN_TOKEN", "scope-test")

if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from digital_barn_finds.database import Base  # noqa: E402
from digital_barn_finds.models import ChassisSeed, VehicleModel  # noqa: E402
from digital_barn_finds.services.chassis_seed_import import import_chassis_seed_rows  # noqa: E402
from digital_barn_finds.services.scope import evaluate_scope  # noqa: E402
from digital_barn_finds.services.scrapers.base import NormalizedCar  # noqa: E402


def _make_session():
    engine = create_engine("sqlite+pysqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    return Session()


def test_scope_allows_when_no_vehicle_models_are_configured() -> None:
    db = _make_session()
    try:
        decision = evaluate_scope(
            db,
            NormalizedCar(serial_number="5010", make="Ferrari", model="275 GTB"),
        )
        assert decision.is_in_scope is True
        assert decision.reason == "no_scope_models_configured"
    finally:
        db.close()


def test_scope_rejects_out_of_scope_make_and_model() -> None:
    db = _make_session()
    try:
        db.add(VehicleModel(make="Ferrari", model="275 GTB", in_scope=True, tier="A"))
        db.commit()

        decision = evaluate_scope(
            db,
            NormalizedCar(serial_number="jt2st205", make="Toyota", model="Celica GT-Four"),
        )
        assert decision.is_in_scope is False
        assert decision.reason == "out_of_scope:Toyota Celica GT-Four"
    finally:
        db.close()


def test_import_chassis_seed_rows_imports_once_and_skips_duplicates() -> None:
    db = _make_session()
    try:
        vehicle_model = VehicleModel(make="Ferrari", model="275 GTB", in_scope=True, tier="A")
        db.add(vehicle_model)
        db.commit()
        db.refresh(vehicle_model)

        result = import_chassis_seed_rows(
            db,
            [
                {
                    "vehicle_model_id": str(vehicle_model.id),
                    "chassis_number": "5010",
                    "confidence": "confirmed",
                    "status": "active",
                },
                {
                    "vehicle_model_id": str(vehicle_model.id),
                    "chassis_number": "5010",
                    "confidence": "confirmed",
                    "status": "active",
                },
            ],
        )

        assert result.requested == 2
        assert result.imported == 1
        assert result.skipped_duplicates == 1
        assert result.errors == []
    finally:
        db.close()


def test_import_chassis_seed_rows_auto_creates_vehicle_model_when_missing() -> None:
    db = _make_session()
    try:
        result = import_chassis_seed_rows(
            db,
            [
                {
                    "make": "Lamborghini Miura",
                    "model": "P400 SV",
                    "chassis_number": "09001",
                    "seed_source": "spreadsheet",
                    "status": "active",
                }
            ],
        )

        assert result.requested == 1
        assert result.imported == 1
        assert result.skipped_duplicates == 0
        assert result.errors == []

        vehicle_model = db.query(VehicleModel).one()
        assert vehicle_model.make == "Lamborghini"
        assert vehicle_model.model == "Miura"
        assert vehicle_model.variant == "P400 SV"
        assert vehicle_model.in_scope is True
        assert vehicle_model.designated_by == "chassis-seed-import"
        assert vehicle_model.seed_source == "spreadsheet"

        seed = db.query(ChassisSeed).one()
        assert seed.chassis_number == "09001"
        assert seed.vehicle_model_id == vehicle_model.id
    finally:
        db.close()


def test_import_chassis_seed_rows_updates_existing_unassigned_duplicate() -> None:
    db = _make_session()
    try:
        seed = ChassisSeed(
            chassis_number="09002",
            confidence="probable",
            status="active",
        )
        db.add(seed)
        db.commit()

        result = import_chassis_seed_rows(
            db,
            [
                {
                    "make": "Ferrari",
                    "model": "275 GTB",
                    "chassis_number": "09002",
                    "last_known_location": "Modena, Italy",
                    "seed_source": "spreadsheet",
                }
            ],
        )

        assert result.requested == 1
        assert result.imported == 0
        assert result.updated_existing == 1
        assert result.skipped_duplicates == 0
        assert result.errors == []

        vehicle_model = db.query(VehicleModel).one()
        refreshed_seed = db.query(ChassisSeed).filter(ChassisSeed.chassis_number == "09002").one()
        assert refreshed_seed.vehicle_model_id == vehicle_model.id
        assert refreshed_seed.last_known_location == "Modena, Italy"
        assert refreshed_seed.seed_source == "spreadsheet"
    finally:
        db.close()


def test_import_chassis_seed_rows_normalizes_ferrari_series_models() -> None:
    db = _make_session()
    try:
        result = import_chassis_seed_rows(
            db,
            [
                {
                    "make": "Ferrari 365 GTB/4",
                    "model": "Daytona Berlinetta",
                    "chassis_number": "09003",
                    "seed_source": "spreadsheet",
                }
            ],
        )

        assert result.imported == 1
        vehicle_model = db.query(VehicleModel).one()
        assert vehicle_model.make == "Ferrari"
        assert vehicle_model.model == "365 GTB/4"
        assert vehicle_model.variant == "Daytona Berlinetta"
    finally:
        db.close()
