from __future__ import annotations

from datetime import UTC, datetime
from urllib.parse import urlparse

from digital_barn_finds.database import SessionLocal
from digital_barn_finds.models import AppSetting, ScrapeLog, Source
from digital_barn_finds.services.darkness import DEFAULTS
from digital_barn_finds.services.scrapers.registry import get_scraper, list_scraper_keys


def _build_source_seeds() -> list[dict[str, str]]:
    seeds: list[dict[str, str]] = []
    for scraper_key in list_scraper_keys():
        manifest = get_scraper(scraper_key).manifest
        hostname = urlparse(manifest.base_url).netloc.removeprefix("www.")
        seeds.append(
            {
                "name": hostname or manifest.display_name,
                "base_url": manifest.base_url,
                "scraper_key": manifest.source_key,
                "notes": manifest.notes or f"Adapter source for {manifest.display_name}.",
            }
        )
    return seeds


def seed_sources() -> None:
    db = SessionLocal()
    try:
        seeds = _build_source_seeds()

        for seed in seeds:
            source = db.query(Source).filter(Source.scraper_key == seed["scraper_key"]).one_or_none()
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
            else:
                source.name = seed["name"]
                source.base_url = seed["base_url"]
                source.notes = seed["notes"]

        if db.query(AppSetting).filter(AppSetting.key == "darkness_weights").one_or_none() is None:
            db.add(
                AppSetting(
                    key="darkness_weights",
                    value=DEFAULTS["darkness_weights"],
                    description="Weights and thresholds for darkness score computation.",
                )
            )
        if db.query(AppSetting).filter(AppSetting.key == "fetch_more_ui").one_or_none() is None:
            db.add(
                AppSetting(
                    key="fetch_more_ui",
                    value={"enabled": False},
                    description="Controls whether the Fetch More Cars panel is shown in the admin UI.",
                )
            )
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed_sources()
