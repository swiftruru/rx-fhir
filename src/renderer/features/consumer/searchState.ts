import type { SearchParams } from '../../types/fhir.d'

export type SearchTab = 'basic' | 'date' | 'complex'

export type SearchPrefill =
  | { tab: 'basic'; searchBy: 'identifier' | 'name'; value: string }
  | { tab: 'date'; identifier: string; date: string }
  | {
      tab: 'complex'
      identifier: string
      complexBy?: 'organization' | 'author'
      orgId?: string
      authorName?: string
    }

export interface ConsumerLaunchState {
  prefill?: SearchPrefill
  autoSearch?: SearchParams
  targetBundleId?: string
}
