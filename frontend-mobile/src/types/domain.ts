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
