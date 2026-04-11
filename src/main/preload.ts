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
const isE2E = process.env.RXFHIR_E2E === '1'

interface E2EBridgeCalls {
  openExternalUrls: string[]
  skippedUpdateVersions: string[]
  checkForUpdatesCount: number
}

interface E2EBridgeState {
  cachedUpdateResult: UpdateCheckResult | null
  checkForUpdatesResult: UpdateCheckResult | null
  calls: E2EBridgeCalls
  updateListeners: Set<(result: UpdateCheckResult) => void>
}

const e2eBridgeState: E2EBridgeState = {
  cachedUpdateResult: null,
  checkForUpdatesResult: null,
  calls: {
    openExternalUrls: [],
    skippedUpdateVersions: [],
    checkForUpdatesCount: 0
  },
  updateListeners: new Set()
}

function getDefaultE2EUpdateResult(): UpdateCheckResult {
  return {
    status: 'up-to-date',
    currentVersion: 'e2e'
  }
}

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
    isE2E
      ? Promise.resolve().then(() => {
          e2eBridgeState.calls.openExternalUrls.push(url)
          return { opened: true }
        })
      : ipcRenderer.invoke('external-url:open', url) as Promise<{ opened: boolean }>,
  setAppZoomFactor: (zoomFactor: number) =>
    ipcRenderer.invoke('app-zoom:set', zoomFactor) as Promise<ZoomFactorResult>,
  checkForUpdates: () =>
    isE2E
      ? Promise.resolve().then(() => {
          e2eBridgeState.calls.checkForUpdatesCount += 1
          return e2eBridgeState.checkForUpdatesResult ?? getDefaultE2EUpdateResult()
        })
      : ipcRenderer.invoke('app-update:check') as Promise<UpdateCheckResult>,
  getCachedUpdateResult: () =>
    isE2E
      ? Promise.resolve(e2eBridgeState.cachedUpdateResult)
      : ipcRenderer.invoke('app-update:get-cached') as Promise<UpdateCheckResult | null>,
  skipUpdateVersion: (version: string) =>
    isE2E
      ? Promise.resolve().then(() => {
          e2eBridgeState.calls.skippedUpdateVersions.push(version)
        })
      : ipcRenderer.invoke('app-update:skip-version', version) as Promise<void>,
  onUpdateResult: (callback: (result: UpdateCheckResult) => void) => {
    if (isE2E) {
      e2eBridgeState.updateListeners.add(callback)
      return () => { e2eBridgeState.updateListeners.delete(callback) }
    }
    const handler = (_event: Electron.IpcRendererEvent, result: UpdateCheckResult): void => {
      callback(result)
    }
    ipcRenderer.on('app-update:result', handler)
    return () => { ipcRenderer.removeListener('app-update:result', handler) }
  }
}

const e2eBridge = {
  reset(): void {
    e2eBridgeState.cachedUpdateResult = null
    e2eBridgeState.checkForUpdatesResult = null
    e2eBridgeState.calls = {
      openExternalUrls: [],
      skippedUpdateVersions: [],
      checkForUpdatesCount: 0
    }
  },
  setUpdateMocks(payload: {
    cachedUpdateResult?: UpdateCheckResult | null
    checkForUpdatesResult?: UpdateCheckResult | null
  }): void {
    if (payload.cachedUpdateResult !== undefined) {
      e2eBridgeState.cachedUpdateResult = payload.cachedUpdateResult
    }
    if (payload.checkForUpdatesResult !== undefined) {
      e2eBridgeState.checkForUpdatesResult = payload.checkForUpdatesResult
    }
  },
  emitUpdateResult(result: UpdateCheckResult): void {
    for (const listener of e2eBridgeState.updateListeners) {
      listener(result)
    }
  },
  getCalls(): E2EBridgeCalls {
    return {
      openExternalUrls: [...e2eBridgeState.calls.openExternalUrls],
      skippedUpdateVersions: [...e2eBridgeState.calls.skippedUpdateVersions],
      checkForUpdatesCount: e2eBridgeState.calls.checkForUpdatesCount
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('rxfhir', bundleJsonBridge)
    if (isE2E) {
      contextBridge.exposeInMainWorld('__rxfhirE2E', e2eBridge)
    }
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.rxfhir = bundleJsonBridge
  if (isE2E) {
    // @ts-ignore (only exposed in Electron E2E mode)
    window.__rxfhirE2E = e2eBridge
  }
}
