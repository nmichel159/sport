"""Add optimistic revision metadata for offline tournament synchronization."""

from alembic import op


revision = "0016_offline_tournament_sync"
down_revision = "0015_match_result_details"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE organization_events "
        "ADD COLUMN tournament_revision bigint NOT NULL DEFAULT 0"
    )
    op.execute(
        "ALTER TABLE organization_events "
        "ADD COLUMN tournament_updated_at timestamptz NOT NULL DEFAULT now()"
    )
    op.execute(
        "ALTER TABLE organization_events "
        "ADD COLUMN last_tournament_mutation_id uuid"
    )


def downgrade() -> None:
    op.drop_column("organization_events", "last_tournament_mutation_id")
    op.drop_column("organization_events", "tournament_updated_at")
    op.drop_column("organization_events", "tournament_revision")
