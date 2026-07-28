import type {
  ApiTeam,
  AuthenticatedFetch,
} from '../../../types/domain'

export async function loadMyTeams(fetcher: AuthenticatedFetch) {
  const response = await fetcher('/teams/mine')
  if (!response.ok) throw Error('TEAMS_LOAD_FAILED')
  return (await response.json()) as ApiTeam[]
}

export async function createTeam(
  fetcher: AuthenticatedFetch,
  name: string,
) {
  const response = await fetcher('/teams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!response.ok) throw Error('TEAM_CREATE_FAILED')
  return (await response.json()) as ApiTeam
}

export async function addTeamPlayer(
  fetcher: AuthenticatedFetch,
  teamId: string,
  nickname: string,
) {
  const response = await fetcher(`/teams/${teamId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  })
  if (!response.ok) throw Error('Hráča sa nepodarilo pridať.')
  return (await response.json()) as ApiTeam
}

