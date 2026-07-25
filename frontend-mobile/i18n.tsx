import { createContext, useContext, useEffect, useState } from 'react'
import { getStoredValue, setStoredValue } from './services/storage'
export type Language = 'sk' | 'en'
const dictionary = { sk: { subtitle: 'Tvoje miesto pre športové tímy a turnaje.', google: 'Pokračovať cez Google', loading: 'Overujeme prihlásenie…', error: 'Prihlásenie sa nepodarilo.', signout: 'Odhlásiť' }, en: { subtitle: 'Your place for sports teams and tournaments.', google: 'Continue with Google', loading: 'Checking sign-in…', error: 'Sign-in failed.', signout: 'Sign out' } } as const
type Translation = { [K in keyof typeof dictionary.sk]: string }
const C = createContext<{ lang: Language; setLang: (l: Language) => void; t: Translation }>({ lang: 'sk', setLang: () => {}, t: dictionary.sk })
export function I18nProvider({ children }: { children: React.ReactNode }) { const [lang, set] = useState<Language>('sk'); useEffect(() => { getStoredValue('sport-language').then(v => { if (v === 'en' || v === 'sk') set(v) }) }, []); const setLang = (l: Language) => { set(l); void setStoredValue('sport-language', l) }; return <C.Provider value={{ lang, setLang, t: dictionary[lang] }}>{children}</C.Provider> }
export const useI18n = () => useContext(C)
