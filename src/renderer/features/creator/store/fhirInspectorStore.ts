import { create } from 'zustand'

export interface FhirRequestEntry {
  id: string
  module?: string
  method: 'GET' | 'POST' | 'PUT'
  url: string
  resourceType?: string
  reasonCode?: 'check-existing' | 'create' | 'update' | 'search' | 'validate'
  requestHeaders: Record<string, string>
  requestBody?: unknown
  startedAt: string
  finishedAt?: string
  durationMs?: number
  ok?: boolean
  responseStatus?: number
  responseStatusText?: string
  responseHeaders?: Record<string, string>
  responseBody?: unknown
  errorMessage?: string
}

interface FhirInspectorState {
  latest?: FhirRequestEntry
  history: FhirRequestEntry[]
  startRequest: (request: Omit<FhirRequestEntry, 'id' | 'startedAt'>, module?: string) => string
  finishRequest: (
    id: string,
    result: Pick<
      FhirRequestEntry,
      'ok' | 'responseStatus' | 'responseStatusText' | 'responseHeaders' | 'responseBody' | 'errorMessage'
    >
  ) => void
  clear: () => void
}

const MAX_HISTORY = 12

export const useFhirInspectorStore = create<FhirInspectorState>((set) => ({
  latest: undefined,
  history: [],

  startRequest: (request, module) => {
    const id = crypto.randomUUID()
    const entry: FhirRequestEntry = {
      id,
      module,
      method: request.method,
      url: request.url,
      resourceType: request.resourceType,
      reasonCode: request.reasonCode,
      requestHeaders: request.requestHeaders,
      requestBody: request.requestBody,
      startedAt: new Date().toISOString()
    }

    set((state) => ({
      latest: entry,
      history: [entry, ...state.history].slice(0, MAX_HISTORY)
    }))

    return id
  },

  finishRequest: (id, result) => {
    set((state) => {
      const history = state.history.map((entry) => {
        if (entry.id !== id) return entry

        const finishedAt = new Date().toISOString()
        const durationMs = Math.max(0, new Date(finishedAt).getTime() - new Date(entry.startedAt).getTime())

        return {
          ...entry,
          ...result,
          finishedAt,
          durationMs
        }
      })

      const latest = history.find((entry) => entry.id === id) ?? state.latest

      return { history, latest }
    })
  },

  clear: () => set({ latest: undefined, history: [] })
}))
