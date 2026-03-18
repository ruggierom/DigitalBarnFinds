from __future__ import annotations

import uuid
from datetime import UTC, date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from digital_barn_finds.database import Base


def new_uuid() -> uuid.UUID:
    return uuid.uuid4()


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )


class Source(TimestampMixin, Base):
    __tablename__ = "sources"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    base_url: Mapped[str] = mapped_column(Text, nullable=False)
    scraper_key: Mapped[str] = mapped_column(String(100), nullable=False)
    enabled: Mapped[bool] = mapped_column(default=True, nullable=False)
    last_scraped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str | None] = mapped_column(Text)

    source_cars: Mapped[list["CarSource"]] = relationship(back_populates="source")
    scrape_logs: Mapped[list["ScrapeLog"]] = relationship(back_populates="source")


class VehicleModel(TimestampMixin, Base):
    __tablename__ = "vehicle_models"
    __table_args__ = (
        CheckConstraint("tier IN ('A', 'B', 'C', 'D')", name="ck_vehicle_models_tier"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    make: Mapped[str] = mapped_column(Text, nullable=False)
    model: Mapped[str] = mapped_column(Text, nullable=False)
    variant: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int | None] = mapped_column(Integer)
    tier: Mapped[str | None] = mapped_column(String(1))
    units_built: Mapped[int | None] = mapped_column(Integer)
    est_value_low: Mapped[int | None] = mapped_column(Integer)
    est_value_high: Mapped[int | None] = mapped_column(Integer)
    us_delivery: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    darkness_pct: Mapped[int | None] = mapped_column(SmallInteger)
    seed_source: Mapped[str | None] = mapped_column(Text)
    in_scope: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    designated_by: Mapped[str | None] = mapped_column(Text)
    designated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    notes: Mapped[str | None] = mapped_column(Text)

    chassis_seeds: Mapped[list["ChassisSeed"]] = relationship(back_populates="vehicle_model")


class Car(TimestampMixin, Base):
    __tablename__ = "cars"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    normalized_serial_number: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    display_serial_number: Mapped[str] = mapped_column(String(80), nullable=False)
    make: Mapped[str] = mapped_column(String(50), nullable=False)
    model: Mapped[str] = mapped_column(Text, nullable=False)
    variant: Mapped[str | None] = mapped_column(Text)
    year_built: Mapped[int | None] = mapped_column(SmallInteger)
    build_date: Mapped[date | None] = mapped_column(Date)
    build_date_precision: Mapped[str | None] = mapped_column(String(20))
    body_style: Mapped[str | None] = mapped_column(Text)
    drive_side: Mapped[str | None] = mapped_column(String(3))
    original_color: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    chassis_seed_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("chassis_seed.id"),
        unique=True,
    )
    geo_signal: Mapped[str | None] = mapped_column(Text)
    geo_region: Mapped[str | None] = mapped_column(Text)
    research_status: Mapped[str] = mapped_column(String(50), default="unresearched", nullable=False)
    estimated_value_usd: Mapped[int | None] = mapped_column(Integer)
    source_count: Mapped[int] = mapped_column(default=0, nullable=False)

    sources: Mapped[list["CarSource"]] = relationship(back_populates="car")
    custody_events: Mapped[list["CustodyEvent"]] = relationship(back_populates="car")
    car_events: Mapped[list["CarEvent"]] = relationship(back_populates="car")
    media_items: Mapped[list["CarMedia"]] = relationship(back_populates="car")
    darkness_score: Mapped["DarknessScore | None"] = relationship(back_populates="car")
    watchlist_entry: Mapped["WatchlistEntry | None"] = relationship(back_populates="car")
    chassis_seed: Mapped["ChassisSeed | None"] = relationship(
        "ChassisSeed",
        foreign_keys=[chassis_seed_id],
        back_populates="linked_car",
    )
    agent_runs: Mapped[list["AgentRun"]] = relationship(back_populates="car")
    provenance_reports: Mapped[list["ProvenanceReport"]] = relationship(back_populates="car")


