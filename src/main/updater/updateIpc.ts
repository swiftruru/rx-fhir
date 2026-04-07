import electron from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'path'
import { checkForUpdates } from './updateChecker'
import type { UpdateCheckResult } from './updateChecker'

const { app, ipcMain, BrowserWindow } = electron

const SKIPPED_VERSION_PATH = (): string =>
  join(app.getPath('userData'), 'update-skip.json')

async function readSkippedVersion(): Promise<string | null> {
  try {
    const raw = await readFile(SKIPPED_VERSION_PATH(), 'utf8')
    const parsed = JSON.parse(raw) as { skippedVersion?: unknown }
    return typeof parsed.skippedVersion === 'string' ? parsed.skippedVersion : null
  } catch {
    return null
  }
}

async function writeSkippedVersion(version: string): Promise<void> {
  await writeFile(SKIPPED_VERSION_PATH(), JSON.stringify({ skippedVersion: version }), 'utf8')
}

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

  ipcMain.handle('app-update:skip-version', async (_event, version: string): Promise<void> => {
    await writeSkippedVersion(version)
    cachedStartupResult = null  // clear cache so About page amber dot also disappears
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

      if (result.status !== 'update-available') return

      // Check if the user has chosen to skip this specific version.
      const skipped = await readSkippedVersion()
      if (skipped && skipped === result.latestVersion) return

      // Cache so About page can retrieve it on mount.
      cachedStartupResult = result

      const [win] = BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed())
      if (!win) return

      win.webContents.send('app-update:result', result)
    })()
  }, delayMs)
}
