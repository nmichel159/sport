import type {
  ApiEvent,
  ApiOrganization,
  ApiTeam,
  AuthenticatedFetch,
} from '../../../types/domain'

type DashboardData = {
  teams: ApiTeam[]
  organizations: ApiOrganization[]
  events: ApiEvent[]
}

export async function loadDashboard(
  fetcher: AuthenticatedFetch,
): Promise<DashboardData> {
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

  return { teams, organizations, events }
}
