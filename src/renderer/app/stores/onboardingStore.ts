import { create } from 'zustand'

interface OnboardingState {
  open: boolean
  stepId?: string
  openOnboarding: (stepId?: string) => void
  closeOnboarding: () => void
}

export const useOnboardingStore = create<OnboardingState>()((set) => ({
  open: false,
  stepId: undefined,
  openOnboarding: (stepId) => set({ open: true, stepId }),
  closeOnboarding: () => set({ open: false, stepId: undefined })
}))
