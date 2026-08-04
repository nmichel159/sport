"""Backfill a discoverable region for legacy events."""

from alembic import op


revision = "0018_backfill_event_regions"
down_revision = "0017_event_invite_tokens"
branch_labels = None
depends_on = None


def upgrade() -> None:
    source = "coalesce(city, '') || ' ' || coalesce(location, '')"
    op.execute(
        "UPDATE organization_events SET region = CASE "
        f"WHEN {source} ILIKE '%Bratislav%' THEN 'Bratislavský kraj' "
        f"WHEN {source} ILIKE '%Trnav%' THEN 'Trnavský kraj' "
        f"WHEN {source} ILIKE '%Trenč%' OR {source} ILIKE '%Trenc%' THEN 'Trenčiansky kraj' "
        f"WHEN {source} ILIKE '%Nitr%' THEN 'Nitriansky kraj' "
        f"WHEN {source} ILIKE '%Žilin%' OR {source} ILIKE '%Zilin%' THEN 'Žilinský kraj' "
        f"WHEN {source} ILIKE '%Banská Bystrica%' OR {source} ILIKE '%Banska Bystrica%' THEN 'Banskobystrický kraj' "
        f"WHEN {source} ILIKE '%Prešov%' OR {source} ILIKE '%Presov%' THEN 'Prešovský kraj' "
        f"WHEN {source} ILIKE '%Košic%' OR {source} ILIKE '%Kosic%' THEN 'Košický kraj' "
        "ELSE 'Celé Slovensko' END "
        "WHERE region IS NULL OR btrim(region) = ''"
    )


def downgrade() -> None:
    # This is a data repair. It intentionally does not discard the recovered regions.
    pass
