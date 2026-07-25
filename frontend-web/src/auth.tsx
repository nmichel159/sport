import { createContext, useContext, useEffect, useState } from 'react'
import { apiBaseUrl } from './config/env'

export type CurrentUser = { id: string; email: string; display_name?: string; profile_image_url?: string; preferred_language: 'sk' | 'en'; onboarding_completed: boolean }
type Auth = { user: CurrentUser | null; loading: boolean; login: (credential: string) => Promise<void>; logout: () => Promise<void>; completeOnboarding: (name: string, language: 'sk' | 'en') => Promise<void>; token: string | null }
const Context = createContext<Auth>({ user: null, loading: true, login: async () => {}, logout: async () => {}, completeOnboarding: async () => {}, token: null })
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null); const [loading, setLoading] = useState(true); const [token, setToken] = useState<string | null>(null)
  const refresh = async () => { const r = await fetch(`${apiBaseUrl}/api/v1/auth/refresh`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}' }); if (!r.ok) throw Error(); const d = await r.json(); setToken(d.access_token); setUser(d.user) }
  // Session bootstrap is asynchronous; until it settles private routes stay in splash state.
  useEffect(() => { void refresh().catch(() => setUser(null)).finally(() => setLoading(false)) }, []) // eslint-disable-line react-hooks/set-state-in-effect
  const login = async (credential: string) => { const r = await fetch(`${apiBaseUrl}/api/v1/auth/google`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential, platform: 'web' }) }); if (!r.ok) throw Error(); const d = await r.json(); setToken(d.access_token); setUser(d.user) }
  const logout = async () => { await fetch(`${apiBaseUrl}/api/v1/auth/logout`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}' }); setToken(null); setUser(null) }
  const completeOnboarding = async (display_name: string, preferred_language: 'sk' | 'en') => { const r = await fetch(`${apiBaseUrl}/api/v1/users/me/onboarding`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ display_name, preferred_language }) }); if (!r.ok) throw Error(); setUser(await r.json()) }
  return <Context.Provider value={{ user, loading, login, logout, completeOnboarding, token }}>{children}</Context.Provider>
}
export const useAuth = () => useContext(Context)
