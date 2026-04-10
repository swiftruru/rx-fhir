import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CreatedResources } from '../../../types/fhir'
import type { ResourceKey } from '../../../types/fhir'
import { RESOURCE_STEPS } from '../../../types/fhir'
import {
  buildCreatorSubmissionSnapshot,
  type CreatorSubmissionSnapshot
} from '../lib/creatorSubmissionDiff'

export type CreatorDraftValues = Partial<Record<ResourceKey, Record<string, unknown>>>
export type CreatorSaveOutcome = 'created' | 'updated' | 'reused'
export type DraftStatus = 'idle' | 'saving' | 'saved' | 'error'

export type CreatorRequestMethod = 'GET' | 'POST' | 'PUT'

export interface CreatorResourceFeedback {
  id: string
  outcome: CreatorSaveOutcome
  requestMethod?: CreatorRequestMethod
}

type CreatorResourceFeedbacks = Partial<Record<ResourceKey, CreatorResourceFeedback>>

interface PersistedCreatorState {
  currentStep: number
  resources: CreatedResources
  drafts: CreatorDraftValues
  feedbacks: CreatorResourceFeedbacks
  lastUpdatedResourceKey?: ResourceKey
  draftSavedAt?: string
}

export function hasCreatorPersistableWork(resources: CreatedResources, drafts: CreatorDraftValues): boolean {
  return Object.values(resources).some(Boolean) || Object.values(drafts).some((draft) => draft && Object.keys(draft).length > 0)
}

function inferLastUpdatedResourceKey(resources: CreatedResources, currentStep: number): ResourceKey | undefined {
  const currentStepKey = RESOURCE_STEPS[currentStep]?.key
  if (currentStepKey && resources[currentStepKey]) return currentStepKey

  for (let index = RESOURCE_STEPS.length - 1; index >= 0; index -= 1) {
    const key = RESOURCE_STEPS[index].key
    if (resources[key]) return key
  }

  return undefined
}

function buildHydratedCreatorState(
  current: CreatorState,
  persisted?: PersistedCreatorState
): Partial<CreatorState> {
  const resources = persisted?.resources ?? current.resources
  const drafts = persisted?.drafts ?? current.drafts
  const currentStep = persisted?.currentStep ?? current.currentStep
  const restored = !!persisted && hasCreatorPersistableWork(resources, drafts)

  return {
    draftHydrated: true,
    draftRestored: restored,
    draftStatus: restored ? 'saved' : 'idle',
    lastUpdatedResourceKey:
      persisted?.lastUpdatedResourceKey
      ?? inferLastUpdatedResourceKey(resources, currentStep),
    draftRevision: current.draftRevision + 1
  }
}

interface CreatorState {
  currentStep: number
  resources: CreatedResources
  drafts: CreatorDraftValues
  feedbacks: CreatorResourceFeedbacks
  lastUpdatedResourceKey?: ResourceKey
  draftSavedAt?: string
  draftStatus: DraftStatus
  draftHydrated: boolean
  draftRestored: boolean
  draftRevision: number
  bundleId?: string
  bundleError?: string
  submittingBundle: boolean
  lastSubmittedSnapshot?: CreatorSubmissionSnapshot

  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  setResource: <K extends keyof CreatedResources>(key: K, resource: CreatedResources[K]) => void
  setFeedback: (key: ResourceKey, feedback: CreatorResourceFeedback) => void
  clearFeedback: (key: ResourceKey) => void
  setDraft: (key: ResourceKey, values?: Record<string, unknown>) => void
  clearDraft: (key: ResourceKey) => void
  applyTemplateDrafts: (drafts: CreatorDraftValues) => void
  dismissDraftRestored: () => void
  setDraftStatus: (status: DraftStatus) => void
  setBundleId: (id: string) => void
  markBundleSubmitted: (id: string, baselineDrafts?: CreatorDraftValues) => void
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
      lastUpdatedResourceKey: undefined,
      draftSavedAt: undefined,
      draftStatus: 'idle',
      draftHydrated: false,
      draftRestored: false,
      draftRevision: 0,
      bundleId: undefined,
      bundleError: undefined,
      submittingBundle: false,
      lastSubmittedSnapshot: undefined,

