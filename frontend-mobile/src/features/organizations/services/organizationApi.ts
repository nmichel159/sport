import type {
  ApiOrganization,
  AuthenticatedFetch,
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

