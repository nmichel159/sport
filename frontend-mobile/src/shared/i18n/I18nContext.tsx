import { createContext, useContext, useEffect, useState } from 'react'
import {
  getStoredValue,
  setStoredValue,
} from '../../services/storage'
import {
  dictionary,
  type Language,
  type Translation,
} from './dictionary'

export type { Language, Translation } from './dictionary'

type I18nContextValue = {
  lang: Language
  setLang: (language: Language) => void
  t: Translation
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'sk',
  setLang: () => {},
  t: dictionary.sk,
})

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLanguage] = useState<Language>('sk')

  useEffect(() => {
    void getStoredValue('sport-language').then((value) => {
      if (value === 'en' || value === 'sk') setLanguage(value)
    })
  }, [])

  const setLang = (language: Language) => {
    setLanguage(language)
    void setStoredValue('sport-language', language)
  }

  return (
    <I18nContext.Provider
      value={{ lang, setLang, t: dictionary[lang] }}
    >
      {children}
    </I18nContext.Provider>
  )
}

export const useI18n = () => useContext(I18nContext)
