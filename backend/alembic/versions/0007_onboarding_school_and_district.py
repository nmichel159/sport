"""Store the school and district city selected during onboarding."""
from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS school_code varchar(20)")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS district_city varchar(100)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_school_code ON users(school_code)")


def downgrade() -> None:
    raise NotImplementedError
