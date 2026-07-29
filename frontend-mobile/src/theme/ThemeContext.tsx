import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getStoredValue, setStoredValue } from '../services/storage'
import { defaultThemeId, themes, type AppTheme, type ThemeId } from './theme'

const themeStorageKey = 'sport-local-theme'

type ThemeContextValue = {
  theme: AppTheme
  setThemeId: (themeId: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(defaultThemeId)

  useEffect(() => {
    void getStoredValue(themeStorageKey).then((storedThemeId) => {
      if (storedThemeId && storedThemeId in themes) {
        setThemeIdState(storedThemeId as ThemeId)
      }
    })
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: themes[themeId],
      setThemeId: (nextThemeId) => {
        setThemeIdState(nextThemeId)
        void setStoredValue(themeStorageKey, nextThemeId)
      },
    }),
    [themeId],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw Error('useTheme must be used inside ThemeProvider')
  return context
}
