import electron from 'electron'
import { basename } from 'path'
import { readFile, writeFile } from 'node:fs/promises'
import type {
  BundleJsonSavePayload,
  BundleJsonSaveResult,
  FileSavePayload,
  PreferencesJsonSavePayload,
  RecentBundleFileEntry,
  SaveFileResult
} from '../../shared/contracts/electron'
import { rememberRecentBundleFile, getExistingRecentBundleFiles } from '../services/recentBundleFileService'
import { consumePendingBundleFilePath } from '../services/pendingBundleOpenService'
import { clampZoomFactor } from '../services/mainWindowService'

const { BrowserWindow, dialog, ipcMain, shell } = electron

function getTargetWindow(): Electron.BrowserWindow | undefined {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
}

export function registerDesktopIpc(): void {
  ipcMain.handle(
    'bundle-json:save',
    async (_event, payload: BundleJsonSavePayload): Promise<BundleJsonSaveResult> => {
      const targetWindow = getTargetWindow()
      const saveOptions = {
        title: 'Export FHIR Bundle JSON',
        defaultPath: payload.defaultFileName ?? 'rxfhir-bundle.json',
        filters: [{ name: 'FHIR Bundle JSON', extensions: ['json'] }]
      }
      const { canceled, filePath } = targetWindow
        ? await dialog.showSaveDialog(targetWindow, saveOptions)
        : await dialog.showSaveDialog(saveOptions)

      if (canceled || !filePath) {
        return { canceled: true }
      }

      await writeFile(filePath, payload.content, 'utf8')
      await rememberRecentBundleFile(filePath)

      return {
        canceled: false,
        filePath,
        fileName: basename(filePath)
      }
    }
  )

  ipcMain.handle('bundle-json:open', async () => {
    const targetWindow = getTargetWindow()
    const openOptions: Electron.OpenDialogOptions = {
      title: 'Import FHIR Bundle JSON',
      properties: ['openFile'],
      filters: [{ name: 'FHIR Bundle JSON', extensions: ['json'] }]
    }
    const { canceled, filePaths } = targetWindow
      ? await dialog.showOpenDialog(targetWindow, openOptions)
      : await dialog.showOpenDialog(openOptions)

    const filePath = filePaths[0]
    if (canceled || !filePath) {
      return { canceled: true }
    }

    const content = await readFile(filePath, 'utf8')
    await rememberRecentBundleFile(filePath)

    return {
      canceled: false,
      filePath,
      fileName: basename(filePath),
      content
    }
  })

  ipcMain.handle('bundle-json:recent-list', async (): Promise<RecentBundleFileEntry[]> => {
    return getExistingRecentBundleFiles()
  })

  ipcMain.handle('bundle-json:recent-open', async (_event, filePath: string) => {
    if (!filePath.trim()) {
      return { canceled: true }
    }

    const content = await readFile(filePath, 'utf8')
    await rememberRecentBundleFile(filePath)

    return {
      canceled: false,
      filePath,
      fileName: basename(filePath),
      content
    }
  })

  ipcMain.handle('bundle-json:recent-track', async (_event, filePath: string) => {
    await rememberRecentBundleFile(filePath)
  })

  ipcMain.handle('bundle-json:pending-open:consume', async (): Promise<string | null> => {
    return consumePendingBundleFilePath()
  })

  ipcMain.handle(
    'preferences-json:save',
    async (_event, payload: PreferencesJsonSavePayload) => {
      const targetWindow = getTargetWindow()
      const saveOptions = {
        title: 'Export RxFHIR Preferences',
        defaultPath: payload.defaultFileName ?? `rxfhir-preferences-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [{ name: 'RxFHIR Preferences JSON', extensions: ['json'] }]
      }
      const { canceled, filePath } = targetWindow
        ? await dialog.showSaveDialog(targetWindow, saveOptions)
        : await dialog.showSaveDialog(saveOptions)

      if (canceled || !filePath) {
        return { canceled: true }
      }

      await writeFile(filePath, payload.content, 'utf8')

      return {
        canceled: false,
        filePath,
        fileName: basename(filePath)
      }
    }
  )

  ipcMain.handle('preferences-json:open', async () => {
    const targetWindow = getTargetWindow()
    const openOptions: Electron.OpenDialogOptions = {
      title: 'Import RxFHIR Preferences',
      properties: ['openFile'],
      filters: [{ name: 'RxFHIR Preferences JSON', extensions: ['json'] }]
    }
    const { canceled, filePaths } = targetWindow
      ? await dialog.showOpenDialog(targetWindow, openOptions)
      : await dialog.showOpenDialog(openOptions)

    const filePath = filePaths[0]
    if (canceled || !filePath) {
      return { canceled: true }
    }

    const content = await readFile(filePath, 'utf8')

    return {
      canceled: false,
      filePath,
      fileName: basename(filePath),
      content
    }
  })

  ipcMain.handle(
    'file:save',
    async (_event, payload: FileSavePayload): Promise<SaveFileResult> => {
      const targetWindow = getTargetWindow()
      const saveOptions = {
        defaultPath: payload.defaultFileName,
        filters: payload.filters
      }
      const { canceled, filePath } = targetWindow
        ? await dialog.showSaveDialog(targetWindow, saveOptions)
        : await dialog.showSaveDialog(saveOptions)

      if (canceled || !filePath) {
        return { canceled: true }
      }

      await writeFile(filePath, payload.content, 'utf8')

      return {
        canceled: false,
        filePath,
        fileName: basename(filePath)
      }
    }
  )

  ipcMain.handle('external-url:open', async (_event, url: string) => {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`Unsupported URL protocol: ${parsed.protocol}`)
    }

    await shell.openExternal(parsed.toString())
    return { opened: true }
  })

  ipcMain.handle('app-zoom:set', async (event, zoomFactor: number) => {
    const targetWindow = BrowserWindow.fromWebContents(event.sender)
    if (!targetWindow) {
      return { zoomFactor: 1 }
    }

    const nextZoomFactor = clampZoomFactor(zoomFactor)
    targetWindow.webContents.setZoomFactor(nextZoomFactor)

    return { zoomFactor: targetWindow.webContents.getZoomFactor() }
  })
}
