import { createContext, useContext, useEffect, useState } from 'react'
import { getStoredValue, removeStoredValue, setStoredValue } from './services/storage'
import { apiBaseUrl } from './config/env'
type User = { id: string; display_name?: string; preferred_language: 'sk' | 'en' }
type Auth = { user: User | null; loading: boolean; signIn: (credential: string) => Promise<void>; developmentSignIn: () => Promise<void>; signOut: () => Promise<void> }
const C = createContext<Auth>({ user: null, loading: true, signIn: async () => {}, developmentSignIn: async () => {}, signOut: async () => {} })
const refreshKey = 'sport-refresh-token'
export function AuthProvider({ children }: { children: React.ReactNode }) { const [user, setUser] = useState<User | null>(null); const [loading, setLoading] = useState(true)
  const request = async (path: string, body: object) => fetch(`${apiBaseUrl}/api/v1/auth/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  useEffect(() => { getStoredValue(refreshKey).then(async token => { if (!token) return; const r = await request('refresh', { refresh_token: token }); if (!r.ok) { await removeStoredValue(refreshKey); return }; const d = await r.json(); await setStoredValue(refreshKey, d.refresh_token); setUser(d.user) }).catch(() => undefined).finally(() => setLoading(false)) }, [])
  const signIn = async (credential: string) => { const r = await request('google', { credential, platform: 'mobile' }); if (!r.ok) throw Error(); const d = await r.json(); await setStoredValue(refreshKey, d.refresh_token); setUser(d.user) }
  const developmentSignIn = async () => { const r = await request('development-login', {}); if (!r.ok) throw Error(); const d = await r.json(); await setStoredValue(refreshKey, d.refresh_token); setUser(d.user) }
  const signOut = async () => { const token = await getStoredValue(refreshKey); if (token) await request('logout', { refresh_token: token }); await removeStoredValue(refreshKey); setUser(null) }
  return <C.Provider value={{ user, loading, signIn, developmentSignIn, signOut }}>{children}</C.Provider> }
export const useAuth = () => useContext(C)
