"""Add a tournament format and persisted single-elimination matches to events."""

from alembic import op


revision = "0011_event_single_elimination"
down_revision = "0010_event_registrations"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "ALTER TABLE organization_events "
        "ADD COLUMN format_id uuid REFERENCES tournament_formats(id) ON DELETE RESTRICT"
    )
    op.execute(
        "UPDATE organization_events SET format_id = "
        "(SELECT id FROM tournament_formats WHERE code = 'SINGLE_ELIMINATION') "
        "WHERE format_id IS NULL"
    )
    op.execute(
        "CREATE TABLE organization_event_matches ("
        "id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "
        "event_id uuid NOT NULL REFERENCES organization_events(id) ON DELETE CASCADE, "
        "round_number integer NOT NULL CHECK (round_number > 0), "
        "position integer NOT NULL CHECK (position >= 0), "
        "participant_a_registration_id uuid REFERENCES organization_event_registrations(id) ON DELETE SET NULL, "
        "participant_b_registration_id uuid REFERENCES organization_event_registrations(id) ON DELETE SET NULL, "
        "score_a integer CHECK (score_a IS NULL OR score_a >= 0), "
        "score_b integer CHECK (score_b IS NULL OR score_b >= 0), "
        "winner_registration_id uuid REFERENCES organization_event_registrations(id) ON DELETE SET NULL, "
        "created_at timestamptz NOT NULL DEFAULT now(), "
        "UNIQUE(event_id, round_number, position))"
    )
    op.execute(
        "CREATE INDEX ix_organization_event_matches_event_id "
        "ON organization_event_matches(event_id)"
    )


def downgrade():
    op.drop_table("organization_event_matches")
    op.drop_column("organization_events", "format_id")
