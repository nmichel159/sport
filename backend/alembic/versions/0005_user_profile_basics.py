"""Store the basic profile details collected during onboarding."""
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name varchar(100)")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name varchar(100)")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date date")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS gender varchar(30)")


def downgrade() -> None:
    raise NotImplementedError
