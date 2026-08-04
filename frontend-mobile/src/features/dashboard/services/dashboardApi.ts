import type {
  ApiEvent,
  ApiOrganization,
  ApiTeam,
  AuthenticatedFetch,
} from '../../../types/domain'
import { getStoredValue, setStoredValue } from '../../../services/storage'
import { isOngoingTournament } from '../../organizations/services/tournamentCache'

type DashboardData = {
  teams: ApiTeam[]
  organizations: ApiOrganization[]
  events: ApiEvent[]
  participatingEvents: ApiEvent[]
  participationVersion: string
}

type ParticipatingEventsResponse = {
  version: string
  events: ApiEvent[]
}

type DashboardCache = { data: DashboardData }
type ParticipationCache = ParticipatingEventsResponse

const dashboardCacheKey = (userId: string) => `offline-dashboard:v3:${userId}`
const participationCacheKey = (userId: string) => `offline-participating-events:v1:${userId}`

async function readParticipationCache(userId: string): Promise<ParticipationCache | null> {
  const stored = await getStoredValue(participationCacheKey(userId))
  if (!stored) return null
  try { return JSON.parse(stored) as ParticipationCache } catch { return null }
}

export async function refreshParticipatingEvents(
  fetcher: AuthenticatedFetch,
  userId: string,
): Promise<ApiEvent[]> {
  const cached = await readParticipationCache(userId)
  try {
    const versionResponse = await fetcher('/organizations/events/participating/version')
    if (!versionResponse.ok) throw Error('PARTICIPATION_VERSION_FAILED')
    const { version } = await versionResponse.json() as Pick<ParticipatingEventsResponse, 'version'>
    if (cached?.version === version) return cached.events

    const response = await fetcher('/organizations/events/participating')
    if (!response.ok) throw Error('PARTICIPATION_LOAD_FAILED')
    const participation = await response.json() as ParticipatingEventsResponse
    await setStoredValue(participationCacheKey(userId), JSON.stringify(participation))
    return participation.events
  } catch (caught) {
    if (cached) return cached.events
    throw caught
  }
}

export async function loadDashboard(
  fetcher: AuthenticatedFetch,
  userId: string,
): Promise<DashboardData> {
  const key = dashboardCacheKey(userId)
  const stored = await getStoredValue(key)
  let cached: DashboardData | null = null
  if (stored) {
    try {
      cached = (JSON.parse(stored) as DashboardCache).data
    } catch {
      cached = null
    }
  }
  try {
    const [teamResponse, organizationResponse, eventResponse, participatingResponse] =
      await Promise.all([
        fetcher('/teams/mine'),
        fetcher('/organizations/mine'),
        fetcher('/organizations/events'),
        fetcher('/organizations/events/participating'),
      ])

    if (
      !teamResponse.ok ||
      !organizationResponse.ok ||
      !eventResponse.ok ||
      !participatingResponse.ok
    ) {
      throw Error('DASHBOARD_LOAD_FAILED')
    }

    const [teams, organizations, events, participation] = await Promise.all([
      teamResponse.json() as Promise<ApiTeam[]>,
      organizationResponse.json() as Promise<ApiOrganization[]>,
      eventResponse.json() as Promise<ApiEvent[]>,
      participatingResponse.json() as Promise<ParticipatingEventsResponse>,
    ])

    const participatingEvents = cached?.participationVersion === participation.version
      ? cached.participatingEvents
      : participation.events
    const result = { teams, organizations, events, participatingEvents, participationVersion: participation.version }
    const offlineResult: DashboardData = {
      teams,
      organizations: organizations.map((organization) => ({
        ...organization,
        events: organization.events.filter(isOngoingTournament),
      })),
      events: events.filter(isOngoingTournament),
      participatingEvents,
      participationVersion: participation.version,
    }
    await setStoredValue(key, JSON.stringify({ data: offlineResult } satisfies DashboardCache))
    await setStoredValue(participationCacheKey(userId), JSON.stringify(participation))
    return result
  } catch (caught) {
    if (cached) return cached
    throw caught
  }
}
