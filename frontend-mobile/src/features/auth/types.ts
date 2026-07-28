import type { OnboardingData } from '../../types/onboarding'
import type { AuthenticatedFetch } from '../../types/domain'

export type User = {
  id: string
  display_name?: string
  preferred_language: 'sk' | 'en'
  onboarding_completed: boolean
}

export type Session = {
  access_token: string
  refresh_token: string
  user: User
}

export type AuthContextValue = {
  user: User | null
  loading: boolean
  signingIn: boolean
  signIn: (credential: string) => Promise<void>
  developmentSignIn: () => Promise<void>
  signOut: () => Promise<void>
  completeOnboarding: (data: OnboardingData) => Promise<void>
  authenticatedFetch: AuthenticatedFetch
}
