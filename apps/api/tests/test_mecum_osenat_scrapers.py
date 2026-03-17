from __future__ import annotations

import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = API_ROOT / "src"

if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from digital_barn_finds.services.scrapers.mecum import MecumScraper  # noqa: E402
from digital_barn_finds.services.scrapers.osenat import OsenatScraper  # noqa: E402


def test_mecum_parser_extracts_serial_from_spaced_vin_label() -> None:
    scraper = MecumScraper(delay_seconds=0, request_timeout_seconds=1, max_attempts=1)
    html = """
    <html>
      <head><title>2024 Chevrolet Corvette Z06 3LZ Convertible | Mecum</title></head>
      <body>
        <a href="/auctions/houston-2025/">Houston 2025</a>
        <h1>2024 Chevrolet Corvette Z06 3LZ Convertible</h1>
        <div>Lot F228.1 // Friday, April 4th // Houston 2025</div>
        <div>5.5L/670 HP V-8, Automatic, 83 Miles</div>
        <div>Odometer reads</div>
        <div>83 miles</div>
        <div>VIN / Serial</div>
        <div>1G1YF3D30R5602316</div>
        <img src="https://images.mecum.com/image/upload/sample.jpg" />
      </body>
    </html>
    """

    record = scraper.parse_detail_html(
        html,
        "https://www.mecum.com/lots/1144807/2024-chevrolet-corvette-z06-3lz-convertible/",
    )

    assert record.car.serial_number == "1G1YF3D30R5602316"


def test_mecum_parser_uses_schema_vehicle_identification_number() -> None:
    scraper = MecumScraper(delay_seconds=0, request_timeout_seconds=1, max_attempts=1)
    html = """
    <html>
      <head>
        <title>2021 Lamborghini Urus | Mecum</title>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Car",
            "name": "2021 Lamborghini Urus",
            "vehicleIdentificationNumber": "ZPBUA1ZL7MLA12345"
          }
        </script>
      </head>
      <body>
        <h1>2021 Lamborghini Urus</h1>
      </body>
    </html>
    """

    record = scraper.parse_detail_html(
        html,
        "https://www.mecum.com/lots/628453/2021-lamborghini-urus/",
    )

    assert record.car.serial_number == "ZPBUA1ZL7MLA12345"


def test_osenat_parser_extracts_accented_chassis_label() -> None:
    scraper = OsenatScraper(delay_seconds=0, request_timeout_seconds=1, max_attempts=1)
    html = """
    <html>
      <head><title>1972 Mercedes-Benz 300 SEL 3.5 - Lot 239</title></head>
      <body>
        <h1>1972 Mercedes-Benz 300 SEL 3.5 - Lot 239</h1>
        <div>Vente le 10 novembre 2024</div>
        <div>Lieu: Parc des Expositions Eurexpo Lyon</div>
        <div>Châssis : 10905612008303</div>
        <img src="https://www.osenat.com/uploads/lot/26974426-1.jpg" />
      </body>
    </html>
    """

    record = scraper.parse_detail_html(
        html,
        "https://www.osenat.com/lot/155250/26974426-1972-mercedes-benz-300-sel-3-5-chassis-10905612008303-carte",
    )

    assert record.car.serial_number == "10905612008303"


def test_osenat_parser_ignores_numero_placeholder_and_reads_actual_serial() -> None:
    scraper = OsenatScraper(delay_seconds=0, request_timeout_seconds=1, max_attempts=1)
    html = """
    <html>
      <head><title>1958 Mercedes-Benz 180 D - Lot 201</title></head>
      <body>
        <h1>1958 Mercedes-Benz 180 D - Lot 201</h1>
        <div>Châssis numero 1201108503115</div>
        <div>Moteur numero 63693035024722</div>
      </body>
    </html>
    """

    record = scraper.parse_detail_html(
        html,
        "https://www.osenat.com/lot/155250/26974388-1958-mercedes-benz-180-d-chassis-numero-1201108503115-vendu",
    )

    assert record.car.serial_number == "1201108503115"
    assert record.car.attributes["engine_number"] == "63693035024722"


