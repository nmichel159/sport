"""Add registrations for organization events."""

from alembic import op


revision = "0010_event_registrations"
down_revision = "0009_event_details"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("CREATE TABLE organization_event_registrations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES organization_events(id) ON DELETE CASCADE, user_id uuid REFERENCES users(id) ON DELETE CASCADE, team_id uuid REFERENCES teams(id) ON DELETE CASCADE, registered_at timestamptz NOT NULL DEFAULT now(), CHECK ((user_id IS NOT NULL AND team_id IS NULL) OR (user_id IS NULL AND team_id IS NOT NULL)))")
    op.execute("CREATE UNIQUE INDEX uq_event_registration_user ON organization_event_registrations(event_id, user_id) WHERE user_id IS NOT NULL")
    op.execute("CREATE UNIQUE INDEX uq_event_registration_team ON organization_event_registrations(event_id, team_id) WHERE team_id IS NOT NULL")


def downgrade():
    op.drop_table("organization_event_registrations")
