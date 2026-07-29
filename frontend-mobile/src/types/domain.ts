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

export type TournamentFormat = {
  id: string
  code: string
  name: string
}

export type ApiEvent = {
  id: string
  name: string
  sport: string
  participation_type: ParticipationType
  format_id: string | null
  format_code: string | null
  format_name: string | null
  event_date?: string | null
  location?: string | null
  fee?: number | null
  description?: string | null
  // The API does not provide event images yet, but discovery cards are ready for one.
  image_url?: string | null
  registrations: ApiRegistration[]
}

export type EventPayload = {
  name: string
  sport: string
  participation_type: ParticipationType
  format_id?: string | null
  event_date?: string | null
  location?: string | null
  fee?: number | null
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
