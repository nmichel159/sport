import type {
  ApiOrganization,
  AuthenticatedFetch,
  EventBracket,
  EventGroupStage,
  MatchResultDetail,
  MatchResultPayload,
  TournamentRevision,
  TournamentSnapshot,
  TournamentStateResponse,
  TournamentFormat,
} from '../../../types/domain'

export async function requestOrganization(
  fetcher: AuthenticatedFetch,
  path: string,
  method: string,
  body?: object,
): Promise<ApiOrganization> {
  const response = await fetcher(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) throw Error('ORGANIZATION_REQUEST_FAILED')
  return (await response.json()) as ApiOrganization
}

export async function requestEventFormats(
  fetcher: AuthenticatedFetch,
): Promise<TournamentFormat[]> {
  const response = await fetcher('/organizations/event-formats')
  if (!response.ok) throw Error('EVENT_FORMATS_REQUEST_FAILED')
  return (await response.json()) as TournamentFormat[]
}

export async function requestEventBracket(
  fetcher: AuthenticatedFetch,
  organizationId: string,
  eventId: string,
  method = 'GET',
  suffix = '',
  body?: object,
): Promise<EventBracket> {
  const response = await fetcher(
    `/organizations/${organizationId}/events/${eventId}/bracket${suffix}`,
    {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    },
  )
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as {
      detail?: { code?: string }
    } | null
    throw Error(detail?.detail?.code ?? 'EVENT_BRACKET_REQUEST_FAILED')
  }
  return (await response.json()) as EventBracket
}

export async function requestParticipantBracket(
  fetcher: AuthenticatedFetch,
  eventId: string,
): Promise<EventBracket> {
  const response = await fetcher(`/organizations/events/${eventId}/bracket`)
  if (!response.ok) throw Error('PARTICIPANT_BRACKET_REQUEST_FAILED')
  return (await response.json()) as EventBracket
}

export async function requestEventGroupStage(
  fetcher: AuthenticatedFetch,
  organizationId: string,
  eventId: string,
  method = 'GET',
  suffix = '',
  body?: object,
): Promise<EventGroupStage> {
  const response = await fetcher(
    `/organizations/${organizationId}/events/${eventId}/group-stage${suffix}`,
    {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    },
  )
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as {
      detail?: { code?: string }
    } | null
    throw Error(detail?.detail?.code ?? 'EVENT_GROUP_STAGE_REQUEST_FAILED')
  }
  return (await response.json()) as EventGroupStage
}

export async function requestParticipantGroupStage(
  fetcher: AuthenticatedFetch,
  eventId: string,
): Promise<EventGroupStage> {
  const response = await fetcher(`/organizations/events/${eventId}/group-stage`)
  if (!response.ok) throw Error('PARTICIPANT_GROUP_STAGE_REQUEST_FAILED')
  return (await response.json()) as EventGroupStage
}

export async function requestMatchResult(
  fetcher: AuthenticatedFetch,
  organizationId: string,
  eventId: string,
  kind: 'BRACKET' | 'GROUP',
  matchId: string,
  payload?: MatchResultPayload,
): Promise<MatchResultDetail> {
  const parent = kind === 'BRACKET' ? 'bracket' : 'group-stage'
  const response = await fetcher(
    `/organizations/${organizationId}/events/${eventId}/${parent}/matches/${matchId}/result`,
    {
      method: payload ? 'PUT' : 'GET',
      headers: payload ? { 'Content-Type': 'application/json' } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
    },
  )
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as {
      detail?: { code?: string }
    } | null
    throw Error(detail?.detail?.code ?? 'MATCH_RESULT_REQUEST_FAILED')
  }
  return (await response.json()) as MatchResultDetail
}

function normalizeTournamentState(
  response: TournamentStateResponse,
): TournamentSnapshot {
  return {
    ...response,
    match_details: Object.fromEntries(
      response.match_details.map((detail) => [detail.match_id, detail]),
    ),
  }
}

function tournamentStatePath(organizationId: string, eventId: string) {
  return `/organizations/${organizationId}/events/${eventId}/tournament-state`
}

function tournamentServerError(code: string) {
  const error = Error(code)
  error.name = 'TournamentServerError'
  return error
}

export async function requestTournamentRevision(
  fetcher: AuthenticatedFetch,
  organizationId: string,
  eventId: string,
): Promise<TournamentRevision> {
  const response = await fetcher(
    `${tournamentStatePath(organizationId, eventId)}/revision`,
  )
  if (!response.ok) throw Error('TOURNAMENT_REVISION_REQUEST_FAILED')
  return (await response.json()) as TournamentRevision
}

export async function requestTournamentState(
  fetcher: AuthenticatedFetch,
  organizationId: string,
  eventId: string,
): Promise<TournamentSnapshot> {
  const response = await fetcher(tournamentStatePath(organizationId, eventId))
  if (!response.ok) throw Error('TOURNAMENT_STATE_REQUEST_FAILED')
  return normalizeTournamentState(
    (await response.json()) as TournamentStateResponse,
  )
}

export async function synchronizeTournamentState(
  fetcher: AuthenticatedFetch,
  organizationId: string,
  snapshot: TournamentSnapshot,
  mutationId: string,
): Promise<TournamentSnapshot> {
  const response = await fetcher(
    tournamentStatePath(organizationId, snapshot.event_id),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base_revision: snapshot.revision,
        client_mutation_id: mutationId,
        bracket: snapshot.bracket,
        group_stage: snapshot.group_stage,
        match_details: Object.values(snapshot.match_details).map(
          ({ match_id, pitch, scheduled_start, mvp_user_id, scorers }) => ({
            match_id,
            pitch,
            scheduled_start,
            mvp_user_id,
            scorers: scorers.map(({ user_id, goals }) => ({
              user_id,
              goals,
            })),
          }),
        ),
      }),
    },
  )
  if (!response.ok) {
    if (response.status === 409)
      throw tournamentServerError('TOURNAMENT_REVISION_CONFLICT')
    const detail = (await response.json().catch(() => null)) as {
      detail?: { code?: string }
    } | null
    throw tournamentServerError(
      detail?.detail?.code ?? 'TOURNAMENT_SYNC_FAILED',
    )
  }
  return normalizeTournamentState(
    (await response.json()) as TournamentStateResponse,
  )
}
