"""Add authentication profile fields used by the application."""

from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name varchar(255)")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url text")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language varchar(5) NOT NULL DEFAULT 'sk'")
    op.execute("ALTER TABLE users ADD CONSTRAINT ck_users_preferred_language CHECK (preferred_language IN ('sk','en'))")


def downgrade() -> None:
    raise NotImplementedError("Authentication migrations are not destructively downgraded.")
