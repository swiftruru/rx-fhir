import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ToastVariant = 'success' | 'info' | 'warning' | 'error'

export interface ToastAction {
  label: string
  onAction: () => void
}

export interface ToastItem {
  id: string
  variant: ToastVariant
  description: string
  title?: string
  durationMs: number
  action?: ToastAction
  actions?: ToastAction[]
}

export interface ToastHistoryItem extends Omit<ToastItem, 'durationMs'> {
  createdAt: string
  read: boolean
}

export interface ToastInput {
  variant?: ToastVariant
  description: string
  title?: string
  durationMs?: number
  action?: ToastAction
  actions?: ToastAction[]
}

interface ToastState {
  toasts: ToastItem[]
  history: ToastHistoryItem[]
  pushToast: (toast: ToastInput) => string
  dismissToast: (id: string) => void
  markHistoryItemRead: (id: string) => void
  markAllHistoryRead: () => void
  clearHistory: () => void
  clearToasts: () => void
}

const MAX_TOASTS = 4
const MAX_HISTORY = 30
const DEFAULT_DURATION_MS = 4200

export const useToastStore = create<ToastState>()(
  persist(
    (set) => ({
      toasts: [],
      history: [],
      pushToast: ({ variant = 'info', description, title, durationMs = DEFAULT_DURATION_MS, action, actions }) => {
        if (!description.trim()) return ''

        const id = crypto.randomUUID()
        const nextToast: ToastItem = {
          id,
          variant,
          description,
          title,
          durationMs,
          action,
          actions
        }

        const historyEntry: ToastHistoryItem = {
          id,
          variant,
          description,
          title,
          action,
          actions,
          createdAt: new Date().toISOString(),
          read: false
        }

        set((state) => ({
          toasts: [nextToast, ...state.toasts].slice(0, MAX_TOASTS),
          history: [historyEntry, ...state.history].slice(0, MAX_HISTORY)
        }))

        return id
      },
      dismissToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((toast) => toast.id !== id)
        })),
      markHistoryItemRead: (id) =>
        set((state) => ({
          history: state.history.map((item) => (item.id === id ? { ...item, read: true } : item))
        })),
      markAllHistoryRead: () =>
        set((state) => ({
          history: state.history.map((item) => (item.read ? item : { ...item, read: true }))
        })),
      clearHistory: () => set({ history: [] }),
      clearToasts: () => set({ toasts: [] })
    }),
    {
      name: 'rxfhir-toast-store',
      partialize: (state) => ({
        history: state.history
          .slice(0, MAX_HISTORY)
          .map(({ action: _action, ...itemWithoutAction }) => itemWithoutAction)
      })
    }
  )
)

export function showToast(toast: ToastInput): string {
  return useToastStore.getState().pushToast(toast)
}
