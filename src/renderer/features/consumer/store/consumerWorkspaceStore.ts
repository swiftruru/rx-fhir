import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SearchParams } from '../../../types/fhir'
import type { SearchPrefill, SearchTab } from '../searchState'

export interface ConsumerWorkspaceSnapshot {
  serverUrl?: string
  activeTab: SearchTab
  activeComplexBy: 'organization' | 'author'
  middleTab: 'results' | 'quickstart' | 'history'
  prefill: SearchPrefill | null
  autoSearch: SearchParams | null
  targetBundleId: string | null
  recentBundleFilePath: string | null
}

interface ConsumerWorkspaceState extends ConsumerWorkspaceSnapshot {
  hasHydrated: boolean
  setHasHydrated: (value: boolean) => void
  setWorkspace: (patch: Partial<ConsumerWorkspaceSnapshot>) => void
  replaceWorkspace: (snapshot: Partial<ConsumerWorkspaceSnapshot>) => void
  clearWorkspace: () => void
}

const DEFAULT_WORKSPACE: ConsumerWorkspaceSnapshot = {
  serverUrl: undefined,
  activeTab: 'basic',
  activeComplexBy: 'organization',
  middleTab: 'quickstart',
  prefill: null,
  autoSearch: null,
  targetBundleId: null,
  recentBundleFilePath: null
}

export const useConsumerWorkspaceStore = create<ConsumerWorkspaceState>()(
  persist(
    (set) => ({
      ...DEFAULT_WORKSPACE,
      hasHydrated: false,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      setWorkspace: (patch) => set((state) => ({ ...state, ...patch })),
      replaceWorkspace: (snapshot) => set((state) => ({ ...DEFAULT_WORKSPACE, ...snapshot, hasHydrated: state.hasHydrated })),
      clearWorkspace: () => set((state) => ({ ...DEFAULT_WORKSPACE, hasHydrated: state.hasHydrated }))
    }),
    {
      name: 'rxfhir-consumer-workspace',
      partialize: (state) => ({
        serverUrl: state.serverUrl,
        activeTab: state.activeTab,
        activeComplexBy: state.activeComplexBy,
        middleTab: state.middleTab,
        prefill: state.prefill,
        autoSearch: state.autoSearch,
        targetBundleId: state.targetBundleId,
        recentBundleFilePath: state.recentBundleFilePath
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      }
    }
  )
)
