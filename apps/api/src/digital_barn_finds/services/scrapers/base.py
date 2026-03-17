from __future__ import annotations

from datetime import date
from dataclasses import dataclass, field
from enum import Enum
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


class FixtureType(str, Enum):
    DETAIL_PAGE = "detail_page"
    SEARCH_RESULTS = "search_results"
    API_RESPONSE = "api_response"


@dataclass(slots=True)
class FixtureInput:
    fixture_type: FixtureType
    source_key: str
    source_url: str
    raw_html: str | None = None
    raw_json: dict | None = None
    raw_xml: str | None = None
    auxiliary_payloads: list[dict] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)


@dataclass(slots=True)
class AdapterManifest:
    source_key: str
    display_name: str
    base_url: str
    supported_detail_fixture_types: list[FixtureType]
    supported_discovery_fixture_types: list[FixtureType]
    requires_auth: bool = False
    language: str = "en"
    notes: str = ""


class DiscoveryMixin(Protocol):
    def crawl(self, *, full: bool) -> list[str]:
        ...

    def parse_discovery_page(self, fixture: FixtureInput) -> list[str]:
        ...


class ParserContract(Protocol):
    def parse_detail_page(self, url: str) -> ScrapedCarRecord:
        ...

    def parse_record_fixture(self, fixture: FixtureInput) -> ScrapedCarRecord:
        ...


class BaseScraper(DiscoveryMixin, ParserContract, Protocol):
    source_key: str
    manifest: AdapterManifest
