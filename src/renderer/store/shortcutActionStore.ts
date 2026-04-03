import { create } from 'zustand'
import type { SearchTab } from '../features/consumer/searchState'

export type SettingsShortcutTab = 'server' | 'accessibility' | 'shortcuts'
export type ConsumerMiddleTab = 'results' | 'quickstart'

interface CreatorShortcutActions {
  openTemplates?: () => void
  toggleRightPanel?: () => void
  toggleRightPanelMode?: () => void
  showInfoPanel?: () => void
  setInfoPanelMode?: (mode: 'json' | 'request') => void
}

interface ConsumerShortcutActions {
  focusSearch?: () => void
  submitSearch?: () => void
  importBundle?: () => Promise<void> | void
  fillExample?: () => void
  setSearchTab?: (tab: SearchTab) => void
  setMiddleTab?: (tab: ConsumerMiddleTab) => void
  toggleDetailView?: () => void
}

interface SettingsShortcutActions {
  save?: () => void
  testConnection?: () => Promise<void> | void
  setTab?: (tab: SettingsShortcutTab) => void
}

interface ShortcutActionState {
  creator: CreatorShortcutActions
  consumer: ConsumerShortcutActions
  settings: SettingsShortcutActions
  setCreatorActions: (actions: Partial<CreatorShortcutActions>) => void
  clearCreatorActions: (keys?: Array<keyof CreatorShortcutActions>) => void
  setConsumerActions: (actions: Partial<ConsumerShortcutActions>) => void
  clearConsumerActions: (keys?: Array<keyof ConsumerShortcutActions>) => void
  setSettingsActions: (actions: Partial<SettingsShortcutActions>) => void
  clearSettingsActions: (keys?: Array<keyof SettingsShortcutActions>) => void
}

function removeKeys<T extends object>(source: T, keys?: Array<keyof T>): T {
  if (!keys || keys.length === 0) {
    return {} as T
  }

  const next = { ...source } as T & Record<PropertyKey, unknown>
  for (const key of keys) {
    delete next[key]
  }
  return next as T
}

export const useShortcutActionStore = create<ShortcutActionState>()((set) => ({
  creator: {},
  consumer: {},
  settings: {},
  setCreatorActions: (actions) => set((state) => ({ creator: { ...state.creator, ...actions } })),
  clearCreatorActions: (keys) => set((state) => ({ creator: removeKeys(state.creator, keys) })),
  setConsumerActions: (actions) => set((state) => ({ consumer: { ...state.consumer, ...actions } })),
  clearConsumerActions: (keys) => set((state) => ({ consumer: removeKeys(state.consumer, keys) })),
  setSettingsActions: (actions) => set((state) => ({ settings: { ...state.settings, ...actions } })),
  clearSettingsActions: (keys) => set((state) => ({ settings: removeKeys(state.settings, keys) }))
}))
