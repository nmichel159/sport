"""Add complete event creation fields and event categories."""

from alembic import op


revision = "0014_event_creation_form"
down_revision = "0013_org_role_constraint"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE organization_events "
        "ADD COLUMN IF NOT EXISTS event_type varchar(20) "
        "NOT NULL DEFAULT 'TOURNAMENT'"
    )
    op.execute(
        "ALTER TABLE organization_events "
        "ADD COLUMN IF NOT EXISTS event_time time"
    )
    op.execute(
        "ALTER TABLE organization_events "
        "ADD COLUMN IF NOT EXISTS region varchar(120)"
    )
    op.execute(
        "ALTER TABLE organization_events "
        "ADD COLUMN IF NOT EXISTS city_id varchar(120)"
    )
    op.execute(
        "ALTER TABLE organization_events "
        "ADD COLUMN IF NOT EXISTS city varchar(120)"
    )
    op.execute(
        "ALTER TABLE organization_events "
        "ADD COLUMN IF NOT EXISTS venue varchar(240)"
    )
    op.execute(
        "ALTER TABLE organization_events "
        "ADD COLUMN IF NOT EXISTS cover_image_url text"
    )
    op.execute(
        "ALTER TABLE organization_events "
        "ADD COLUMN IF NOT EXISTS registration_open boolean "
        "NOT NULL DEFAULT true"
    )
    op.execute(
        "ALTER TABLE organization_events "
        "ADD COLUMN IF NOT EXISTS xp_points integer"
    )
    op.execute(
        "ALTER TABLE organization_events "
        "ADD CONSTRAINT ck_organization_events_event_type "
        "CHECK (event_type IN ('TOURNAMENT', 'LEAGUE'))"
    )
    op.execute(
        "CREATE TABLE organization_event_categories ("
        "id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "
        "event_id uuid NOT NULL REFERENCES organization_events(id) "
        "ON DELETE CASCADE, "
        "age_group varchar(20) NOT NULL, "
        "team_format varchar(20) NOT NULL, "
        "gender_category varchar(20) NOT NULL, "
        "fee numeric(10, 2) NOT NULL, "
        "capacity integer NOT NULL, "
        "created_at timestamptz NOT NULL DEFAULT now(), "
        "CONSTRAINT uq_event_category_taxonomy UNIQUE "
        "(event_id, age_group, team_format, gender_category), "
        "CONSTRAINT ck_event_category_age_group CHECK "
        "(age_group IN ('kids', 'junior', 'open', 'veterani')), "
        "CONSTRAINT ck_event_category_team_format CHECK "
        "(team_format IN ('1v1', '2v2', '3v3', '3v3g', '4v4', '5v5')), "
        "CONSTRAINT ck_event_category_gender CHECK "
        "(gender_category IN ('muzi', 'zeny', 'mix')), "
        "CONSTRAINT ck_event_category_fee CHECK (fee >= 0), "
        "CONSTRAINT ck_event_category_capacity CHECK (capacity > 0)"
        ")"
    )
    op.create_index(
        "ix_organization_event_categories_event_id",
        "organization_event_categories",
        ["event_id"],
    )
    op.create_index(
        "ix_organization_events_event_type",
        "organization_events",
        ["event_type"],
    )
    op.create_index(
        "ix_organization_events_region_city",
        "organization_events",
        ["region", "city"],
    )


def downgrade() -> None:
    op.drop_table("organization_event_categories")
    op.drop_index(
        "ix_organization_events_region_city",
        table_name="organization_events",
    )
    op.drop_index(
        "ix_organization_events_event_type",
        table_name="organization_events",
    )
    op.drop_constraint(
        "ck_organization_events_event_type",
        "organization_events",
        type_="check",
    )
    for column in (
        "xp_points",
        "registration_open",
        "cover_image_url",
        "venue",
        "city",
        "city_id",
        "region",
        "event_time",
        "event_type",
    ):
        op.drop_column("organization_events", column)
