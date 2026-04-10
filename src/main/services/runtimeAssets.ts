import { app } from 'electron'
import { join } from 'path'
import { fileURLToPath } from 'node:url'

export const isDev = !app.isPackaged

export function resolveMainPath(relativePath: string): string {
  return fileURLToPath(new URL(relativePath, import.meta.url))
}

export function getRuntimeIconPath(): string {
  if (isDev) {
    return resolveMainPath('../../build/icon.png')
  }

  const resourcesDir = join(app.getAppPath(), '..')
  return join(resourcesDir, 'icon.png')
}
