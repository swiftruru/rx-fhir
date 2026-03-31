import { app, shell, BrowserWindow, nativeImage, Menu, nativeTheme } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

// Must be set before app.ready so the macOS menu bar picks it up
app.name = 'RxFHIR'

function getIconPath(): string {
  if (is.dev) {
    return join(__dirname, '../../build/icon.png')
  }
  return join(__dirname, '../../resources/icon.png')
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
  <p class="version">版本 1.0.6</p>
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

function createWindow(): void {
  const icon = nativeImage.createFromPath(getIconPath())

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.rxfhir.app')

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
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
