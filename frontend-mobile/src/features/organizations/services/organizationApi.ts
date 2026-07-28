import type {
  ApiOrganization,
  AuthenticatedFetch,
  EventBracket,
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
