import type { ReactNode } from 'react'
import { AuthProvider } from '../features/auth/context/AuthContext'
import { I18nProvider } from '../shared/i18n/I18nContext'
import { SystemUiController } from '../system/SystemUiController'
import { ThemeProvider } from '../theme/ThemeContext'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <SystemUiController />
          {children}
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  )
}
