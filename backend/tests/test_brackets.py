import pytest

from app.services.brackets import (
    balanced_round_robin_groups,
    rank_group,
    round_robin_pairs,
    seeded_single_elimination_layout,
    select_group_qualifiers,
    single_elimination_layout,
)


@pytest.mark.parametrize("participant_count", range(2, 18))
def test_single_elimination_layout_handles_byes(participant_count):
    participants = list(range(participant_count))

    bracket_size, round_count, pairs = single_elimination_layout(
        participants, seed=42
    )

    assert bracket_size >= participant_count
    assert bracket_size & (bracket_size - 1) == 0
    assert round_count == bracket_size.bit_length() - 1
    assert len(pairs) == bracket_size // 2
    assert sum(second is None for _, second in pairs) == (
        bracket_size - participant_count
    )
    placed = [
        participant
        for pair in pairs
        for participant in pair
        if participant is not None
    ]
    assert sorted(placed) == participants


def test_single_elimination_layout_is_stable_for_event_seed():
    first = single_elimination_layout(list("ABCDEFG"), seed=1234)
    second = single_elimination_layout(list("ABCDEFG"), seed=1234)

    assert first == second


def test_balanced_groups_are_equal_and_create_every_pair_once():
    groups = balanced_round_robin_groups(
        list("ABCDEFGH"), group_count=2, seed=123
    )

    assert [len(group) for group in groups] == [4, 4]
    assert sorted(participant for group in groups for participant in group) == list(
        "ABCDEFGH"
    )
    assert all(len(round_robin_pairs(group)) == 6 for group in groups)


def test_balanced_groups_reject_unequal_sizes():
    with pytest.raises(ValueError):
        balanced_round_robin_groups(list("ABCDEFG"), group_count=2, seed=123)


def test_group_ranking_and_cross_group_qualification():
    first_group = rank_group(
        ["A", "B", "C"],
        [
            ("A", "B", 2, 0),
            ("A", "C", 1, 1),
            ("B", "C", 3, 0),
        ],
    )
    second_group = rank_group(
        ["D", "E", "F"],
        [
            ("D", "E", 1, 0),
            ("D", "F", 1, 0),
            ("E", "F", 2, 0),
        ],
    )

    assert [standing.participant for standing in first_group] == ["A", "B", "C"]
    assert [standing.participant for standing in second_group] == ["D", "E", "F"]
    qualifiers = select_group_qualifiers(
        [first_group, second_group], advancing_count=3
    )
    assert [standing.participant for standing in qualifiers] == ["D", "A", "B"]


def test_seeded_bracket_gives_top_seeds_byes_on_opposite_sides():
    bracket_size, round_count, pairs = seeded_single_elimination_layout(
        list("ABCDEF")
    )

    assert bracket_size == 8
    assert round_count == 3
    assert pairs == [("A", None), ("D", "E"), ("B", None), ("C", "F")]
