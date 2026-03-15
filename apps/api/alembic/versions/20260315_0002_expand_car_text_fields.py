"""expand car text fields

Revision ID: 20260315_0002
Revises: 20260314_0001
Create Date: 2026-03-15 15:20:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260315_0002"
down_revision: str | None = "20260314_0001"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("cars", "model", existing_type=sa.String(length=100), type_=sa.Text(), existing_nullable=False)
    op.alter_column("cars", "variant", existing_type=sa.String(length=100), type_=sa.Text(), existing_nullable=True)
    op.alter_column("cars", "body_style", existing_type=sa.String(length=100), type_=sa.Text(), existing_nullable=True)
    op.alter_column(
        "cars",
        "original_color",
        existing_type=sa.String(length=100),
        type_=sa.Text(),
        existing_nullable=True,
    )
    op.alter_column(
        "car_sources",
        "source_model",
        existing_type=sa.String(length=100),
        type_=sa.Text(),
        existing_nullable=True,
    )
    op.alter_column(
        "car_sources",
        "source_variant",
        existing_type=sa.String(length=100),
        type_=sa.Text(),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "car_sources",
        "source_variant",
        existing_type=sa.Text(),
        type_=sa.String(length=100),
        existing_nullable=True,
    )
    op.alter_column(
        "car_sources",
        "source_model",
        existing_type=sa.Text(),
        type_=sa.String(length=100),
        existing_nullable=True,
    )
    op.alter_column(
        "cars",
        "original_color",
        existing_type=sa.Text(),
        type_=sa.String(length=100),
        existing_nullable=True,
    )
    op.alter_column("cars", "body_style", existing_type=sa.Text(), type_=sa.String(length=100), existing_nullable=True)
    op.alter_column("cars", "variant", existing_type=sa.Text(), type_=sa.String(length=100), existing_nullable=True)
    op.alter_column("cars", "model", existing_type=sa.Text(), type_=sa.String(length=100), existing_nullable=False)
