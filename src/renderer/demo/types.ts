import type { ResourceKey } from '../types/fhir'

export type LiveDemoStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error'

export type LiveDemoPhase =
  | 'preparing'
  | 'intro'
  | 'filling'
  | 'submitting'
  | 'navigating'
  | 'searching'
  | 'reviewing'

export type LiveDemoControllerKey = ResourceKey

export type LiveDemoStepId =
  | 'organization'
  | 'patient'
  | 'practitioner'
  | 'encounter'
  | 'condition'
  | 'observation'
  | 'coverage'
  | 'medication'
  | 'medicationRequest'
  | 'extension'
  | 'compositionPreview'
  | 'bundleSubmit'
  | 'consumerSearch'

export type LiveDemoStepMode = 'fill-submit' | 'fill-only' | 'submit-only' | 'consumer-search'

export interface LiveDemoNarrative {
  title: string
  action: string
  concept: string
  practical: string
  relation: string
}

export interface LiveDemoStepDefinition {
  id: LiveDemoStepId
  mode: LiveDemoStepMode
  controllerKey?: LiveDemoControllerKey
  creatorStepIndex?: number
  introDelayMs?: number
  settleDelayMs?: number
}

export interface LiveDemoFormController {
  fillMock?: () => void
  fillDemo?: () => Promise<void>
  submit?: () => Promise<void> | void
  reveal?: () => Promise<void>
}
