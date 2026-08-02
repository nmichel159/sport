import { apiBaseUrl } from '../config/env'
import type { HealthResponse } from '../types/health'

export type EventCategoryInput = {
  age_group: 'kids' | 'junior' | 'open' | 'veterani'
  team_format: '1v1' | '2v2' | '3v3' | '3v3g' | '4v4' | '5v5'
  gender_category: 'muzi' | 'zeny' | 'mix'
  fee: number
  capacity: number
}
export type OrganizationEvent = {
  id: string
  name: string
  event_type: 'TOURNAMENT' | 'LEAGUE'
  sport: string
  participation_type: 'TEAM' | 'INDIVIDUAL'
  event_date: string | null
  event_time: string | null
  region: string | null
  city_id: string | null
  city: string | null
  venue: string | null
  cover_image_url: string | null
  registration_open: boolean
  xp_points: number | null
  location: string | null
  fee: number | null
  categories: (EventCategoryInput & { id: string })[]
  description: string | null
}
export type Organization = {
  id: string
  name: string
  owner_user_id: string
  members: { id: string; nickname: string; role: string }[]
  events: OrganizationEvent[]
}
export type EventInput = {
  name: string
  event_type: 'TOURNAMENT' | 'LEAGUE'
  sport: string
  participation_type: 'TEAM' | 'INDIVIDUAL'
  event_date: string | null
  event_time: string | null
  region: string
  city_id: string | null
  city: string | null
  venue: string | null
  cover_image_url: string | null
  categories: EventCategoryInput[]
  description: string | null
}

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${apiBaseUrl}/health`)
  if (!response.ok) throw new Error(`Backend returned ${response.status}`)
  return response.json() as Promise<HealthResponse>
}

async function organizationRequest<T>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}/api/v1/organizations${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  })
  if (!response.ok)
    throw new Error(`Nepodarilo sa uložiť zmenu (${response.status}).`)
  return response.json() as Promise<T>
}

export const getMyOrganizations = (token: string) =>
  organizationRequest<Organization[]>('/mine', token)
export const createOrganization = (token: string, name: string) =>
  organizationRequest<Organization>('', token, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
export const createOrganizationEvent = (
  token: string,
  organizationId: string,
  event: EventInput,
) =>
  organizationRequest<Organization>(`/${organizationId}/events`, token, {
    method: 'POST',
    body: JSON.stringify(event),
  })
