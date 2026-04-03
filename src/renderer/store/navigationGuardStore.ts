import { create } from 'zustand'
import type { DraftStatus } from './creatorStore'

export interface PendingNavigation {
  to: string
  replace?: boolean
  state?: unknown
  label?: string
  draftStatus: DraftStatus
}

interface NavigationGuardState {
  pendingNavigation: PendingNavigation | null
  requestNavigation: (navigation: PendingNavigation) => void
  clearNavigationRequest: () => void
}

export const useNavigationGuardStore = create<NavigationGuardState>()((set) => ({
  pendingNavigation: null,
  requestNavigation: (pendingNavigation) => set({ pendingNavigation }),
  clearNavigationRequest: () => set({ pendingNavigation: null })
}))
