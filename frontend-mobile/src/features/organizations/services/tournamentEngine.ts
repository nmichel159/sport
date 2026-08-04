import type {
  ApiEvent,
  BracketMatch,
  BracketParticipant,
  EventBracket,
  EventGroup,
  EventGroupStage,
  GroupParticipant,
  GroupStanding,
  MatchResultDetail,
  MatchResultPayload,
  TournamentOperation,
  TournamentRegistration,
  TournamentSnapshot,
} from '../../../types/domain'

const goalSports = new Set(['Futbal', 'Florbal'])
const teamSports = new Set([
  'Futbal',
  'Florbal',
  'Basketbal 3x3',
  'Volejbal',
  '3x3sportgames',
])

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function seedFrom(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function randomFrom(value: string) {
  let state = seedFrom(value)
  return () => {
    state += 0x6d2b79f5
    let result = state
    result = Math.imul(result ^ (result >>> 15), result | 1)
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61)
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: T[], seed: string) {
  const result = [...items]
  const random = randomFrom(seed)
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

export function deterministicUuid(value: string) {
  const parts = Array.from({ length: 4 }, (_, index) =>
    seedFrom(`${index}:${value}`).toString(16).padStart(8, '0'),
  ).join('')
  return `${parts.slice(0, 8)}-${parts.slice(8, 12)}-5${parts.slice(
    13,
    16,
  )}-a${parts.slice(17, 20)}-${parts.slice(20, 32)}`
}

export function localOperationId(eventId: string) {
  return deterministicUuid(
    `${eventId}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
  )
}

function participant(
  registration: TournamentRegistration,
): BracketParticipant {
  return {
    registration_id: registration.id,
    name: registration.name,
  }
}

function nextPowerOfTwo(value: number) {
  let result = 1
  while (result < value) result *= 2
  return result
}

function emptyBracket(eventId: string): EventBracket {
  return {
    event_id: eventId,
    generated: false,
    round_count: 0,
    matches: [],
  }
}

function createBracket(
  eventId: string,
  pairs: [TournamentRegistration, TournamentRegistration | null][],
  participantCount: number,
): EventBracket {
  const bracketSize = nextPowerOfTwo(participantCount)
  const roundCount = Math.log2(bracketSize)
  const matches: BracketMatch[] = []
  for (let round = 1; round <= roundCount; round += 1) {
    const count = bracketSize / 2 ** round
    for (let position = 0; position < count; position += 1) {
      const pair = round === 1 ? pairs[position] : null
      const sideA = pair ? participant(pair[0]) : null
      const sideB = pair?.[1] ? participant(pair[1]) : null
      matches.push({
        id: deterministicUuid(`${eventId}:bracket:${round}:${position}`),
        round_number: round,
        position,
        participant_a: sideA,
        participant_b: sideB,
        score_a: null,
        score_b: null,
        winner_registration_id: sideA && !sideB ? sideA.registration_id : null,
        is_bye: round === 1 && Boolean(sideA) !== Boolean(sideB),
      })
    }
  }
  for (const match of matches.filter(
    (item) => item.round_number === 1 && item.is_bye,
  )) {
    placeWinner(matches, match)
  }
  return {
    event_id: eventId,
    generated: true,
    round_count: roundCount,
    matches,
  }
}

function randomBracket(snapshot: TournamentSnapshot) {
  if (snapshot.registrations.length < 2) throw Error('NOT_ENOUGH_PARTICIPANTS')
  const shuffled = shuffle(
    snapshot.registrations,
    `${snapshot.event_id}:single-elimination`,
  )
  const bracketSize = nextPowerOfTwo(shuffled.length)
  const byeCount = bracketSize - shuffled.length
  const pairs: [TournamentRegistration, TournamentRegistration | null][] = []
  let cursor = 0
  for (let index = 0; index < byeCount; index += 1) {
    pairs.push([shuffled[cursor], null])
    cursor += 1
  }
  while (cursor < shuffled.length) {
    pairs.push([shuffled[cursor], shuffled[cursor + 1]])
    cursor += 2
  }
  return createBracket(
    snapshot.event_id,
    shuffle(pairs, `${snapshot.event_id}:single-elimination:pairs`),
    shuffled.length,
  )
}

function seededBracket(
  eventId: string,
  registrations: TournamentRegistration[],
) {
  if (registrations.length < 2) throw Error('NOT_ENOUGH_PARTICIPANTS')
  const bracketSize = nextPowerOfTwo(registrations.length)
  let seedOrder = [1, 2]
  while (seedOrder.length < bracketSize) {
    const nextSize = seedOrder.length * 2
    seedOrder = seedOrder.flatMap((seed) => [seed, nextSize + 1 - seed])
  }
  const slots = seedOrder.map((seed) => registrations[seed - 1] ?? null)
  const pairs: [TournamentRegistration, TournamentRegistration | null][] = []
  for (let index = 0; index < slots.length; index += 2) {
    const first = slots[index]
    if (!first) throw Error('INVALID_SEEDED_BRACKET')
    pairs.push([first, slots[index + 1]])
  }
  return createBracket(eventId, pairs, registrations.length)
}

function groupParticipant(
  registration: TournamentRegistration,
): GroupParticipant {
  return participant(registration)
}

function rankGroup(group: EventGroup): GroupStanding[] {
  const seeds = new Map(
    group.participants.map((item, index) => [item.registration_id, index]),
  )
  const qualified = new Map(
    group.standings.map((item) => [
      item.participant.registration_id,
      item.qualified_seed,
    ]),
  )
  const stats = new Map(
    group.participants.map((item) => [
      item.registration_id,
      {
        participant: item,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        score_for: 0,
        score_against: 0,
        points: 0,
      },
    ]),
  )
  for (const match of group.matches) {
    if (match.score_a === null || match.score_b === null) continue
    const sideA = stats.get(match.participant_a.registration_id)!
    const sideB = stats.get(match.participant_b.registration_id)!
    sideA.played += 1
    sideB.played += 1
    sideA.score_for += match.score_a
    sideA.score_against += match.score_b
    sideB.score_for += match.score_b
    sideB.score_against += match.score_a
    if (match.score_a > match.score_b) {
      sideA.wins += 1
      sideA.points += 3
      sideB.losses += 1
    } else if (match.score_b > match.score_a) {
      sideB.wins += 1
      sideB.points += 3
      sideA.losses += 1
    } else {
      sideA.draws += 1
      sideB.draws += 1
      sideA.points += 1
      sideB.points += 1
    }
  }
  const ordered = [...stats.values()].sort(
    (first, second) =>
      second.points - first.points ||
      second.score_for -
        second.score_against -
        (first.score_for - first.score_against) ||
      second.score_for - first.score_for ||
      second.wins - first.wins ||
      seeds.get(first.participant.registration_id)! -
        seeds.get(second.participant.registration_id)!,
  )
  return ordered.map((item, index) => ({
    ...item,
    rank: index + 1,
    score_difference: item.score_for - item.score_against,
    qualified: qualified.get(item.participant.registration_id) != null,
    qualified_seed:
      qualified.get(item.participant.registration_id) ?? null,
  }))
}

function refreshGroups(stage: EventGroupStage) {
  stage.groups = stage.groups.map((group) => ({
    ...group,
    standings: rankGroup(group),
  }))
  stage.total_matches = stage.groups.reduce(
    (total, group) => total + group.matches.length,
    0,
  )
  stage.completed_matches = stage.groups.reduce(
    (total, group) =>
      total +
      group.matches.filter(
        (match) => match.score_a !== null && match.score_b !== null,
      ).length,
    0,
  )
}

function generateGroups(
  snapshot: TournamentSnapshot,
  groupCount: number,
  advancingCount: number,
) {
  const registrations = snapshot.registrations
  if (advancingCount > registrations.length)
    throw Error('TOO_MANY_ADVANCING_PARTICIPANTS')
  if (registrations.length % groupCount) throw Error('UNEQUAL_GROUP_SIZES')
  if (registrations.length / groupCount < 2)
    throw Error('NOT_ENOUGH_PARTICIPANTS_PER_GROUP')
  const shuffled = shuffle(
    registrations,
    `${snapshot.event_id}:groups:${groupCount}`,
  )
  const grouped = Array.from(
    { length: groupCount },
    () => [] as TournamentRegistration[],
  )
  shuffled.forEach((item, index) => grouped[index % groupCount].push(item))
  const groups: EventGroup[] = grouped.map((items, groupPosition) => {
    const participants = items.map(groupParticipant)
    const matches = []
    for (let first = 0; first < participants.length; first += 1) {
      for (let second = first + 1; second < participants.length; second += 1) {
        matches.push({
          id: deterministicUuid(
            `${snapshot.event_id}:group:${groupPosition}:${matches.length}`,
          ),
          position: matches.length,
          participant_a: participants[first],
          participant_b: participants[second],
          score_a: null,
          score_b: null,
          winner_registration_id: null,
        })
      }
    }
    const group: EventGroup = {
      id: deterministicUuid(`${snapshot.event_id}:group:${groupPosition}`),
      position: groupPosition,
      name:
        groupPosition < 26
          ? `Skupina ${String.fromCharCode(65 + groupPosition)}`
          : `Skupina ${groupPosition + 1}`,
      participants,
      standings: [],
      matches,
    }
    group.standings = rankGroup(group)
    return group
  })
  snapshot.group_stage = {
    event_id: snapshot.event_id,
    generated: true,
    locked: false,
    locked_at: null,
    group_count: groupCount,
    advancing_count: advancingCount,
    completed_matches: 0,
    total_matches: groups.reduce((total, group) => total + group.matches.length, 0),
    groups,
  }
}

function findBracketMatch(snapshot: TournamentSnapshot, matchId: string) {
  return snapshot.bracket.matches.find((match) => match.id === matchId)
}

function placeWinner(matches: BracketMatch[], match: BracketMatch) {
  if (!match.winner_registration_id) return
  const winner = [match.participant_a, match.participant_b].find(
    (item) => item?.registration_id === match.winner_registration_id,
  )
  const following = matches.find(
    (item) =>
      item.round_number === match.round_number + 1 &&
      item.position === Math.floor(match.position / 2),
  )
  if (!winner || !following) return
  if (match.position % 2 === 0) following.participant_a = winner
  else following.participant_b = winner
}

function clearDescendants(
  snapshot: TournamentSnapshot,
  match: BracketMatch,
) {
  const following = snapshot.bracket.matches.find(
    (item) =>
      item.round_number === match.round_number + 1 &&
      item.position === Math.floor(match.position / 2),
  )
  if (!following) return
  clearDescendants(snapshot, following)
  following.score_a = null
  following.score_b = null
  following.winner_registration_id = null
  delete snapshot.match_details[following.id]
  if (match.position % 2 === 0) following.participant_a = null
  else following.participant_b = null
}

export function getLocalMatchDetail(
  snapshot: TournamentSnapshot,
  kind: 'BRACKET' | 'GROUP',
  matchId: string,
): MatchResultDetail {
  const bracketMatch = kind === 'BRACKET' ? findBracketMatch(snapshot, matchId) : null
  const groupMatch =
    kind === 'GROUP'
      ? snapshot.group_stage.groups
          .flatMap((group) => group.matches)
          .find((match) => match.id === matchId)
      : null
  const match = bracketMatch ?? groupMatch
  if (!match?.participant_a || !match.participant_b)
    throw Error('MATCH_NOT_READY')
  const stored = snapshot.match_details[matchId]
  const players = ([
    ['A', match.participant_a],
    ['B', match.participant_b],
  ] as const).flatMap(([side, item]) =>
    (snapshot.registrations.find(
      (registration) => registration.id === item.registration_id,
    )?.players ?? []).map((player) => ({
      ...player,
      registration_id: item.registration_id,
      side,
    })),
  )
  return {
    match_id: matchId,
    kind,
    sport: snapshot.event.sport,
    supports_scorers: goalSports.has(snapshot.event.sport),
    supports_mvp: teamSports.has(snapshot.event.sport),
    participant_a: match.participant_a,
    participant_b: match.participant_b,
    score_a: match.score_a,
    score_b: match.score_b,
    pitch: stored?.pitch ?? null,
    scheduled_start: stored?.scheduled_start ?? null,
    players,
    scorers: stored?.scorers ?? [],
    mvp_user_id: stored?.mvp_user_id ?? null,
  }
}

function saveResult(
  snapshot: TournamentSnapshot,
  kind: 'BRACKET' | 'GROUP',
  matchId: string,
  payload: MatchResultPayload,
) {
  const detail = getLocalMatchDetail(snapshot, kind, matchId)
  if (kind === 'BRACKET' && payload.score_a === payload.score_b)
    throw Error('DRAW_NOT_ALLOWED')
  const players = new Map(detail.players.map((player) => [player.id, player]))
  if (payload.mvp_user_id && !players.has(payload.mvp_user_id))
    throw Error('MVP_NOT_IN_MATCH')
  // Scorers are optional: validate their totals only when the organizer chose
  // to record them. An empty list is a valid score-only result.
  if (detail.supports_scorers && payload.scorers.length > 0) {
    const totals = { A: 0, B: 0 }
    for (const scorer of payload.scorers) {
      const player = players.get(scorer.user_id)
      if (!player) throw Error('SCORER_NOT_IN_MATCH')
      totals[player.side] += scorer.goals
    }
    if (totals.A !== payload.score_a || totals.B !== payload.score_b)
      throw Error('SCORER_TOTAL_MISMATCH')
  }
  const match =
    kind === 'BRACKET'
      ? findBracketMatch(snapshot, matchId)
      : snapshot.group_stage.groups
          .flatMap((group) => group.matches)
          .find((item) => item.id === matchId)
  if (!match) throw Error('MATCH_NOT_FOUND')
  if (kind === 'BRACKET') clearDescendants(snapshot, match as BracketMatch)
  match.score_a = payload.score_a
  match.score_b = payload.score_b
  match.winner_registration_id =
    payload.score_a > payload.score_b
      ? match.participant_a!.registration_id
      : payload.score_b > payload.score_a
        ? match.participant_b!.registration_id
        : null
  snapshot.match_details[matchId] = {
    ...detail,
    score_a: payload.score_a,
    score_b: payload.score_b,
    pitch: payload.pitch,
    scheduled_start: payload.scheduled_start,
    scorers: payload.scorers.map((scorer) => ({
      ...scorer,
      name: players.get(scorer.user_id)?.name ?? 'HrÃ¡Ä',
    })),
    mvp_user_id: payload.mvp_user_id,
  }
  if (kind === 'BRACKET') placeWinner(snapshot.bracket.matches, match as BracketMatch)
  else refreshGroups(snapshot.group_stage)
}

function finalizeGroups(snapshot: TournamentSnapshot, lockedAt: string) {
  const stage = snapshot.group_stage
  refreshGroups(stage)
  if (!stage.generated || stage.completed_matches !== stage.total_matches)
    throw Error('GROUP_RESULTS_INCOMPLETE')
  const candidates = stage.groups.flatMap((group, groupIndex) =>
    group.standings.map((standing, seedIndex) => ({
      rank: seedIndex + 1,
      groupIndex,
      seedIndex,
      standing,
    })),
  )
  candidates.sort(
    (first, second) =>
      first.rank - second.rank ||
      second.standing.points - first.standing.points ||
      second.standing.score_difference - first.standing.score_difference ||
      second.standing.score_for - first.standing.score_for ||
      second.standing.wins - first.standing.wins ||
      first.groupIndex - second.groupIndex ||
      first.seedIndex - second.seedIndex,
  )
  const qualifiers = candidates.slice(0, stage.advancing_count)
  const qualification = new Map(
    qualifiers.map((item, index) => [
      item.standing.participant.registration_id,
      index + 1,
    ]),
  )
  stage.groups.forEach((group) => {
    group.standings = group.standings.map((standing) => ({
      ...standing,
      qualified: qualification.has(standing.participant.registration_id),
      qualified_seed:
        qualification.get(standing.participant.registration_id) ?? null,
    }))
  })
  const registrations = qualifiers.map((item) => {
    const registration = snapshot.registrations.find(
      (candidate) =>
        candidate.id === item.standing.participant.registration_id,
    )
    if (!registration) throw Error('UNKNOWN_REGISTRATION')
    return registration
  })
  snapshot.bracket = seededBracket(snapshot.event_id, registrations)
  stage.locked = true
  stage.locked_at = lockedAt
}

export function applyTournamentOperation(
  current: TournamentSnapshot,
  operation: TournamentOperation,
) {
  const snapshot = clone(current)
  if (operation.type === 'GENERATE_BRACKET') {
    if (snapshot.event.format_code !== 'SINGLE_ELIMINATION')
      throw Error('SINGLE_ELIMINATION_REQUIRED')
    if (!snapshot.bracket.generated) snapshot.bracket = randomBracket(snapshot)
  } else if (operation.type === 'GENERATE_GROUPS') {
    if (snapshot.event.format_code !== 'GROUPS_THEN_ELIMINATION')
      throw Error('GROUPS_THEN_ELIMINATION_REQUIRED')
    if (!snapshot.group_stage.generated)
      generateGroups(snapshot, operation.group_count, operation.advancing_count)
  } else if (operation.type === 'SAVE_RESULT') {
    if (operation.kind === 'GROUP' && snapshot.group_stage.locked) return snapshot
    saveResult(snapshot, operation.kind, operation.match_id, operation.payload)
  } else if (!snapshot.group_stage.locked) {
    finalizeGroups(snapshot, operation.locked_at)
  }
  return snapshot
}

export function emptyTournamentSnapshot(
  event: ApiEvent,
  registrations: TournamentRegistration[],
): TournamentSnapshot {
  return {
    event_id: event.id,
    revision: 0,
    updated_at: new Date(0).toISOString(),
    event,
    registrations,
    bracket: emptyBracket(event.id),
    group_stage: {
      event_id: event.id,
      generated: false,
      locked: false,
      locked_at: null,
      group_count: 0,
      advancing_count: 0,
      completed_matches: 0,
      total_matches: 0,
      groups: [],
    },
    match_details: {},
  }
}
