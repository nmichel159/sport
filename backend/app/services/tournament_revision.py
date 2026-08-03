"""Revision helpers shared by online and offline tournament mutations."""

import uuid
from datetime import datetime, timezone

from app.models.user import OrganizationEvent


def bump_tournament_revision(
    event: OrganizationEvent,
    mutation_id: uuid.UUID | None = None,
) -> None:
    event.tournament_revision = (event.tournament_revision or 0) + 1
    event.tournament_updated_at = datetime.now(timezone.utc)
    event.last_tournament_mutation_id = mutation_id
