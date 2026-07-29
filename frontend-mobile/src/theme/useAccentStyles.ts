import { useMemo } from 'react'
import { useTheme } from './ThemeContext'

export function useAccentStyles() {
  const { theme } = useTheme()

  return useMemo(
    () => ({
      primaryButton: { backgroundColor: theme.primary },
      primaryText: { color: theme.onPrimary },
      outlineButton: { borderColor: theme.primary },
      accentText: { color: theme.primary },
      secondaryText: { color: theme.secondary },
      selectedChip: {
        backgroundColor: theme.primary,
        borderColor: theme.primary,
      },
    }),
    [theme],
  )
}
