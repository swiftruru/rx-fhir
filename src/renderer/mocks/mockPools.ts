import type { MockLocale } from './types'
import { getConsumerBasicMocks, getConsumerComplexMocks, getConsumerDateMocks } from './queryExamples'
import { getResourcePool } from './selectors'

export function getPatientMocks(locale?: MockLocale) {
  return getResourcePool('patient', locale)
}

export function getOrganizationMocks(locale?: MockLocale) {
  return getResourcePool('organization', locale)
}

export function getPractitionerMocks(locale?: MockLocale) {
  return getResourcePool('practitioner', locale)
}

export function getEncounterMocks(locale?: MockLocale) {
  return getResourcePool('encounter', locale)
}

export function getConditionMocks(locale?: MockLocale) {
  return getResourcePool('condition', locale)
}

export function getObservationMocks(locale?: MockLocale) {
  return getResourcePool('observation', locale)
}

export function getCoverageMocks(locale?: MockLocale) {
  return getResourcePool('coverage', locale)
}

export function getMedicationMocks(locale?: MockLocale) {
  return getResourcePool('medication', locale)
}

export function getMedicationRequestMocks(locale?: MockLocale) {
  return getResourcePool('medicationRequest', locale)
}

export function getCompositionMocks(locale?: MockLocale) {
  return getResourcePool('composition', locale)
}

export function getExtensionMocks(locale?: MockLocale) {
  return getResourcePool('extension', locale)
}

export { getConsumerBasicMocks, getConsumerDateMocks, getConsumerComplexMocks }
