import { createContext, useCallback, useContext, type ReactNode } from 'react'
import { translate, type MessageKey, type UiLocale } from './messages'

interface I18nContextValue {
  locale: UiLocale
  t: (key: MessageKey, values?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'zh',
  t: (key, values) => translate('zh', key, values),
})

export function I18nProvider({ locale, children }: { locale: UiLocale; children: ReactNode }) {
  const t = useCallback(
    (key: MessageKey, values?: Record<string, string | number>) => translate(locale, key, values),
    [locale],
  )
  return <I18nContext.Provider value={{ locale, t }}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext)
}

export type { UiLocale }
