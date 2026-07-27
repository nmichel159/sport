import { apiBaseUrl } from '../config/env'
import type { HealthResponse } from '../types/health'

export type OrganizationEvent = { id: string; name: string; sport: string; participation_type: 'TEAM' | 'INDIVIDUAL'; event_date: string | null; location: string | null; fee: number | null; description: string | null }
export type Organization = { id: string; name: string; owner_user_id: string; members: { id: string; nickname: string; role: string }[]; events: OrganizationEvent[] }
export type EventInput = { name: string; sport: string; participation_type: 'TEAM' | 'INDIVIDUAL'; event_date: string | null; location: string | null; fee: number | null; description: string | null }

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${apiBaseUrl}/health`)
  if (!response.ok) throw new Error(`Backend returned ${response.status}`)
  return response.json() as Promise<HealthResponse>
}

async function organizationRequest<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}/api/v1/organizations${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options?.headers } })
  if (!response.ok) throw new Error(`Nepodarilo sa uložiť zmenu (${response.status}).`)
  return response.json() as Promise<T>
}

export const getMyOrganizations = (token: string) => organizationRequest<Organization[]>('/mine', token)
export const createOrganization = (token: string, name: string) => organizationRequest<Organization>('', token, { method: 'POST', body: JSON.stringify({ name }) })
export const createOrganizationEvent = (token: string, organizationId: string, event: EventInput) => organizationRequest<Organization>(`/${organizationId}/events`, token, { method: 'POST', body: JSON.stringify(event) })
