"""Constrain organization membership roles."""

from alembic import op


revision = "0013_org_role_constraint"
down_revision = "0012_groups_elimination"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE organization_members "
        "ADD CONSTRAINT ck_organization_members_role "
        "CHECK (role IN ('ADMIN', 'MEMBER'))"
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_organization_members_role",
        "organization_members",
        type_="check",
    )
