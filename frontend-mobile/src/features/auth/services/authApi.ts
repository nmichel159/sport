import { apiBaseUrl } from '../../../config/env'
import type { OnboardingData } from '../../../types/onboarding'
import type { Session, User } from '../types'

async function postAuth(path: string, body: object) {
  return fetch(`${apiBaseUrl}/api/v1/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function readSession(response: Response) {
  if (!response.ok) throw Error('AUTH_REQUIRED')
  return (await response.json()) as Session
}

export class InvalidRefreshTokenError extends Error {}

export async function refreshAuthSession(refreshToken: string) {
  const response = await postAuth('refresh', {
    refresh_token: refreshToken,
  })
  if (!response.ok) throw new InvalidRefreshTokenError('AUTH_REQUIRED')
  return (await response.json()) as Session
}

export function googleSignIn(credential: string) {
  return postAuth('google', { credential, platform: 'mobile' }).then(
    readSession,
  )
}

export function developmentSignIn() {
  return postAuth('development-login', {}).then(readSession)
}

export function logOut(refreshToken: string) {
  return postAuth('logout', { refresh_token: refreshToken })
}

export async function saveOnboarding(
  accessToken: string,
  data: OnboardingData,
  preferredLanguage: User['preferred_language'],
) {
  const response = await fetch(`${apiBaseUrl}/api/v1/users/me/onboarding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      ...data,
      preferred_language: preferredLanguage,
    }),
  })

  if (!response.ok) throw Error('ONBOARDING_FAILED')
  return (await response.json()) as User
}

export function authenticatedRequest(
  accessToken: string,
  path: string,
  init: RequestInit = {},
) {
  return fetch(`${apiBaseUrl}/api/v1${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  })
}
