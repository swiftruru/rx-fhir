import { create } from 'zustand'

interface QuickStartState {
  open: boolean
  openDialog: () => void
  closeDialog: () => void
  toggleDialog: () => void
}

export const useQuickStartStore = create<QuickStartState>()((set) => ({
  open: false,
  openDialog: () => set({ open: true }),
  closeDialog: () => set({ open: false }),
  toggleDialog: () => set((state) => ({ open: !state.open }))
}))
