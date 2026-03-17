from __future__ import annotations

from collections.abc import Callable
from urllib.parse import urlparse

from digital_barn_finds.services.scrapers.aguttes import AguttesScraper
from digital_barn_finds.services.scrapers.artcurial import ArtcurialScraper
from digital_barn_finds.services.scrapers.bat import BringATrailerScraper
from digital_barn_finds.services.scrapers.barchetta import BarchettaScraper
from digital_barn_finds.services.scrapers.base import BaseScraper
from digital_barn_finds.services.scrapers.gooding import GoodingScraper
from digital_barn_finds.services.scrapers.historics import HistoricsScraper
from digital_barn_finds.services.scrapers.iconic import IconicScraper
from digital_barn_finds.services.scrapers.mecum import MecumScraper
from digital_barn_finds.services.scrapers.osenat import OsenatScraper
from digital_barn_finds.services.scrapers.rm_sothebys import RMSothebysScraper


ScraperFactory = Callable[..., BaseScraper]


SCRAPER_REGISTRY: dict[str, ScraperFactory] = {
    "aguttes": AguttesScraper,
    "artcurial": ArtcurialScraper,
    "bat": BringATrailerScraper,
    "barchetta": BarchettaScraper,
    "gooding": GoodingScraper,
    "historics": HistoricsScraper,
    "iconic": IconicScraper,
    "mecum": MecumScraper,
    "osenat": OsenatScraper,
    "rm_sothebys": RMSothebysScraper,
}


def list_scraper_keys() -> list[str]:
    return sorted(SCRAPER_REGISTRY)


def list_searchable_sources() -> list[tuple[str, str]]:
    sources: list[tuple[str, str]] = []
    for source_key in list_scraper_keys():
        manifest = get_scraper(source_key).manifest
        hostname = (urlparse(manifest.base_url).hostname or "").lower().removeprefix("www.")
        if hostname:
            sources.append((source_key, hostname))
    return sources


def get_scraper(source_key: str, **config_kwargs: object) -> BaseScraper:
    factory = SCRAPER_REGISTRY.get(source_key)
    if factory is None:
        raise ValueError(f"No scraper registered for source_key={source_key!r}")
    return factory(**config_kwargs) if config_kwargs else factory()


def detect_scraper_key_for_url(url: str) -> str | None:
    hostname = (urlparse(url).hostname or "").lower().removeprefix("www.")
    if not hostname:
        return None

    for source_key in list_scraper_keys():
        scraper = get_scraper(source_key)
        base_hostname = (urlparse(scraper.manifest.base_url).hostname or "").lower().removeprefix("www.")
        if hostname == base_hostname or hostname.endswith(f".{base_hostname}"):
            return source_key
    return None
