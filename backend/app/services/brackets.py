"""Deterministic layout helpers for persisted tournament brackets."""

import random
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Generic, TypeVar


Participant = TypeVar("Participant")


@dataclass(frozen=True)
class GroupStanding(Generic[Participant]):
    participant: Participant
    played: int
    wins: int
    draws: int
    losses: int
    score_for: int
    score_against: int
    points: int

    @property
    def score_difference(self) -> int:
        return self.score_for - self.score_against


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


def seeded_single_elimination_layout(
    participants: Sequence[Participant],
) -> tuple[int, int, list[tuple[Participant, Participant | None]]]:
    """Place participants ordered from best to worst into a seeded bracket."""
    if len(participants) < 2:
        raise ValueError("At least two participants are required")

    bracket_size = 1 << (len(participants) - 1).bit_length()
    round_count = bracket_size.bit_length() - 1
    seed_order = [1, 2]
    while len(seed_order) < bracket_size:
        next_size = len(seed_order) * 2
        seed_order = [
            placed_seed
            for seed in seed_order
            for placed_seed in (seed, next_size + 1 - seed)
        ]

    slots = [
        participants[seed - 1] if seed <= len(participants) else None
        for seed in seed_order
    ]
    pairs: list[tuple[Participant, Participant | None]] = []
    for index in range(0, len(slots), 2):
        first, second = slots[index], slots[index + 1]
        if first is None:
            raise ValueError("Invalid seeded bracket layout")
        pairs.append((first, second))
    return bracket_size, round_count, pairs


def balanced_round_robin_groups(
    participants: Sequence[Participant], group_count: int, seed: int
) -> list[list[Participant]]:
    """Shuffle and distribute participants into equally sized groups."""
    if group_count < 1:
        raise ValueError("At least one group is required")
    if len(participants) % group_count:
        raise ValueError("Participants must divide evenly into groups")
    if len(participants) // group_count < 2:
        raise ValueError("Each group requires at least two participants")

    shuffled = list(participants)
    random.Random(seed).shuffle(shuffled)
    groups: list[list[Participant]] = [[] for _ in range(group_count)]
    for index, participant in enumerate(shuffled):
        groups[index % group_count].append(participant)
    return groups


def round_robin_pairs(
    participants: Sequence[Participant],
) -> list[tuple[Participant, Participant]]:
    """Return every unique participant pairing exactly once."""
    return [
        (participants[first], participants[second])
        for first in range(len(participants))
        for second in range(first + 1, len(participants))
    ]


def rank_group(
    participants: Sequence[Participant],
    results: Sequence[tuple[Participant, Participant, int, int]],
) -> list[GroupStanding[Participant]]:
    """Rank one group by points, score difference, score, then wins."""
    seed_order = {
        participant: index for index, participant in enumerate(participants)
    }
    statistics = {
        participant: {
            "played": 0,
            "wins": 0,
            "draws": 0,
            "losses": 0,
            "score_for": 0,
            "score_against": 0,
            "points": 0,
        }
        for participant in participants
    }

    for participant_a, participant_b, score_a, score_b in results:
        if participant_a not in statistics or participant_b not in statistics:
            raise ValueError("A result contains a participant outside the group")
        stats_a = statistics[participant_a]
        stats_b = statistics[participant_b]
        stats_a["played"] += 1
        stats_b["played"] += 1
        stats_a["score_for"] += score_a
        stats_a["score_against"] += score_b
        stats_b["score_for"] += score_b
        stats_b["score_against"] += score_a
        if score_a > score_b:
            stats_a["wins"] += 1
            stats_a["points"] += 3
            stats_b["losses"] += 1
        elif score_b > score_a:
            stats_b["wins"] += 1
            stats_b["points"] += 3
            stats_a["losses"] += 1
        else:
            stats_a["draws"] += 1
            stats_b["draws"] += 1
            stats_a["points"] += 1
            stats_b["points"] += 1

    standings = [
        GroupStanding(participant=participant, **values)
        for participant, values in statistics.items()
    ]
    return sorted(
        standings,
        key=lambda standing: (
            -standing.points,
            -standing.score_difference,
            -standing.score_for,
            -standing.wins,
            seed_order[standing.participant],
        ),
    )


def select_group_qualifiers(
    ranked_groups: Sequence[Sequence[GroupStanding[Participant]]],
    advancing_count: int,
) -> list[GroupStanding[Participant]]:
    """Select qualifiers by group place, then comparable group statistics."""
    candidates = [
        (rank, group_index, seed_index, standing)
        for group_index, group in enumerate(ranked_groups)
        for seed_index, standing in enumerate(group)
        for rank in [seed_index + 1]
    ]
    if advancing_count < 2 or advancing_count > len(candidates):
        raise ValueError("Invalid advancing participant count")
    candidates.sort(
        key=lambda item: (
            item[0],
            -item[3].points,
            -item[3].score_difference,
            -item[3].score_for,
            -item[3].wins,
            item[1],
            item[2],
        )
    )
    return [candidate[3] for candidate in candidates[:advancing_count]]
