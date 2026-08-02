"""match result details

Revision ID: 0015_match_result_details
Revises: 0014_event_creation_form
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0015_match_result_details"
down_revision = "0014_event_creation_form"
branch_labels = None
depends_on = None


def _add_detail_columns(table_name: str) -> None:
    op.add_column(table_name, sa.Column("pitch", sa.String(length=40), nullable=True))
    op.add_column(table_name, sa.Column("scheduled_start", sa.Time(), nullable=True))
    op.add_column(
        table_name,
        sa.Column(
            "mvp_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )


def upgrade() -> None:
    _add_detail_columns("organization_event_matches")
    _add_detail_columns("organization_event_group_matches")

    op.create_table(
        "organization_event_match_scorers",
        sa.Column(
            "match_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organization_event_matches.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            primary_key=True,
        ),
        sa.Column("goals", sa.Integer(), nullable=False),
        sa.CheckConstraint("goals > 0", name="ck_event_match_scorer_goals"),
    )
    op.create_table(
        "organization_event_group_match_scorers",
        sa.Column(
            "match_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organization_event_group_matches.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            primary_key=True,
        ),
        sa.Column("goals", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "goals > 0",
            name="ck_event_group_match_scorer_goals",
        ),
    )


def downgrade() -> None:
    op.drop_table("organization_event_group_match_scorers")
    op.drop_table("organization_event_match_scorers")
    for table_name in (
        "organization_event_group_matches",
        "organization_event_matches",
    ):
        op.drop_column(table_name, "mvp_user_id")
        op.drop_column(table_name, "scheduled_start")
        op.drop_column(table_name, "pitch")
