import type { ResourceKey } from '../types/fhir.d'
import { mockResourcePresets } from './resourcePresets'
import { mockScenarioPacks } from './scenarioPacks'
import type {
  CompositionMockInput,
  ConditionMockInput,
  CoverageMockInput,
  EncounterMockInput,
  ExtensionMockInput,
  MedicationMockInput,
  MedicationRequestMockInput,
  MockResourceData,
  MockResourcePresetMap,
  MockScenarioCategory,
  MockScenarioPack,
  ObservationMockInput,
  OrganizationMockInput,
  PatientMockInput,
  PractitionerMockInput
} from './types'
import { validateMockScenarioPacks } from './validate'

validateMockScenarioPacks(mockScenarioPacks)

function uniqueBy<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = getKey(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function getResourceIdentity(key: ResourceKey, item: MockResourceData<ResourceKey>): string {
  switch (key) {
    case 'patient':
      return (item as PatientMockInput).studentId
    case 'organization':
      return (item as OrganizationMockInput).identifier
    case 'practitioner':
      return (item as PractitionerMockInput).licenseNumber
    case 'encounter':
      return `${(item as EncounterMockInput).class}:${(item as EncounterMockInput).periodStart}:${(item as EncounterMockInput).periodEnd ?? ''}`
    case 'condition':
      return `${(item as ConditionMockInput).icdCode}:${(item as ConditionMockInput).icdDisplay}`
    case 'observation':
      return `${(item as ObservationMockInput).loincCode}:${(item as ObservationMockInput).display}:${(item as ObservationMockInput).unit}`
    case 'coverage':
      return (item as CoverageMockInput).subscriberId
    case 'medication':
      return `${(item as MedicationMockInput).codeSystem}:${(item as MedicationMockInput).code}`
    case 'medicationRequest':
      return `${(item as MedicationRequestMockInput).doseValue}:${(item as MedicationRequestMockInput).doseUnit}:${(item as MedicationRequestMockInput).frequency}:${(item as MedicationRequestMockInput).route}:${(item as MedicationRequestMockInput).durationDays ?? ''}:${(item as MedicationRequestMockInput).note ?? ''}`
    case 'extension':
      return `${(item as ExtensionMockInput).codeCode}:${(item as ExtensionMockInput).ext1Url}:${(item as ExtensionMockInput).ext1Value}:${(item as ExtensionMockInput).ext2Url ?? ''}:${(item as ExtensionMockInput).ext2Value ?? ''}`
    case 'composition':
      return `${(item as CompositionMockInput).title}:${(item as CompositionMockInput).date}`
    default:
      return JSON.stringify(item)
  }
}

export function getScenarioById(id?: string): MockScenarioPack | undefined {
  if (!id) return undefined
  return mockScenarioPacks.find((scenario) => scenario.id === id)
}

export function getPrimaryDemoScenario(): MockScenarioPack | undefined {
  return mockScenarioPacks.find((scenario) => scenario.isPrimaryDemo)
}

export function getPrimaryDemoScenarioId(): string | undefined {
  return getPrimaryDemoScenario()?.id
}

export function getScenarioIds(category?: MockScenarioCategory | 'all'): string[] {
  return mockScenarioPacks
    .filter((scenario) => !category || category === 'all' || scenario.category === category)
    .map((scenario) => scenario.id)
}

export function getScenarioMock<K extends ResourceKey>(scenarioId: string, key: K): MockResourceData<K> | undefined {
  const scenario = getScenarioById(scenarioId)
  return scenario?.creator[key]
}

export function getScenarioMocksForResource<K extends ResourceKey>(key: K): MockResourceData<K>[] {
  return uniqueBy(
    mockScenarioPacks.map((scenario) => scenario.creator[key]),
    (item) => getResourceIdentity(key, item as MockResourceData<ResourceKey>)
  )
}

export function getResourcePresets<K extends keyof MockResourcePresetMap>(key: K): MockResourcePresetMap[K] {
  return mockResourcePresets[key]
}

export function getResourcePool<K extends ResourceKey>(key: K): MockResourceData<K>[] {
  return [
    ...getScenarioMocksForResource(key),
    ...(getResourcePresets(key) as MockResourceData<K>[])
  ]
}

export function getNextScenarioMock<K extends ResourceKey>(
  key: K,
  scenarioId?: string
): MockResourceData<K> | undefined {
  if (!scenarioId) return getScenarioMocksForResource(key)[0]
  return getScenarioMock(scenarioId, key)
}
