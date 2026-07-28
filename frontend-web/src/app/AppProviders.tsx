import type { ReactNode } from 'react'
import { AuthProvider } from '../features/auth/context/AuthContext'
import { I18nProvider } from '../shared/i18n/I18nContext'

export function AppProviders({ children }: { children: ReactNode }) {
  return <I18nProvider><AuthProvider>{children}</AuthProvider></I18nProvider>
}
