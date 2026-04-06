import electron from 'electron'
const { contextBridge, ipcRenderer } = electron

const bundleJsonBridge = {
  saveBundleJson: (payload: { content: string; defaultFileName?: string }) =>
    ipcRenderer.invoke('bundle-json:save', payload) as Promise<{
      canceled: boolean
      filePath?: string
      fileName?: string
    }>,
  openBundleJson: () =>
    ipcRenderer.invoke('bundle-json:open') as Promise<{
      canceled: boolean
      filePath?: string
      fileName?: string
      content?: string
    }>,
  openRecentBundleJson: (filePath: string) =>
    ipcRenderer.invoke('bundle-json:recent-open', filePath) as Promise<{
      canceled: boolean
      filePath?: string
      fileName?: string
      content?: string
    }>,
  listRecentBundleJsonFiles: () =>
    ipcRenderer.invoke('bundle-json:recent-list') as Promise<Array<{
      filePath: string
      fileName: string
      lastOpenedAt: string
    }>>,
  rememberRecentBundleJson: (filePath: string) =>
    ipcRenderer.invoke('bundle-json:recent-track', filePath) as Promise<void>,
  savePreferencesJson: (payload: { content: string; defaultFileName?: string }) =>
    ipcRenderer.invoke('preferences-json:save', payload) as Promise<{
      canceled: boolean
      filePath?: string
      fileName?: string
    }>,
  openPreferencesJson: () =>
    ipcRenderer.invoke('preferences-json:open') as Promise<{
      canceled: boolean
      filePath?: string
      fileName?: string
      content?: string
    }>,
  saveFile: (payload: { content: string; defaultFileName: string; filters: Array<{ name: string; extensions: string[] }> }) =>
    ipcRenderer.invoke('file:save', payload) as Promise<{
      canceled: boolean
      filePath?: string
      fileName?: string
    }>,
  openExternalUrl: (url: string) =>
    ipcRenderer.invoke('external-url:open', url) as Promise<{ opened: boolean }>,
  setAppZoomFactor: (zoomFactor: number) =>
    ipcRenderer.invoke('app-zoom:set', zoomFactor) as Promise<{ zoomFactor: number }>
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
