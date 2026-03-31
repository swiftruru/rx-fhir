// Extended FHIR R4 types for RxFHIR
// Using @types/fhir as base, with TW Core specific extensions

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
  composition?: fhir4.Composition
}

export type ResourceKey = keyof CreatedResources

export const RESOURCE_STEPS: { key: ResourceKey; label: string; labelEn: string }[] = [
  { key: 'organization', label: '醫事機構', labelEn: 'Organization' },
  { key: 'patient', label: '病人資料', labelEn: 'Patient' },
  { key: 'practitioner', label: '醫師資料', labelEn: 'Practitioner' },
  { key: 'encounter', label: '門診資料', labelEn: 'Encounter' },
  { key: 'condition', label: '診斷', labelEn: 'Condition' },
  { key: 'observation', label: '檢驗檢查', labelEn: 'Observation' },
  { key: 'coverage', label: '保險資訊', labelEn: 'Coverage' },
  { key: 'medication', label: '藥品資訊', labelEn: 'Medication' },
  { key: 'medicationRequest', label: '處方箋', labelEn: 'MedicationRequest' },
  { key: 'composition', label: '文件組裝', labelEn: 'Composition & Bundle' }
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
  raw: fhir4.Bundle
}
