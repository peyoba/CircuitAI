import React, { createContext, useContext, useMemo, useState } from 'react'
import { translations, TranslationKey } from './translations'

type Language = 'en' | 'zh'

interface I18nContextValue {
  lang: Language
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
  setLang: (lang: Language) => void
}

const I18nContext = createContext<I18nContextValue | null>(null)

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getInitialLang = (): Language => {
    try {
      const saved = localStorage.getItem('circuitsai_lang') as Language | null
      if (saved === 'en' || saved === 'zh') return saved
      // 默认英文
      return 'en'
    } catch {
      return 'en'
    }
  }

  const [lang, setLangState] = useState<Language>(getInitialLang())

  const setLang = (l: Language) => {
    setLangState(l)
    try { 
      localStorage.setItem('circuitsai_lang', l) 
    } catch (error) {
      console.warn('Failed to save language setting:', error)
    }
  }

  const t = useMemo(() => {
    return (key: TranslationKey, vars?: Record<string, string | number>) => {
      const dict = translations[lang]
      let result = dict[key] || key
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
        })
      }
      return result
    }
  }, [lang])

  const value: I18nContextValue = { lang, t, setLang }
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useI18n = () => {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}


