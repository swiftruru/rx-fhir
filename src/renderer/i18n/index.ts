import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import zhCommon   from './locales/zh-TW/common.json'
import zhNav      from './locales/zh-TW/nav.json'
import zhCreator  from './locales/zh-TW/creator.json'
import zhConsumer from './locales/zh-TW/consumer.json'
import zhSettings from './locales/zh-TW/settings.json'
import zhShowcase from './locales/zh-TW/showcase.json'
import zhShortcuts from './locales/zh-TW/shortcuts.json'
import zhHistory  from './locales/zh-TW/history.json'

import enCommon   from './locales/en/common.json'
import enNav      from './locales/en/nav.json'
import enCreator  from './locales/en/creator.json'
import enConsumer from './locales/en/consumer.json'
import enSettings from './locales/en/settings.json'
import enShowcase from './locales/en/showcase.json'
import enShortcuts from './locales/en/shortcuts.json'
import enHistory  from './locales/en/history.json'

export type SupportedLocale = 'zh-TW' | 'en'

function detectLanguage(): SupportedLocale {
  // 1. User's saved preference
  const saved = localStorage.getItem('rxfhir-locale') as SupportedLocale | null
  if (saved === 'zh-TW' || saved === 'en') return saved
  // 2. System language
  if (navigator.language.startsWith('zh')) return 'zh-TW'
  if (navigator.language.startsWith('en')) return 'en'
  // 3. Fallback
  return 'zh-TW'
}

i18n.use(initReactI18next).init({
  resources: {
    'zh-TW': {
      common:   zhCommon,
      nav:      zhNav,
      creator:  zhCreator,
      consumer: zhConsumer,
      settings: zhSettings,
      showcase: zhShowcase,
      shortcuts: zhShortcuts,
      history:   zhHistory
    },
    en: {
      common:   enCommon,
      nav:      enNav,
      creator:  enCreator,
      consumer: enConsumer,
      settings: enSettings,
      showcase: enShowcase,
      shortcuts: enShortcuts,
      history:   enHistory
    }
  },
  lng: detectLanguage(),
  fallbackLng: 'zh-TW',
  ns: ['common', 'nav', 'creator', 'consumer', 'settings', 'showcase', 'shortcuts', 'history'],
  defaultNS: 'common',
  interpolation: { escapeValue: false }
})

export default i18n
