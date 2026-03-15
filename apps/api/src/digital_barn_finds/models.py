from __future__ import annotations

import uuid
from datetime import UTC, date, datetime

from sqlalchemy import JSON, Date, DateTime, ForeignKey, Numeric, SmallInteger, String, Text, UniqueConstraint
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
    source_count: Mapped[int] = mapped_column(default=0, nullable=False)

    sources: Mapped[list["CarSource"]] = relationship(back_populates="car")
    custody_events: Mapped[list["CustodyEvent"]] = relationship(back_populates="car")
    car_events: Mapped[list["CarEvent"]] = relationship(back_populates="car")
    media_items: Mapped[list["CarMedia"]] = relationship(back_populates="car")
    darkness_score: Mapped["DarknessScore | None"] = relationship(back_populates="car")
    watchlist_entry: Mapped["WatchlistEntry | None"] = relationship(back_populates="car")


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
