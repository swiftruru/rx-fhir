import type { SearchPrefill, SearchTab, ConsumerSearchExecution } from '../features/consumer/searchState'
import type { SupportedLocale } from '../i18n'
import type { BundleSummary, CreatedResources, ResourceKey } from '../types/fhir'
import type { SubmissionRecord } from '../features/history/store/historyStore'
import type { SavedSearchRecord } from '../features/history/store/searchHistoryStore'
import type { FhirRequestEntry } from '../features/creator/store/fhirInspectorStore'
import type { CreatorResourceFeedback } from '../features/creator/store/creatorStore'

export type FeatureShowcaseStatus = 'idle' | 'running' | 'paused' | 'completed'
export type FeatureShowcaseHighlightStyle = 'glow' | 'pulse' | 'focus'
export type FeatureShowcasePanelPlacement = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
export type FeatureShowcaseRoute = '/creator' | '/consumer' | '/settings'

export type FeatureShowcaseTargetId =
  | 'app.sidebar'
  | 'app.utilityControls'
  | 'app.statusBar'
  | 'creator.stepper'
  | 'creator.form'
  | 'creator.rightPanel'
  | 'creator.bundleSubmit'
  | 'consumer.searchPanel'
  | 'consumer.quickStartPane'
  | 'consumer.resultsPane'
  | 'consumer.detailPane'
  | 'consumer.exportButton'
  | 'settings.serverCard'
  | 'settings.statusCard'

export type FeatureShowcaseStepId =
  | 'appShell'
  | 'creatorWorkflow'
  | 'fillMock'
  | 'jsonPreview'
  | 'requestInspector'
  | 'bundleAssembly'
  | 'consumerSearch'
  | 'consumerQuickStart'
  | 'consumerResults'
  | 'consumerStructuredDetail'
  | 'consumerRawJson'
  | 'consumerExport'
  | 'consumerBundleDiff'
  | 'settingsServer'
  | 'settingsStatus'
  | 'appControls'
  | 'statusBar'

export interface FeatureShowcaseRect {
  top: number
  left: number
  width: number
  height: number
}

export interface FeatureShowcaseCreatorOverride {
  currentStep?: number
  showRightPanel?: boolean
  rightPanelMode?: 'json' | 'request'
}

export interface FeatureShowcaseConsumerOverride {
  middleTab?: 'results' | 'quickstart' | 'history'
  activeTab?: SearchTab
  prefill?: SearchPrefill
  showDetail?: boolean
  selectedBundleId?: string
  detailView?: 'structured' | 'json'
  bundleDiffTargetId?: string
}

export interface FeatureShowcaseUiOverride {
  creator?: FeatureShowcaseCreatorOverride
  consumer?: FeatureShowcaseConsumerOverride
}

export interface FeatureShowcaseStepDefinition {
  id: FeatureShowcaseStepId
  route: FeatureShowcaseRoute
  targetId: FeatureShowcaseTargetId
  durationMs: number
  spotlightPadding?: number
  highlightStyle?: FeatureShowcaseHighlightStyle
  panelPlacement?: FeatureShowcasePanelPlacement
  ui?: FeatureShowcaseUiOverride
}

export interface FeatureShowcaseCreatorStateSnapshot {
  currentStep: number
  resources: CreatedResources
  feedbacks: Partial<Record<ResourceKey, CreatorResourceFeedback>>
  lastUpdatedResourceKey?: ResourceKey
  bundleId?: string
}

export interface FeatureShowcaseConsumerSnapshot {
  results: BundleSummary[]
  total: number
  selectedBundleId?: string
  quickSearchPrefill: SearchPrefill
  quickSearchExecution: ConsumerSearchExecution
}

export interface FeatureShowcaseSnapshot {
  locale: SupportedLocale
  creator: FeatureShowcaseCreatorStateSnapshot
  consumer: FeatureShowcaseConsumerSnapshot
  recentRecords: SubmissionRecord[]
  savedSearches: SavedSearchRecord[]
  fhirRequests: {
    latest?: FhirRequestEntry
    history: FhirRequestEntry[]
  }
}