def test_osenat_parser_uses_slug_serial_when_body_text_is_missing() -> None:
    scraper = OsenatScraper(delay_seconds=0, request_timeout_seconds=1, max_attempts=1)
    html = """
    <html>
      <head><title>1933 Morgan Three Wheeler Sport - Lot 228</title></head>
      <body>
        <h1>1933 Morgan Three Wheeler Sport - Lot 228</h1>
        <div>Vente le 10 novembre 2024</div>
        <div>Lieu: Parc des Expositions Eurexpo Lyon</div>
        <img src="https://www.osenat.com/uploads/lot/26974423-1.jpg" />
      </body>
    </html>
    """

    record = scraper.parse_detail_html(
        html,
        "https://www.osenat.com/lot/155250/26974423-1933-morgan-three-wheeler-sport-chassis-d407-moteur-1000cc",
    )

    assert record.car.serial_number == "D407"


def test_osenat_parser_uses_chassis_numero_slug_pattern() -> None:
    scraper = OsenatScraper(delay_seconds=0, request_timeout_seconds=1, max_attempts=1)
    html = """
    <html>
      <head><title>1958 Mercedes-Benz 180 D - Lot 201</title></head>
      <body>
        <h1>1958 Mercedes-Benz 180 D - Lot 201</h1>
        <div>Vente le 10 novembre 2024</div>
        <div>Lieu: Parc des Expositions Eurexpo Lyon</div>
      </body>
    </html>
    """

    record = scraper.parse_detail_html(
        html,
        "https://www.osenat.com/lot/155250/26974388-1958-mercedes-benz-180-d-chassis-numero-1201108503115-vendu",
    )

    assert record.car.serial_number == "1201108503115"


def test_osenat_parser_uses_chassis_ndeg_slug_pattern() -> None:
    scraper = OsenatScraper(delay_seconds=0, request_timeout_seconds=1, max_attempts=1)
    html = """
    <html>
      <head><title>1974 Citroen DS 23 IE Pallas - Lot 241</title></head>
      <body>
        <h1>1974 Citroen DS 23 IE Pallas - Lot 241</h1>
      </body>
    </html>
    """

    record = scraper.parse_detail_html(
        html,
        "https://www.osenat.com/lot/155250/26974433-1974-citroen-ds-23-ie-pallas-chassis-ndeg-01fg2946-carte",
    )

    assert record.car.serial_number == "01FG2946"


def test_osenat_parser_prefers_explicit_short_serial_over_fallback() -> None:
    scraper = OsenatScraper(delay_seconds=0, request_timeout_seconds=1, max_attempts=1)
    html = """
    <html>
      <head><title>1901 Renault - Lot 204</title></head>
      <body>
        <nav>Vins &amp; Spiritueux</nav>
        <h1>1901 Renault - Lot 204</h1>
        <div>N° de série 3</div>
        <div>TYPE D</div>
      </body>
    </html>
    """

    record = scraper.parse_detail_html(
        html,
        "https://www.osenat.com/lot/155250/26974391-1901-renault-ndeg-de-serie-3-type-d-meme-famille-depuis-103",
    )

    assert record.car.serial_number == "3"


def test_osenat_parser_extracts_chassis_and_engine_numbers_from_labels() -> None:
    scraper = OsenatScraper(delay_seconds=0, request_timeout_seconds=1, max_attempts=1)
    html = """
    <html>
      <head><title>1954 Packard Clipper Super Panama Hardtop Coupe - Lot 200</title></head>
      <body>
        <h1>1954 Packard Clipper Super Panama Hardtop Coupe - Lot 200</h1>
        <div>Châssis numéro 5467 3004</div>
        <div>Moteur numéro M310576H</div>
      </body>
    </html>
    """

    record = scraper.parse_detail_html(
        html,
        "https://www.osenat.com/lot/155250/26974387-1954-packard-clipper-super-panama-hardtop-coupe-chassis",
    )

    assert record.car.serial_number == "5467 3004"
    assert record.car.attributes["engine_number"] == "M310576H"


def test_osenat_parser_strips_chassis_number_prefix_marker() -> None:
    scraper = OsenatScraper(delay_seconds=0, request_timeout_seconds=1, max_attempts=1)
    html = """
    <html>
      <head><title>1974 Citroen DS 23 IE Pallas - Lot 241</title></head>
      <body>
        <h1>1974 Citroen DS 23 IE Pallas - Lot 241</h1>
        <div>Chassis n° 01FG2946</div>
      </body>
    </html>
    """

    record = scraper.parse_detail_html(
        html,
        "https://www.osenat.com/lot/155250/26974433-1974-citroen-ds-23-ie-pallas-chassis-ndeg-01fg2946-carte",
    )

    assert record.car.serial_number == "01FG2946"
