import type { ResourceKey } from '../types/fhir.d'

export type MockScenarioCategory =
  | 'foundation'
  | 'chronic'
  | 'acute'
  | 'emergency'
  | 'pediatric'
  | 'search-demo'
  | 'optional-empty'

export type MockFillMode = 'cycle' | 'random'

export interface PatientMockInput {
  familyName: string
  givenName: string
  studentId: string
  gender: 'male' | 'female' | 'other' | 'unknown'
  birthDate: string
}

export interface OrganizationMockInput {
  name: string
  identifier: string
  type: 'hospital' | 'clinic' | 'pharmacy'
}

export interface PractitionerMockInput {
  familyName: string
  givenName: string
  licenseNumber: string
  qualification: string
}

export interface EncounterMockInput {
  class: 'AMB' | 'EMER' | 'IMP'
  periodStart: string
  periodEnd?: string
}

export interface ConditionMockInput {
  icdCode: string
  icdDisplay: string
  clinicalStatus: 'active' | 'resolved' | 'inactive'
}

export interface ObservationMockInput {
  loincCode: string
  display: string
  value: number
  unit: string
  status: 'final' | 'preliminary' | 'amended'
}

export interface CoverageMockInput {
  type: 'EHCPOL' | 'PAY' | 'PUBLICPOL'
  subscriberId: string
  periodStart: string
  periodEnd?: string
}

export interface MedicationMockInput {
  code: string
  display: string
  codeSystem: 'atc' | 'nhi'
  form: 'TAB' | 'CAP' | 'SOL' | 'INJ' | 'CRM'
}

export interface MedicationRequestMockInput {
  doseValue: number
  doseUnit: string
  frequency: 'QD' | 'BID' | 'TID' | 'QID' | 'PRN'
  route: '26643006' | '47625008' | '78421000' | '6064005' | '46713006'
  durationDays?: number
  note?: string
}

export interface CompositionMockInput {
  title: string
  date: string
}

export interface ExtensionMockInput {
  codeCode: string
  codeDisplay: string
  ext1Url: string
  ext1Value: string
  ext2Url?: string
  ext2Value?: string
}

export interface ConsumerBasicMockInput {
  searchBy: 'identifier' | 'name'
  value: string
}

export interface ConsumerDateMockInput {
  identifier: string
  date: string
}

export interface ConsumerComplexMockInput {
  identifier: string
  complexBy: 'organization' | 'author'
  orgId: string
  authorName: string
}

export interface MockScenarioCreatorResources {
  organization: OrganizationMockInput
  patient: PatientMockInput
  practitioner: PractitionerMockInput
  encounter: EncounterMockInput
  condition: ConditionMockInput
  observation: ObservationMockInput
  coverage: CoverageMockInput
  medication: MedicationMockInput
  medicationRequest: MedicationRequestMockInput
  composition: CompositionMockInput
  extension: ExtensionMockInput
}

export interface MockScenarioPack {
  id: string
  category: MockScenarioCategory
  label: string
  description: string
  tags: string[]
  isPrimaryDemo?: boolean
  creator: MockScenarioCreatorResources
}

export type MockResourcePresetMap = {
  patient: PatientMockInput[]
  organization: OrganizationMockInput[]
  practitioner: PractitionerMockInput[]
  encounter: EncounterMockInput[]
  condition: ConditionMockInput[]
  observation: ObservationMockInput[]
  coverage: CoverageMockInput[]
  medication: MedicationMockInput[]
  medicationRequest: MedicationRequestMockInput[]
  composition: CompositionMockInput[]
  extension: ExtensionMockInput[]
}

export type MockResourceValueMap = MockScenarioCreatorResources
export type MockResourceData<K extends ResourceKey> = MockResourceValueMap[K]
