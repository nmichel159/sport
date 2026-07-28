"""Deterministic layout helpers for persisted tournament brackets."""

import random
from collections.abc import Sequence
from typing import TypeVar


Participant = TypeVar("Participant")


def single_elimination_layout(
    participants: Sequence[Participant], seed: int
) -> tuple[int, int, list[tuple[Participant, Participant | None]]]:
    """Return bracket size, round count and complete first-round pairings."""
    if len(participants) < 2:
        raise ValueError("At least two participants are required")

    shuffled = list(participants)
    rng = random.Random(seed)
    rng.shuffle(shuffled)
    bracket_size = 1 << (len(shuffled) - 1).bit_length()
    bye_count = bracket_size - len(shuffled)
    round_count = bracket_size.bit_length() - 1

    pairs: list[tuple[Participant, Participant | None]] = []
    cursor = 0
    for _ in range(bye_count):
        pairs.append((shuffled[cursor], None))
        cursor += 1
    while cursor < len(shuffled):
        pairs.append((shuffled[cursor], shuffled[cursor + 1]))
        cursor += 2
    rng.shuffle(pairs)
    return bracket_size, round_count, pairs