class ChassisSeed(TimestampMixin, Base):
    __tablename__ = "chassis_seed"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    vehicle_model_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("vehicle_models.id"))
    chassis_number: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    engine_number: Mapped[str | None] = mapped_column(Text)
    production_number: Mapped[str | None] = mapped_column(Text)
    color_ext: Mapped[str | None] = mapped_column(Text)
    color_int: Mapped[str | None] = mapped_column(Text)
    delivery_date: Mapped[date | None] = mapped_column(Date)
    dealer: Mapped[str | None] = mapped_column(Text)
    destination_country: Mapped[str | None] = mapped_column(Text)
    destination_region: Mapped[str | None] = mapped_column(Text)
    us_spec: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    split_sump: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ac_factory: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_known_location: Mapped[str | None] = mapped_column(Text)
    last_known_owner: Mapped[str | None] = mapped_column(Text)
    dark_pct_est: Mapped[int | None] = mapped_column(SmallInteger)
    notes: Mapped[str | None] = mapped_column(Text)
    seed_source: Mapped[str | None] = mapped_column(Text)
    seed_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    confidence: Mapped[str] = mapped_column(String(50), default="probable", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    car_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("cars.id"), unique=True)

    vehicle_model: Mapped["VehicleModel | None"] = relationship(back_populates="chassis_seeds")
    matched_car: Mapped["Car | None"] = relationship("Car", foreign_keys=[car_id])
    linked_car: Mapped["Car | None"] = relationship(
        "Car",
        foreign_keys="Car.chassis_seed_id",
        back_populates="chassis_seed",
        uselist=False,
    )
    agent_runs: Mapped[list["AgentRun"]] = relationship(back_populates="chassis_seed")
    provenance_contacts: Mapped[list["ProvenanceContact"]] = relationship(back_populates="chassis_seed")
    provenance_reports: Mapped[list["ProvenanceReport"]] = relationship(back_populates="chassis_seed")


class CarSource(TimestampMixin, Base):
    __tablename__ = "car_sources"
    __table_args__ = (
        UniqueConstraint("car_id", "source_id", name="uq_car_source_link"),
        UniqueConstraint("source_id", "source_url", name="uq_source_url_per_source"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    car_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cars.id"), nullable=False)
    source_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sources.id"), nullable=False)
    source_url: Mapped[str] = mapped_column(Text, nullable=False)
    source_serial_number: Mapped[str] = mapped_column(String(80), nullable=False)
    source_make: Mapped[str | None] = mapped_column(String(50))
    source_model: Mapped[str | None] = mapped_column(Text)
    source_variant: Mapped[str | None] = mapped_column(Text)
    source_payload: Mapped[dict | None] = mapped_column(JSONB().with_variant(JSON(), "sqlite"))
    scraped_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    car: Mapped["Car"] = relationship(back_populates="sources")
    source: Mapped["Source"] = relationship(back_populates="source_cars")
    attributes: Mapped[list["CarAttribute"]] = relationship(back_populates="car_source")


class CarAttribute(Base):
    __tablename__ = "car_attributes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    car_source_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("car_sources.id"), nullable=False)
    attr_key: Mapped[str] = mapped_column(String(100), nullable=False)
    attr_value: Mapped[str] = mapped_column(Text, nullable=False)

    car_source: Mapped["CarSource"] = relationship(back_populates="attributes")


class CustodyEvent(TimestampMixin, Base):
    __tablename__ = "custody_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    car_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cars.id"), nullable=False)
    car_source_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("car_sources.id"), nullable=False)
    event_date: Mapped[datetime | None] = mapped_column(Date)
    event_date_precision: Mapped[str] = mapped_column(String(20), nullable=False)
    event_year: Mapped[int | None] = mapped_column(SmallInteger)
    owner_name: Mapped[str | None] = mapped_column(Text)
    location: Mapped[str | None] = mapped_column(Text)
    price_paid: Mapped[float | None] = mapped_column(Numeric(12, 2))
    price_currency: Mapped[str | None] = mapped_column(String(3))
    transaction_notes: Mapped[str | None] = mapped_column(Text)
    source_reference: Mapped[str | None] = mapped_column(Text)

    car: Mapped["Car"] = relationship(back_populates="custody_events")


