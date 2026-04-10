import type {
  PreferencesJsonOpenResult,
  PreferencesJsonSaveResult,
  RxFhirDesktopBridge
} from '../types/electron'
import { setFhirBaseUrl } from './fhirClient'
import {
  DEFAULT_FOCUS_PREFERENCE,
  DEFAULT_MOTION_PREFERENCE,
  DEFAULT_SIDEBAR_MODE,
  DEFAULT_TEXT_SCALE,
  DEFAULT_UI_ZOOM,
  type FocusPreference,
  type MotionPreference,
  type SidebarMode,
  type TextScalePreference,
  type ThemeMode,
  type UiZoomPreference,
  useAppStore
} from '../app/stores/appStore'
import { useShortcutStore } from '../app/stores/shortcutStore'
import { SHORTCUT_DEFINITIONS } from '../shortcuts/defaults'
import type { ShortcutActionId, ShortcutOverrideMap } from '../shortcuts/types'
import type { SupportedLocale } from '../i18n'

export type PreferencesFileErrorCode =
  | 'bridge-unavailable'
  | 'invalid-json'
  | 'invalid-preferences'
  | 'unsupported-version'

export class PreferencesFileError extends Error {
  constructor(public code: PreferencesFileErrorCode) {
    super(code)
    this.name = 'PreferencesFileError'
  }
}

export interface AppPreferencesSnapshot {
  kind: 'rxfhir-preferences'
  version: 1
  exportedAt: string
  app: {
    serverUrl: string
    theme: ThemeMode
    locale: SupportedLocale
    motionPreference: MotionPreference
    textScale: TextScalePreference
    uiZoom: UiZoomPreference
    focusPreference: FocusPreference
    sidebarMode: SidebarMode
    hasSeenOnboarding: boolean
  }
  shortcuts: {
    overrides: ShortcutOverrideMap
  }
}

interface ImportedPreferencesResult {
  fileName: string
  snapshot: AppPreferencesSnapshot
}

type Translate = (key: string, options?: Record<string, unknown>) => string

const SUPPORTED_THEMES: ThemeMode[] = ['light', 'dark', 'system']
const SUPPORTED_LOCALES: SupportedLocale[] = ['zh-TW', 'en']
const SUPPORTED_MOTION: MotionPreference[] = ['system', 'full', 'reduced']
const SUPPORTED_TEXT_SCALE: TextScalePreference[] = ['scale100', 'scale112', 'scale125', 'scale137']
const SUPPORTED_UI_ZOOM: UiZoomPreference[] = ['zoom100', 'zoom110', 'zoom125']
const SUPPORTED_FOCUS: FocusPreference[] = ['standard', 'enhanced']
const SUPPORTED_SIDEBAR: SidebarMode[] = ['expanded', 'compact']
const VALID_SHORTCUT_IDS = new Set<ShortcutActionId>(SHORTCUT_DEFINITIONS.map((definition) => definition.id))

function requireDesktopBridge(): RxFhirDesktopBridge {
  if (!window.rxfhir) {
    throw new PreferencesFileError('bridge-unavailable')
  }

  return window.rxfhir
}

function asEnumValue<T extends string>(value: unknown, supported: readonly T[], fallback: T): T {
  return typeof value === 'string' && supported.includes(value as T) ? value as T : fallback
}

function sanitizeShortcutOverrides(value: unknown): ShortcutOverrideMap {
  if (!value || typeof value !== 'object') return {}

  const nextOverrides: ShortcutOverrideMap = {}

  for (const [key, binding] of Object.entries(value as Record<string, unknown>)) {
    if (!VALID_SHORTCUT_IDS.has(key as ShortcutActionId)) continue
    if (typeof binding !== 'string' || !binding.trim()) continue
    nextOverrides[key as ShortcutActionId] = binding.trim()
  }

  return nextOverrides
}

function parseBridgeOpenResult(result: PreferencesJsonOpenResult): ImportedPreferencesResult | null {
  if (result.canceled || !result.content || !result.fileName) {
    return null
  }

  return {
    fileName: result.fileName,
    snapshot: parsePreferencesSnapshot(result.content)
  }
}

export function buildCurrentPreferencesSnapshot(): AppPreferencesSnapshot {
  const app = useAppStore.getState()
  const shortcuts = useShortcutStore.getState()

  return {
    kind: 'rxfhir-preferences',
    version: 1,
    exportedAt: new Date().toISOString(),
    app: {
      serverUrl: app.serverUrl,
      theme: app.theme,
      locale: app.locale,
      motionPreference: app.motionPreference,
      textScale: app.textScale,
      uiZoom: app.uiZoom,
      focusPreference: app.focusPreference,
      sidebarMode: app.sidebarMode,
      hasSeenOnboarding: app.hasSeenOnboarding
    },
    shortcuts: {
      overrides: shortcuts.overrides
    }
  }
}

