export interface BundleJsonSaveResult {
  canceled: boolean
  filePath?: string
  fileName?: string
}

export interface BundleJsonOpenResult extends BundleJsonSaveResult {
  content?: string
}

export interface RxFhirDesktopBridge {
  saveBundleJson: (payload: { content: string; defaultFileName?: string }) => Promise<BundleJsonSaveResult>
  openBundleJson: () => Promise<BundleJsonOpenResult>
  openExternalUrl: (url: string) => Promise<{ opened: boolean }>
}

declare global {
  interface Window {
    rxfhir: RxFhirDesktopBridge
  }
}

export {}
