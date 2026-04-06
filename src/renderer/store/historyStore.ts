import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SubmissionRecord {
  id: string
  type: 'bundle' | 'resource'
  resourceType?: string
  bundleId?: string
  resourceId?: string
  patientName: string
  patientIdentifier: string
  organizationName?: string
  organizationIdentifier?: string
  practitionerName?: string
  conditionDisplay?: string
  submittedAt: string
  serverUrl: string
  compositionDate?: string
}

interface HistoryState {
  records: SubmissionRecord[]
  addRecord: (record: SubmissionRecord) => void
  updateRecord: (id: string, patch: Partial<SubmissionRecord>) => void
  removeRecord: (id: string) => void
  clearHistory: () => void
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      records: [],
      addRecord: (record) =>
        set((state) => ({
          records: [record, ...state.records].slice(0, 30)
        })),
      updateRecord: (id, patch) =>
        set((state) => ({
          records: state.records.map((record) => (
            record.id === id ? { ...record, ...patch } : record
          ))
        })),
      removeRecord: (id) =>
        set((state) => ({
          records: state.records.filter((r) => r.id !== id)
        })),
      clearHistory: () => set({ records: [] })
    }),
    { name: 'rxfhir-history' }
  )
)
