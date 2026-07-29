export type ThemeId = 'gold' | 'blue' | 'green' | 'violet' | 'coral'

export type AppTheme = {
  id: ThemeId
  name: string
  primary: string
  secondary: string
  soft: string
  softBorder: string
  onPrimary: string
}

export const themes: Record<ThemeId, AppTheme> = {
  gold: {
    id: 'gold',
    name: 'Zlatá',
    primary: '#ffd400',
    secondary: '#c8a900',
    soft: '#29270f',
    softBorder: '#665814',
    onPrimary: '#171400',
  },
  blue: {
    id: 'blue',
    name: 'Modrá',
    primary: '#55aaff',
    secondary: '#a8d5ff',
    soft: '#10283e',
    softBorder: '#28577d',
    onPrimary: '#071725',
  },
  green: {
    id: 'green',
    name: 'Zelená',
    primary: '#67dc9a',
    secondary: '#b5f5cd',
    soft: '#112c20',
    softBorder: '#2d704c',
    onPrimary: '#082014',
  },
  violet: {
    id: 'violet',
    name: 'Fialová',
    primary: '#b99cff',
    secondary: '#e1d7ff',
    soft: '#251b3e',
    softBorder: '#5d478d',
    onPrimary: '#170d2a',
  },
  coral: {
    id: 'coral',
    name: 'Koralová',
    primary: '#ff9292',
    secondary: '#ffd0d0',
    soft: '#3b1e20',
    softBorder: '#824548',
    onPrimary: '#2a0e10',
  },
}

export const defaultThemeId: ThemeId = 'gold'
