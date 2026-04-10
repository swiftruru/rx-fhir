import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SearchParams } from '../../../types/fhir'

export interface SavedSearchRecord {
  id: string
  params: SearchParams
  pinned: boolean
  createdAt: string
  lastUsedAt: string
}

interface SearchHistoryState {
  records: SavedSearchRecord[]
  recordSearch: (params: SearchParams) => void
  togglePinned: (id: string) => void
  removeSearch: (id: string) => void
  clearRecentSearches: () => void
}

const MAX_RECENT_SEARCHES = 12

function normalizeParams(params: SearchParams): SearchParams {
  const normalized: SearchParams = { mode: params.mode }

  if (params.identifier) normalized.identifier = params.identifier.trim()
  if (params.name) normalized.name = params.name.trim()
  if (params.date) normalized.date = params.date.trim()
  if (params.organizationId) normalized.organizationId = params.organizationId.trim()
  if (params.authorName) normalized.authorName = params.authorName.trim()
  if (params.complexSearchBy) normalized.complexSearchBy = params.complexSearchBy

  return normalized
}

function buildSearchKey(params: SearchParams): string {
  const normalized = normalizeParams(params)
  const ordered = Object.keys(normalized)
    .sort()
    .reduce<Record<string, string>>((acc, key) => {
      const value = normalized[key as keyof SearchParams]
      if (value !== undefined) acc[key] = String(value)
      return acc
    }, {})

  return JSON.stringify(ordered)
}

function trimRecords(records: SavedSearchRecord[]): SavedSearchRecord[] {
  const pinned = records.filter((record) => record.pinned)
  const recent = records.filter((record) => !record.pinned).slice(0, MAX_RECENT_SEARCHES)
  return [...pinned, ...recent]
}

export const useSearchHistoryStore = create<SearchHistoryState>()(
  persist(
    (set) => ({
      records: [],
      recordSearch: (params) =>
        set((state) => {
          const normalized = normalizeParams(params)
          const key = buildSearchKey(normalized)
          const now = new Date().toISOString()
          const existing = state.records.find((record) => record.id === key)

          if (existing) {
            const updated = state.records
              .map((record) =>
                record.id === key
                  ? { ...record, params: normalized, lastUsedAt: now }
                  : record
              )
              .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.lastUsedAt.localeCompare(a.lastUsedAt))

            return { records: trimRecords(updated) }
          }

          const next: SavedSearchRecord = {
            id: key,
            params: normalized,
            pinned: false,
            createdAt: now,
            lastUsedAt: now
          }

          return {
            records: trimRecords(
              [next, ...state.records].sort(
                (a, b) => Number(b.pinned) - Number(a.pinned) || b.lastUsedAt.localeCompare(a.lastUsedAt)
              )
            )
          }
        }),
      togglePinned: (id) =>
        set((state) => ({
          records: state.records
            .map((record) =>
              record.id === id
                ? { ...record, pinned: !record.pinned }
                : record
            )
            .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.lastUsedAt.localeCompare(a.lastUsedAt))
        })),
      removeSearch: (id) =>
        set((state) => ({
          records: state.records.filter((record) => record.id !== id)
        })),
      clearRecentSearches: () =>
        set((state) => ({
          records: state.records.filter((record) => record.pinned)
        }))
    }),
    { name: 'rxfhir-search-history' }
  )
)
