import electron from 'electron'
import { setupUpdateIpc, scheduleStartupUpdateCheck } from './updater/index'
import { getRuntimeIconPath } from './services/runtimeAssets'
import { createMainWindow, watchWindowShortcuts } from './services/mainWindowService'
import { setupMacMenu } from './services/macMenuService'
import { registerDesktopIpc } from './ipc/registerDesktopIpc'

const { app, BrowserWindow, nativeImage } = electron
const isE2eMode = process.env.RXFHIR_E2E === '1'
const customUserDataDir = process.env.RXFHIR_USER_DATA_DIR?.trim()

if (customUserDataDir) {
  app.setPath('userData', customUserDataDir)
}

app.name = 'RxFHIR'

registerDesktopIpc()

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.rxfhir.app')
  }

  if (process.platform === 'darwin') {
    const dockIcon = nativeImage.createFromPath(getRuntimeIconPath())
    if (!dockIcon.isEmpty()) {
      app.dock.setIcon(dockIcon)
    }
    setupMacMenu()
  }

  app.on('browser-window-created', (_, window) => {
    watchWindowShortcuts(window)
  })

  setupUpdateIpc()
  void createMainWindow().then(() => {
    if (!isE2eMode) {
      scheduleStartupUpdateCheck()
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow().then(() => {
        if (!isE2eMode) {
          scheduleStartupUpdateCheck()
        }
      })
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
