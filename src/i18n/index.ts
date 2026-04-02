import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import es from './locales/es.json'

export type LocaleCode = 'en' | 'es'

const STORAGE_KEY = 'controltower.locale'

function readInitialLocale(): LocaleCode {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (s === 'es' || s === 'en') return s
  } catch {
    /* ignore */
  }
  return 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: readInitialLocale(),
  fallbackLocale: 'en',
  messages: { en, es },
  globalInjection: true
})

export function setLocale(locale: LocaleCode) {
  i18n.global.locale.value = locale
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    /* ignore */
  }
}

export function getLocale(): LocaleCode {
  const l = i18n.global.locale.value
  return l === 'es' ? 'es' : 'en'
}
