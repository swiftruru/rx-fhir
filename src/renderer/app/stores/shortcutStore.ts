import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ShortcutActionId, ShortcutOverrideMap } from '../../shortcuts/types'

interface ShortcutState {
  overrides: ShortcutOverrideMap
  helpOpen: boolean
  setOverride: (id: ShortcutActionId, binding: string) => void
  clearOverride: (id: ShortcutActionId) => void
  resetAll: () => void
  openHelp: () => void
  closeHelp: () => void
  toggleHelp: () => void
}

export const useShortcutStore = create<ShortcutState>()(
  persist(
    (set) => ({
      overrides: {},
      helpOpen: false,
      setOverride: (id, binding) =>
        set((state) => ({
          overrides: { ...state.overrides, [id]: binding }
        })),
      clearOverride: (id) =>
        set((state) => {
          const overrides = { ...state.overrides }
          delete overrides[id]
          return { overrides }
        }),
      resetAll: () => set({ overrides: {} }),
      openHelp: () => set({ helpOpen: true }),
      closeHelp: () => set({ helpOpen: false }),
      toggleHelp: () => set((state) => ({ helpOpen: !state.helpOpen }))
    }),
    {
      name: 'rxfhir-shortcuts',
      partialize: (state) => ({ overrides: state.overrides })
    }
  )
)
