"""initial schema

Revision ID: 20260314_0001
Revises:
Create Date: 2026-03-14 12:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260314_0001"
down_revision: str | None = None
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "app_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("key", sa.String(length=100), nullable=False),
        sa.Column("value", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("key"),
    )
    op.create_table(
        "cars",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("normalized_serial_number", sa.String(length=80), nullable=False),
        sa.Column("display_serial_number", sa.String(length=80), nullable=False),
        sa.Column("make", sa.String(length=50), nullable=False),
        sa.Column("model", sa.String(length=100), nullable=False),
        sa.Column("variant", sa.String(length=100), nullable=True),
        sa.Column("year_built", sa.SmallInteger(), nullable=True),
        sa.Column("body_style", sa.String(length=100), nullable=True),
        sa.Column("drive_side", sa.String(length=3), nullable=True),
        sa.Column("original_color", sa.String(length=100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("source_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("normalized_serial_number"),
    )
    op.create_table(
        "sources",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("base_url", sa.Text(), nullable=False),
        sa.Column("scraper_key", sa.String(length=100), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("last_scraped_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "car_sources",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("car_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_url", sa.Text(), nullable=False),
        sa.Column("source_serial_number", sa.String(length=80), nullable=False),
        sa.Column("source_make", sa.String(length=50), nullable=True),
        sa.Column("source_model", sa.String(length=100), nullable=True),
        sa.Column("source_variant", sa.String(length=100), nullable=True),
        sa.Column("source_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("scraped_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["car_id"], ["cars.id"]),
        sa.ForeignKeyConstraint(["source_id"], ["sources.id"]),
        sa.UniqueConstraint("car_id", "source_id", name="uq_car_source_link"),
    )
    op.create_table(
        "darkness_scores",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("car_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("last_known_year", sa.SmallInteger(), nullable=True),
        sa.Column("first_reappear_year", sa.SmallInteger(), nullable=True),
        sa.Column("gap_start_year", sa.SmallInteger(), nullable=True),
        sa.Column("gap_end_year", sa.SmallInteger(), nullable=True),
        sa.Column("gap_years", sa.SmallInteger(), nullable=True),
        sa.Column("total_sightings", sa.Integer(), nullable=True),
        sa.Column("years_since_last_seen", sa.SmallInteger(), nullable=True),
        sa.Column("score", sa.Numeric(5, 2), nullable=True),
        sa.Column("is_currently_dark", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("qualifies_primary", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("qualifies_secondary", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("last_computed", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["car_id"], ["cars.id"]),
        sa.UniqueConstraint("car_id"),
    )
    op.create_table(
        "watchlist",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("car_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("priority", sa.SmallInteger(), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("interest_reason", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["car_id"], ["cars.id"]),
        sa.UniqueConstraint("car_id"),
    )
    op.create_table(
        "car_attributes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("car_source_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("attr_key", sa.String(length=100), nullable=False),
        sa.Column("attr_value", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["car_source_id"], ["car_sources.id"]),
    )
    op.create_table(
        "car_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("car_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("car_source_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_date", sa.Date(), nullable=True),
        sa.Column("event_date_precision", sa.String(length=20), nullable=False),
        sa.Column("event_year", sa.SmallInteger(), nullable=True),
        sa.Column("event_name", sa.Text(), nullable=True),
        sa.Column("event_type", sa.String(length=50), nullable=True),
        sa.Column("driver", sa.Text(), nullable=True),
        sa.Column("car_number", sa.String(length=20), nullable=True),
        sa.Column("result", sa.Text(), nullable=True),
        sa.Column("location", sa.Text(), nullable=True),
        sa.Column("source_reference", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["car_id"], ["cars.id"]),
        sa.ForeignKeyConstraint(["car_source_id"], ["car_sources.id"]),
    )
    op.create_table(
        "car_media",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("car_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("car_source_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("media_type", sa.String(length=20), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("caption", sa.Text(), nullable=True),
        sa.Column("scraped_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["car_id"], ["cars.id"]),
        sa.ForeignKeyConstraint(["car_source_id"], ["car_sources.id"]),
    )
    op.create_table(
        "custody_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("car_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("car_source_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_date", sa.Date(), nullable=True),
        sa.Column("event_date_precision", sa.String(length=20), nullable=False),
        sa.Column("event_year", sa.SmallInteger(), nullable=True),
        sa.Column("owner_name", sa.Text(), nullable=True),
        sa.Column("location", sa.Text(), nullable=True),
        sa.Column("price_paid", sa.Numeric(12, 2), nullable=True),
        sa.Column("price_currency", sa.String(length=3), nullable=True),
        sa.Column("transaction_notes", sa.Text(), nullable=True),
        sa.Column("source_reference", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["car_id"], ["cars.id"]),
        sa.ForeignKeyConstraint(["car_source_id"], ["car_sources.id"]),
    )
    op.create_table(
        "scrape_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("source_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("run_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("mode", sa.String(length=20), nullable=False),
        sa.Column("cars_found", sa.Integer(), nullable=True),
        sa.Column("cars_updated", sa.Integer(), nullable=True),
        sa.Column("errors", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["source_id"], ["sources.id"]),
    )


def downgrade() -> None:
    op.drop_table("scrape_log")
    op.drop_table("custody_events")
    op.drop_table("car_media")
    op.drop_table("car_events")
    op.drop_table("car_attributes")
    op.drop_table("watchlist")
    op.drop_table("darkness_scores")
    op.drop_table("car_sources")
    op.drop_table("sources")
    op.drop_table("cars")
    op.drop_table("app_settings")

