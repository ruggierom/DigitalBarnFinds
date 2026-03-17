from __future__ import annotations

from collections.abc import Callable

from digital_barn_finds.services.scrapers.barchetta import BarchettaScraper
from digital_barn_finds.services.scrapers.base import BaseScraper


ScraperFactory = Callable[..., BaseScraper]


SCRAPER_REGISTRY: dict[str, ScraperFactory] = {
    "barchetta": BarchettaScraper,
}


def list_scraper_keys() -> list[str]:
    return sorted(SCRAPER_REGISTRY)


def get_scraper(source_key: str, **config_kwargs: object) -> BaseScraper:
    factory = SCRAPER_REGISTRY.get(source_key)
    if factory is None:
        raise ValueError(f"No scraper registered for source_key={source_key!r}")
    return factory(**config_kwargs) if config_kwargs else factory()