      setStep: (step) =>
        set((state) => ({
          currentStep: Math.max(0, Math.min(step, TOTAL_STEPS - 1)),
          draftSavedAt: hasCreatorPersistableWork(state.resources, state.drafts) ? new Date().toISOString() : state.draftSavedAt
        })),
      nextStep: () =>
        set((state) => ({
          currentStep: Math.min(get().currentStep + 1, TOTAL_STEPS - 1),
          draftSavedAt: hasCreatorPersistableWork(state.resources, state.drafts) ? new Date().toISOString() : state.draftSavedAt
        })),
      prevStep: () =>
        set((state) => ({
          currentStep: Math.max(get().currentStep - 1, 0),
          draftSavedAt: hasCreatorPersistableWork(state.resources, state.drafts) ? new Date().toISOString() : state.draftSavedAt
        })),

      setResource: (key, resource) =>
        set((state) => ({
          resources: { ...state.resources, [key]: resource },
          lastUpdatedResourceKey: key,
          draftSavedAt: new Date().toISOString(),
          draftStatus: 'saved'
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

          const hasWork = hasCreatorPersistableWork(state.resources, drafts)
          return {
            drafts,
            draftSavedAt: hasWork ? new Date().toISOString() : undefined,
            draftStatus: hasWork ? 'saved' : 'idle'
          }
        }),

      clearDraft: (key) =>
        set((state) => {
          const drafts = { ...state.drafts }
          delete drafts[key]
          const hasWork = hasCreatorPersistableWork(state.resources, drafts)
          return {
            drafts,
            draftSavedAt: hasWork ? new Date().toISOString() : undefined,
            draftStatus: hasWork ? 'saved' : 'idle'
          }
        }),

      applyTemplateDrafts: (drafts) =>
        set((state) => ({
          currentStep: 0,
          resources: {},
          drafts,
          feedbacks: {},
          lastUpdatedResourceKey: undefined,
          draftSavedAt: hasCreatorPersistableWork({}, drafts) ? new Date().toISOString() : undefined,
          draftStatus: hasCreatorPersistableWork({}, drafts) ? 'saved' : 'idle',
          draftRestored: false,
          draftRevision: state.draftRevision + 1,
          bundleId: undefined,
          bundleError: undefined,
          submittingBundle: false,
          lastSubmittedSnapshot: undefined
        })),

      dismissDraftRestored: () => set({ draftRestored: false }),

      setDraftStatus: (draftStatus) => set({ draftStatus }),

      setBundleId: (id) => set({ bundleId: id, bundleError: undefined, draftRestored: false }),
      markBundleSubmitted: (id, baselineDrafts) =>
        set((state) => ({
          bundleId: id,
          bundleError: undefined,
          draftRestored: false,
          lastSubmittedSnapshot: buildCreatorSubmissionSnapshot(id, baselineDrafts ?? state.drafts)
        })),
      setBundleError: (error) => set({ bundleError: error }),
      setSubmittingBundle: (value) => set({ submittingBundle: value }),

      reset: () =>
        set((state) => ({
          currentStep: 0,
          resources: {},
          drafts: {},
          feedbacks: {},
          lastUpdatedResourceKey: undefined,
          draftSavedAt: undefined,
          draftStatus: 'idle',
          draftRestored: false,
          draftRevision: state.draftRevision + 1,
          bundleId: undefined,
          bundleError: undefined,
          submittingBundle: false,
          lastSubmittedSnapshot: undefined
        }))
    }),
    {
      name: 'rxfhir-creator-draft',
      partialize: (state): PersistedCreatorState => {
        if (state.bundleId || !hasCreatorPersistableWork(state.resources, state.drafts)) {
          return {
            currentStep: 0,
            resources: {},
            drafts: {},
            feedbacks: {},
            lastUpdatedResourceKey: undefined,
            draftSavedAt: undefined
          }
        }

        return {
          currentStep: state.currentStep,
          resources: state.resources,
          drafts: state.drafts,
          feedbacks: state.feedbacks,
          lastUpdatedResourceKey: state.lastUpdatedResourceKey,
          draftSavedAt: state.draftSavedAt
        }
      },
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as PersistedCreatorState | undefined),
        ...buildHydratedCreatorState(currentState, persistedState as PersistedCreatorState | undefined)
      })
    }
  )
)
