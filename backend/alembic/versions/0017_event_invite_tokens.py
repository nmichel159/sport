"""Add opaque tokens for event QR invitations."""

from alembic import op


revision = "0017_event_invite_tokens"
down_revision = "0016_offline_tournament_sync"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE organization_events "
        "ADD COLUMN invite_token varchar(64)"
    )
    op.execute(
        "UPDATE organization_events "
        "SET invite_token = replace(gen_random_uuid()::text, '-', '') "
        "|| replace(gen_random_uuid()::text, '-', '') "
        "WHERE invite_token IS NULL"
    )
    op.alter_column("organization_events", "invite_token", nullable=False)
    op.create_unique_constraint(
        "uq_organization_events_invite_token",
        "organization_events",
        ["invite_token"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_organization_events_invite_token",
        "organization_events",
        type_="unique",
    )
    op.drop_column("organization_events", "invite_token")
