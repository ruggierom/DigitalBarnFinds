from __future__ import annotations

import os
import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = API_ROOT / "src"

os.environ.setdefault("DBF_DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("DBF_ADMIN_TOKEN", "lp112-test")

if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from digital_barn_finds.services.scrapers.base import FixtureInput, FixtureType  # noqa: E402
from digital_barn_finds.services.scrapers.lp112 import LP112Scraper  # noqa: E402


def test_lp112_discovery_dedupes_relative_detail_links() -> None:
    scraper = LP112Scraper()
    fixture = FixtureInput(
        fixture_type=FixtureType.SEARCH_RESULTS,
        source_key="lp112",
        source_url="https://www.lp112.com/Lamborghini/Results.asp?Model=Countach&Version=LP400",
        raw_html="""
        <html>
          <body>
            <a href="/Lamborghini/Detail.asp?Model=Countach&Version=LP400&ChassisNumber=1120001">#1120001</a>
            <a href="/Lamborghini/Detail.asp?Model=Countach&Version=LP400&ChassisNumber=1120001">#1120001</a>
            <a href="/Lamborghini/Detail.asp?Model=Countach&Version=LP400&ChassisNumber=1120106">#1120106</a>
          </body>
        </html>
        """,
    )

    assert scraper.parse_discovery_page(fixture) == [
        "https://www.lp112.com/Lamborghini/Detail.asp?Model=Countach&Version=LP400&ChassisNumber=1120001",
        "https://www.lp112.com/Lamborghini/Detail.asp?Model=Countach&Version=LP400&ChassisNumber=1120106",
    ]


def test_lp112_older_detail_extracts_variant_location_and_engine() -> None:
    scraper = LP112Scraper()
    record = scraper.parse_detail_html(
        """
        <html>
          <head>
            <title>Detail on 1975 Lamborghini Countach LP400 1120106</title>
          </head>
          <body>
            <p><font size="+3">1975 RHD Countach LP400</font></p>
            <p>Chassis Number 1120106 is this Arancio car with Beige Leather interior, currently believed to be residing in Hertfordshire, UK.</p>
            <p>It is fitted with engine number 1120106.</p>
            <p>Other Information: Supplied new in the UK and retained in right-hand-drive form.</p>
            <p>The data on this specific vehicle was last updated 11-Jul-2022.</p>
            <img src="https://www.lamborghinicarregister.com/images/cars/Countach/1120106a.jpg" />
          </body>
        </html>
        """,
        "https://www.lp112.com/Lamborghini/Detail.asp?Model=Countach&Version=LP400&ChassisNumber=1120106",
    )

    assert record.car.serial_number == "1120106"
    assert record.car.make == "Lamborghini"
    assert record.car.model == "Countach"
    assert record.car.variant == "LP400"
    assert record.car.drive_side == "RHD"
    assert record.car.original_color == "Arancio"
    assert record.car.attributes["interior_color"] == "Beige Leather"
    assert record.car.attributes["engine_number"] == "1120106"
    assert record.car.attributes["location_text"] == "Hertfordshire, UK"
    assert len(record.car_events) == 1
    assert record.car_events[0].payload["location"] == "Hertfordshire, UK"


def test_lp112_modern_detail_prefers_full_vehicle_id_from_query_param() -> None:
    scraper = LP112Scraper()
    record = scraper.parse_detail_html(
        """
        <html>
          <head>
            <title>Detail on 2021 Lamborghini Countach LPI800-4 ZHWEA9ZD7NLA10702</title>
            <meta property="og:description" content="LHD Bianco Sideris with Nero Ade &amp; Rosso Alala Leather interior" />
          </head>
          <body>
            <p><font size="+3">2021 LHD Countach LPI800-4</font></p>
            <p>Chassis Number NLA10702 is this Bianco Sideris car with Nero Ade &amp; Rosso Alala Leather interior, .</p>
            <p>Other Information: Press car shown at Monterey Car Week 2021.</p>
            <p>The data on this specific vehicle was last updated 16-Aug-2021.</p>
            <img src="https://www.lamborghinicarregister.com/images/cars/Countach/ZHWEA9ZD7NLA10702.jpg" />
          </body>
        </html>
        """,
        "https://www.lp112.com/Lamborghini/Detail.asp?Model=Countach&Version=LPI800-4&ChassisNumber=ZHWEA9ZD7NLA10702",
    )

    assert record.car.serial_number == "ZHWEA9ZD7NLA10702"
    assert record.car.variant == "LPI800-4"
    assert record.car.drive_side == "LHD"
    assert record.car.original_color == "Bianco Sideris"
    assert record.car.attributes["interior_color"] == "Nero Ade & Rosso Alala Leather"
    assert len(record.media) == 1
