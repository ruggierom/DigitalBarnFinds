from __future__ import annotations

from datetime import UTC, datetime

from digital_barn_finds.database import SessionLocal
from digital_barn_finds.models import AppSetting, ScrapeLog, Source
from digital_barn_finds.services.darkness import DEFAULTS


def seed_sources() -> None:
    db = SessionLocal()
    try:
        seeds = [
            {
                "name": "barchetta.cc",
                "base_url": "https://www.barchetta.cc",
                "scraper_key": "barchetta",
                "notes": "Initial registry source for Ferrari, Maserati, Alfa Romeo, and Fiat histories.",
            }
        ]

        for seed in seeds:
            source = db.query(Source).filter(Source.name == seed["name"]).one_or_none()
            if source is None:
                source = Source(**seed)
                db.add(source)
                db.flush()
                db.add(
                    ScrapeLog(
                        source_id=source.id,
                        run_at=datetime.now(UTC),
                        status="success",
                        mode="seed",
                        cars_found=0,
                        cars_updated=0,
                        errors=[],
                        duration_seconds=0,
                    )
                )

        if db.query(AppSetting).filter(AppSetting.key == "darkness_weights").one_or_none() is None:
            db.add(
                AppSetting(
                    key="darkness_weights",
                    value=DEFAULTS["darkness_weights"],
                    description="Weights and thresholds for darkness score computation.",
                )
            )
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed_sources()

