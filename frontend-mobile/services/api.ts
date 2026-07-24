import { apiBaseUrl } from '../config/env'

export async function getHealth(): Promise<{ status: string }> {
  const response = await fetch(`${apiBaseUrl}/health`)
  if (!response.ok) throw new Error(`Backend returned ${response.status}`)
  return response.json() as Promise<{ status: string }>
}
