import type {
  ConsumerBasicMockInput,
  ConsumerComplexMockInput,
  ConsumerDateMockInput,
  MockScenarioPack
} from './types'
import { getScenarioEncounterDate, mockScenarioPacks } from './scenarioPacks'

function uniqueBy<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = getKey(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function practitionerFullName(scenario: MockScenarioPack): string {
  const { familyName, givenName } = scenario.creator.practitioner
  return `${familyName}${givenName}`
}

export const consumerBasicMocks: ConsumerBasicMockInput[] = uniqueBy(
  mockScenarioPacks.map((scenario) => ({
    searchBy: 'identifier' as const,
    value: scenario.creator.patient.studentId
  })),
  (item) => `${item.searchBy}:${item.value}`
)

export const consumerDateMocks: ConsumerDateMockInput[] = uniqueBy(
  mockScenarioPacks.map((scenario) => ({
    identifier: scenario.creator.patient.studentId,
    date: getScenarioEncounterDate(scenario)
  })),
  (item) => `${item.identifier}:${item.date}`
)

export const consumerComplexMocks: ConsumerComplexMockInput[] = uniqueBy(
  mockScenarioPacks.flatMap((scenario) => ([
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
      authorName: practitionerFullName(scenario)
    }
  ])),
  (item) => `${item.identifier}:${item.complexBy}:${item.orgId}:${item.authorName}`
)
