import type {
  ConsumerBasicMockInput,
  ConsumerComplexMockInput,
  ConsumerDateMockInput,
  MockLocale,
  MockScenarioPack
} from './types'
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

  const identifierMocks: ConsumerBasicMockInput[] = scenarios.map((scenario) => ({
    searchBy: 'identifier' as const,
    value: scenario.creator.patient.studentId
  }))

  // Insert a name-based example for the primary demo patient right after its
  // identifier example, so users can also try name search with familiar data.
  const primaryDemo = scenarios.find((s) => s.isPrimaryDemo)
  // Use family name only — HAPI FHIR name search matches per component, so
  // a multi-word string like "Pan RuRu" would not match family="Pan" + given="RuRu".
  const nameMocks: ConsumerBasicMockInput[] = primaryDemo
    ? [{
        searchBy: 'name' as const,
        value: primaryDemo.creator.patient.familyName
      }]
    : []

  // Order: primary demo identifier, primary demo name, then remaining identifier examples
  const [primaryIdentifier, ...restIdentifiers] = identifierMocks
  const ordered: ConsumerBasicMockInput[] = [
    ...(primaryIdentifier ? [primaryIdentifier] : []),
    ...nameMocks,
    ...restIdentifiers
  ]

  return uniqueBy(ordered, (item) => `${item.searchBy}:${item.value}`)
}

export function getConsumerDateMocks(locale: MockLocale): ConsumerDateMockInput[] {
  // Date is intentionally left empty: the mock fills only the identifier so the user
  // can type the actual prescription date from their own submitted bundle.
  // Using a dynamic relativeDate() here would be wrong because Composition.date on the
  // FHIR Server is fixed at submission time and won't match today's relative calculation.
  return uniqueBy(
    sortPrimaryDemoFirst(getResolvedScenarioPacks(locale)).map((scenario) => ({
      identifier: scenario.creator.patient.studentId,
      date: ''
    })),
    (item) => item.identifier
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
