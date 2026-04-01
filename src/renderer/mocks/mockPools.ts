import { consumerBasicMocks, consumerComplexMocks, consumerDateMocks } from './queryExamples'
import { getResourcePool } from './selectors'

export const patientMocks = getResourcePool('patient')
export const organizationMocks = getResourcePool('organization')
export const practitionerMocks = getResourcePool('practitioner')
export const encounterMocks = getResourcePool('encounter')
export const conditionMocks = getResourcePool('condition')
export const observationMocks = getResourcePool('observation')
export const coverageMocks = getResourcePool('coverage')
export const medicationMocks = getResourcePool('medication')
export const medicationRequestMocks = getResourcePool('medicationRequest')
export const compositionMocks = getResourcePool('composition')
export const extensionMocks = getResourcePool('extension')

export { consumerBasicMocks, consumerDateMocks, consumerComplexMocks }
