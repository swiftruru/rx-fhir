import { create } from 'zustand'
import type { CreatedResources } from '../types/fhir.d'

interface CreatorState {
  currentStep: number
  resources: CreatedResources
  bundleId?: string
  bundleError?: string
  submittingBundle: boolean

  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  setResource: <K extends keyof CreatedResources>(key: K, resource: CreatedResources[K]) => void
  setBundleId: (id: string) => void
  setBundleError: (error: string | undefined) => void
  setSubmittingBundle: (value: boolean) => void
  reset: () => void
}

const TOTAL_STEPS = 11

export const useCreatorStore = create<CreatorState>()((set, get) => ({
  currentStep: 0,
  resources: {},
  bundleId: undefined,
  bundleError: undefined,
  submittingBundle: false,

  setStep: (step) => set({ currentStep: Math.max(0, Math.min(step, TOTAL_STEPS - 1)) }),
  nextStep: () => set({ currentStep: Math.min(get().currentStep + 1, TOTAL_STEPS - 1) }),
  prevStep: () => set({ currentStep: Math.max(get().currentStep - 1, 0) }),

  setResource: (key, resource) =>
    set((state) => ({
      resources: { ...state.resources, [key]: resource }
    })),

  setBundleId: (id) => set({ bundleId: id, bundleError: undefined }),
  setBundleError: (error) => set({ bundleError: error }),
  setSubmittingBundle: (value) => set({ submittingBundle: value }),

  reset: () =>
    set({
      currentStep: 0,
      resources: {},
      bundleId: undefined,
      bundleError: undefined,
      submittingBundle: false
    })
}))