export async function exportPreferencesJson(
  snapshot: AppPreferencesSnapshot = buildCurrentPreferencesSnapshot()
): Promise<PreferencesJsonSaveResult> {
  const bridge = requireDesktopBridge()
  return bridge.savePreferencesJson({
    content: JSON.stringify(snapshot, null, 2),
    defaultFileName: `rxfhir-preferences-${snapshot.exportedAt.slice(0, 10)}.json`
  })
}

export async function importPreferencesJson(): Promise<ImportedPreferencesResult | null> {
  const bridge = requireDesktopBridge()
  const result = await bridge.openPreferencesJson()
  return parseBridgeOpenResult(result)
}

export function parsePreferencesSnapshot(content: string): AppPreferencesSnapshot {
  let parsed: unknown

  try {
    parsed = JSON.parse(content) as unknown
  } catch {
    throw new PreferencesFileError('invalid-json')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new PreferencesFileError('invalid-preferences')
  }

  const candidate = parsed as Partial<AppPreferencesSnapshot>
  if (candidate.kind !== 'rxfhir-preferences') {
    throw new PreferencesFileError('invalid-preferences')
  }

  if (candidate.version !== 1) {
    throw new PreferencesFileError('unsupported-version')
  }

  if (!candidate.app || typeof candidate.app !== 'object') {
    throw new PreferencesFileError('invalid-preferences')
  }

  const nextSnapshot: AppPreferencesSnapshot = {
    kind: 'rxfhir-preferences',
    version: 1,
    exportedAt: typeof candidate.exportedAt === 'string' ? candidate.exportedAt : new Date().toISOString(),
    app: {
      serverUrl: typeof candidate.app.serverUrl === 'string' && candidate.app.serverUrl.trim()
        ? candidate.app.serverUrl.trim()
        : useAppStore.getState().serverUrl,
      theme: asEnumValue(candidate.app.theme, SUPPORTED_THEMES, 'system'),
      locale: asEnumValue(candidate.app.locale, SUPPORTED_LOCALES, 'zh-TW'),
      motionPreference: asEnumValue(candidate.app.motionPreference, SUPPORTED_MOTION, DEFAULT_MOTION_PREFERENCE),
      textScale: asEnumValue(candidate.app.textScale, SUPPORTED_TEXT_SCALE, DEFAULT_TEXT_SCALE),
      uiZoom: asEnumValue(candidate.app.uiZoom, SUPPORTED_UI_ZOOM, DEFAULT_UI_ZOOM),
      focusPreference: asEnumValue(candidate.app.focusPreference, SUPPORTED_FOCUS, DEFAULT_FOCUS_PREFERENCE),
      sidebarMode: asEnumValue(candidate.app.sidebarMode, SUPPORTED_SIDEBAR, DEFAULT_SIDEBAR_MODE),
      hasSeenOnboarding: typeof candidate.app.hasSeenOnboarding === 'boolean'
        ? candidate.app.hasSeenOnboarding
        : true
    },
    shortcuts: {
      overrides: sanitizeShortcutOverrides(candidate.shortcuts?.overrides)
    }
  }

  return nextSnapshot
}

export function applyImportedPreferences(snapshot: AppPreferencesSnapshot): void {
  setFhirBaseUrl(snapshot.app.serverUrl)
  localStorage.setItem('rxfhir-locale', snapshot.app.locale)

  useAppStore.setState({
    serverUrl: snapshot.app.serverUrl,
    serverStatus: 'unknown',
    serverName: undefined,
    serverVersion: undefined,
    theme: snapshot.app.theme,
    locale: snapshot.app.locale,
    motionPreference: snapshot.app.motionPreference,
    textScale: snapshot.app.textScale,
    uiZoom: snapshot.app.uiZoom,
    focusPreference: snapshot.app.focusPreference,
    sidebarMode: snapshot.app.sidebarMode,
    hasSeenOnboarding: snapshot.app.hasSeenOnboarding
  })

  useShortcutStore.setState({
    overrides: snapshot.shortcuts.overrides
  })
}

export function getPreferencesFileErrorMessage(error: unknown, t: Translate): string {
  if (error instanceof PreferencesFileError) {
    switch (error.code) {
      case 'bridge-unavailable':
        return t('preferences.errors.unavailable')
      case 'invalid-json':
        return t('preferences.errors.invalidJson')
      case 'invalid-preferences':
        return t('preferences.errors.invalidPreferences')
      case 'unsupported-version':
        return t('preferences.errors.unsupportedVersion')
    }
  }

  return error instanceof Error ? error.message : t('errors.unknown', { ns: 'common' })
}
