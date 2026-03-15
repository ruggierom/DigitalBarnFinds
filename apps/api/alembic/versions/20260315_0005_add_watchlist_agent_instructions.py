"""add watchlist agent instructions

Revision ID: 20260315_0005
Revises: 20260315_0004
Create Date: 2026-03-15 14:30:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260315_0005"
down_revision = "20260315_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("watchlist", sa.Column("agent_instructions", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("watchlist", "agent_instructions")
