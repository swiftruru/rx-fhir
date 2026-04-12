import { resolve } from 'path'
import { rememberRecentBundleFile } from './recentBundleFileService'

const JSON_FILE_PATTERN = /\.json$/i

let pendingBundleFilePath: string | null = null

function normalizeBundleJsonPath(filePath: string): string | null {
  const trimmed = filePath.trim()
  if (!trimmed || !JSON_FILE_PATTERN.test(trimmed)) return null
  return resolve(trimmed)
}

export function queuePendingBundleFilePath(filePath: string): string | null {
  const normalized = normalizeBundleJsonPath(filePath)
  if (!normalized) return null

  pendingBundleFilePath = normalized
  void rememberRecentBundleFile(normalized).catch(() => undefined)
  return normalized
}

export function consumePendingBundleFilePath(): string | null {
  const next = pendingBundleFilePath
  pendingBundleFilePath = null
  return next
}

export function findBundleFilePathFromArgv(argv: string[]): string | null {
  for (const value of argv.slice(1)) {
    if (value.startsWith('-')) continue
    const normalized = normalizeBundleJsonPath(value)
    if (normalized) return normalized
  }

  return null
}
