export type FhirResourceType =
  | 'Patient'
  | 'Organization'
  | 'Practitioner'
  | 'Encounter'
  | 'Condition'
  | 'Observation'
  | 'Coverage'
  | 'Medication'
  | 'MedicationRequest'
  | 'Composition'
  | 'Bundle'

export interface CreatedResources {
  organization?: fhir4.Organization
  patient?: fhir4.Patient
  practitioner?: fhir4.Practitioner
  encounter?: fhir4.Encounter
  condition?: fhir4.Condition
  observation?: fhir4.Observation
  coverage?: fhir4.Coverage
  medication?: fhir4.Medication
  medicationRequest?: fhir4.MedicationRequest
  extension?: fhir4.Basic
  composition?: fhir4.Composition
}

export type ResourceKey = keyof CreatedResources

export const RESOURCE_STEPS: { key: ResourceKey }[] = [
  { key: 'organization' },
  { key: 'patient' },
  { key: 'practitioner' },
  { key: 'encounter' },
  { key: 'condition' },
  { key: 'observation' },
  { key: 'coverage' },
  { key: 'medication' },
  { key: 'medicationRequest' },
  { key: 'extension' },
  { key: 'composition' }
]

export interface SearchParams {
  mode: 'basic' | 'date' | 'complex'
  identifier?: string
  name?: string
  date?: string
  organizationId?: string
  authorName?: string
  complexSearchBy?: 'organization' | 'author'
}

export interface BundleSummary {
  id: string
  date?: string
  patientName?: string
  patientIdentifier?: string
  organizationName?: string
  conditions?: string[]
  medications?: string[]
  source?: 'server' | 'imported'
  fileName?: string
  raw: fhir4.Bundle
}
