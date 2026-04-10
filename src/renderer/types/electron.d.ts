export type {
  BundleJsonOpenResult,
  BundleJsonSavePayload,
  BundleJsonSaveResult,
  FileSavePayload,
  PreferencesJsonOpenResult,
  PreferencesJsonSavePayload,
  PreferencesJsonSaveResult,
  RecentBundleFileEntry,
  RxFhirDesktopBridge,
  SaveFileResult,
  UpdateCheckResult,
  UpdateStatus,
  ZoomFactorResult
} from '../../shared/contracts/electron'

import type { RxFhirDesktopBridge } from '../../shared/contracts/electron'

declare global {
  interface Window {
    rxfhir: RxFhirDesktopBridge
  }
  const __APP_VERSION__: string
}

export {}
