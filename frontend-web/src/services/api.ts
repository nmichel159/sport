import { apiBaseUrl } from '../config/env'
import type { HealthResponse } from '../types/health'

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${apiBaseUrl}/health`)
  if (!response.ok) throw new Error(`Backend returned ${response.status}`)
  return response.json() as Promise<HealthResponse>
}
