import pytest

from app.services.brackets import single_elimination_layout


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
