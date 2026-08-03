import { createContext, useContext, useEffect, useState } from 'react'
import { getLocales } from 'expo-localization'
import { I18n } from 'i18n-js'
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
  setLang: (language: Language) => void
  t: Translation
}

const I18nContext = createContext<I18nContextValue>({
  setLang: () => {},
  t: dictionary.sk,
})

const i18n = new I18n(dictionary)
i18n.defaultLocale = 'sk'
i18n.enableFallback = true

function deviceLanguage(): Language {
  return getLocales()[0]?.languageCode === 'en' ? 'en' : 'sk'
}

function translations(language: Language): Translation {
  i18n.locale = language
  return {
    subtitle: i18n.t('subtitle'),
    google: i18n.t('google'),
    loading: i18n.t('loading'),
    error: i18n.t('error'),
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLanguage] = useState<Language>(deviceLanguage)

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
      value={{ setLang, t: translations(lang) }}
    >
      {children}
    </I18nContext.Provider>
  )
}

export const useI18n = () => useContext(I18nContext)
