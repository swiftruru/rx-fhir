import type { ResourceKey } from '../types/fhir.d'
import type { MockScenarioPack } from './types'

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

export function validateMockScenarioPacks(scenarios: MockScenarioPack[]): void {
  const ids = new Set<string>()

  for (const scenario of scenarios) {
    if (ids.has(scenario.id)) {
      throw new Error(`Duplicate mock scenario id: ${scenario.id}`)
    }
    ids.add(scenario.id)

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
  }
}
