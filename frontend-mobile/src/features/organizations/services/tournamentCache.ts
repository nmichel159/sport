import type {
  ApiEvent,
  CachedTournament,
} from '../../../types/domain'
import {
  getStoredValue,
  removeStoredValue,
  setStoredValue,
} from '../../../services/storage'

const schemaVersion = 1

function cacheKey(organizationId: string, eventId: string) {
  return `offline-tournament:v${schemaVersion}:${organizationId}:${eventId}`
}

export function isOngoingTournament(event: ApiEvent) {
  if (!event.event_date) return true
  const now = new Date()
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
  return event.event_date >= today
}

export async function readCachedTournament(
  organizationId: string,
  event: ApiEvent,
) {
  if (!isOngoingTournament(event)) return null
  try {
    const stored = await getStoredValue(cacheKey(organizationId, event.id))
    if (!stored) return null
    const parsed = JSON.parse(stored) as CachedTournament
    if (
      parsed.snapshot.event_id !== event.id ||
      !Array.isArray(parsed.pending_operations)
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export async function writeCachedTournament(
  organizationId: string,
  event: ApiEvent,
  cached: CachedTournament,
) {
  const key = cacheKey(organizationId, event.id)
  if (!isOngoingTournament(event)) {
    await removeStoredValue(key)
    return
  }
  await setStoredValue(key, JSON.stringify(cached))
}
