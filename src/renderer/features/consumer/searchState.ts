import type { SearchParams } from '../../types/fhir.d'
import type { QueryStep } from '../../services/fhirClient'

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
  recentBundleFilePath?: string
  quickStartScenario?: 'example-query'
}

export interface ConsumerSearchExecution {
  params: SearchParams
  lastUrl?: string
  querySteps: QueryStep[]
  error?: string
  nextUrl?: string   // HAPI pagination — present when more results exist on the server
  cancelled?: boolean
}

export function getSearchTabFromParams(params: SearchParams): SearchTab {
  switch (params.mode) {
    case 'date':
      return 'date'
    case 'complex':
      return 'complex'
    default:
      return 'basic'
  }
}

export function buildSearchPrefillFromParams(params: SearchParams): SearchPrefill {
  switch (params.mode) {
    case 'date':
      return {
        tab: 'date',
        identifier: params.identifier ?? '',
        date: params.date ?? ''
      }
    case 'complex':
      return {
        tab: 'complex',
        identifier: params.identifier ?? '',
        complexBy: params.complexSearchBy ?? 'organization',
        orgId: params.organizationId,
        authorName: params.authorName
      }
    case 'basic':
    default:
      return {
        tab: 'basic',
        searchBy: params.identifier ? 'identifier' : 'name',
        value: params.identifier ?? params.name ?? ''
      }
  }
}
