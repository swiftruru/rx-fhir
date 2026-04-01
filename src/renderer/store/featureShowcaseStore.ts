import { create } from 'zustand'
import type {
  FeatureShowcasePanelPlacement,
  FeatureShowcaseRect,
  FeatureShowcaseSnapshot,
  FeatureShowcaseStepDefinition,
  FeatureShowcaseStepId,
  FeatureShowcaseUiOverride,
  FeatureShowcaseStatus,
  FeatureShowcaseTargetId
} from '../showcase/types'

interface FeatureShowcaseState {
  status: FeatureShowcaseStatus
  autoplay: boolean
  currentStepId?: FeatureShowcaseStepId
  currentStepIndex: number
  totalSteps: number
  runId: number
  error?: string
  currentTargetId?: FeatureShowcaseTargetId
  currentPanelPlacement: FeatureShowcasePanelPlacement
  currentHighlightStyle: FeatureShowcaseStepDefinition['highlightStyle']
  currentSpotlightPadding: number
  targets: Partial<Record<FeatureShowcaseTargetId, FeatureShowcaseRect>>
  ui: FeatureShowcaseUiOverride
  snapshot?: FeatureShowcaseSnapshot
  start: (totalSteps: number) => void
  pause: () => void
  resume: () => void
  stop: () => void
  dismiss: () => void
  complete: () => void
  fail: (message: string) => void
  next: () => void
  previous: () => void
  setAutoplay: (value: boolean) => void
  activateStep: (step: FeatureShowcaseStepDefinition, index: number, totalSteps: number) => void
  registerTarget: (id: FeatureShowcaseTargetId, rect: FeatureShowcaseRect) => void
  unregisterTarget: (id: FeatureShowcaseTargetId) => void
  setSnapshot: (snapshot?: FeatureShowcaseSnapshot) => void
  setUi: (ui: FeatureShowcaseUiOverride) => void
}

const DEFAULT_SPOTLIGHT_PADDING = 16

function resetEphemeralState() {
  return {
    currentStepId: undefined,
    currentStepIndex: 0,
    totalSteps: 0,
    currentTargetId: undefined,
    currentPanelPlacement: 'bottom-right' as const,
    currentHighlightStyle: 'glow' as const,
    currentSpotlightPadding: DEFAULT_SPOTLIGHT_PADDING,
    ui: {}
  }
}

export const useFeatureShowcaseStore = create<FeatureShowcaseState>((set) => ({
  status: 'idle',
  autoplay: false,
  runId: 0,
  error: undefined,
  snapshot: undefined,
  targets: {},
  ...resetEphemeralState(),

  start: (totalSteps) =>
    set((state) => ({
      ...resetEphemeralState(),
      status: 'running',
      autoplay: false,
      runId: state.runId + 1,
      totalSteps,
      error: undefined
    })),

  pause: () =>
    set((state) => (state.status === 'running' ? { status: 'paused' } : state)),

  resume: () =>
    set((state) => (state.status === 'paused' ? { status: 'running' } : state)),

  stop: () =>
    set({
      status: 'idle',
      autoplay: false,
      error: undefined,
      snapshot: undefined,
      ...resetEphemeralState()
    }),

  dismiss: () =>
    set({
      status: 'idle',
      autoplay: false,
      error: undefined,
      snapshot: undefined,
      ...resetEphemeralState()
    }),

  complete: () =>
    set({
      status: 'completed',
      currentTargetId: undefined,
      currentHighlightStyle: 'glow',
      currentSpotlightPadding: DEFAULT_SPOTLIGHT_PADDING,
      ui: {}
    }),

  fail: (message) =>
    set({
      status: 'completed',
      error: message,
      currentTargetId: undefined,
      currentHighlightStyle: 'focus',
      currentSpotlightPadding: DEFAULT_SPOTLIGHT_PADDING,
      ui: {}
    }),

  next: () =>
    set((state) => ({
      currentStepIndex: Math.min(state.currentStepIndex + 1, Math.max(state.totalSteps - 1, 0))
    })),

  previous: () =>
    set((state) => ({
      currentStepIndex: Math.max(state.currentStepIndex - 1, 0)
    })),

  setAutoplay: (value) => set({ autoplay: value }),

  activateStep: (step, index, totalSteps) =>
    set({
      currentStepId: step.id,
      currentStepIndex: index,
      totalSteps,
      currentTargetId: step.targetId,
      currentPanelPlacement: step.panelPlacement ?? 'bottom-right',
      currentHighlightStyle: step.highlightStyle ?? 'glow',
      currentSpotlightPadding: step.spotlightPadding ?? DEFAULT_SPOTLIGHT_PADDING,
      ui: step.ui ?? {}
    }),

  registerTarget: (id, rect) =>
    set((state) => ({
      targets: { ...state.targets, [id]: rect }
    })),

  unregisterTarget: (id) =>
    set((state) => {
      const targets = { ...state.targets }
      delete targets[id]
      return { targets }
    }),

  setSnapshot: (snapshot) => set({ snapshot }),
  setUi: (ui) => set({ ui })
}))
