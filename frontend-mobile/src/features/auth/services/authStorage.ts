import {
  getSecureStoredValue,
  removeSecureStoredValue,
  setSecureStoredValue,
} from '../../../services/storage'
import type { User } from '../types'

const refreshKey = 'sport-refresh-token'
const userKey = 'sport-current-user'

export async function readStoredSession() {
  const [serializedUser, refreshToken] = await Promise.all([
    getSecureStoredValue(userKey),
    getSecureStoredValue(refreshKey),
  ])

  return { serializedUser, refreshToken }
}

export function readRefreshToken() {
  return getSecureStoredValue(refreshKey)
}

export function storeRefreshToken(token: string) {
  return setSecureStoredValue(refreshKey, token)
}

export function storeUser(user: User) {
  return setSecureStoredValue(userKey, JSON.stringify(user))
}

export function removeStoredUser() {
  return removeSecureStoredValue(userKey)
}

export async function clearStoredSession() {
  await Promise.all([
    removeSecureStoredValue(refreshKey),
    removeSecureStoredValue(userKey),
  ])
}
