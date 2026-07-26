import { apiBaseUrl } from '../config/env'
import { getStoredValue, setStoredValue } from './storage'

export type School = { code: string; edu_id: string; name: string; street: string; municipality: string }
export type DistrictCity = { id: string; district: string; name: string }
type Catalog<T> = { version: string; items: T[] }

// The full catalogue lives on the phone. It is downloaded again only after
// the lightweight version endpoint reports a new version.
async function loadCatalog<T>(name: string): Promise<T[]> {
  const key = `sport.catalog.${name}`
  const cachedText = await getStoredValue(key)
  const cached = cachedText ? JSON.parse(cachedText) as Catalog<T> : undefined
  try {
    const versionResponse = await fetch(`${apiBaseUrl}/api/v1/catalogs/${name}/version`)
    if (!versionResponse.ok) throw Error('CATALOG_VERSION_FAILED')
    const { version } = await versionResponse.json() as { version: string }
    if (cached?.version === version) return cached.items
    const response = await fetch(`${apiBaseUrl}/api/v1/catalogs/${name}`)
    if (!response.ok) throw Error('CATALOG_DOWNLOAD_FAILED')
    const next = await response.json() as Catalog<T>
    await setStoredValue(key, JSON.stringify(next))
    return next.items
  } catch (error) {
    if (cached) return cached.items
    throw error
  }
}

export const loadSchools = () => loadCatalog<School>('schools')
export const loadDistrictCities = () => loadCatalog<DistrictCity>('district-cities')

async function searchCatalog<T>(name: string, query: string): Promise<T[]> {
  if (!query.trim()) return []
  const response = await fetch(`${apiBaseUrl}/api/v1/catalogs/${name}/search?q=${encodeURIComponent(query)}&limit=4`)
  if (!response.ok) throw Error('CATALOG_SEARCH_FAILED')
  return (await response.json() as { items: T[] }).items
}

export const searchSchools = (query: string) => searchCatalog<School>('schools', query)
export const searchDistrictCities = (query: string) => searchCatalog<DistrictCity>('district-cities', query)
