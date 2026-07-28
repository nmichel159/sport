import {
  getStoredValue,
  removeStoredValue,
  setStoredValue,
} from '../../../services/storage'
import type { User } from '../types'

const refreshKey = 'sport-refresh-token'
const userKey = 'sport-current-user'

export async function readStoredSession() {
  const [serializedUser, refreshToken] = await Promise.all([
    getStoredValue(userKey),
    getStoredValue(refreshKey),
  ])

  return { serializedUser, refreshToken }
}

export function readRefreshToken() {
  return getStoredValue(refreshKey)
}

export function storeRefreshToken(token: string) {
  return setStoredValue(refreshKey, token)
}

export function storeUser(user: User) {
  return setStoredValue(userKey, JSON.stringify(user))
}

export function removeStoredUser() {
  return removeStoredValue(userKey)
}

export async function clearStoredSession() {
  await Promise.all([
    removeStoredValue(refreshKey),
    removeStoredValue(userKey),
  ])
}

