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
}

export async function loadDashboard(
  fetcher: AuthenticatedFetch,
  userId: string,
): Promise<DashboardData> {
  const key = `offline-dashboard:v1:${userId}`
  try {
    const [teamResponse, organizationResponse, eventResponse] =
      await Promise.all([
        fetcher('/teams/mine'),
        fetcher('/organizations/mine'),
        fetcher('/organizations/events'),
      ])

    if (
      !teamResponse.ok ||
      !organizationResponse.ok ||
      !eventResponse.ok
    ) {
      throw Error('DASHBOARD_LOAD_FAILED')
    }

    const [teams, organizations, events] = await Promise.all([
      teamResponse.json() as Promise<ApiTeam[]>,
      organizationResponse.json() as Promise<ApiOrganization[]>,
      eventResponse.json() as Promise<ApiEvent[]>,
    ])

    const result = { teams, organizations, events }
    const offlineResult: DashboardData = {
      teams,
      organizations: organizations.map((organization) => ({
        ...organization,
        events: organization.events.filter(isOngoingTournament),
      })),
      events: events.filter(isOngoingTournament),
    }
    await setStoredValue(key, JSON.stringify(offlineResult))
    return result
  } catch (caught) {
    const stored = await getStoredValue(key)
    if (stored) return JSON.parse(stored) as DashboardData
    throw caught
  }
}
