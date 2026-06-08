export const EMR_PROFILES = {
  bundle: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Bundle-EP',
  composition: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Composition-EP',
  organization: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Organization-EP',
  patient: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Patient-EP',
  practitioner: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Practitioner-EP',
  encounter: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Encounter-EP',
  condition: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Condition-EP',
  observation: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Observation-EP',
  observationBodyWeight: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Observation-EP-BodyWeight',
  coverage: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Coverage-EMR',
  medication: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Medication-EP',
  medicationRequest: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/MedicationRequest-EP'
} as const

// Terminology bindings from TW EMR IG 0.2.0 official examples (Composition-EP / Bundle-EP).
export const TW_PAYMENT_CATEGORY_SYSTEM = 'https://twcore.mohw.gov.tw/ig/emr/CodeSystem/paymentcategory'
export const TW_CASE_TYPE_SYSTEM = 'https://standard-interoperability-lab.com/fhir/CodeSystem/casetype'
export const TW_PRESCRIPTION_CATEGORY_SYSTEM = 'https://twcore.mohw.gov.tw/ig/emr/CodeSystem/prescription'
export const ICD10_CM_TW_SYSTEM = 'https://twcore.mohw.gov.tw/ig/twcore/CodeSystem/icd-10-cm-2021-tw'
/** @deprecated Use TW_PRESCRIPTION_CATEGORY_SYSTEM */
export const TW_MEDICATION_REQUEST_CATEGORY_SYSTEM = TW_PRESCRIPTION_CATEGORY_SYSTEM
export const TW_TOTAL_DURATION_EXTENSION = 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Extension-TotalDuration'
export const PATIENT_MEDICAL_RECORD_SYSTEM = 'https://rxfhir.app/fhir/medical-record-number'
export const MR_IDENTIFIER_TYPE_SYSTEM = 'http://terminology.hl7.org/CodeSystem/v2-0203'
export const LEGACY_COVERAGE_TYPE_SYSTEM = 'http://terminology.hl7.org/CodeSystem/v3-ActCode'

/** Case type (案件分類) displays — IG example uses zh-TW labels. */
export const CASE_TYPE_DISPLAYS: Record<string, string> = {
  '01': '西醫一般案件',
  '02': '西醫急診',
  '03': '西醫門診手術',
  '1': '住院一般案件',
  '2': '住院案件分類案件'
}

/** Validator-canonical short labels for CodeSystem/prescription. */
export const PRESCRIPTION_CATEGORY_DISPLAYS: Record<string, string> = {
  A: '一般處方箋',
  B: '慢性病處方箋'
}

/** @deprecated Use PRESCRIPTION_CATEGORY_DISPLAYS */
export const MEDICATION_REQUEST_CATEGORY_DISPLAYS = PRESCRIPTION_CATEGORY_DISPLAYS

/** Payment category (給付類別) displays — IG example uses zh-TW labels. */
export const PAYMENT_CATEGORY_DISPLAYS: Record<string, string> = {
  '1': '職業傷害',
  '2': '職業病',
  '3': '普通傷害',
  '4': '普通疾病',
  '6': '正常分娩',
  '7': '剖腹產',
  '8': '天然災害',
  '9': '呼吸照護',
  A: '安寧照護',
  B: '天然災害（非巡迴）',
  C: '糖尿病試辦計畫',
  D: '周產期試辦計畫',
  E: '氣喘試辦計畫',
  F: '結核病試辦計畫',
  M: '肝炎試辦計畫',
  Y: '塵爆事件',
  Z: '氣爆事件'
}

/** Creator UI option → TW PaymentCategory coding + 就醫身分別 (Coverage.type.text). */
export const COVERAGE_IDENTITY_OPTIONS = [
  { value: 'nhi', paymentCode: '4', labelKey: 'nhi' },
  { value: 'selfpay', paymentCode: '4', labelKey: 'selfpay' },
  { value: 'public', paymentCode: '4', labelKey: 'public' },
  { value: 'injury', paymentCode: '3', labelKey: 'injury' },
  { value: 'occupational', paymentCode: '1', labelKey: 'occupational' }
] as const

