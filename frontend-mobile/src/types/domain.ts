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

type ApiRegistration = {
  id: string
  user_id: string | null
  team_id: string | null
  name: string
  type: 'TEAM' | 'INDIVIDUAL'
}

export type ParticipationType = 'TEAM' | 'INDIVIDUAL'

export type ApiEvent = {
  id: string
  name: string
  sport: string
  participation_type: ParticipationType
  event_date?: string | null
  location?: string | null
  fee?: number | null
  description?: string | null
  registrations: ApiRegistration[]
}

export type EventPayload = {
  name: string
  sport: string
  participation_type: ParticipationType
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
