"""add vehicle model sort order"""

revision = "20260317_0001"
down_revision = "500f0401f2d9"
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.add_column("vehicle_models", sa.Column("sort_order", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("vehicle_models", "sort_order")
