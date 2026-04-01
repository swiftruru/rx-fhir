import type { ResourceKey } from '../types/fhir.d'
import type {
  LocalizedString,
  MockScenarioPackSource,
  MockScenarioCreatorResourceSources
} from './types'

const REQUIRED_RESOURCE_KEYS: ResourceKey[] = [
  'organization',
  'patient',
  'practitioner',
  'encounter',
  'condition',
  'observation',
  'coverage',
  'medication',
  'medicationRequest',
  'extension',
  'composition'
]

function hasLocalizedStringContent(value: LocalizedString): boolean {
  return Boolean(value['zh-TW']) && Boolean(value.en)
}

function hasLocalizedResourceText(
  resources: MockScenarioCreatorResourceSources,
  key: 'organization' | 'patient' | 'practitioner' | 'condition' | 'observation' | 'medication' | 'medicationRequest' | 'composition' | 'extension'
): boolean {
  const resource = resources[key]
  return 'text' in resource && Boolean(resource.text['zh-TW']) && Boolean(resource.text.en)
}

export function validateMockScenarioPacks(scenarios: MockScenarioPackSource[]): void {
  const ids = new Set<string>()

  for (const scenario of scenarios) {
    if (ids.has(scenario.id)) {
      throw new Error(`Duplicate mock scenario id: ${scenario.id}`)
    }
    ids.add(scenario.id)

    if (!hasLocalizedStringContent(scenario.label)) {
      throw new Error(`Scenario ${scenario.id} is missing localized label content`)
    }

    if (!hasLocalizedStringContent(scenario.description)) {
      throw new Error(`Scenario ${scenario.id} is missing localized description content`)
    }

    for (const key of REQUIRED_RESOURCE_KEYS) {
      if (!scenario.creator[key]) {
        throw new Error(`Scenario ${scenario.id} is missing creator resource: ${key}`)
      }
    }

    if (!scenario.creator.patient.studentId) {
      throw new Error(`Scenario ${scenario.id} is missing patient studentId`)
    }

    if (!scenario.creator.organization.identifier) {
      throw new Error(`Scenario ${scenario.id} is missing organization identifier`)
    }

    if (!scenario.creator.practitioner.licenseNumber) {
      throw new Error(`Scenario ${scenario.id} is missing practitioner licenseNumber`)
    }

    if (!scenario.creator.composition.date) {
      throw new Error(`Scenario ${scenario.id} is missing composition date`)
    }

    for (const key of [
      'organization',
      'patient',
      'practitioner',
      'condition',
      'observation',
      'medication',
      'medicationRequest',
      'composition',
      'extension'
    ] as const) {
      if (!hasLocalizedResourceText(scenario.creator, key)) {
        throw new Error(`Scenario ${scenario.id} is missing localized text for resource: ${key}`)
      }
    }
  }
}