export type CoverageIdentityOption = (typeof COVERAGE_IDENTITY_OPTIONS)[number]['value']

const LEGACY_COVERAGE_TYPE_TO_PAYMENT_CODE: Record<string, string> = {
  EHCPOL: '4',
  PAY: '4',
  PUBLICPOL: '4'
}

/**
 * Canonical displays from TW CodeSystem icd-10-cm-2021-tw (validator enforces exact wording).
 * User-facing diagnosis text may differ in CodeableConcept.text.
 */
export const ICD10_CM_TW_DISPLAYS: Record<string, string> = {
  'K21.9': '胃食道逆性疾病未伴有食道炎',
  'J06.9': '急性上呼吸道感染',
  'I10': '本態性(原發性)高血壓',
  'E11.9': '第二型糖尿病未伴有併發症',
  'R50.9': '發燒',
  'T78.40XA': '過敏，未明示，初次就醫',
  'M79.10': '肌痛',
  'M54.5': '下背痛',
  'K30': '功能性消化不良',
  'J30.9': '過敏性鼻炎',
  'J45.909': '未明示之氣喘',
  'G43.909': '未明示之偏頭痛',
  'E78.5': '高脂血症',
  'J18.9': '肺炎',
  'K29.7': '胃炎'
}

/** Canonical American English ICD-10-CM displays (legacy / reference). */
export const ICD10_CM_DISPLAYS: Record<string, string> = {
  'K21.9': 'Gastro-esophageal reflux disease without esophagitis',
  'J06.9': 'Acute upper respiratory infection, unspecified',
  'I10': 'Essential (primary) hypertension',
  'E11.9': 'Type 2 diabetes mellitus without complications',
  'R50.9': 'Fever, unspecified',
  'T78.40XA': 'Allergy, unspecified, initial encounter',
  'M79.10': 'Myalgia, unspecified site',
  'M54.5': 'Low back pain',
  'K30': 'Functional dyspepsia',
  'J30.9': 'Allergic rhinitis, unspecified',
  'J45.909': 'Unspecified asthma, uncomplicated',
  'G43.909': 'Migraine, unspecified, not intractable, without status migrainosus',
  'E78.5': 'Hyperlipidemia, unspecified',
  'J18.9': 'Pneumonia, unspecified organism',
  'K29.7': 'Gastritis, unspecified'
}

export function paymentCategoryCoding(code: string): fhir4.Coding {
  return {
    system: TW_PAYMENT_CATEGORY_SYSTEM,
    code,
    display: PAYMENT_CATEGORY_DISPLAYS[code] ?? code
  }
}

export function buildCoverageType(
  identityOption: CoverageIdentityOption | string,
  identityText: string
): fhir4.CodeableConcept {
  const option = COVERAGE_IDENTITY_OPTIONS.find((item) => item.value === identityOption)
  const paymentCode = option?.paymentCode
    ?? LEGACY_COVERAGE_TYPE_TO_PAYMENT_CODE[identityOption]
    ?? (PAYMENT_CATEGORY_DISPLAYS[identityOption] ? identityOption : '4')

  return {
    coding: [paymentCategoryCoding(paymentCode)],
    text: identityText
  }
}

const ICD10_CM_SYSTEM = 'http://hl7.org/fhir/sid/icd-10-cm'
const ICD10_SYSTEM = 'http://hl7.org/fhir/sid/icd-10'

export function resolveIcd10CmDisplay(code: string, fallback?: string): string {
  return ICD10_CM_TW_DISPLAYS[code] ?? ICD10_CM_DISPLAYS[code] ?? fallback ?? code
}

