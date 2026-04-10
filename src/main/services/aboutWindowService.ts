import electron from 'electron'
import { getRuntimeIconPath } from './runtimeAssets'

const { app, BrowserWindow, nativeImage, nativeTheme } = electron

export async function createAboutWindow(): Promise<void> {
  const iconPath = getRuntimeIconPath()
  let iconDataUrl = ''
  try {
    const img = nativeImage.createFromPath(iconPath)
    iconDataUrl = img.resize({ width: 128, height: 128 }).toDataURL()
  } catch {
    iconDataUrl = ''
  }

  let isDark = nativeTheme.shouldUseDarkColors
  const mainWindow = BrowserWindow.getAllWindows().find((window) => !window.isDestroyed())
  if (mainWindow) {
    try {
      isDark = await mainWindow.webContents.executeJavaScript(
        `document.documentElement.classList.contains('dark')`
      ) as boolean
    } catch {
      isDark = nativeTheme.shouldUseDarkColors
    }
  }

  const bg = isDark ? 'hsl(330,12%,10%)' : 'hsl(340,35%,98.5%)'
  const fg = isDark ? 'hsl(30,12%,87%)' : 'hsl(330,20%,17%)'
  const subFg = isDark ? 'hsl(330,6%,56%)' : 'hsl(330,8%,50%)'
  const descFg = isDark ? 'hsl(330,8%,40%)' : 'hsl(330,8%,65%)'
  const bgHex = isDark ? '#1c1518' : '#faf3f5'

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
  <p class="version">版本 ${app.getVersion()}</p>
  <p class="desc">℞ + FHIR = RxFHIR<br>基於 TW Core 電子處方箋 Profile 的桌面應用程式</p>
</body>
</html>`)

  win.loadURL(`data:text/html;charset=utf-8,${html}`)
}
