"""Add the application nickname and make it unique for player lookup."""
from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname citext")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_users_nickname ON users(nickname) WHERE nickname IS NOT NULL")


def downgrade() -> None:
    raise NotImplementedError
