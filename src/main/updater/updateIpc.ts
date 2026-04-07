import electron from 'electron'
import { checkForUpdates } from './updateChecker'

const { app, ipcMain, BrowserWindow } = electron

/**
 * Register the 'app-update:check' IPC handler so the renderer can
 * manually trigger a version check from the About page.
 */
export function setupUpdateIpc(): void {
  ipcMain.handle('app-update:check', async (): Promise<ReturnType<typeof checkForUpdates>> => {
    return checkForUpdates(app.getVersion())
  })
}

/**
 * Perform a background update check after startup and push the result
 * to the renderer via 'app-update:result' if a new version is found.
 * Only fires if a window is available (not during headless tests).
 */
export function scheduleStartupUpdateCheck(delayMs = 5_000): void {
  setTimeout(() => {
    void (async () => {
      const result = await checkForUpdates(app.getVersion())

      // Only push to renderer when there is actually a new version —
      // avoid disrupting the user with a "you're up to date" banner on startup.
      if (result.status !== 'update-available') return

      const [win] = BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed())
      if (!win) return

      win.webContents.send('app-update:result', result)
    })()
  }, delayMs)
}