class CarEvent(TimestampMixin, Base):
    __tablename__ = "car_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    car_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cars.id"), nullable=False)
    car_source_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("car_sources.id"), nullable=False)
    event_date: Mapped[datetime | None] = mapped_column(Date)
    event_date_precision: Mapped[str] = mapped_column(String(20), nullable=False)
    event_year: Mapped[int | None] = mapped_column(SmallInteger)
    event_name: Mapped[str | None] = mapped_column(Text)
    event_type: Mapped[str | None] = mapped_column(String(50))
    driver: Mapped[str | None] = mapped_column(Text)
    car_number: Mapped[str | None] = mapped_column(String(20))
    result: Mapped[str | None] = mapped_column(Text)
    location: Mapped[str | None] = mapped_column(Text)
    source_reference: Mapped[str | None] = mapped_column(Text)

    car: Mapped["Car"] = relationship(back_populates="car_events")


class CarMedia(TimestampMixin, Base):
    __tablename__ = "car_media"
    __table_args__ = (
        UniqueConstraint("car_source_id", "url", name="uq_car_source_media_url"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    car_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cars.id"), nullable=False)
    car_source_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("car_sources.id"), nullable=False)
    media_type: Mapped[str] = mapped_column(String(20), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    caption: Mapped[str | None] = mapped_column(Text)
    scraped_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    car: Mapped["Car"] = relationship(back_populates="media_items")


class DarknessScore(Base):
    __tablename__ = "darkness_scores"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    car_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cars.id"), nullable=False, unique=True)
    last_known_year: Mapped[int | None] = mapped_column(SmallInteger)
    first_reappear_year: Mapped[int | None] = mapped_column(SmallInteger)
    gap_start_year: Mapped[int | None] = mapped_column(SmallInteger)
    gap_end_year: Mapped[int | None] = mapped_column(SmallInteger)
    gap_years: Mapped[int | None] = mapped_column(SmallInteger)
    total_sightings: Mapped[int | None] = mapped_column()
    years_since_last_seen: Mapped[int | None] = mapped_column(SmallInteger)
    score: Mapped[float | None] = mapped_column(Numeric(5, 2))
    base_score: Mapped[float | None] = mapped_column(Numeric(5, 2))
    geo_bonus_applied: Mapped[float | None] = mapped_column(Numeric(5, 2), default=0)
    human_override_score: Mapped[float | None] = mapped_column(Numeric(5, 2))
    is_currently_dark: Mapped[bool] = mapped_column(default=False, nullable=False)
    qualifies_primary: Mapped[bool] = mapped_column(default=False, nullable=False)
    qualifies_secondary: Mapped[bool] = mapped_column(default=False, nullable=False)
    last_computed: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    car: Mapped["Car"] = relationship(back_populates="darkness_score")


class WatchlistEntry(TimestampMixin, Base):
    __tablename__ = "watchlist"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    car_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cars.id"), nullable=False, unique=True)
    priority: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    interest_reason: Mapped[str | None] = mapped_column(Text)
    agent_instructions: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)

    car: Mapped["Car"] = relationship(back_populates="watchlist_entry")


class ScrapeLog(Base):
    __tablename__ = "scrape_log"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    source_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sources.id"), nullable=False)
    run_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    mode: Mapped[str] = mapped_column(String(20), nullable=False)
    cars_found: Mapped[int | None] = mapped_column()
    cars_updated: Mapped[int | None] = mapped_column()
    errors: Mapped[list[str] | None] = mapped_column(JSONB().with_variant(JSON(), "sqlite"))
    duration_seconds: Mapped[int | None] = mapped_column()

    source: Mapped["Source"] = relationship(back_populates="scrape_logs")


class AppSetting(TimestampMixin, Base):
    __tablename__ = "app_settings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    value: Mapped[dict] = mapped_column(JSONB().with_variant(JSON(), "sqlite"), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)


class AgentRun(TimestampMixin, Base):
    __tablename__ = "agent_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    chassis_seed_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("chassis_seed.id"))
    car_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("cars.id"))
    triggered_by: Mapped[str | None] = mapped_column(Text)
    triggered_by_user: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50), default="running", nullable=False)
    phases_completed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error: Mapped[str | None] = mapped_column(Text)
    raw_results: Mapped[dict | list | None] = mapped_column(JSONB().with_variant(JSON(), "sqlite"))

    chassis_seed: Mapped["ChassisSeed | None"] = relationship(back_populates="agent_runs")
    car: Mapped["Car | None"] = relationship(back_populates="agent_runs")
    provenance_contacts: Mapped[list["ProvenanceContact"]] = relationship(back_populates="agent_run")
    provenance_reports: Mapped[list["ProvenanceReport"]] = relationship(back_populates="agent_run")


