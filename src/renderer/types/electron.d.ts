export interface BundleJsonSaveResult {
  canceled: boolean
  filePath?: string
  fileName?: string
}

export interface BundleJsonOpenResult extends BundleJsonSaveResult {
  content?: string
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

export interface SaveFileResult {
  canceled: boolean
  filePath?: string
  fileName?: string
}

export interface RxFhirDesktopBridge {
  saveBundleJson: (payload: { content: string; defaultFileName?: string }) => Promise<BundleJsonSaveResult>
  openBundleJson: () => Promise<BundleJsonOpenResult>
  openRecentBundleJson: (filePath: string) => Promise<BundleJsonOpenResult>
  listRecentBundleJsonFiles: () => Promise<RecentBundleFileEntry[]>
  rememberRecentBundleJson: (filePath: string) => Promise<void>
  savePreferencesJson: (payload: { content: string; defaultFileName?: string }) => Promise<PreferencesJsonSaveResult>
  openPreferencesJson: () => Promise<PreferencesJsonOpenResult>
  saveFile: (payload: { content: string; defaultFileName: string; filters: Array<{ name: string; extensions: string[] }> }) => Promise<SaveFileResult>
  openExternalUrl: (url: string) => Promise<{ opened: boolean }>
  setAppZoomFactor: (zoomFactor: number) => Promise<{ zoomFactor: number }>
}

declare global {
  interface Window {
    rxfhir: RxFhirDesktopBridge
  }
}

export {}
