from __future__ import annotations

from datetime import datetime
from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class DashboardSnapshot(BaseModel):
    candidate_count: int
    watchlist_count: int
    source_count: int
    dark_now_count: int


class CarListItem(BaseModel):
    id: UUID
    serial_number: str
    make: str
    model: str
    variant: str | None = None
    year_built: int | None = None
    build_date: date | None = None
    build_date_precision: str | None = None
    build_date_label: str | None = None
    body_style: str | None = None
    drive_side: str | None = None
    original_color: str | None = None
    notes: str | None = None
    source_count: int
    darkness_score: Decimal | None
    last_known_year: int | None
    gap_years: int | None = None
    years_since_last_seen: int | None = None
    is_currently_dark: bool = False
    qualifies_primary: bool = False
    qualifies_secondary: bool = False
    watchlist_status: str | None
    sources: list["CarSourceItem"]
    media: list["CarMediaItem"]
    timeline: list["CarTimelineItem"]


class CarSourceItem(BaseModel):
    source_name: str
    source_url: str
    source_serial_number: str
    scraped_at: datetime


class CarTimelineItem(BaseModel):
    kind: str
    event_date: datetime | None = None
    event_date_label: str
    event_date_precision: str
    event_year: int | None = None
    title: str
    subtitle: str | None = None
    detail: str | None = None
    source_reference: str | None = None


class CarMediaItem(BaseModel):
    media_type: str
    url: str
    caption: str | None = None


class WatchlistItem(BaseModel):
    car_id: UUID
    serial_number: str
    make: str
    model: str
    priority: int
    status: str
    score: Decimal | None
    interest_reason: str | None
    updated_at: datetime


class SourceSummary(BaseModel):
    id: UUID
    name: str
    base_url: str
    scraper_key: str
    enabled: bool
    last_scraped_at: datetime | None
    last_status: str | None


class SettingItem(BaseModel):
    key: str
    value: dict
    description: str | None
    updated_at: datetime


class WatchlistUpdate(BaseModel):
    priority: int
    status: str
    interest_reason: str | None = None
    notes: str | None = None


class SettingUpdate(BaseModel):
    value: dict


class RequestHeaderItem(BaseModel):
    name: str
    value: str


class RequestPreview(BaseModel):
    method: str
    url: str
    headers: list[RequestHeaderItem]
    follow_redirects: bool
    timeout_seconds: float


class ResponsePreview(BaseModel):
    attempted: bool
    status_code: int | None = None
    final_url: str | None = None
    headers: list[RequestHeaderItem] = []
    elapsed_ms: float | None = None
    content_type: str | None = None
    body_preview: str | None = None
    error: str | None = None


class BarchettaRequestDiagnostics(BaseModel):
    path: str
    user_agent: str
    request: RequestPreview
    response: ResponsePreview


class RequestLabInput(BaseModel):
    url: str
    method: str = "GET"
    headers: dict[str, str] = {}
    body: str | None = None


class RequestLabResult(BaseModel):
    request: RequestPreview
    response: ResponsePreview
