import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingIn, setSigningIn] = useState(false)
  const sessionRef = useRef<Session | null>(null)
  const refreshInFlight = useRef<Promise<Session> | null>(null)

  const persistUser = async (nextUser: User) => {
    setUser(nextUser)
    await storeUser(nextUser)
  }

  const persistSession = async (session: Session) => {
    sessionRef.current = session
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
          sessionRef.current = null
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

  const getSession = () =>
    sessionRef.current
      ? Promise.resolve(sessionRef.current)
      : refreshSession()

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
    const session = await getSession()
    const nextUser = await saveOnboarding(
      session.access_token,
      data,
      user?.preferred_language ?? 'sk',
    )
    await persistUser(nextUser)
  }

  // Keep the latest implementation in a ref so the stable callback
  // returned by useCallback always calls up-to-date logic without
  // changing its own identity. This prevents useEffect loops in
  // consumers that list `authenticatedFetch` / `fetcher` as a dep.
  const authenticatedFetchRef = useRef<AuthContextValue['authenticatedFetch']>(
    null!,
  )
  authenticatedFetchRef.current = async (path, init = {}) => {
    const session = await getSession()
    const response = await authenticatedRequest(
      session.access_token,
      path,
      init,
    )

    if (response.status !== 401) return response

    const newerSession = sessionRef.current
    const retrySession =
      newerSession && newerSession.access_token !== session.access_token
        ? newerSession
        : await refreshSession()
    return authenticatedRequest(retrySession.access_token, path, init)
  }

  // Stable reference – never changes across renders.
  const authenticatedFetch = useCallback<
    AuthContextValue['authenticatedFetch']
  >((path, init) => authenticatedFetchRef.current(path, init), [])

  const signOut = async () => {
    const token = await readRefreshToken()
    try {
      if (token) await logOut(token)
    } finally {
      sessionRef.current = null
      await clearStoredSession()
      setUser(null)
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signingIn,
      signIn,
      developmentSignIn,
      signOut,
      completeOnboarding,
      authenticatedFetch,
    }),
    // authenticatedFetch is stable; the others legitimately change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, loading, signingIn],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
