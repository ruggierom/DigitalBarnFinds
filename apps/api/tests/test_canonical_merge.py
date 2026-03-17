from __future__ import annotations

import os
import sys
from datetime import date
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = API_ROOT / "src"

os.environ.setdefault("DBF_DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("DBF_ADMIN_TOKEN", "canonical-merge-test")

if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from digital_barn_finds.services.ingest import (  # noqa: E402
    SourceCanonicalCandidate,
    select_canonical_car_fields,
)


def test_select_canonical_car_fields_prefers_real_serial_and_richer_fields() -> None:
    selected = select_canonical_car_fields(
        existing_fields={
            "display_serial_number": "mecum-lot-1127243",
            "make": "Ferrari",
            "model": "360 Spider",
            "variant": None,
            "year_built": 2002,
            "build_date": None,
            "build_date_precision": None,
            "body_style": None,
            "drive_side": None,
            "original_color": None,
            "notes": "Parsed from Mecum auction lot page.",
        },
        candidates=[
            SourceCanonicalCandidate(
                source_key="mecum",
                display_serial_number="mecum-lot-1127243",
                make="Ferrari",
                model="360 Spider",
                year_built=2002,
                original_color="Argento Nurburgring",
                notes="Parsed from Mecum auction lot page.",
            ),
            SourceCanonicalCandidate(
                source_key="barchetta",
                display_serial_number="ZFFYT53A620127086",
                make="Ferrari",
                model="360 Spider",
                year_built=2002,
                body_style="Spider",
                drive_side="LHD",
                notes="Factory-correct US-market example with documented early ownership.",
            ),
        ],
    )

    assert selected["display_serial_number"] == "ZFFYT53A620127086"
    assert selected["normalized_serial_number"] == "zffyt53a620127086"
    assert selected["body_style"] == "Spider"
    assert selected["drive_side"] == "LHD"
    assert selected["original_color"] == "Argento Nurburgring"
    assert selected["notes"] == "Factory-correct US-market example with documented early ownership."


def test_select_canonical_car_fields_prefers_precise_build_date_and_non_boilerplate_notes() -> None:
    selected = select_canonical_car_fields(
        existing_fields={
            "display_serial_number": "0465GT",
            "make": "Ferrari",
            "model": "250 GT PF Coupe Speciale",
            "variant": None,
            "year_built": 1957,
            "build_date": None,
            "build_date_precision": None,
            "body_style": None,
            "drive_side": "LHD",
            "original_color": None,
            "notes": "Parsed from saved Barchetta detail page.",
        },
        candidates=[
            SourceCanonicalCandidate(
                source_key="barchetta",
                display_serial_number="0465GT",
                make="Ferrari",
                model="250 GT PF Coupe Speciale",
                year_built=1957,
                drive_side="LHD",
                notes="Parsed from saved Barchetta detail page.",
            ),
            SourceCanonicalCandidate(
                source_key="artcurial",
                display_serial_number="0465 GT",
                make="Ferrari",
                model="250 GT PF Coupe Speciale",
                year_built=1957,
                build_date=date(1957, 4, 1),
                build_date_precision="day",
                body_style="Coupe",
                notes="Shown at the Turin Motor Show before disappearing from public view for decades.",
            ),
        ],
    )

    assert selected["display_serial_number"] == "0465GT"
    assert selected["year_built"] == 1957
    assert selected["build_date"] == date(1957, 4, 1)
    assert selected["build_date_precision"] == "day"
    assert selected["body_style"] == "Coupe"
    assert selected["notes"] == "Shown at the Turin Motor Show before disappearing from public view for decades."
