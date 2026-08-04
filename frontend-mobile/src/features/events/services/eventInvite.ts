import { Share } from 'react-native'
import type { ApiEvent } from '../../../types/domain'

// Temporary development link. Production will replace this with a public link.
const localInviteBaseUrl = 'http://localhost:8000'
const invitePath = '/api/v1/organizations/events/invites/'
const inviteTokenPattern = /^[a-f0-9]{64}$/i

export function eventInviteUrl(inviteToken: unknown) {
  if (typeof inviteToken !== 'string' || !inviteTokenPattern.test(inviteToken)) return null
  return `${localInviteBaseUrl}${invitePath}${encodeURIComponent(inviteToken)}`
}

/** Accepts link QR codes as well as QR codes created by older app builds. */
export function eventInviteTokenFromQr(data: string) {
  try {
    const legacyValue = JSON.parse(data) as { type?: string; version?: number; token?: string }
    if (legacyValue.type === 'sport-event-invite' && legacyValue.version === 1 && legacyValue.token && inviteTokenPattern.test(legacyValue.token)) return legacyValue.token
  } catch {
    // Link QR codes are plain text rather than JSON.
  }

  const match = data.match(/\/organizations\/events\/invites\/([^/?#]+)/)
  if (!match) return null
  try {
    const token = decodeURIComponent(match[1])
    return inviteTokenPattern.test(token) ? token : null
  } catch {
    return null
  }
}

export async function shareEventInvite(event: ApiEvent) {
  const url = eventInviteUrl(event.invite_token)
  if (!url) throw Error('INVITE_TOKEN_MISSING')
  await Share.share({
    title: `Pozvánka na ${event.name}`,
    message: `Pridaj sa na event „${event.name}".\n${url}`,
  })
}
