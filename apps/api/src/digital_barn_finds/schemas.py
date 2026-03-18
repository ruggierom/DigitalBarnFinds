from __future__ import annotations

from datetime import datetime
from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class DashboardSnapshot(BaseModel):
    candidate_count: int
    watchlist_count: int
    source_count: int
    dark_now_count: int


class RegistryStats(BaseModel):
    total_cars: int
    cars_with_media: int
    media_rows: int
    enabled_sources: int
    watchlist_count: int
    dark_now_count: int
    primary_candidate_count: int
    secondary_candidate_count: int


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
    last_seen_location: str | None = None
    last_seen_country_code: str | None = None
    last_seen_country_name: str | None = None
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


class ResearchLinkItem(BaseModel):
    label: str
    category: str
    query: str
    url: str


class WatchlistItem(BaseModel):
    car_id: UUID
    serial_number: str
    make: str
    model: str
    priority: int
    status: str
    score: Decimal | None
    interest_reason: str | None
    agent_instructions: str | None
    notes: str | None
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
    agent_instructions: str | None = None
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
    headers: list[RequestHeaderItem] = Field(default_factory=list)
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
    headers: dict[str, str] = Field(default_factory=dict)
    body: str | None = None


class RequestLabResult(BaseModel):
    request: RequestPreview
    response: ResponsePreview


class ImportUrlRequest(BaseModel):
    url: str


class ImportUrlResultItem(BaseModel):
    scraper_key: str
    source_name: str
    source_url: str
    car_id: UUID
    serial_number: str
    make: str
    model: str
    source_count: int
    media_count: int
    already_known_url: bool


class SearchCandidateItem(BaseModel):
    scraper_key: str
    query: str
    url: str
    title: str
    description: str


class CarEnrichmentResultItem(BaseModel):
    car_id: UUID
    serial_number: str
    queries_attempted: int
    candidate_count: int
    imported_count: int
    skipped_known_urls: int
    skipped_serial_mismatch: int
    imported: list[ImportUrlResultItem]
    candidates: list[SearchCandidateItem]
    errors: list[str]


class EnrichmentRunResultItem(BaseModel):
    requested: int
    processed: int
    queries_attempted: int
    candidate_count: int
    imported_count: int
    skipped_known_urls: int
    skipped_serial_mismatch: int
    cars: list[CarEnrichmentResultItem]
    errors: list[str]


class VehicleModelWrite(BaseModel):
    make: str
    model: str
    variant: str | None = None
    sort_order: int | None = None
    tier: str | None = None
    units_built: int | None = None
    est_value_low: int | None = None
    est_value_high: int | None = None
    us_delivery: bool = True
    darkness_pct: int | None = None
    seed_source: str | None = None
    in_scope: bool = True
    designated_by: str | None = None
    notes: str | None = None


class VehicleModelItem(VehicleModelWrite):
    id: UUID
    designated_at: datetime
    created_at: datetime
    updated_at: datetime


class ChassisSeedWrite(BaseModel):
    vehicle_model_id: UUID | None = None
    chassis_number: str
    engine_number: str | None = None
    production_number: str | None = None
    color_ext: str | None = None
    color_int: str | None = None
    delivery_date: date | None = None
    dealer: str | None = None
    destination_country: str | None = None
    destination_region: str | None = None
    us_spec: bool = False
    split_sump: bool = False
    ac_factory: bool = False
    last_known_location: str | None = None
    last_known_owner: str | None = None
    dark_pct_est: int | None = None
    notes: str | None = None
    seed_source: str | None = None
    seed_date: date | None = None
    confidence: str = "probable"
    status: str = "active"
    car_id: UUID | None = None


class ChassisSeedUpdate(BaseModel):
    vehicle_model_id: UUID | None = None
    chassis_number: str | None = None
    engine_number: str | None = None
    production_number: str | None = None
    color_ext: str | None = None
    color_int: str | None = None
    delivery_date: date | None = None
    dealer: str | None = None
    destination_country: str | None = None
    destination_region: str | None = None
    us_spec: bool | None = None
    split_sump: bool | None = None
    ac_factory: bool | None = None
    last_known_location: str | None = None
    last_known_owner: str | None = None
    dark_pct_est: int | None = None
    notes: str | None = None
    seed_source: str | None = None
    seed_date: date | None = None
    confidence: str | None = None
    status: str | None = None
    car_id: UUID | None = None


class ChassisSeedItem(ChassisSeedWrite):
    id: UUID
    vehicle_make: str | None = None
    vehicle_model: str | None = None
    vehicle_variant: str | None = None
    created_at: datetime
    updated_at: datetime


class ChassisSeedImportResultItem(BaseModel):
    requested: int
    imported: int
    skipped_duplicates: int
    errors: list[str]


class ResearchJobRequest(BaseModel):
    chassis_number: str | None = None
    car_id: UUID | None = None
    triggered_by: str = "manual"
    triggered_by_user: str | None = None


class AgentRunItem(BaseModel):
    id: UUID
    chassis_seed_id: UUID | None = None
    car_id: UUID | None = None
    chassis_number: str | None = None
    serial_number: str | None = None
    status: str
    phases_completed: int
    triggered_by: str | None = None
    triggered_by_user: str | None = None
    started_at: datetime
    completed_at: datetime | None = None
    error: str | None = None


class ResearchJobAccepted(BaseModel):
    run_id: UUID
    status: str


class ProvenanceContactItem(BaseModel):
    id: UUID
    priority: int
    name: str | None = None
    org: str | None = None
    city: str | None = None
    phone: str | None = None
    email: str | None = None
    rationale: str | None = None
    target_chassis: str | None = None
    contact_status: str
    notes: str | None = None
    created_at: datetime


class DealerLookupWrite(BaseModel):
    provenance_report_id: UUID
    contact_id: UUID | None = None
    outcome: str | None = None
    notes: str | None = None


class DealerLookupUpdate(BaseModel):
    outcome: str | None = None
    notes: str | None = None


class DealerLookupItem(BaseModel):
    id: UUID
    provenance_report_id: UUID | None = None
    contact_id: UUID | None = None
    attempted_at: datetime
    outcome: str | None = None
    notes: str | None = None


class ProvenanceReportItem(BaseModel):
    id: UUID
    agent_run_id: UUID | None = None
    car_id: UUID | None = None
    chassis_seed_id: UUID | None = None
    summary: str | None = None
    geo_region: str | None = None
    last_known_location: str | None = None
    estimated_value_usd: int | None = None
    darkness_score: int | None = None
    custody_chain: list[dict] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)
    status: str
    created_at: datetime
    updated_at: datetime
    contacts: list[ProvenanceContactItem] = Field(default_factory=list)
    dealer_lookups: list[DealerLookupItem] = Field(default_factory=list)
