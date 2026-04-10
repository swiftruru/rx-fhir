import { create } from 'zustand'
import type { ToastVariant } from './toastStore'

export type ActivityCenterFilter = 'all' | 'unread' | ToastVariant

interface ActivityCenterState {
  open: boolean
  filter: ActivityCenterFilter
  openCenter: () => void
  closeCenter: () => void
  toggleCenter: () => void
  setFilter: (filter: ActivityCenterFilter) => void
}

export const useActivityCenterStore = create<ActivityCenterState>()((set) => ({
  open: false,
  filter: 'all',
  openCenter: () => set({ open: true }),
  closeCenter: () => set({ open: false }),
  toggleCenter: () => set((state) => ({ open: !state.open })),
  setFilter: (filter) => set({ filter })
}))
