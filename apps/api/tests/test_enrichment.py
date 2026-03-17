from __future__ import annotations

import base64
import os
import sys
from datetime import UTC, datetime
from pathlib import Path

import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

API_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = API_ROOT / "src"

os.environ.setdefault("DBF_DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("DBF_ADMIN_TOKEN", "enrichment-test")

if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from digital_barn_finds.database import Base  # noqa: E402
from digital_barn_finds.models import Car, CarSource, Source  # noqa: E402
from digital_barn_finds.services.enrichment import (  # noqa: E402
    SearchCandidate,
    build_enrichment_queries,
    enrich_single_car,
    search_supported_source_urls,
)
from digital_barn_finds.services.scrapers.base import NormalizedCar, ScrapedCarRecord  # noqa: E402


def _make_session():
    engine = create_engine("sqlite+pysqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    return Session()


def _build_car_fixture(db):
    existing_source = Source(
        name="barchetta.cc",
        base_url="http://www.barchetta.cc",
        scraper_key="barchetta",
    )
    candidate_source = Source(
        name="mecum.com",
        base_url="https://www.mecum.com",
        scraper_key="mecum",
    )
    car = Car(
        normalized_serial_number="0465gt",
        display_serial_number="0465GT",
        make="Ferrari",
        model="250 GT PF Coupe Speciale",
        variant="Coupe Speciale",
        year_built=1957,
        source_count=1,
    )
    db.add_all([existing_source, candidate_source, car])
    db.flush()
    db.add(
        CarSource(
            car_id=car.id,
            source_id=existing_source.id,
            source_url="http://www.barchetta.cc/english/All.Ferraris/Detail/0465GT.250GT.PF.Coupe.htm",
            source_serial_number="0465GT",
            source_make="Ferrari",
            source_model="250 GT PF Coupe Speciale",
            scraped_at=datetime.now(UTC),
        )
    )
    db.commit()
    db.refresh(car)
    return car


def test_build_enrichment_queries_skips_known_source_domains(monkeypatch) -> None:
    db = _make_session()
    try:
        car = _build_car_fixture(db)
        monkeypatch.setattr(
            "digital_barn_finds.services.enrichment.list_searchable_sources",
            lambda: [("barchetta", "barchetta.cc"), ("mecum", "mecum.com")],
        )

        queries = build_enrichment_queries(car, source_records=car.sources)

        assert queries == [
            ("mecum", 'site:mecum.com "0465GT" 1957 Ferrari "250 GT PF Coupe Speciale"'),
            ("mecum", 'site:mecum.com "0465 GT" 1957 Ferrari "250 GT PF Coupe Speciale"'),
        ]
    finally:
        db.close()


def test_enrich_single_car_imports_only_serial_matching_results(monkeypatch) -> None:
    db = _make_session()
    try:
        car = _build_car_fixture(db)
        mismatch = SearchCandidate(
            scraper_key="mecum",
            query='site:mecum.com "0465GT" Ferrari',
            url="https://www.mecum.com/lots/999999/1956-jaguar-xk140/",
            title="1956 Jaguar XK140",
            description="Wrong car",
        )
        match = SearchCandidate(
            scraper_key="mecum",
            query='site:mecum.com "0465GT" Ferrari',
            url="https://www.mecum.com/lots/480219/1957-ferrari-250-gt-pf-coupe-speciale/",
            title="1957 Ferrari 250 GT PF Coupe Speciale",
            description="Correct car",
        )

        monkeypatch.setattr(
            "digital_barn_finds.services.enrichment.build_enrichment_queries",
            lambda *args, **kwargs: [("mecum", 'site:mecum.com "0465GT" Ferrari')],
        )
        monkeypatch.setattr(
            "digital_barn_finds.services.enrichment.search_supported_source_urls",
            lambda *args, **kwargs: [mismatch, match],
        )

        def parse_candidate(candidate: SearchCandidate):
            serial_number = "0123GT" if candidate.url == mismatch.url else "0465 GT"
            return ScrapedCarRecord(
                source_url=candidate.url,
                car=NormalizedCar(
                    serial_number=serial_number,
                    make="Ferrari",
                    model="250 GT PF Coupe Speciale",
                    variant="Coupe Speciale",
                    year_built=1957,
                    body_style="Coupe",
                ),
                media=[],
                custody_events=[],
                car_events=[],
            )

        monkeypatch.setattr(
            "digital_barn_finds.services.enrichment._parse_candidate_record",
            parse_candidate,
        )

        result = enrich_single_car(db, car, max_imports=5)

        db.refresh(car)
        assert result.imported_count == 1
        assert result.skipped_serial_mismatch == 1
        assert result.imported[0].scraper_key == "mecum"
        assert result.imported[0].serial_number == "0465GT"
        assert car.source_count == 2
    finally:
        db.close()


def test_search_supported_source_urls_falls_back_to_bing_when_brave_throttles() -> None:
    mecum_url = "https://www.mecum.com/lots/480219/2002-ferrari-360-spider/"
    encoded_url = base64.b64encode(mecum_url.encode("utf-8")).decode("ascii").rstrip("=")
    bing_html = f"""
    <html>
      <body>
        <ol id="b_results">
          <li class="b_algo">
            <h2>
              <a href="https://www.bing.com/ck/a?u=a1{encoded_url}&amp;ntb=1">
                2002 Ferrari 360 Spider
              </a>
            </h2>
            <div class="b_caption"><p>Matching Mecum lot</p></div>
          </li>
        </ol>
      </body>
    </html>
    """

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.host == "search.brave.com":
            return httpx.Response(429, request=request)
        if request.url.host == "www.bing.com":
            return httpx.Response(200, request=request, text=bing_html)
        raise AssertionError(f"Unexpected host {request.url.host}")

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        candidates = search_supported_source_urls(
            'site:mecum.com "ZFFYT53A620127086" Ferrari "360 Spider"',
            client=client,
            candidate_limit=5,
        )

    assert len(candidates) == 1
    assert candidates[0].scraper_key == "mecum"
    assert candidates[0].url == mecum_url
