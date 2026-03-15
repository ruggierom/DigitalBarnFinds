"""add build date metadata to cars

Revision ID: 20260315_0004
Revises: 20260315_0003
Create Date: 2026-03-15 20:10:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260315_0004"
down_revision: str | None = "20260315_0003"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("cars", sa.Column("build_date", sa.Date(), nullable=True))
    op.add_column("cars", sa.Column("build_date_precision", sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column("cars", "build_date_precision")
    op.drop_column("cars", "build_date")
