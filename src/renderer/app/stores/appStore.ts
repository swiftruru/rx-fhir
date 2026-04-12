import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getFhirBaseUrl, setFhirBaseUrl } from '../../services/fhirClient'
import type { SupportedLocale } from '../../i18n'
import type { ServerCapabilities } from '../../../shared/contracts/electron'

type ServerStatus = 'unknown' | 'online' | 'offline' | 'checking'
type AppMode = 'creator' | 'consumer' | 'settings'
export type ThemeMode = 'light' | 'dark' | 'system'
export type MotionPreference = 'system' | 'full' | 'reduced'
export type TextScalePreference = 'scale100' | 'scale112' | 'scale125' | 'scale137'
export type UiZoomPreference = 'zoom100' | 'zoom110' | 'zoom125'
export type FocusPreference = 'standard' | 'enhanced'
export type SidebarMode = 'expanded' | 'compact'

export const DEFAULT_MOTION_PREFERENCE: MotionPreference = 'system'
export const DEFAULT_TEXT_SCALE: TextScalePreference = 'scale100'
export const DEFAULT_UI_ZOOM: UiZoomPreference = 'zoom100'
export const DEFAULT_FOCUS_PREFERENCE: FocusPreference = 'standard'
export const DEFAULT_SIDEBAR_MODE: SidebarMode = 'expanded'

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
  serverCapabilities?: ServerCapabilities
  currentMode: AppMode
  theme: ThemeMode
  locale: SupportedLocale
  motionPreference: MotionPreference
  textScale: TextScalePreference
  uiZoom: UiZoomPreference
  focusPreference: FocusPreference
  sidebarMode: SidebarMode
  hasSeenOnboarding: boolean
  setServerUrl: (url: string) => void
  setServerStatus: (status: ServerStatus, name?: string, version?: string, capabilities?: ServerCapabilities) => void
  setCurrentMode: (mode: AppMode) => void
  setTheme: (theme: ThemeMode) => void
  setLocale: (locale: SupportedLocale) => void
  setMotionPreference: (preference: MotionPreference) => void
  setTextScale: (preference: TextScalePreference) => void
  setUiZoom: (preference: UiZoomPreference) => void
  setFocusPreference: (preference: FocusPreference) => void
  setSidebarMode: (mode: SidebarMode) => void
  setHasSeenOnboarding: (value: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      serverUrl: getFhirBaseUrl(),
      serverStatus: 'unknown',
      serverName: undefined,
      serverVersion: undefined,
      serverCapabilities: undefined,
      currentMode: 'creator',
      theme: 'system',
      locale: 'zh-TW',
      motionPreference: DEFAULT_MOTION_PREFERENCE,
      textScale: DEFAULT_TEXT_SCALE,
      uiZoom: DEFAULT_UI_ZOOM,
      focusPreference: DEFAULT_FOCUS_PREFERENCE,
      sidebarMode: DEFAULT_SIDEBAR_MODE,
      hasSeenOnboarding: false,

      setServerUrl: (url: string) => {
        setFhirBaseUrl(url)
        set({
          serverUrl: url,
          serverStatus: 'unknown',
          serverName: undefined,
          serverVersion: undefined,
          serverCapabilities: undefined
        })
      },

      setServerStatus: (status, name, version, serverCapabilities) => {
        set({ serverStatus: status, serverName: name, serverVersion: version, serverCapabilities })
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
      setFocusPreference: (focusPreference) => set({ focusPreference }),
      setSidebarMode: (sidebarMode) => set({ sidebarMode }),
      setHasSeenOnboarding: (hasSeenOnboarding) => set({ hasSeenOnboarding })
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
        focusPreference: state.focusPreference,
        sidebarMode: state.sidebarMode,
        hasSeenOnboarding: state.hasSeenOnboarding
      })
    }
  )
)
