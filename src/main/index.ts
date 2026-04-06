import electron from 'electron'
import { access, readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'path'
import { fileURLToPath } from 'node:url'
const { app, shell, BrowserWindow, nativeImage, Menu, nativeTheme, dialog, ipcMain, screen } = electron
type ElectronBrowserWindow = InstanceType<typeof BrowserWindow>

// Must be set before app.ready so the macOS menu bar picks it up
app.name = 'RxFHIR'

const isDev = !app.isPackaged

function resolveMainPath(relativePath: string): string {
  return fileURLToPath(new URL(relativePath, import.meta.url))
}

function watchWindowShortcuts(window: ElectronBrowserWindow): void {
  window.webContents.on('before-input-event', (event, input) => {
    const isReload = (input.key === 'r' || input.key === 'R') && input.meta
    const isDevTools = input.key === 'F12'

    if (!isDev && (isReload || isDevTools)) {
      event.preventDefault()
    }
  })
}

function clampZoomFactor(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(1.25, Math.max(1, value))
}

function getIconPath(): string {
  if (isDev) {
    return resolveMainPath('../../build/icon.png')
  }
  return resolveMainPath('../../resources/icon.png')
}

interface WindowState {
  width: number
  height: number
  x?: number
  y?: number
  isMaximized?: boolean
}

const DEFAULT_WINDOW_STATE: WindowState = {
  width: 1280,
  height: 800,
  isMaximized: false
}

const MIN_WINDOW_WIDTH = 900
const MIN_WINDOW_HEIGHT = 600
const WINDOW_STATE_PATH = join(app.getPath('userData'), 'window-state.json')
const RECENT_BUNDLES_PATH = join(app.getPath('userData'), 'recent-bundles.json')
const MAX_RECENT_BUNDLES = 8

interface RecentBundleFileEntry {
  filePath: string
  fileName: string
  lastOpenedAt: string
}

function isVisibleWithinDisplays(state: WindowState): boolean {
  if (state.x === undefined || state.y === undefined) return true
  const x = state.x
  const y = state.y

  return screen.getAllDisplays().some((display) => {
    const { x: areaX, y: areaY, width, height } = display.workArea
    return x >= areaX
      && y >= areaY
      && x < areaX + width
      && y < areaY + height
  })
}

async function readWindowState(): Promise<WindowState> {
  try {
    const raw = await readFile(WINDOW_STATE_PATH, 'utf8')
    const parsed = JSON.parse(raw) as Partial<WindowState>

    const nextState: WindowState = {
      width: Math.max(MIN_WINDOW_WIDTH, Math.round(parsed.width ?? DEFAULT_WINDOW_STATE.width)),
      height: Math.max(MIN_WINDOW_HEIGHT, Math.round(parsed.height ?? DEFAULT_WINDOW_STATE.height)),
      x: typeof parsed.x === 'number' ? Math.round(parsed.x) : undefined,
      y: typeof parsed.y === 'number' ? Math.round(parsed.y) : undefined,
      isMaximized: Boolean(parsed.isMaximized)
    }

    if (!isVisibleWithinDisplays(nextState)) {
      return {
        ...DEFAULT_WINDOW_STATE,
        width: nextState.width,
        height: nextState.height
      }
    }

    return nextState
  } catch {
    return DEFAULT_WINDOW_STATE
  }
}

async function writeWindowState(windowState: WindowState): Promise<void> {
  await writeFile(WINDOW_STATE_PATH, JSON.stringify(windowState, null, 2), 'utf8')
}

async function readRecentBundleFiles(): Promise<RecentBundleFileEntry[]> {
  try {
    const raw = await readFile(RECENT_BUNDLES_PATH, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []

    return parsed.filter((entry): entry is RecentBundleFileEntry => (
      !!entry
      && typeof entry === 'object'
      && typeof (entry as RecentBundleFileEntry).filePath === 'string'
      && typeof (entry as RecentBundleFileEntry).fileName === 'string'
      && typeof (entry as RecentBundleFileEntry).lastOpenedAt === 'string'
    ))
  } catch {
    return []
  }
}

async function writeRecentBundleFiles(entries: RecentBundleFileEntry[]): Promise<void> {
  await writeFile(RECENT_BUNDLES_PATH, JSON.stringify(entries, null, 2), 'utf8')
}

async function getExistingRecentBundleFiles(): Promise<RecentBundleFileEntry[]> {
  const entries = await readRecentBundleFiles()
  const existingEntries: RecentBundleFileEntry[] = []

  for (const entry of entries) {
    try {
      await access(entry.filePath)
      existingEntries.push(entry)
    } catch {
      continue
    }
  }

  if (existingEntries.length !== entries.length) {
    await writeRecentBundleFiles(existingEntries)
  }

  return existingEntries
}

async function rememberRecentBundleFile(filePath: string): Promise<void> {
  if (!filePath.trim()) return

  const nextEntry: RecentBundleFileEntry = {
    filePath,
    fileName: basename(filePath),
    lastOpenedAt: new Date().toISOString()
  }

  const currentEntries = await getExistingRecentBundleFiles()
  const nextEntries = [
    nextEntry,
    ...currentEntries.filter((entry) => entry.filePath !== filePath)
  ].slice(0, MAX_RECENT_BUNDLES)

  await writeRecentBundleFiles(nextEntries)
  app.addRecentDocument(filePath)
}

function getWindowState(mainWindow: ElectronBrowserWindow): WindowState {
  const bounds = mainWindow.isMaximized() ? mainWindow.getNormalBounds() : mainWindow.getBounds()
  return {
    width: Math.max(MIN_WINDOW_WIDTH, Math.round(bounds.width)),
    height: Math.max(MIN_WINDOW_HEIGHT, Math.round(bounds.height)),
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    isMaximized: mainWindow.isMaximized()
  }
}

// Custom About window — replaces the system About panel so we can show our icon
async function createAboutWindow(): Promise<void> {
  const iconPath = getIconPath()
  let iconDataUrl = ''
  try {
    const img = nativeImage.createFromPath(iconPath)
    iconDataUrl = img.resize({ width: 128, height: 128 }).toDataURL()
  } catch { /* fall back to no icon */ }

  // Read the actual rendered theme by checking if .dark class is on <html>
  let isDark = nativeTheme.shouldUseDarkColors
  const mainWindow = BrowserWindow.getAllWindows().find(w => !w.isDestroyed())
  if (mainWindow) {
    try {
      isDark = await mainWindow.webContents.executeJavaScript(
        `document.documentElement.classList.contains('dark')`
      ) as boolean
    } catch { /* fall back to nativeTheme */ }
  }

  // Match globals.css: light = Sakura Mist, dark = Twilight Mauve
  const bg      = isDark ? 'hsl(330,12%,10%)'  : 'hsl(340,35%,98.5%)'
  const fg      = isDark ? 'hsl(30,12%,87%)'   : 'hsl(330,20%,17%)'
  const subFg   = isDark ? 'hsl(330,6%,56%)'   : 'hsl(330,8%,50%)'
  const descFg  = isDark ? 'hsl(330,8%,40%)'   : 'hsl(330,8%,65%)'
  const bgHex   = isDark ? '#1c1518'            : '#faf3f5'

  const win = new BrowserWindow({
    width: 380,
    height: 300,
    resizable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    titleBarStyle: 'hiddenInset',
    backgroundColor: bgHex,
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  })

  const html = encodeURIComponent(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; height: 100vh;
    background: ${bg}; color: ${fg};
    gap: 6px; padding: 20px; text-align: center;
    -webkit-user-select: none;
  }
  img { width: 100px; height: 100px; border-radius: 22px; margin-bottom: 10px; box-shadow: 0 4px 16px rgba(0,0,0,.15); }
  h1 { font-size: 22px; font-weight: 700; letter-spacing: -.3px; }
  .version { font-size: 13px; color: ${subFg}; }
  .desc { font-size: 12px; color: ${descFg}; line-height: 1.6; margin-top: 6px; }
</style>
</head>
<body>
  ${iconDataUrl ? `<img src="${iconDataUrl}" alt="RxFHIR" />` : ''}
  <h1>RxFHIR</h1>
  <p class="version">版本 1.0.16</p>
  <p class="desc">℞ + FHIR = RxFHIR<br>基於 TW Core 電子處方箋 Profile 的桌面應用程式</p>
</body>
</html>`)

  win.loadURL(`data:text/html;charset=utf-8,${html}`)
}

// Build the macOS application menu with "RxFHIR" as the first label
// — this is what controls what text appears in the menu bar
function setupMacMenu(): void {
  const menu = Menu.buildFromTemplate([
    {
      label: 'RxFHIR',        // ← menu bar shows this label
      submenu: [
        { label: 'About RxFHIR', click: () => createAboutWindow() },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide', label: 'Hide RxFHIR' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: 'Quit RxFHIR' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ]
    }
  ])
  Menu.setApplicationMenu(menu)
}

async function createWindow(): Promise<void> {
  const icon = nativeImage.createFromPath(getIconPath())
  const savedWindowState = await readWindowState()

  const mainWindow = new BrowserWindow({
    width: savedWindowState.width,
    height: savedWindowState.height,
    x: savedWindowState.x,
    y: savedWindowState.y,
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    icon,
    webPreferences: {
      preload: resolveMainPath('../preload/index.cjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    if (savedWindowState.isMaximized) {
      mainWindow.maximize()
    }
  })

  let windowStateSaveTimer: ReturnType<typeof setTimeout> | undefined
  const scheduleWindowStateSave = (): void => {
    if (windowStateSaveTimer) clearTimeout(windowStateSaveTimer)
    windowStateSaveTimer = setTimeout(() => {
      void writeWindowState(getWindowState(mainWindow))
    }, 250)
  }

  mainWindow.on('resize', scheduleWindowStateSave)
  mainWindow.on('move', scheduleWindowStateSave)
  mainWindow.on('maximize', scheduleWindowStateSave)
  mainWindow.on('unmaximize', scheduleWindowStateSave)
  mainWindow.on('close', () => {
    if (windowStateSaveTimer) clearTimeout(windowStateSaveTimer)
    void writeWindowState(getWindowState(mainWindow))
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(resolveMainPath('../renderer/index.html'))
  }
}

ipcMain.handle(
  'bundle-json:save',
  async (_event, payload: { content: string; defaultFileName?: string }) => {
    const targetWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const { canceled, filePath } = await dialog.showSaveDialog(targetWindow, {
      title: 'Export FHIR Bundle JSON',
      defaultPath: payload.defaultFileName ?? 'rxfhir-bundle.json',
      filters: [{ name: 'FHIR Bundle JSON', extensions: ['json'] }]
    })

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
  const targetWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  const { canceled, filePaths } = await dialog.showOpenDialog(targetWindow, {
    title: 'Import FHIR Bundle JSON',
    properties: ['openFile'],
    filters: [{ name: 'FHIR Bundle JSON', extensions: ['json'] }]
  })

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

ipcMain.handle('bundle-json:recent-list', async () => {
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

ipcMain.handle(
  'preferences-json:save',
  async (_event, payload: { content: string; defaultFileName?: string }) => {
    const targetWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const { canceled, filePath } = await dialog.showSaveDialog(targetWindow, {
      title: 'Export RxFHIR Preferences',
      defaultPath: payload.defaultFileName ?? `rxfhir-preferences-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'RxFHIR Preferences JSON', extensions: ['json'] }]
    })

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
  const targetWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  const { canceled, filePaths } = await dialog.showOpenDialog(targetWindow, {
    title: 'Import RxFHIR Preferences',
    properties: ['openFile'],
    filters: [{ name: 'RxFHIR Preferences JSON', extensions: ['json'] }]
  })

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
  async (_event, payload: { content: string; defaultFileName: string; filters: Electron.FileFilter[] }) => {
    const targetWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const { canceled, filePath } = await dialog.showSaveDialog(targetWindow, {
      defaultPath: payload.defaultFileName,
      filters: payload.filters
    })

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

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.rxfhir.app')
  }

  if (process.platform === 'darwin') {
    // Set dock icon
    const dockIcon = nativeImage.createFromPath(getIconPath())
    if (!dockIcon.isEmpty()) {
      app.dock.setIcon(dockIcon)
    }
    // Build menu bar with "RxFHIR" label + custom About handler
    setupMacMenu()
  }

  app.on('browser-window-created', (_, window) => {
    watchWindowShortcuts(window)
  })

  void createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
