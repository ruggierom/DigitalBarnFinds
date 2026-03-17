from __future__ import annotations

import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = API_ROOT / "src"

if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from digital_barn_finds.services.scrapers.bat import BringATrailerScraper  # noqa: E402


def test_bat_parser_handles_prefixed_titles_and_variant_metadata() -> None:
    scraper = BringATrailerScraper(delay_seconds=0, request_timeout_seconds=1, max_attempts=1)
    html = """
    <html>
      <head><title>374-Mile 2023 Aston Martin DBS Coupe 770 Ultimate for sale on BaT Auctions</title></head>
      <body>
        <h1 class="listing-post-title">374-Mile 2023 Aston Martin DBS Coupe 770 Ultimate</h1>
        <div class="post-excerpt">Factory-finished in Satin Lunar White over black leather.</div>
        <section class="essentials">
          <div class="item">
            <ul>
              <li>Seller: demo_seller</li>
              <li>Location: Las Vegas, Nevada</li>
              <li>Chassis: SCFRMHAV2PGR10465</li>
              <li>374 Miles Shown</li>
              <li>5.2-Liter Twin-Turbo V12</li>
              <li>Eight-Speed Automatic Transaxle</li>
              <li>Satin Lunar White Paint</li>
              <li>Onyx Black Leather Upholstery</li>
              <li><strong>Lot</strong> #201234</li>
            </ul>
          </div>
          <strong>Seller</strong>: demo_seller
          <strong>Location</strong>: Las Vegas, Nevada
          <strong>Private Party or Dealer</strong>: Dealer
        </section>
        <table class="listing-stats">
          <tr>
            <td class="listing-stats-label">Winning Bid</td>
            <td class="listing-stats-value">USD $310,000 by Robster5000</td>
          </tr>
          <tr>
            <td class="listing-stats-label">Auction Ended</td>
            <td class="listing-stats-value">March 13, 2026</td>
          </tr>
        </table>
        <div data-gallery-items='[{"large":{"url":"https://bringatrailer.com/wp-content/uploads/2026/03/demo1.jpg"}}]'></div>
      </body>
    </html>
    """

    record = scraper.parse_detail_html(
        html,
        "https://bringatrailer.com/listing/2023-aston-martin-dbs-coupe-6/",
    )

    assert record.car.make == "Aston Martin"
    assert record.car.model == "DBS Coupe 770 Ultimate"
    assert record.car.variant == "770 Ultimate"
    assert record.car.year_built == 2023
    assert record.car.body_style == "Coupe"
    assert record.car.original_color == "Satin Lunar White"
    assert record.car.attributes["seller"] == "demo_seller"
    assert record.car.attributes["transmission"] == "Eight-Speed Automatic Transaxle"
    assert len(record.media) == 1
