"""enforce source uniqueness

Revision ID: 20260315_0003
Revises: 20260315_0002
Create Date: 2026-03-15 16:05:00
"""

from collections.abc import Sequence

from alembic import op


revision: str = "20260315_0003"
down_revision: str | None = "20260315_0002"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_source_url_per_source",
        "car_sources",
        ["source_id", "source_url"],
    )
    op.create_unique_constraint(
        "uq_car_source_media_url",
        "car_media",
        ["car_source_id", "url"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_car_source_media_url", "car_media", type_="unique")
    op.drop_constraint("uq_source_url_per_source", "car_sources", type_="unique")
