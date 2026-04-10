import electron from 'electron'
import { getRuntimeIconPath, isDev, resolveMainPath } from './runtimeAssets'
import {
  getWindowState,
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  readWindowState,
  writeWindowState
} from './windowStateService'

const { BrowserWindow, nativeImage, shell } = electron

type ElectronBrowserWindow = InstanceType<typeof BrowserWindow>

export function watchWindowShortcuts(window: ElectronBrowserWindow): void {
  window.webContents.on('before-input-event', (event, input) => {
    const isReload = (input.key === 'r' || input.key === 'R') && input.meta
    const isDevTools = input.key === 'F12'

    if (!isDev && (isReload || isDevTools)) {
      event.preventDefault()
    }
  })
}

export function clampZoomFactor(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(1.25, Math.max(1, value))
}

export async function createMainWindow(): Promise<void> {
  const rawIcon = nativeImage.createFromPath(getRuntimeIconPath())
  const icon = process.platform === 'win32'
    ? rawIcon.resize({ width: 256, height: 256 })
    : rawIcon
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
