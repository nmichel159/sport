"""Add event sport, participation mode, fee, and description."""

from alembic import op


revision = "0009_event_details"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE organization_events ADD COLUMN IF NOT EXISTS sport varchar(80) NOT NULL DEFAULT ''")
    op.execute("ALTER TABLE organization_events ADD COLUMN IF NOT EXISTS participation_type varchar(20) NOT NULL DEFAULT 'TEAM'")
    op.execute("ALTER TABLE organization_events ADD COLUMN IF NOT EXISTS fee numeric(10, 2)")
    op.execute("ALTER TABLE organization_events ADD COLUMN IF NOT EXISTS description text")


def downgrade():
    op.execute("ALTER TABLE organization_events DROP COLUMN IF EXISTS description")
    op.execute("ALTER TABLE organization_events DROP COLUMN IF EXISTS fee")
    op.execute("ALTER TABLE organization_events DROP COLUMN IF EXISTS participation_type")
    op.execute("ALTER TABLE organization_events DROP COLUMN IF EXISTS sport")
