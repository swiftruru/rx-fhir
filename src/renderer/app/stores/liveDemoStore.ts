import { create } from 'zustand'
import type {
  LiveDemoControllerKey,
  LiveDemoFormController,
  LiveDemoPhase,
  LiveDemoStatus,
  LiveDemoStepId
} from '../../demo/types'

export type LiveDemoPlayMode = 'manual' | 'auto'

interface LiveDemoState {
  status: LiveDemoStatus
  playMode: LiveDemoPlayMode
  coachCollapsed: boolean
  phase?: LiveDemoPhase
  currentStepId?: LiveDemoStepId
  currentIndex: number
  totalSteps: number
  runId: number
  advanceToken: number
  error?: string
  consumerSearchReady: boolean
  controllers: Partial<Record<LiveDemoControllerKey, LiveDemoFormController>>
  start: (totalSteps: number, playMode?: LiveDemoPlayMode) => void
  pause: () => void
  resume: () => void
  stop: () => void
  dismiss: () => void
  complete: () => void
  fail: (message: string) => void
  setCurrentStep: (stepId: LiveDemoStepId, index: number, totalSteps: number) => void
  setPhase: (phase: LiveDemoPhase) => void
  setCoachCollapsed: (collapsed: boolean) => void
  setPlayMode: (mode: LiveDemoPlayMode) => void
  requestAdvance: () => void
  registerController: (key: LiveDemoControllerKey, controller: LiveDemoFormController) => void
  unregisterController: (key: LiveDemoControllerKey) => void
  markConsumerSearchReady: () => void
  resetConsumerSearchReady: () => void
}

export const useLiveDemoStore = create<LiveDemoState>((set) => ({
  status: 'idle',
  playMode: 'manual',
  coachCollapsed: false,
  phase: undefined,
  currentStepId: undefined,
  currentIndex: 0,
  totalSteps: 0,
  runId: 0,
  advanceToken: 0,
  error: undefined,
  consumerSearchReady: false,
  controllers: {},

  start: (totalSteps, playMode = 'manual') =>
    set((state) => ({
      status: 'running',
      playMode,
      coachCollapsed: false,
      phase: 'preparing',
      currentStepId: undefined,
      currentIndex: 0,
      totalSteps,
      runId: state.runId + 1,
      advanceToken: state.advanceToken + 1,
      error: undefined,
      consumerSearchReady: false
    })),

  pause: () => set((state) => (state.status === 'running' ? { status: 'paused' } : state)),
  resume: () => set((state) => (state.status === 'paused' ? { status: 'running' } : state)),

  stop: () =>
    set((state) => ({
      status: 'idle',
      playMode: 'manual',
      coachCollapsed: false,
      phase: undefined,
      currentStepId: undefined,
      currentIndex: 0,
      totalSteps: 0,
      runId: state.runId + 1,
      advanceToken: state.advanceToken + 1,
      error: undefined,
      consumerSearchReady: false
    })),

  dismiss: () =>
    set((state) => ({
      status: 'idle',
      playMode: 'manual',
      coachCollapsed: false,
      phase: undefined,
      currentStepId: undefined,
      currentIndex: 0,
      totalSteps: 0,
      runId: state.runId + 1,
      error: undefined,
      consumerSearchReady: false
    })),

  complete: () => set({ status: 'completed', phase: 'reviewing' }),
  fail: (message) => set({ status: 'error', error: message }),

  setCurrentStep: (stepId, index, totalSteps) =>
    set({
      currentStepId: stepId,
      currentIndex: index,
      totalSteps
    }),

  setPhase: (phase) => set({ phase }),
  setCoachCollapsed: (collapsed) => set({ coachCollapsed: collapsed }),
  setPlayMode: (mode) =>
    set((state) => ({
      playMode: mode,
      advanceToken: mode === 'auto' ? state.advanceToken + 1 : state.advanceToken
    })),
  requestAdvance: () => set((state) => ({ advanceToken: state.advanceToken + 1 })),

  registerController: (key, controller) =>
    set((state) => ({
      controllers: { ...state.controllers, [key]: controller }
    })),

  unregisterController: (key) =>
    set((state) => {
      const controllers = { ...state.controllers }
      delete controllers[key]
      return { controllers }
    }),

  markConsumerSearchReady: () => set({ consumerSearchReady: true }),
  resetConsumerSearchReady: () => set({ consumerSearchReady: false })
}))