export function normalizeConditionCodeForEmr(code: fhir4.CodeableConcept | undefined): fhir4.CodeableConcept | undefined {
  if (!code) return code

  const twIcd10 = code.coding?.find((item) => item.system === ICD10_CM_TW_SYSTEM)
  const icd10Cm = code.coding?.find((item) => item.system === ICD10_CM_SYSTEM)
  const icd10 = code.coding?.find((item) => item.system === ICD10_SYSTEM)
  const source = twIcd10 ?? icd10Cm ?? icd10
  if (!source?.code) return code

  const canonicalDisplay = ICD10_CM_TW_DISPLAYS[source.code]
    ?? ICD10_CM_DISPLAYS[source.code]
    ?? source.display
    ?? code.text
    ?? source.code
  return {
    text: code.text ?? canonicalDisplay,
    coding: [{
      system: ICD10_CM_TW_SYSTEM,
      code: source.code,
      display: canonicalDisplay
    }]
  }
}

/** @deprecated Prefer normalizeConditionCodeForEmr for TW EMR bundles. */
export function appendIcd10CmCoding(code: fhir4.CodeableConcept | undefined): fhir4.CodeableConcept | undefined {
  return normalizeConditionCodeForEmr(code)
}

export function encounterCaseTypeCoding(classCode: string | undefined): fhir4.Coding {
  switch ((classCode ?? 'AMB').toUpperCase()) {
    case 'EMER':
      return { system: TW_CASE_TYPE_SYSTEM, code: '02', display: CASE_TYPE_DISPLAYS['02'] }
    case 'IMP':
      return { system: TW_CASE_TYPE_SYSTEM, code: '1', display: CASE_TYPE_DISPLAYS['1'] }
    case 'AMB':
    default:
      return { system: TW_CASE_TYPE_SYSTEM, code: '01', display: CASE_TYPE_DISPLAYS['01'] }
  }
}

export function medicationRequestCategoryCoding(durationDays?: number): fhir4.Coding {
  // IG example uses code A for ≤7-day outpatient prescriptions; B for chronic/longer regimens.
  const code = (durationDays ?? 0) > 7 ? 'B' : 'A'
  return {
    system: TW_PRESCRIPTION_CATEGORY_SYSTEM,
    code,
    display: PRESCRIPTION_CATEGORY_DISPLAYS[code]
  }
}

export type BundleAssemblyMode = 'submit' | 'export'

/**
 * Use server-absolute fullUrls + ResourceType/id references whenever a FHIR base
 * URL is configured (HAPI, TW conference, etc.). IG Bundle-EP examples follow this
 * pattern. `export` (urn:uuid everywhere) is only for offline/self-contained use.
 */
export function resolveBundleAssemblyMode(serverBaseUrl?: string): BundleAssemblyMode {
  const base = (serverBaseUrl ?? '').trim()
  return base ? 'submit' : 'export'
}

export function resolveEmrProfile(resource: fhir4.Resource): string | undefined {
  switch (resource.resourceType) {
    case 'Bundle':
      return EMR_PROFILES.bundle
    case 'Composition':
      return EMR_PROFILES.composition
    case 'Organization':
      return EMR_PROFILES.organization
    case 'Patient':
      return EMR_PROFILES.patient
    case 'Practitioner':
      return EMR_PROFILES.practitioner
    case 'Encounter':
      return EMR_PROFILES.encounter
    case 'Condition':
      return EMR_PROFILES.condition
    case 'Observation': {
      const observation = resource as fhir4.Observation
      const isBodyWeight = observation.code?.coding?.some((coding) => (
        coding.system === 'http://loinc.org' && coding.code === '29463-7'
      ))
      return isBodyWeight ? EMR_PROFILES.observationBodyWeight : EMR_PROFILES.observation
    }
    case 'Coverage':
      return EMR_PROFILES.coverage
    case 'Medication':
      return EMR_PROFILES.medication
    case 'MedicationRequest':
      return EMR_PROFILES.medicationRequest
    default:
      return undefined
  }
}

