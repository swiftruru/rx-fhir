export interface BundleJsonSavePayload {
  content: string
  defaultFileName?: string
}

export interface BundleJsonSaveResult {
  canceled: boolean
  filePath?: string
  fileName?: string
}

export interface BundleJsonOpenResult extends BundleJsonSaveResult {
  content?: string
}

export interface PreferencesJsonSavePayload {
  content: string
  defaultFileName?: string
}

export interface PreferencesJsonSaveResult {
  canceled: boolean
  filePath?: string
  fileName?: string
}

export interface PreferencesJsonOpenResult extends PreferencesJsonSaveResult {
  content?: string
}

export interface RecentBundleFileEntry {
  filePath: string
  fileName: string
  lastOpenedAt: string
}

export interface FileSavePayload {
  content: string
  defaultFileName: string
  filters: Array<{ name: string; extensions: string[] }>
}

export interface SaveFileResult {
  canceled: boolean
  filePath?: string
  fileName?: string
}

export interface ZoomFactorResult {
  zoomFactor: number
}

export type UpdateStatus = 'up-to-date' | 'update-available' | 'check-failed'

export interface UpdateCheckResult {
  status: UpdateStatus
  currentVersion: string
  latestVersion?: string
  releaseUrl?: string
  releaseName?: string
  error?: string
}

export interface RxFhirDesktopBridge {
  saveBundleJson: (payload: BundleJsonSavePayload) => Promise<BundleJsonSaveResult>
  openBundleJson: () => Promise<BundleJsonOpenResult>
  openRecentBundleJson: (filePath: string) => Promise<BundleJsonOpenResult>
  listRecentBundleJsonFiles: () => Promise<RecentBundleFileEntry[]>
  rememberRecentBundleJson: (filePath: string) => Promise<void>
  savePreferencesJson: (payload: PreferencesJsonSavePayload) => Promise<PreferencesJsonSaveResult>
  openPreferencesJson: () => Promise<PreferencesJsonOpenResult>
  saveFile: (payload: FileSavePayload) => Promise<SaveFileResult>
  openExternalUrl: (url: string) => Promise<{ opened: boolean }>
  setAppZoomFactor: (zoomFactor: number) => Promise<ZoomFactorResult>
  checkForUpdates: () => Promise<UpdateCheckResult>
  getCachedUpdateResult: () => Promise<UpdateCheckResult | null>
  skipUpdateVersion: (version: string) => Promise<void>
  onUpdateResult: (callback: (result: UpdateCheckResult) => void) => () => void
}
