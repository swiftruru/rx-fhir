import { create } from 'zustand'

interface AccessibilityAnnouncement {
  id: number
  message: string
}

interface AccessibilityState {
  politeAnnouncement: AccessibilityAnnouncement | null
  assertiveAnnouncement: AccessibilityAnnouncement | null
  announcePolite: (message: string) => void
  announceAssertive: (message: string) => void
  clearPolite: () => void
  clearAssertive: () => void
}

export const useAccessibilityStore = create<AccessibilityState>((set) => ({
  politeAnnouncement: null,
  assertiveAnnouncement: null,

  announcePolite: (message) => {
    if (!message.trim()) return
    set(() => ({
      politeAnnouncement: {
        id: Date.now() + Math.random(),
        message
      }
    }))
  },

  announceAssertive: (message) => {
    if (!message.trim()) return
    set(() => ({
      assertiveAnnouncement: {
        id: Date.now() + Math.random(),
        message
      }
    }))
  },

  clearPolite: () => set({ politeAnnouncement: null }),
  clearAssertive: () => set({ assertiveAnnouncement: null })
}))
