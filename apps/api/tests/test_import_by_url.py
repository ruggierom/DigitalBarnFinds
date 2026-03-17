from __future__ import annotations

import os
import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = API_ROOT / "src"

os.environ.setdefault("DBF_DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("DBF_ADMIN_TOKEN", "import-url-test")

if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from digital_barn_finds.services.scrapers.registry import detect_scraper_key_for_url  # noqa: E402
from digital_barn_finds.services.import_by_url import import_car_from_url  # noqa: E402


def test_detect_scraper_key_for_url_matches_supported_domains() -> None:
    assert (
        detect_scraper_key_for_url("https://www.mecum.com/lots/480219/2002-ferrari-360-spider/")
        == "mecum"
    )
    assert (
        detect_scraper_key_for_url(
            "http://www.barchetta.cc/english/All.Ferraris/Detail/0465GT.250GT.PF.Coupe.htm"
        )
        == "barchetta"
    )
    assert (
        detect_scraper_key_for_url(
            "https://www.iconicauctioneers.com/1971-bond-bug-700es-rec14985-1-nec-1124"
        )
        == "iconic"
    )
    assert (
        detect_scraper_key_for_url("https://bringatrailer.com/listing/1991-ferrari-348-27/")
        == "bat"
    )


def test_detect_scraper_key_for_url_rejects_unknown_domains() -> None:
    assert detect_scraper_key_for_url("https://example.com/car/123") is None


def test_import_car_from_url_reports_unsupported_site_helpfully() -> None:
    try:
        import_car_from_url(None, "https://example.com/car/123")  # type: ignore[arg-type]
    except ValueError as exc:
        assert str(exc) == "We don't support example.com yet. We'll consider adding support for that site."
    else:
        raise AssertionError("Expected ValueError for unsupported site")
