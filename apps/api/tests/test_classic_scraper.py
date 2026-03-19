from __future__ import annotations

import os
import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = API_ROOT / "src"

os.environ.setdefault("DBF_DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("DBF_ADMIN_TOKEN", "classic-test")

if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from digital_barn_finds.services.scrapers.base import FixtureInput, FixtureType  # noqa: E402
from digital_barn_finds.services.scrapers.classic import ClassicComScraper  # noqa: E402


def test_classic_discovery_extracts_unique_vehicle_links() -> None:
    scraper = ClassicComScraper()
    fixture = FixtureInput(
        fixture_type=FixtureType.SEARCH_RESULTS,
        source_key="classic",
        source_url="https://www.classic.com/search?q=ferrari+dino",
        raw_html="""
        <html>
          <body>
            <a href="/veh/1972-ferrari-dino-246-gts-4250-4VA2vDp">First</a>
            <a href="/veh/1972-ferrari-dino-246-gts-4250-4VA2vDp">Duplicate</a>
            <a href="/veh/1973-ferrari-dino-246-gts-06210-4RDaNVn/">Second</a>
            <a href="/m/ferrari/dino/246-gts/">Market</a>
          </body>
        </html>
        """,
    )

    assert scraper.parse_discovery_page(fixture) == [
        "https://www.classic.com/veh/1972-ferrari-dino-246-gts-4250-4VA2vDp",
        "https://www.classic.com/veh/1973-ferrari-dino-246-gts-06210-4RDaNVn/",
    ]


def test_classic_detail_extracts_vin_specs_and_listing_event() -> None:
    scraper = ClassicComScraper()
    record = scraper.parse_detail_html(
        """
        <html>
          <head>
            <title>1972 Ferrari Dino 246 GTS VIN: 4250 - CLASSIC.COM</title>
            <meta property="og:image" content="https://images.classic.com/vehicles/hero.jpeg?w=1200&amp;h=676&amp;fit=crop" />
          </head>
          <body>
            <div class="flex flex-col w-full">
              <div class="flex flex-col md:flex-row justify-between">
                <div class="flex flex-col justify-start items-start gap-x-8 gap-y-1 w-auto">
                  <h1 class="text-2xl md:text-3xl font-bold">1972 Ferrari Dino 246 GTS</h1>
                  <div>VIN: 4250</div>
                  <div>visibility</div>
                  <div>167</div>
                  <div>View count is the number of times the vehicle detail page has been opened in the past thirty days.</div>
                  <div>bookmark_border</div>
                  <div>Save</div>
                </div>
                <div>
                  <div>For Sale</div>
                  <div class="text-xl font-medium text-black">$488,991</div>
                  <div>by</div>
                  <a href="/dealer/spady-auto-group">Spady Auto Group</a>
                  <div>verified</div>
                  <div>Verified Seller</div>
                  <div>Mar 19, 2026</div>
                  <div>Contact Seller</div>
                </div>
              </div>
              <div class="flex flex-col md:flex-row gap-3 md:gap-4 bg-white border shadow md:bg-black md:border-0 md:shadow-none p-3 md:px-6 rounded md:items-center">
                <div>Scottsdale, Arizona, USA</div>
                <div>24,668 mi</div>
                <div>Manual</div>
                <div>LHD</div>
                <div>Original &amp; Highly Original</div>
                <div>30 Comps</div>
              </div>
            </div>

            <div class="flex flex-col gap-8 my-8">
              <div>
                <div class="mb-4">
                  <h2 class="font-medium text-xl">Specs</h2>
                  <p>Details about this vehicle - curated by our market specialists.</p>
                </div>
                <div>
                  <div>Year</div><div>1972</div>
                  <div>Make</div><div>Ferrari</div>
                  <div>Model Family</div><div>Dino 246</div>
                  <div>Model Generation</div><div>E-Series</div>
                  <div>Model Variant</div><div>GTS</div>
                  <div>Model Trim</div><div>-</div>
                  <div>Engine</div><div>2.4L V6 (Tipo 135CS)</div>
                  <div>Transmission</div><div>Manual</div>
                  <div>Drive Type</div><div>Rear Wheel Drive (RWD)</div>
                  <div>Originality</div><div>Original &amp; Highly Original</div>
                  <div>Mileage</div><div>24,668 mi</div>
                  <div>VIN</div><div>4250</div>
                  <div>Vehicle Type</div><div>Automobile</div>
                  <div>Body Style</div><div>Coupe</div>
                  <div>Doors</div><div>2 Doors</div>
                  <div>Driver Side</div><div>Left Hand Drive</div>
                  <div>Ext. Color Group</div><div>Red</div>
                  <div>Int. Color Group</div><div>Beige/Tan</div>
                  <div>SEE SPECS</div>
                  <div>See an error? Report it here</div>
                </div>
              </div>
            </div>

            <img src="https://images.classic.com/vehicles/hero.jpeg?w=1200&amp;h=676&amp;fit=crop" />
            <img src="https://images.classic.com/vehicles/thumb-1.jpeg?ar=3:2&amp;w=300&amp;fit=crop" />
            <img src="https://images.classic.com/vehicles/thumb-2.jpeg?ar=3:2&amp;w=300&amp;fit=crop" />
            <img src="https://images.classic.com/uploads/dealer/Spady_Auto_Group.png" alt="Spady Auto Group" />
          </body>
        </html>
        """,
        "https://www.classic.com/veh/1972-ferrari-dino-246-gts-4250-4VA2vDp",
    )

    assert record.car.serial_number == "4250"
    assert record.car.make == "Ferrari"
    assert record.car.model == "Dino 246"
    assert record.car.variant == "GTS"
    assert record.car.year_built == 1972
    assert record.car.body_style == "Coupe"
    assert record.car.drive_side == "LHD"
    assert record.car.original_color == "Red"
    assert record.car.attributes["seller"] == "Spady Auto Group"
    assert record.car.attributes["listing_status"] == "For Sale"
    assert record.car.attributes["location_text"] == "Scottsdale, Arizona, USA"
    assert record.car.attributes["interior_color"] == "Beige/Tan"
    assert len(record.car_events) == 1
    assert record.car_events[0].payload["event_type"] == "listing_for_sale"
    assert record.car_events[0].payload["result"] == "For Sale $488,991"
    assert len(record.media) == 3
