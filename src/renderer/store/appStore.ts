import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getFhirBaseUrl, setFhirBaseUrl } from '../services/fhirClient'
import type { SupportedLocale } from '../i18n'

type ServerStatus = 'unknown' | 'online' | 'offline' | 'checking'
type AppMode = 'creator' | 'consumer' | 'settings'
export type ThemeMode = 'light' | 'dark' | 'system'

interface AppState {
  serverUrl: string
  serverStatus: ServerStatus
  serverName?: string
  serverVersion?: string
  currentMode: AppMode
  theme: ThemeMode
  locale: SupportedLocale
  setServerUrl: (url: string) => void
  setServerStatus: (status: ServerStatus, name?: string, version?: string) => void
  setCurrentMode: (mode: AppMode) => void
  setTheme: (theme: ThemeMode) => void
  setLocale: (locale: SupportedLocale) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      serverUrl: getFhirBaseUrl(),
      serverStatus: 'unknown',
      serverName: undefined,
      serverVersion: undefined,
      currentMode: 'creator',
      theme: 'system',
      locale: 'zh-TW',

      setServerUrl: (url: string) => {
        setFhirBaseUrl(url)
        set({ serverUrl: url, serverStatus: 'unknown' })
      },

      setServerStatus: (status, name, version) => {
        set({ serverStatus: status, serverName: name, serverVersion: version })
      },

      setCurrentMode: (mode) => set({ currentMode: mode }),

      setTheme: (theme) => set({ theme }),

      setLocale: (locale) => {
        localStorage.setItem('rxfhir-locale', locale)
        set({ locale })
      }
    }),
    {
      name: 'rxfhir-app-store',
      partialize: (state) => ({ serverUrl: state.serverUrl, theme: state.theme, locale: state.locale })
    }
  )
)
