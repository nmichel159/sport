import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { apiBaseUrl } from '../../../config/env'

export type CurrentUser = {
  id: string
  email: string
  display_name?: string
  profile_image_url?: string
  preferred_language: 'sk' | 'en'
  onboarding_completed: boolean
}

type AuthResponse = {
  access_token: string
  user: CurrentUser
}

type Auth = {
  user: CurrentUser | null
  loading: boolean
  login: (credential: string) => Promise<void>
  logout: () => Promise<void>
  completeOnboarding: (name: string, language: 'sk' | 'en') => Promise<void>
  token: string | null
}

const AuthContext = createContext<Auth>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  completeOnboarding: async () => {},
  token: null,
})

class InvalidSessionError extends Error {}
class AuthServiceError extends Error {
  constructor(
    public readonly status: number,
    public readonly retryAfter: string | null = null,
  ) {
    super(`AUTH_SERVICE_ERROR_${status}`)
  }
}

// React StrictMode can mount the provider twice in development. Sharing this
// request prevents two calls from trying to rotate the same refresh token.
let refreshRequest: Promise<AuthResponse> | null = null

function retryDelay(retryAfter: string | null) {
  if (!retryAfter) return 60_000

  const seconds = Number(retryAfter)
  if (Number.isFinite(seconds)) {
    return Math.min(Math.max(seconds * 1_000, 1_000), 60_000)
  }

  const dateDelay = Date.parse(retryAfter) - Date.now()
  return Math.min(Math.max(dateDelay, 1_000), 60_000)
}

async function fetchRefresh(attempt = 0): Promise<AuthResponse> {
  const response = await fetch(`${apiBaseUrl}/api/v1/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })

  if (response.status === 401) throw new InvalidSessionError()
  if (response.status === 429 && attempt === 0) {
    await new Promise((resolve) =>
      setTimeout(resolve, retryDelay(response.headers.get('Retry-After'))),
    )
    return fetchRefresh(attempt + 1)
  }
  if (!response.ok) {
    throw new AuthServiceError(
      response.status,
      response.headers.get('Retry-After'),
    )
  }
  return (await response.json()) as AuthResponse
}

function requestRefresh() {
  if (refreshRequest) return refreshRequest

  refreshRequest = fetchRefresh().finally(() => {
    refreshRequest = null
  })

  return refreshRequest
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)

  const acceptAuth = (data: AuthResponse) => {
    setToken(data.access_token)
    setUser(data.user)
  }

  useEffect(() => {
    void requestRefresh()
      .then(acceptAuth)
      .catch((error: unknown) => {
        // A 429 or temporary backend failure must not be treated as logout.
        if (error instanceof InvalidSessionError) {
          setToken(null)
          setUser(null)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (credential: string) => {
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/google`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential, platform: 'web' }),
    })
    if (!response.ok) throw new AuthServiceError(response.status)
    acceptAuth((await response.json()) as AuthResponse)
  }

  const logout = async () => {
    try {
      await fetch(`${apiBaseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
    } finally {
      setToken(null)
      setUser(null)
    }
  }

  const completeOnboarding = async (
    display_name: string,
    preferred_language: 'sk' | 'en',
  ) => {
    const response = await fetch(
      `${apiBaseUrl}/api/v1/users/me/onboarding`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ display_name, preferred_language }),
      },
    )
    if (!response.ok) throw new Error('ONBOARDING_FAILED')
    setUser((await response.json()) as CurrentUser)
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, completeOnboarding, token }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
