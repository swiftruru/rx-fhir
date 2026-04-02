import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getFhirBaseUrl, setFhirBaseUrl } from '../services/fhirClient'
import type { SupportedLocale } from '../i18n'

type ServerStatus = 'unknown' | 'online' | 'offline' | 'checking'
type AppMode = 'creator' | 'consumer' | 'settings'
export type ThemeMode = 'light' | 'dark' | 'system'
export type MotionPreference = 'system' | 'full' | 'reduced'
export type TextScalePreference = 'scale100' | 'scale112' | 'scale125' | 'scale137'
export type UiZoomPreference = 'zoom100' | 'zoom110' | 'zoom125'
export type FocusPreference = 'standard' | 'enhanced'

export const TEXT_SCALE_VALUES: Record<TextScalePreference, number> = {
  scale100: 1,
  scale112: 1.125,
  scale125: 1.25,
  scale137: 1.375
}

export const UI_ZOOM_VALUES: Record<UiZoomPreference, number> = {
  zoom100: 1,
  zoom110: 1.1,
  zoom125: 1.25
}

interface AppState {
  serverUrl: string
  serverStatus: ServerStatus
  serverName?: string
  serverVersion?: string
  currentMode: AppMode
  theme: ThemeMode
  locale: SupportedLocale
  motionPreference: MotionPreference
  textScale: TextScalePreference
  uiZoom: UiZoomPreference
  focusPreference: FocusPreference
  setServerUrl: (url: string) => void
  setServerStatus: (status: ServerStatus, name?: string, version?: string) => void
  setCurrentMode: (mode: AppMode) => void
  setTheme: (theme: ThemeMode) => void
  setLocale: (locale: SupportedLocale) => void
  setMotionPreference: (preference: MotionPreference) => void
  setTextScale: (preference: TextScalePreference) => void
  setUiZoom: (preference: UiZoomPreference) => void
  setFocusPreference: (preference: FocusPreference) => void
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
      motionPreference: 'system',
      textScale: 'scale100',
      uiZoom: 'zoom100',
      focusPreference: 'standard',

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
      },

      setMotionPreference: (motionPreference) => set({ motionPreference }),
      setTextScale: (textScale) => set({ textScale }),
      setUiZoom: (uiZoom) => set({ uiZoom }),
      setFocusPreference: (focusPreference) => set({ focusPreference })
    }),
    {
      name: 'rxfhir-app-store',
      partialize: (state) => ({
        serverUrl: state.serverUrl,
        theme: state.theme,
        locale: state.locale,
        motionPreference: state.motionPreference,
        textScale: state.textScale,
        uiZoom: state.uiZoom,
        focusPreference: state.focusPreference
      })
    }
  )
)
