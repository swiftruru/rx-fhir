import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

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
  openExternalUrl: (url: string) =>
    ipcRenderer.invoke('external-url:open', url) as Promise<{ opened: boolean }>
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('rxfhir', bundleJsonBridge)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.rxfhir = bundleJsonBridge
}
