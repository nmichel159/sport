export type MainTab = 'home' | 'events' | 'ranking' | 'profile'

type ApiTeamMember = {
  id: string
  nickname: string
}

export type ApiTeam = {
  id: string
  name: string
  owner_user_id: string
  members: ApiTeamMember[]
}

export type ApiRegistration = {
  id: string
  user_id: string | null
  team_id: string | null
  name: string
  type: 'TEAM' | 'INDIVIDUAL'
}

export type ParticipationType = 'TEAM' | 'INDIVIDUAL'
export type EventType = 'TOURNAMENT' | 'LEAGUE'

export type EventCategory = {
  id?: string
  age_group: 'kids' | 'junior' | 'open' | 'veterani'
  team_format: '1v1' | '2v2' | '3v3' | '3v3g' | '4v4' | '5v5'
  gender_category: 'muzi' | 'zeny' | 'mix'
  fee: number
  capacity: number
}

export type TournamentFormat = {
  id: string
  code: string
  name: string
}

export type ApiEvent = {
  id: string
  invite_token: string
  name: string
  event_type: EventType
  sport: string
  participation_type: ParticipationType
  format_id: string | null
  format_code: string | null
  format_name: string | null
  event_date?: string | null
  event_time?: string | null
  region?: string | null
  city_id?: string | null
  city?: string | null
  venue?: string | null
  cover_image_url?: string | null
  registration_open: boolean
  xp_points?: number | null
  location?: string | null
  fee?: number | null
  description?: string | null
  // The API does not provide event images yet, but discovery cards are ready for one.
  image_url?: string | null
  categories: EventCategory[]
  registrations: ApiRegistration[]
}

export type EventPayload = {
  name: string
  event_type: EventType
  sport: string
  participation_type: ParticipationType
  format_id?: string | null
  event_date: string
  event_time?: string | null
  region: string
  city_id?: string | null
  city?: string | null
  venue?: string | null
  cover_image_url?: string | null
  categories: Omit<EventCategory, 'id'>[]
  description?: string | null
}

type ApiOrganizationMember = {
  id: string
  nickname: string
  role: string
}

export type ApiOrganization = {
  id: string
  name: string
  owner_user_id: string
  members: ApiOrganizationMember[]
  events: ApiEvent[]
}

export type RankingKind = 'players' | 'teams'

type RankingSport = {
  code: string
  name: string
}

type RankingItem = {
  rank: number
  name: string
  sport?: string
  xp: number
}

export type RankingResponse = {
  items: RankingItem[]
  sports: RankingSport[]
}

export type AuthenticatedFetch = (
  path: string,
  init?: RequestInit,
) => Promise<Response>

export type BracketParticipant = {
  registration_id: string
  name: string
}

export type BracketMatch = {
  id: string
  round_number: number
  position: number
  participant_a: BracketParticipant | null
  participant_b: BracketParticipant | null
  score_a: number | null
  score_b: number | null
  winner_registration_id: string | null
  is_bye: boolean
}

export type EventBracket = {
  event_id: string
  generated: boolean
  round_count: number
  matches: BracketMatch[]
}

export type MatchResultPlayer = {
  id: string
  name: string
  registration_id: string
  side: 'A' | 'B'
}

export type MatchResultScorer = {
  user_id: string
  name: string
  goals: number
}

export type MatchResultDetail = {
  match_id: string
  kind: 'BRACKET' | 'GROUP'
  sport: string
  supports_scorers: boolean
  supports_mvp: boolean
  participant_a: BracketParticipant
  participant_b: BracketParticipant
  score_a: number | null
  score_b: number | null
  pitch: string | null
  scheduled_start: string | null
  players: MatchResultPlayer[]
  scorers: MatchResultScorer[]
  mvp_user_id: string | null
}

export type MatchResultPayload = {
  score_a: number
  score_b: number
  pitch: string | null
  scheduled_start: string | null
  mvp_user_id: string | null
  scorers: { user_id: string; goals: number }[]
}

export type GroupParticipant = {
  registration_id: string
  name: string
}

export type GroupStanding = {
  rank: number
  participant: GroupParticipant
  played: number
  wins: number
  draws: number
  losses: number
  score_for: number
  score_against: number
  score_difference: number
  points: number
  qualified: boolean
  qualified_seed: number | null
}

export type GroupMatch = {
  id: string
  position: number
  participant_a: GroupParticipant
  participant_b: GroupParticipant
  score_a: number | null
  score_b: number | null
  winner_registration_id: string | null
}

export type EventGroup = {
  id: string
  position: number
  name: string
  participants: GroupParticipant[]
  standings: GroupStanding[]
  matches: GroupMatch[]
}

export type EventGroupStage = {
  event_id: string
  generated: boolean
  locked: boolean
  locked_at: string | null
  group_count: number
  advancing_count: number
  completed_matches: number
  total_matches: number
  groups: EventGroup[]
}

export type TournamentPlayer = {
  id: string
  name: string
}

export type TournamentRegistration = ApiRegistration & {
  players: TournamentPlayer[]
}

export type TournamentRevision = {
  event_id: string
  revision: number
  updated_at: string
}

export type TournamentStateResponse = TournamentRevision & {
  event: ApiEvent
  registrations: TournamentRegistration[]
  bracket: EventBracket
  group_stage: EventGroupStage
  match_details: MatchResultDetail[]
}

export type TournamentSnapshot = TournamentRevision & {
  event: ApiEvent
  registrations: TournamentRegistration[]
  bracket: EventBracket
  group_stage: EventGroupStage
  match_details: Record<string, MatchResultDetail>
}

export type TournamentOperation =
  | {
      id: string
      type: 'GENERATE_BRACKET'
    }
  | {
      id: string
      type: 'GENERATE_GROUPS'
      group_count: number
      advancing_count: number
    }
  | {
      id: string
      type: 'SAVE_RESULT'
      kind: 'BRACKET' | 'GROUP'
      match_id: string
      payload: MatchResultPayload
    }
  | {
      id: string
      type: 'FINALIZE_GROUPS'
      locked_at: string
    }

export type CachedTournament = {
  snapshot: TournamentSnapshot
  pending_operations: TournamentOperation[]
}
