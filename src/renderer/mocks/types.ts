import type { SupportedLocale } from '../i18n'
import type { ResourceKey } from '../types/fhir.d'

export type MockLocale = SupportedLocale
export type LocalizedString = Record<MockLocale, string>
export type LocalizedText<T extends object> = Record<MockLocale, T>

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

export interface PatientMockText {
  familyName: string
  givenName: string
}

export interface OrganizationMockText {
  name: string
}

export interface PractitionerMockText {
  familyName: string
  givenName: string
  qualification: string
}

export interface ConditionMockText {
  icdDisplay: string
}

export interface ObservationMockText {
  display: string
}

export interface MedicationMockText {
  display: string
}

export interface MedicationRequestMockText {
  note?: string
}

export interface CompositionMockText {
  title: string
}

export interface ExtensionMockText {
  codeDisplay: string
  ext1Value: string
  ext2Value?: string
}

export interface BasePatientMockInput {
  studentId: string
  gender: 'male' | 'female' | 'other' | 'unknown'
  birthDate: string
}

export type PatientMockSource = BasePatientMockInput & {
  text: LocalizedText<PatientMockText>
}

export interface BaseOrganizationMockInput {
  identifier: string
  type: 'hospital' | 'clinic' | 'pharmacy'
}

export type OrganizationMockSource = BaseOrganizationMockInput & {
  text: LocalizedText<OrganizationMockText>
}

export interface BasePractitionerMockInput {
  licenseNumber: string
}

export type PractitionerMockSource = BasePractitionerMockInput & {
  text: LocalizedText<PractitionerMockText>
}

export type EncounterMockSource = EncounterMockInput

export interface BaseConditionMockInput {
  icdCode: string
  clinicalStatus: 'active' | 'resolved' | 'inactive'
}

export type ConditionMockSource = BaseConditionMockInput & {
  text: LocalizedText<ConditionMockText>
}

export interface BaseObservationMockInput {
  loincCode: string
  value: number
  unit: string
  status: 'final' | 'preliminary' | 'amended'
}

export type ObservationMockSource = BaseObservationMockInput & {
  text: LocalizedText<ObservationMockText>
}

export type CoverageMockSource = CoverageMockInput

export interface BaseMedicationMockInput {
  code: string
  codeSystem: 'atc' | 'nhi'
  form: 'TAB' | 'CAP' | 'SOL' | 'INJ' | 'CRM'
}

export type MedicationMockSource = BaseMedicationMockInput & {
  text: LocalizedText<MedicationMockText>
}

export interface BaseMedicationRequestMockInput {
  doseValue: number
  doseUnit: string
  frequency: 'QD' | 'BID' | 'TID' | 'QID' | 'PRN'
  route: '26643006' | '47625008' | '78421000' | '6064005' | '46713006'
  durationDays?: number
}

export type MedicationRequestMockSource = BaseMedicationRequestMockInput & {
  text: LocalizedText<MedicationRequestMockText>
}

export interface BaseCompositionMockInput {
  date: string
}

export type CompositionMockSource = BaseCompositionMockInput & {
  text: LocalizedText<CompositionMockText>
}

export interface BaseExtensionMockInput {
  codeCode: string
  ext1Url: string
  ext2Url?: string
}

export type ExtensionMockSource = BaseExtensionMockInput & {
  text: LocalizedText<ExtensionMockText>
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

export interface MockScenarioCreatorResourceSources {
  organization: OrganizationMockSource
  patient: PatientMockSource
  practitioner: PractitionerMockSource
  encounter: EncounterMockSource
  condition: ConditionMockSource
  observation: ObservationMockSource
  coverage: CoverageMockSource
  medication: MedicationMockSource
  medicationRequest: MedicationRequestMockSource
  composition: CompositionMockSource
  extension: ExtensionMockSource
}

export interface MockScenarioPackSource {
  id: string
  category: MockScenarioCategory
  label: LocalizedString
  description: LocalizedString
  tags: string[]
  isPrimaryDemo?: boolean
  creator: MockScenarioCreatorResourceSources
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

export interface MockPrescriptionTemplate {
  id: string
  category: Extract<MockScenarioCategory, 'foundation' | 'acute' | 'chronic' | 'pediatric'>
  label: string
  description: string
  tags: string[]
  isPrimaryDemo?: boolean
  scenario: MockScenarioPack
}

export interface MockResourcePresetSourceMap {
  patient: PatientMockSource[]
  organization: OrganizationMockSource[]
  practitioner: PractitionerMockSource[]
  encounter: EncounterMockSource[]
  condition: ConditionMockSource[]
  observation: ObservationMockSource[]
  coverage: CoverageMockSource[]
  medication: MedicationMockSource[]
  medicationRequest: MedicationRequestMockSource[]
  composition: CompositionMockSource[]
  extension: ExtensionMockSource[]
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

export type MockResourceSourceValueMap = MockScenarioCreatorResourceSources
export type MockResourceValueMap = MockScenarioCreatorResources
export type MockResourceData<K extends ResourceKey> = MockResourceValueMap[K]
export type MockResourceSourceData<K extends ResourceKey> = MockResourceSourceValueMap[K]
