from __future__ import annotations

from datetime import date
from dataclasses import dataclass, field
from typing import Protocol


@dataclass(slots=True)
class NormalizedCar:
    serial_number: str
    make: str
    model: str
    variant: str | None = None
    year_built: int | None = None
    build_date: date | None = None
    build_date_precision: str | None = None
    body_style: str | None = None
    drive_side: str | None = None
    original_color: str | None = None
    notes: str | None = None
    attributes: dict[str, str] = field(default_factory=dict)


@dataclass(slots=True)
class NormalizedTimelineEvent:
    event_kind: str
    event_date: date | None
    event_date_precision: str
    event_year: int | None
    payload: dict[str, str | int | float | None]
    source_reference: str | None = None


@dataclass(slots=True)
class ScrapedCarRecord:
    source_url: str
    car: NormalizedCar
    custody_events: list[NormalizedTimelineEvent] = field(default_factory=list)
    car_events: list[NormalizedTimelineEvent] = field(default_factory=list)
    media: list[dict[str, str | None]] = field(default_factory=list)


class BaseScraper(Protocol):
    source_key: str

    def crawl(self, *, full: bool) -> list[str]:
        ...

    def parse_detail_page(self, url: str) -> ScrapedCarRecord:
        ...
