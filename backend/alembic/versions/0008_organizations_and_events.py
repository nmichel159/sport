"""Add organizations, their members, and organizer events."""
from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE TABLE IF NOT EXISTS organizations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT, name varchar(180) NOT NULL, slug varchar(200) NOT NULL UNIQUE, is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now())")
    op.execute("CREATE TABLE IF NOT EXISTS organization_members (organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT, role varchar(20) NOT NULL DEFAULT 'MEMBER', joined_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(organization_id, user_id))")
    op.execute("CREATE TABLE IF NOT EXISTS organization_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT, name varchar(180) NOT NULL, event_date date, location varchar(180), created_at timestamptz NOT NULL DEFAULT now())")


def downgrade() -> None:
    raise NotImplementedError
