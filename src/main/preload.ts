import electron from 'electron'
import type {
  BundleJsonOpenResult,
  BundleJsonSavePayload,
  BundleJsonSaveResult,
  FileSavePayload,
  PreferencesJsonOpenResult,
  PreferencesJsonSavePayload,
  PreferencesJsonSaveResult,
  RecentBundleFileEntry,
  SaveFileResult,
  UpdateCheckResult,
  ZoomFactorResult
} from '../shared/contracts/electron'
const { contextBridge, ipcRenderer } = electron

const bundleJsonBridge = {
  saveBundleJson: (payload: BundleJsonSavePayload) =>
    ipcRenderer.invoke('bundle-json:save', payload) as Promise<BundleJsonSaveResult>,
  openBundleJson: () =>
    ipcRenderer.invoke('bundle-json:open') as Promise<BundleJsonOpenResult>,
  openRecentBundleJson: (filePath: string) =>
    ipcRenderer.invoke('bundle-json:recent-open', filePath) as Promise<BundleJsonOpenResult>,
  listRecentBundleJsonFiles: () =>
    ipcRenderer.invoke('bundle-json:recent-list') as Promise<RecentBundleFileEntry[]>,
  rememberRecentBundleJson: (filePath: string) =>
    ipcRenderer.invoke('bundle-json:recent-track', filePath) as Promise<void>,
  savePreferencesJson: (payload: PreferencesJsonSavePayload) =>
    ipcRenderer.invoke('preferences-json:save', payload) as Promise<PreferencesJsonSaveResult>,
  openPreferencesJson: () =>
    ipcRenderer.invoke('preferences-json:open') as Promise<PreferencesJsonOpenResult>,
  saveFile: (payload: FileSavePayload) =>
    ipcRenderer.invoke('file:save', payload) as Promise<SaveFileResult>,
  openExternalUrl: (url: string) =>
    ipcRenderer.invoke('external-url:open', url) as Promise<{ opened: boolean }>,
  setAppZoomFactor: (zoomFactor: number) =>
    ipcRenderer.invoke('app-zoom:set', zoomFactor) as Promise<ZoomFactorResult>,
  checkForUpdates: () =>
    ipcRenderer.invoke('app-update:check') as Promise<UpdateCheckResult>,
  getCachedUpdateResult: () =>
    ipcRenderer.invoke('app-update:get-cached') as Promise<UpdateCheckResult | null>,
  skipUpdateVersion: (version: string) =>
    ipcRenderer.invoke('app-update:skip-version', version) as Promise<void>,
  onUpdateResult: (callback: (result: UpdateCheckResult) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, result: UpdateCheckResult): void => {
      callback(result)
    }
    ipcRenderer.on('app-update:result', handler)
    return () => { ipcRenderer.removeListener('app-update:result', handler) }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('rxfhir', bundleJsonBridge)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.rxfhir = bundleJsonBridge
}
