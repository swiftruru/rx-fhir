import electron from 'electron'
import { createAboutWindow } from './aboutWindowService'
import { checkForUpdates, GITHUB_RELEASES_PAGE } from '../updater/index'

const { app, dialog, Menu, shell } = electron

export function setupMacMenu(): void {
  const menu = Menu.buildFromTemplate([
    {
      label: 'RxFHIR',
      submenu: [
        { label: 'About RxFHIR', click: () => { void createAboutWindow() } },
        { type: 'separator' },
        {
          label: 'Check for Updates…',
          click: async (menuItem) => {
            menuItem.enabled = false
            menuItem.label = 'Checking…'

            const result = await checkForUpdates(app.getVersion())

            menuItem.enabled = true
            menuItem.label = 'Check for Updates…'

            if (result.status === 'update-available') {
              const { response } = await dialog.showMessageBox({
                type: 'info',
                title: 'Update Available',
                message: `RxFHIR ${result.latestVersion ?? ''} is available`,
                detail: `You are running version ${result.currentVersion}. Would you like to view the release on GitHub?`,
                buttons: ['View on GitHub Releases', 'Later'],
                defaultId: 0,
                cancelId: 1
              })
              if (response === 0) {
                void shell.openExternal(result.releaseUrl ?? GITHUB_RELEASES_PAGE)
              }
            } else if (result.status === 'up-to-date') {
              await dialog.showMessageBox({
                type: 'info',
                title: 'You\'re Up to Date',
                message: 'RxFHIR is up to date',
                detail: `Version ${result.currentVersion} is the latest release.`,
                buttons: ['OK']
              })
            } else {
              await dialog.showMessageBox({
                type: 'warning',
                title: 'Update Check Failed',
                message: 'Could not check for updates',
                detail: 'Please check your network connection and try again.',
                buttons: ['OK']
              })
            }
          }
        },
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
