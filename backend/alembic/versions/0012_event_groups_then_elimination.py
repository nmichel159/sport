"""Add persisted group stages for groups-then-elimination events."""

from alembic import op


revision = "0012_groups_elimination"
down_revision = "0011_event_single_elimination"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "CREATE TABLE organization_event_group_stages ("
        "id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "
        "event_id uuid NOT NULL UNIQUE REFERENCES organization_events(id) ON DELETE CASCADE, "
        "group_count integer NOT NULL CHECK (group_count > 0), "
        "advancing_count integer NOT NULL CHECK (advancing_count > 1), "
        "locked_at timestamptz, "
        "created_at timestamptz NOT NULL DEFAULT now())"
    )
    op.execute(
        "CREATE INDEX ix_organization_event_group_stages_event_id "
        "ON organization_event_group_stages(event_id)"
    )
    op.execute(
        "CREATE TABLE organization_event_groups ("
        "id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "
        "event_id uuid NOT NULL REFERENCES organization_events(id) ON DELETE CASCADE, "
        "position integer NOT NULL CHECK (position >= 0), "
        "name varchar(40) NOT NULL, "
        "UNIQUE(event_id, position))"
    )
    op.execute(
        "CREATE INDEX ix_organization_event_groups_event_id "
        "ON organization_event_groups(event_id)"
    )
    op.execute(
        "CREATE TABLE organization_event_group_members ("
        "group_id uuid NOT NULL REFERENCES organization_event_groups(id) ON DELETE CASCADE, "
        "registration_id uuid NOT NULL REFERENCES organization_event_registrations(id) ON DELETE CASCADE, "
        "seed_position integer NOT NULL CHECK (seed_position >= 0), "
        "qualified_seed integer CHECK (qualified_seed IS NULL OR qualified_seed > 0), "
        "PRIMARY KEY(group_id, registration_id), "
        "UNIQUE(group_id, seed_position), "
        "UNIQUE(registration_id))"
    )
    op.execute(
        "CREATE TABLE organization_event_group_matches ("
        "id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "
        "group_id uuid NOT NULL REFERENCES organization_event_groups(id) ON DELETE CASCADE, "
        "position integer NOT NULL CHECK (position >= 0), "
        "participant_a_registration_id uuid NOT NULL REFERENCES organization_event_registrations(id) ON DELETE CASCADE, "
        "participant_b_registration_id uuid NOT NULL REFERENCES organization_event_registrations(id) ON DELETE CASCADE, "
        "score_a integer CHECK (score_a IS NULL OR score_a >= 0), "
        "score_b integer CHECK (score_b IS NULL OR score_b >= 0), "
        "winner_registration_id uuid REFERENCES organization_event_registrations(id) ON DELETE SET NULL, "
        "created_at timestamptz NOT NULL DEFAULT now(), "
        "updated_at timestamptz NOT NULL DEFAULT now(), "
        "CHECK(participant_a_registration_id <> participant_b_registration_id), "
        "UNIQUE(group_id, position))"
    )
    op.execute(
        "CREATE INDEX ix_organization_event_group_matches_group_id "
        "ON organization_event_group_matches(group_id)"
    )


def downgrade():
    op.drop_table("organization_event_group_matches")
    op.drop_table("organization_event_group_members")
    op.drop_table("organization_event_groups")
    op.drop_table("organization_event_group_stages")
