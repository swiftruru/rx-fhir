import { create } from 'zustand'
import type { AuditedBundleSummary } from '../../../domain/fhir/validation'
import type { ConsumerSearchExecution } from '../searchState'

export interface ConsumerSessionSnapshot {
  results: AuditedBundleSummary[]
  total: number
  selected: AuditedBundleSummary | null
  diffTarget: AuditedBundleSummary | null
  hasSearched: boolean
  searchExecution: ConsumerSearchExecution | null
  nextUrl: string | null
  lastNameFilter?: string
}

export const DEFAULT_CONSUMER_SESSION: ConsumerSessionSnapshot = {
  results: [],
  total: 0,
  selected: null,
  diffTarget: null,
  hasSearched: false,
  searchExecution: null,
  nextUrl: null,
  lastNameFilter: undefined
}

interface ConsumerSessionState extends ConsumerSessionSnapshot {
  setSnapshot: (patch: Partial<ConsumerSessionSnapshot>) => void
  replaceSnapshot: (snapshot: Partial<ConsumerSessionSnapshot>) => void
  clearSession: () => void
}

export const useConsumerSessionStore = create<ConsumerSessionState>((set) => ({
  ...DEFAULT_CONSUMER_SESSION,
  setSnapshot: (patch) => set((state) => ({ ...state, ...patch })),
  replaceSnapshot: (snapshot) => set({ ...DEFAULT_CONSUMER_SESSION, ...snapshot }),
  clearSession: () => set(DEFAULT_CONSUMER_SESSION)
}))
