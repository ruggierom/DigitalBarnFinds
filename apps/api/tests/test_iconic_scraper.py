from __future__ import annotations

import os
import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = API_ROOT / "src"

os.environ.setdefault("DBF_DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("DBF_ADMIN_TOKEN", "iconic-test")

if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from digital_barn_finds.services.scrapers.iconic import IconicScraper  # noqa: E402


def test_iconic_parser_prefers_gallery_images_over_icons() -> None:
    html = """
    <!DOCTYPE html>
    <html>
      <body>
        <h1>1976 Daimler Double-Six VDP</h1>
        <div>Lot Number: 271</div>
        <div>Sold For: £11,250</div>
        <div>Chassis Number: 2K12345BW</div>
        <div class="image-gallery">
          <img
            src="https://am-s3-bucket-assets.s3.eu-west-2.amazonaws.com/silverstone/prod/lot_images/large/REC15126-5/REC15126-5_5.jpg.webp?dummy=1773725803"
            data-src="https://am-s3-bucket-assets.s3.eu-west-2.amazonaws.com/silverstone/prod/lot_images/xlarge/REC15126-5/REC15126-5_5.jpg.webp"
            data-fancybox="gallery_all"
          />
          <img
            src="https://am-s3-bucket-assets.s3.eu-west-2.amazonaws.com/silverstone/prod/lot_images/large/REC15126-5/REC15126-5_13.jpg.webp?dummy=1773725803"
            data-src="https://am-s3-bucket-assets.s3.eu-west-2.amazonaws.com/silverstone/prod/lot_images/xlarge/REC15126-5/REC15126-5_13.jpg.webp"
            data-fancybox="gallery_all"
          />
        </div>
        <img src="https://www.iconicauctioneers.com/templates/silverstone/images/icons/newsletter-icon.svg" />
        <img src="https://www.iconicauctioneers.com/assets/consignor/CS.jpg" />
      </body>
    </html>
    """

    scraper = IconicScraper()
    record = scraper.parse_detail_html(
        html,
        "https://www.iconicauctioneers.com/1976-daimler-double-six-rec15126-5-bicester-0625",
        sale_context={
            "sale_title": "Classic Sale 2025",
            "sale_date": "Sunday 1st June 2025",
            "sale_location": "Bicester Motion",
        },
    )

    urls = [str(item["url"]) for item in record.media]
    assert urls == [
        "https://am-s3-bucket-assets.s3.eu-west-2.amazonaws.com/silverstone/prod/lot_images/xlarge/REC15126-5/REC15126-5_5.jpg.webp",
        "https://am-s3-bucket-assets.s3.eu-west-2.amazonaws.com/silverstone/prod/lot_images/xlarge/REC15126-5/REC15126-5_13.jpg.webp",
    ]
