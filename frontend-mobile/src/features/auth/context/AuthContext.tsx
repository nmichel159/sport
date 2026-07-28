import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { OnboardingData } from '../../../types/onboarding'
import {
  authenticatedRequest,
  developmentSignIn as requestDevelopmentSignIn,
  googleSignIn,
  InvalidRefreshTokenError,
  logOut,
  refreshAuthSession,
  saveOnboarding,
} from '../services/authApi'
import {
  clearStoredSession,
  readRefreshToken,
  readStoredSession,
  removeStoredUser,
  storeRefreshToken,
  storeUser,
} from '../services/authStorage'
import type { AuthContextValue, Session, User } from '../types'

export type { User } from '../types'

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signingIn: false,
  signIn: async () => {},
  developmentSignIn: async () => {},
  signOut: async () => {},
  completeOnboarding: async () => {},
  authenticatedFetch: async () => {
    throw Error('AUTH_REQUIRED')
  },
  updateNickname: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingIn, setSigningIn] = useState(false)
  const refreshInFlight = useRef<Promise<Session> | null>(null)

  const persistUser = async (nextUser: User) => {
    setUser(nextUser)
    await storeUser(nextUser)
  }

  const persistSession = async (session: Session) => {
    await storeRefreshToken(session.refresh_token)
    await persistUser(session.user)
  }

  const refreshSession = async () => {
    if (refreshInFlight.current) return refreshInFlight.current

    const pending = (async () => {
      const token = await readRefreshToken()
      if (!token) throw Error('AUTH_REQUIRED')

      try {
        const session = await refreshAuthSession(token)
        await persistSession(session)
        return session
      } catch (error) {
        if (
          error instanceof InvalidRefreshTokenError &&
          (await readRefreshToken()) === token
        ) {
          await clearStoredSession()
          setUser(null)
        }
        throw error
      }
    })()

    refreshInFlight.current = pending
    try {
      return await pending
    } finally {
      refreshInFlight.current = null
    }
  }

  useEffect(() => {
    const bootstrap = async () => {
      const { serializedUser, refreshToken } = await readStoredSession()

      if (serializedUser && refreshToken) {
        try {
          setUser(JSON.parse(serializedUser) as User)
          setLoading(false)
          void refreshSession().catch(() => undefined)
          return
        } catch {
          await removeStoredUser()
        }
      }

      if (refreshToken) {
        await refreshSession().catch(() => undefined)
      }
      setLoading(false)
    }

    void bootstrap()
  }, [])

  const signIn = async (credential: string) => {
    setSigningIn(true)
    try {
      await persistSession(await googleSignIn(credential))
    } finally {
      setSigningIn(false)
    }
  }

  const developmentSignIn = async () => {
    setSigningIn(true)
    try {
      await persistSession(await requestDevelopmentSignIn())
    } finally {
      setSigningIn(false)
    }
  }

  const completeOnboarding = async (data: OnboardingData) => {
    const session = await refreshSession()
    const nextUser = await saveOnboarding(
      session.access_token,
      data,
      user?.preferred_language ?? 'sk',
    )
    await persistUser(nextUser)
  }

  const authenticatedFetch: AuthContextValue['authenticatedFetch'] = async (
    path,
    init = {},
  ) => {
    const session = await refreshSession()
    return authenticatedRequest(session.access_token, path, init)
  }

  const updateNickname = async (nickname: string) => {
    const response = await authenticatedFetch('/users/me/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname }),
    })
    if (!response.ok) throw Error('NICKNAME_FAILED')
    await persistUser((await response.json()) as User)
  }

  const signOut = async () => {
    const token = await readRefreshToken()
    if (token) await logOut(token)
    await clearStoredSession()
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signingIn,
        signIn,
        developmentSignIn,
        signOut,
        completeOnboarding,
        authenticatedFetch,
        updateNickname,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
