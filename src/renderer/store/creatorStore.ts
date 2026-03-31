import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CreatedResources } from '../types/fhir.d'
import type { ResourceKey } from '../types/fhir.d'

type CreatorDraftValues = Partial<Record<ResourceKey, Record<string, unknown>>>
export type CreatorSaveOutcome = 'created' | 'reused'

export interface CreatorResourceFeedback {
  id: string
  outcome: CreatorSaveOutcome
}

type CreatorResourceFeedbacks = Partial<Record<ResourceKey, CreatorResourceFeedback>>

interface PersistedCreatorState {
  currentStep: number
  resources: CreatedResources
  drafts: CreatorDraftValues
  feedbacks: CreatorResourceFeedbacks
  draftSavedAt?: string
}

function hasPersistableWork(resources: CreatedResources, drafts: CreatorDraftValues): boolean {
  return Object.values(resources).some(Boolean) || Object.values(drafts).some((draft) => draft && Object.keys(draft).length > 0)
}

interface CreatorState {
  currentStep: number
  resources: CreatedResources
  drafts: CreatorDraftValues
  feedbacks: CreatorResourceFeedbacks
  draftSavedAt?: string
  draftHydrated: boolean
  draftRestored: boolean
  draftRevision: number
  bundleId?: string
  bundleError?: string
  submittingBundle: boolean

  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  setResource: <K extends keyof CreatedResources>(key: K, resource: CreatedResources[K]) => void
  setFeedback: (key: ResourceKey, feedback: CreatorResourceFeedback) => void
  clearFeedback: (key: ResourceKey) => void
  setDraft: (key: ResourceKey, values?: Record<string, unknown>) => void
  clearDraft: (key: ResourceKey) => void
  dismissDraftRestored: () => void
  setBundleId: (id: string) => void
  setBundleError: (error: string | undefined) => void
  setSubmittingBundle: (value: boolean) => void
  reset: () => void
}

const TOTAL_STEPS = 11

export const useCreatorStore = create<CreatorState>()(
  persist(
    (set, get) => ({
      currentStep: 0,
      resources: {},
      drafts: {},
      feedbacks: {},
      draftSavedAt: undefined,
      draftHydrated: false,
      draftRestored: false,
      draftRevision: 0,
      bundleId: undefined,
      bundleError: undefined,
      submittingBundle: false,

      setStep: (step) =>
        set((state) => ({
          currentStep: Math.max(0, Math.min(step, TOTAL_STEPS - 1)),
          draftSavedAt: hasPersistableWork(state.resources, state.drafts) ? new Date().toISOString() : state.draftSavedAt
        })),
      nextStep: () =>
        set((state) => ({
          currentStep: Math.min(get().currentStep + 1, TOTAL_STEPS - 1),
          draftSavedAt: hasPersistableWork(state.resources, state.drafts) ? new Date().toISOString() : state.draftSavedAt
        })),
      prevStep: () =>
        set((state) => ({
          currentStep: Math.max(get().currentStep - 1, 0),
          draftSavedAt: hasPersistableWork(state.resources, state.drafts) ? new Date().toISOString() : state.draftSavedAt
        })),

      setResource: (key, resource) =>
        set((state) => ({
          resources: { ...state.resources, [key]: resource },
          draftSavedAt: new Date().toISOString()
        })),

      setFeedback: (key, feedback) =>
        set((state) => ({
          feedbacks: { ...state.feedbacks, [key]: feedback }
        })),

      clearFeedback: (key) =>
        set((state) => {
          const feedbacks = { ...state.feedbacks }
          delete feedbacks[key]
          return { feedbacks }
        }),

      setDraft: (key, values) =>
        set((state) => {
          const drafts = { ...state.drafts }
          if (values && Object.keys(values).length > 0) drafts[key] = values
          else delete drafts[key]

          return {
            drafts,
            draftSavedAt: hasPersistableWork(state.resources, drafts) ? new Date().toISOString() : undefined
          }
        }),

      clearDraft: (key) =>
        set((state) => {
          const drafts = { ...state.drafts }
          delete drafts[key]
          return {
            drafts,
            draftSavedAt: hasPersistableWork(state.resources, drafts) ? new Date().toISOString() : undefined
          }
        }),

      dismissDraftRestored: () => set({ draftRestored: false }),

      setBundleId: (id) => set({ bundleId: id, bundleError: undefined, draftRestored: false }),
      setBundleError: (error) => set({ bundleError: error }),
      setSubmittingBundle: (value) => set({ submittingBundle: value }),

      reset: () =>
        set((state) => ({
          currentStep: 0,
          resources: {},
          drafts: {},
          feedbacks: {},
          draftSavedAt: undefined,
          draftRestored: false,
          draftRevision: state.draftRevision + 1,
          bundleId: undefined,
          bundleError: undefined,
          submittingBundle: false
        }))
    }),
    {
      name: 'rxfhir-creator-draft',
      partialize: (state): PersistedCreatorState => {
        if (state.bundleId || !hasPersistableWork(state.resources, state.drafts)) {
          return {
            currentStep: 0,
            resources: {},
            drafts: {},
            feedbacks: {},
            draftSavedAt: undefined
          }
        }

        return {
          currentStep: state.currentStep,
          resources: state.resources,
          drafts: state.drafts,
          feedbacks: state.feedbacks,
          draftSavedAt: state.draftSavedAt
        }
      },
      onRehydrateStorage: () => (state, error) => {
        useCreatorStore.setState((current) => ({
          draftHydrated: true,
          draftRestored: !error && !!state && hasPersistableWork(state.resources, state.drafts),
          draftRevision: current.draftRevision + 1
        }))
      }
    }
  )
)
