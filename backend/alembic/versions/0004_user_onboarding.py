"""Persist completion of the first-login questionnaire."""
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false")
    # Accounts that existed before onboarding was introduced retain direct access.
    op.execute("UPDATE users SET onboarding_completed = true WHERE last_login_at IS NOT NULL")

def downgrade() -> None:
    raise NotImplementedError
