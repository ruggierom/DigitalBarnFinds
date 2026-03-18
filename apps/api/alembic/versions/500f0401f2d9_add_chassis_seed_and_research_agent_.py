"""add chassis seed and research agent tables"""

# ruff: noqa: E402

revision = '500f0401f2d9'
down_revision = '20260315_0005'
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


def upgrade() -> None:
    op.create_table(
        'vehicle_models',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('make', sa.Text(), nullable=False),
        sa.Column('model', sa.Text(), nullable=False),
        sa.Column('variant', sa.Text(), nullable=True),
        sa.Column('tier', sa.String(length=1), nullable=True),
        sa.Column('units_built', sa.Integer(), nullable=True),
        sa.Column('est_value_low', sa.Integer(), nullable=True),
        sa.Column('est_value_high', sa.Integer(), nullable=True),
        sa.Column('us_delivery', sa.Boolean(), nullable=False),
        sa.Column('darkness_pct', sa.SmallInteger(), nullable=True),
        sa.Column('seed_source', sa.Text(), nullable=True),
        sa.Column('in_scope', sa.Boolean(), nullable=False),
        sa.Column('designated_by', sa.Text(), nullable=True),
        sa.Column('designated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("tier IN ('A', 'B', 'C', 'D')", name='ck_vehicle_models_tier'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'scope_rejections',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('source_url', sa.Text(), nullable=True),
        sa.Column('make', sa.Text(), nullable=True),
        sa.Column('model', sa.Text(), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('rejected_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'chassis_seed',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('vehicle_model_id', sa.UUID(), nullable=True),
        sa.Column('chassis_number', sa.Text(), nullable=False),
        sa.Column('engine_number', sa.Text(), nullable=True),
        sa.Column('production_number', sa.Text(), nullable=True),
        sa.Column('color_ext', sa.Text(), nullable=True),
        sa.Column('color_int', sa.Text(), nullable=True),
        sa.Column('delivery_date', sa.Date(), nullable=True),
        sa.Column('dealer', sa.Text(), nullable=True),
        sa.Column('destination_country', sa.Text(), nullable=True),
        sa.Column('destination_region', sa.Text(), nullable=True),
        sa.Column('us_spec', sa.Boolean(), nullable=False),
        sa.Column('split_sump', sa.Boolean(), nullable=False),
        sa.Column('ac_factory', sa.Boolean(), nullable=False),
        sa.Column('last_known_location', sa.Text(), nullable=True),
        sa.Column('last_known_owner', sa.Text(), nullable=True),
        sa.Column('dark_pct_est', sa.SmallInteger(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('seed_source', sa.Text(), nullable=True),
        sa.Column('seed_date', sa.Date(), nullable=False),
        sa.Column('confidence', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('car_id', sa.UUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['car_id'], ['cars.id'], name='fk_chassis_seed_car_id_cars'),
        sa.ForeignKeyConstraint(
            ['vehicle_model_id'],
            ['vehicle_models.id'],
            name='fk_chassis_seed_vehicle_model_id_vehicle_models',
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('car_id', name='uq_chassis_seed_car_id'),
        sa.UniqueConstraint('chassis_number', name='uq_chassis_seed_chassis_number'),
    )
    op.create_table(
        'agent_runs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('chassis_seed_id', sa.UUID(), nullable=True),
        sa.Column('car_id', sa.UUID(), nullable=True),
        sa.Column('triggered_by', sa.Text(), nullable=True),
        sa.Column('triggered_by_user', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('phases_completed', sa.Integer(), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('raw_results', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['car_id'], ['cars.id'], name='fk_agent_runs_car_id_cars'),
        sa.ForeignKeyConstraint(
            ['chassis_seed_id'],
            ['chassis_seed.id'],
            name='fk_agent_runs_chassis_seed_id_chassis_seed',
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'provenance_contacts',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('agent_run_id', sa.UUID(), nullable=True),
        sa.Column('chassis_seed_id', sa.UUID(), nullable=True),
        sa.Column('priority', sa.Integer(), nullable=False),
        sa.Column('name', sa.Text(), nullable=True),
        sa.Column('org', sa.Text(), nullable=True),
        sa.Column('city', sa.Text(), nullable=True),
        sa.Column('phone', sa.Text(), nullable=True),
        sa.Column('email', sa.Text(), nullable=True),
        sa.Column('rationale', sa.Text(), nullable=True),
        sa.Column('target_chassis', sa.Text(), nullable=True),
        sa.Column('contact_status', sa.String(length=50), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ['agent_run_id'],
            ['agent_runs.id'],
            name='fk_provenance_contacts_agent_run_id_agent_runs',
        ),
        sa.ForeignKeyConstraint(
            ['chassis_seed_id'],
            ['chassis_seed.id'],
            name='fk_provenance_contacts_chassis_seed_id_chassis_seed',
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'provenance_reports',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('agent_run_id', sa.UUID(), nullable=True),
        sa.Column('car_id', sa.UUID(), nullable=True),
        sa.Column('chassis_seed_id', sa.UUID(), nullable=True),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('geo_region', sa.Text(), nullable=True),
        sa.Column('last_known_location', sa.Text(), nullable=True),
        sa.Column('estimated_value_usd', sa.Integer(), nullable=True),
        sa.Column('darkness_score', sa.Integer(), nullable=True),
        sa.Column('custody_chain', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('recommended_actions', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ['agent_run_id'],
            ['agent_runs.id'],
            name='fk_provenance_reports_agent_run_id_agent_runs',
        ),
        sa.ForeignKeyConstraint(['car_id'], ['cars.id'], name='fk_provenance_reports_car_id_cars'),
        sa.ForeignKeyConstraint(
            ['chassis_seed_id'],
            ['chassis_seed.id'],
            name='fk_provenance_reports_chassis_seed_id_chassis_seed',
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'dealer_lookups',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('provenance_report_id', sa.UUID(), nullable=True),
        sa.Column('contact_id', sa.UUID(), nullable=True),
        sa.Column('attempted_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('outcome', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(
            ['contact_id'],
            ['provenance_contacts.id'],
            name='fk_dealer_lookups_contact_id_provenance_contacts',
        ),
        sa.ForeignKeyConstraint(
            ['provenance_report_id'],
            ['provenance_reports.id'],
            name='fk_dealer_lookups_provenance_report_id_provenance_reports',
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.add_column('cars', sa.Column('chassis_seed_id', sa.UUID(), nullable=True))
    op.add_column('cars', sa.Column('geo_signal', sa.Text(), nullable=True))
    op.add_column('cars', sa.Column('geo_region', sa.Text(), nullable=True))
    op.add_column(
        'cars',
        sa.Column(
            'research_status',
            sa.String(length=50),
            nullable=False,
            server_default='unresearched',
        ),
    )
    op.add_column('cars', sa.Column('estimated_value_usd', sa.Integer(), nullable=True))
    op.create_unique_constraint('uq_cars_chassis_seed_id', 'cars', ['chassis_seed_id'])
    op.create_foreign_key(
        'fk_cars_chassis_seed_id_chassis_seed',
        'cars',
        'chassis_seed',
        ['chassis_seed_id'],
        ['id'],
    )
    op.alter_column('cars', 'research_status', server_default=None)
    op.add_column('darkness_scores', sa.Column('base_score', sa.Numeric(precision=5, scale=2), nullable=True))
    op.add_column(
        'darkness_scores',
        sa.Column(
            'geo_bonus_applied',
            sa.Numeric(precision=5, scale=2),
            nullable=True,
            server_default='0',
        ),
    )
    op.add_column(
        'darkness_scores',
        sa.Column('human_override_score', sa.Numeric(precision=5, scale=2), nullable=True),
    )
    op.alter_column('darkness_scores', 'geo_bonus_applied', server_default=None)


def downgrade() -> None:
    op.drop_column('darkness_scores', 'human_override_score')
    op.drop_column('darkness_scores', 'geo_bonus_applied')
    op.drop_column('darkness_scores', 'base_score')
    op.drop_constraint('fk_cars_chassis_seed_id_chassis_seed', 'cars', type_='foreignkey')
    op.drop_constraint('uq_cars_chassis_seed_id', 'cars', type_='unique')
    op.drop_column('cars', 'estimated_value_usd')
    op.drop_column('cars', 'research_status')
    op.drop_column('cars', 'geo_region')
    op.drop_column('cars', 'geo_signal')
    op.drop_column('cars', 'chassis_seed_id')
    op.drop_table('dealer_lookups')
    op.drop_table('provenance_reports')
    op.drop_table('provenance_contacts')
    op.drop_table('agent_runs')
    op.drop_table('chassis_seed')
    op.drop_table('scope_rejections')
    op.drop_table('vehicle_models')
