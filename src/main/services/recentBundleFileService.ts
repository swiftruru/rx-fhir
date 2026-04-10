import { app } from 'electron'
import { access, readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'path'
import type { RecentBundleFileEntry } from '../../shared/contracts/electron'

const RECENT_BUNDLES_PATH = join(app.getPath('userData'), 'recent-bundles.json')
const MAX_RECENT_BUNDLES = 8

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

export async function getExistingRecentBundleFiles(): Promise<RecentBundleFileEntry[]> {
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

export async function rememberRecentBundleFile(filePath: string): Promise<void> {
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