export function ensureEmrProfile<T extends fhir4.Resource>(resource: T): T {
  const profile = resolveEmrProfile(resource)
  if (!profile) return resource

  if (!resource.meta) resource.meta = {}
  if (!resource.meta.profile?.includes(profile)) {
    resource.meta.profile = [profile]
  }
  return resource
}

export function normalizePatientMedicalRecordIdentifier(patient: fhir4.Patient): fhir4.Patient {
  const identifiers = patient.identifier ?? []
  if (!identifiers.length) return patient

  const mrIdentifiers = identifiers.filter((identifier) => (
    identifier.type?.coding?.some((coding) => (
      coding.system === MR_IDENTIFIER_TYPE_SYSTEM && coding.code === 'MR'
    ))
  ))

  if (mrIdentifiers.length > 1) {
    const preferred = mrIdentifiers.find((identifier) => identifier.system === PATIENT_MEDICAL_RECORD_SYSTEM)
      ?? mrIdentifiers[0]
    patient.identifier = [preferred]
    return patient
  }

  if (mrIdentifiers.length === 1) {
    patient.identifier = [mrIdentifiers[0]]
    return patient
  }

  // Legacy patients may carry a single untyped identifier — normalize to MR.
  if (identifiers.length >= 1) {
    const legacy = identifiers[0]
    patient.identifier = [{
      ...legacy,
      use: legacy.use ?? 'official',
      type: {
        coding: [{
          system: MR_IDENTIFIER_TYPE_SYSTEM,
          code: 'MR',
          display: 'Medical record number'
        }]
      }
    }]
  }

  return patient
}

export function resolveCoverageIdentityOption(coverage?: fhir4.Coverage): CoverageIdentityOption {
  if (!coverage?.type) return 'nhi'

  const legacyCode = coverage.type.coding?.find((coding) => coding.system === LEGACY_COVERAGE_TYPE_SYSTEM)?.code
  if (legacyCode === 'PAY') return 'selfpay'
  if (legacyCode === 'PUBLICPOL') return 'public'
  if (legacyCode === 'EHCPOL') return 'nhi'

  const paymentCode = coverage.type.coding?.find((coding) => coding.system === TW_PAYMENT_CATEGORY_SYSTEM)?.code
    ?? coverage.type.coding?.[0]?.code
  if (paymentCode === '3') return 'injury'
  if (paymentCode === '1') return 'occupational'

  const text = coverage.type.text?.toLowerCase() ?? ''
  if (text.includes('自費') || text.includes('self-pay')) return 'selfpay'
  if (text.includes('公務') || text.includes('public')) return 'public'
  return 'nhi'
}

export function normalizeCoveragePaymentCategory(coverage: fhir4.Coverage): fhir4.Coverage {
  if (!coverage.type) return coverage

  const legacyCoding = coverage.type.coding?.find((coding) => coding.system === LEGACY_COVERAGE_TYPE_SYSTEM)
  if (legacyCoding?.code && LEGACY_COVERAGE_TYPE_TO_PAYMENT_CODE[legacyCoding.code]) {
    const paymentCode = LEGACY_COVERAGE_TYPE_TO_PAYMENT_CODE[legacyCoding.code]
    coverage.type = {
      coding: [paymentCategoryCoding(paymentCode)],
      text: coverage.type.text
    }
    return coverage
  }

  const paymentCoding = coverage.type.coding?.find((coding) => (
    coding.system === TW_PAYMENT_CATEGORY_SYSTEM
    || coding.system === 'https://nhicore.nhi.gov.tw/empd/CodeSystem/PaymentCategory'
    || (coding.code && PAYMENT_CATEGORY_DISPLAYS[coding.code] !== undefined)
  ))

  if (paymentCoding?.code) {
    coverage.type = {
      ...coverage.type,
      coding: [paymentCategoryCoding(paymentCoding.code)]
    }
  }

  return coverage
}
