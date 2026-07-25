import { createContext, useContext, useEffect, useState } from 'react'

export type Language = 'sk' | 'en'
const messages = {
  sk: { title: 'Sport', subtitle: 'Tvoje miesto pre športové tímy a turnaje.', continueGoogle: 'Pokračovať cez Google', loading: 'Overujeme tvoje prihlásenie…', loginError: 'Prihlásenie sa nepodarilo. Skús to znova.', privacy: 'Ochrana súkromia', terms: 'Podmienky používania', signOut: 'Odhlásiť', welcome: 'Vitaj späť', language: 'Jazyk' },
  en: { title: 'Sport', subtitle: 'Your place for sports teams and tournaments.', continueGoogle: 'Continue with Google', loading: 'Checking your sign-in…', loginError: 'Sign-in failed. Please try again.', privacy: 'Privacy', terms: 'Terms of use', signOut: 'Sign out', welcome: 'Welcome back', language: 'Language' },
} as const
type Translation = { [K in keyof typeof messages.sk]: string }
const I18n = createContext<{ language: Language; setLanguage: (v: Language) => void; t: Translation }>({ language: 'sk', setLanguage: () => {}, t: messages.sk })
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, set] = useState<Language>(() => (localStorage.getItem('sport-language') as Language) || (navigator.language.startsWith('en') ? 'en' : 'sk'))
  const setLanguage = (value: Language) => { localStorage.setItem('sport-language', value); set(value) }
  useEffect(() => { document.documentElement.lang = language }, [language])
  return <I18n.Provider value={{ language, setLanguage, t: messages[language] }}>{children}</I18n.Provider>
}
export const useI18n = () => useContext(I18n)
