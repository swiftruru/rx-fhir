import electron from 'electron'
import { checkForUpdates } from './updateChecker'
import type { UpdateCheckResult } from './updateChecker'

const { app, ipcMain, BrowserWindow } = electron

// Cache the latest startup check result so the About page can retrieve it
// even if it mounts after the push was already sent.
let cachedStartupResult: UpdateCheckResult | null = null

/**
 * Register the 'app-update:check' and 'app-update:get-cached' IPC handlers
 * so the renderer can manually trigger a version check or retrieve the
 * cached startup result.
 */
export function setupUpdateIpc(): void {
  ipcMain.handle('app-update:check', async (): Promise<UpdateCheckResult> => {
    return checkForUpdates(app.getVersion())
  })

  ipcMain.handle('app-update:get-cached', (): UpdateCheckResult | null => {
    return cachedStartupResult
  })
}

/**
 * Perform a background update check after startup and push the result
 * to the renderer via 'app-update:result' if a new version is found.
 * The result is also cached so late-mounting pages can query it via IPC.
 * Only fires if a window is available (not during headless tests).
 */
export function scheduleStartupUpdateCheck(delayMs = 5_000): void {
  setTimeout(() => {
    void (async () => {
      const result = await checkForUpdates(app.getVersion())

      // Cache regardless of status so About page can query it on mount.
      if (result.status === 'update-available') {
        cachedStartupResult = result
      }

      // Only push to renderer when there is actually a new version —
      // avoid disrupting the user with a "you're up to date" banner on startup.
      if (result.status !== 'update-available') return

      const [win] = BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed())
      if (!win) return

      win.webContents.send('app-update:result', result)
    })()
  }, delayMs)
}