class ProvenanceContact(Base):
    __tablename__ = "provenance_contacts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    agent_run_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("agent_runs.id"))
    chassis_seed_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("chassis_seed.id"))
    priority: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str | None] = mapped_column(Text)
    org: Mapped[str | None] = mapped_column(Text)
    city: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(Text)
    email: Mapped[str | None] = mapped_column(Text)
    rationale: Mapped[str | None] = mapped_column(Text)
    target_chassis: Mapped[str | None] = mapped_column(Text)
    contact_status: Mapped[str] = mapped_column(String(50), default="not_contacted", nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    agent_run: Mapped["AgentRun | None"] = relationship(back_populates="provenance_contacts")
    chassis_seed: Mapped["ChassisSeed | None"] = relationship(back_populates="provenance_contacts")
    dealer_lookups: Mapped[list["DealerLookup"]] = relationship(back_populates="contact")


class ProvenanceReport(TimestampMixin, Base):
    __tablename__ = "provenance_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    agent_run_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("agent_runs.id"))
    car_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("cars.id"))
    chassis_seed_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("chassis_seed.id"))
    summary: Mapped[str | None] = mapped_column(Text)
    geo_region: Mapped[str | None] = mapped_column(Text)
    last_known_location: Mapped[str | None] = mapped_column(Text)
    estimated_value_usd: Mapped[int | None] = mapped_column(Integer)
    darkness_score: Mapped[int | None] = mapped_column(Integer)
    custody_chain: Mapped[list | dict | None] = mapped_column(JSONB().with_variant(JSON(), "sqlite"))
    recommended_actions: Mapped[list | dict | None] = mapped_column(JSONB().with_variant(JSON(), "sqlite"))
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)

    agent_run: Mapped["AgentRun | None"] = relationship(back_populates="provenance_reports")
    car: Mapped["Car | None"] = relationship(back_populates="provenance_reports")
    chassis_seed: Mapped["ChassisSeed | None"] = relationship(back_populates="provenance_reports")
    dealer_lookups: Mapped[list["DealerLookup"]] = relationship(back_populates="provenance_report")


class DealerLookup(Base):
    __tablename__ = "dealer_lookups"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    provenance_report_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("provenance_reports.id"))
    contact_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("provenance_contacts.id"))
    attempted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    outcome: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)

    provenance_report: Mapped["ProvenanceReport | None"] = relationship(back_populates="dealer_lookups")
    contact: Mapped["ProvenanceContact | None"] = relationship(back_populates="dealer_lookups")


class ScopeRejection(Base):
    __tablename__ = "scope_rejections"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    source_url: Mapped[str | None] = mapped_column(Text)
    make: Mapped[str | None] = mapped_column(Text)
    model: Mapped[str | None] = mapped_column(Text)
    reason: Mapped[str | None] = mapped_column(Text)
    rejected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
