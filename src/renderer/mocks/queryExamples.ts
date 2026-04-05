import type {
  ConsumerBasicMockInput,
  ConsumerComplexMockInput,
  ConsumerDateMockInput,
  MockLocale,
  MockScenarioPack
} from './types'
import { getScenarioEncounterDate } from './scenarioPacks'
import { getResolvedScenarioPacks } from './selectors'

function uniqueBy<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = getKey(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function practitionerFullName(scenario: MockScenarioPack, locale: MockLocale): string {
  const { familyName, givenName } = scenario.creator.practitioner
  return locale === 'en' ? `${familyName} ${givenName}` : `${familyName}${givenName}`
}

function sortPrimaryDemoFirst(scenarios: MockScenarioPack[]): MockScenarioPack[] {
  return [...scenarios].sort((a, b) => {
    if (a.isPrimaryDemo && !b.isPrimaryDemo) return -1
    if (!a.isPrimaryDemo && b.isPrimaryDemo) return 1
    return 0
  })
}

export function getConsumerBasicMocks(locale: MockLocale): ConsumerBasicMockInput[] {
  const scenarios = sortPrimaryDemoFirst(getResolvedScenarioPacks(locale))

  return uniqueBy(
    scenarios.map((scenario) => ({
      searchBy: 'identifier' as const,
      value: scenario.creator.patient.studentId
    })),
    (item) => `${item.searchBy}:${item.value}`
  )
}

export function getConsumerDateMocks(locale: MockLocale): ConsumerDateMockInput[] {
  return uniqueBy(
    sortPrimaryDemoFirst(getResolvedScenarioPacks(locale)).map((scenario) => ({
      identifier: scenario.creator.patient.studentId,
      date: getScenarioEncounterDate(scenario)
    })),
    (item) => `${item.identifier}:${item.date}`
  )
}

export function getConsumerComplexMocks(locale: MockLocale): ConsumerComplexMockInput[] {
  return uniqueBy(
    sortPrimaryDemoFirst(getResolvedScenarioPacks(locale)).flatMap((scenario) => ([
      {
        identifier: scenario.creator.patient.studentId,
        complexBy: 'organization' as const,
        orgId: scenario.creator.organization.identifier,
        authorName: ''
      },
      {
        identifier: scenario.creator.patient.studentId,
        complexBy: 'author' as const,
        orgId: '',
        authorName: practitionerFullName(scenario, locale)
      }
    ])),
    (item) => `${item.identifier}:${item.complexBy}:${item.orgId}:${item.authorName}`
  )
}
