from __future__ import annotations

import os
import sys
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

API_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = API_ROOT / "src"

os.environ.setdefault("DBF_DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("DBF_ADMIN_TOKEN", "media-backfill-test")

if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from digital_barn_finds.database import Base  # noqa: E402
from digital_barn_finds.models import Car, CarMedia, CarSource, Source  # noqa: E402
from digital_barn_finds.services.media_backfill import cache_existing_media  # noqa: E402
from digital_barn_finds.services.media_storage import StoredMediaAsset  # noqa: E402


def _make_session():
    engine = create_engine("sqlite+pysqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    return Session()


def test_cache_existing_media_migrates_file_urls(monkeypatch, tmp_path) -> None:
    db = _make_session()
    try:
        source = Source(
            name="artcurial.com",
            base_url="https://www.artcurial.com",
            scraper_key="artcurial",
        )
        car = Car(
            normalized_serial_number="sale6144lot16",
            display_serial_number="sale-6144-lot-16",
            make="Lancia",
            model="Flaminia 2,5L cabriolet Touring",
            source_count=1,
        )
        db.add_all([source, car])
        db.flush()

        car_source = CarSource(
            car_id=car.id,
            source_id=source.id,
            source_url="https://www.artcurial.com/en/sales/6144/lots/16-a",
            source_serial_number=car.display_serial_number,
            source_make=car.make,
            source_model=car.model,
            scraped_at=datetime.now(UTC),
        )
        db.add(car_source)
        db.flush()

        original_file = tmp_path / "original.jpg"
        original_file.write_bytes(b"\xff\xd8\xffdemo-jpeg")
        media = CarMedia(
            car_id=car.id,
            car_source_id=car_source.id,
            media_type="image/jpeg",
            url=f"file://{original_file}",
            caption=None,
            scraped_at=datetime.now(UTC),
        )
        db.add(media)
        db.commit()

        monkeypatch.setattr(
            "digital_barn_finds.services.media_backfill.persist_local_media",
            lambda *args, **kwargs: StoredMediaAsset(
                url="dbfblob://artcurial/sale-6144-lot-16/demo.jpg",
                bytes_written=12,
                content_type="image/jpeg",
            ),
        )

        result = cache_existing_media(db, limit=10)
        db.refresh(media)

        assert result.requested == 1
        assert result.updated == 1
        assert result.remaining_local == 0
        assert result.remaining_unmanaged == 0
        assert media.url == "dbfblob://artcurial/sale-6144-lot-16/demo.jpg"
    finally:
        db.close()
