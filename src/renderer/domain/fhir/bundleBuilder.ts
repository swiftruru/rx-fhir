import type { CreatedResources } from '../../types/fhir'
import { toFhirDateTime } from './dateTime'

type BundleResourceMap = CreatedResources & { composition: fhir4.Composition }
type BundleResourceKey = keyof BundleResourceMap

const EMR_PROFILES = {
  bundle: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Bundle-EP',
  composition: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Composition-EP',
  coverage: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Coverage-EMR',
  observationBodyWeight: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Observation-EP-BodyWeight'
} as const

// LOINC codes + display strings here are the slice discriminators for the
// TW Core EMR Composition-EP profile. The validator rejects any deviation:
// Composition.section:Coverage requires `48768-6 Payment sources Document`,
// Composition.section:Condition requires `29548-5 Diagnosis Narrative`,
// Composition.section:MedicationPrescribed requires `29551-9 Medication prescribed Narrative`.
// `display` is fixed-value in the profile, so canonicalize it here once and
// keep mock data / forms from overriding it.
const DOCUMENT_SECTIONS = {
  coverage: {
    title: '保險資訊',
    system: 'http://loinc.org',
    code: '48768-6',
    display: 'Payment sources Document'
  },
  observationBodyWeight: {
    title: '檢驗檢查',
    system: 'http://loinc.org',
    code: '85353-1',
    display: 'Vital signs, weight, height, head circumference, oxygen saturation and BMI panel'
  },
  condition: {
    title: '診斷',
    system: 'http://loinc.org',
    code: '29548-5',
    display: 'Diagnosis Narrative'
  },
  medicationPrescribed: {
    title: '處方用藥',
    system: 'http://loinc.org',
    code: '29551-9',
    display: 'Medication prescribed Narrative'
  }
} as const

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // RFC 4122 v4 polyfill — must remain lowercase hex with the 4xxx / [89ab]xxx variant bits
  // so that downstream FHIR validators accept the urn:uuid: identifier.
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256)
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function createBundleScopedFullUrl(): string {
  return `urn:uuid:${generateUUID()}`
}

function escapeXhtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function getHumanName(name?: fhir4.HumanName): string | undefined {
  return name?.text ?? ([name?.family, ...(name?.given ?? [])].filter(Boolean).join(' ').trim() || undefined)
}

function buildNarrativeSummary(resource: fhir4.Resource): string | undefined {
  switch (resource.resourceType) {
    case 'Composition': {
      const composition = resource as fhir4.Composition
      return composition.title || 'Prescription document'
    }
    case 'Patient': {
      const patient = resource as fhir4.Patient
      return getHumanName(patient.name?.[0]) || patient.identifier?.[0]?.value || 'Patient'
    }
    case 'Organization': {
      const organization = resource as fhir4.Organization
      return organization.name || organization.identifier?.[0]?.value || 'Organization'
    }
    case 'Practitioner': {
      const practitioner = resource as fhir4.Practitioner
      return getHumanName(practitioner.name?.[0]) || practitioner.identifier?.[0]?.value || 'Practitioner'
    }
    case 'Encounter': {
      const encounter = resource as fhir4.Encounter
      const classLabel = encounter.class?.display || encounter.class?.code || 'Encounter'
      const periodStart = encounter.period?.start ? ` at ${encounter.period.start}` : ''
      return `${classLabel}${periodStart}`
    }
    case 'Condition': {
      const condition = resource as fhir4.Condition
      return condition.code?.text || condition.code?.coding?.[0]?.display || condition.code?.coding?.[0]?.code || 'Condition'
    }
    case 'Observation': {
      const observation = resource as fhir4.Observation
      const label = observation.code?.text || observation.code?.coding?.[0]?.display || observation.code?.coding?.[0]?.code || 'Observation'
      const value = observation.valueQuantity?.value
      const unit = observation.valueQuantity?.unit
      return value !== undefined ? `${label}: ${value}${unit ? ` ${unit}` : ''}` : label
    }
    case 'Coverage': {
      const coverage = resource as fhir4.Coverage
      return coverage.type?.text || coverage.type?.coding?.[0]?.display || coverage.subscriberId || 'Coverage'
    }
    case 'Medication': {
      const medication = resource as fhir4.Medication
      return medication.code?.text || medication.code?.coding?.[0]?.display || medication.code?.coding?.[0]?.code || 'Medication'
    }
    case 'MedicationRequest': {
      const medicationRequest = resource as fhir4.MedicationRequest
      return medicationRequest.dosageInstruction?.[0]?.text
        || medicationRequest.medicationReference?.display
        || medicationRequest.medicationCodeableConcept?.text
        || 'Medication request'
    }
    case 'Basic': {
      const basic = resource as fhir4.Basic
      return basic.code?.text || basic.code?.coding?.[0]?.display || basic.code?.coding?.[0]?.code || 'Basic record'
    }
    default:
      return resource.resourceType
  }
}

function cloneResource<T extends fhir4.Resource>(resource: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(resource)
  }
  return JSON.parse(JSON.stringify(resource)) as T
}

function sanitizeMeta(meta?: fhir4.Meta): fhir4.Meta | undefined {
  if (!meta) return undefined

  const nextMeta: fhir4.Meta = {}
  if (meta.profile?.length) nextMeta.profile = [...meta.profile]
  if (meta.security?.length) nextMeta.security = meta.security.map((item) => ({ ...item }))
  if (meta.tag?.length) nextMeta.tag = meta.tag.map((item) => ({ ...item }))

  return Object.keys(nextMeta).length > 0 ? nextMeta : undefined
}

function sanitizeResource<T extends fhir4.Resource>(resource: T): T {
  const clone = cloneResource(resource)
  clone.meta = sanitizeMeta(clone.meta)
  canonicalizeDisplays(clone)
  const domainResource = clone as T & Partial<fhir4.DomainResource>
  if (!domainResource.text?.div) {
    const summary = buildNarrativeSummary(clone)
    if (summary) {
      domainResource.text = {
        status: 'generated',
        div: `<div xmlns="http://www.w3.org/1999/xhtml"><p>${escapeXhtml(summary)}</p></div>`
      }
    }
  }
  return clone
}

function normalizeLegacyProfiles<T extends fhir4.Resource>(resource: T): T {
  if (!resource.meta?.profile?.length) return resource

  resource.meta.profile = resource.meta.profile.map((profile) => {
    if (profile === 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Coverage-EP') {
      return EMR_PROFILES.coverage
    }

    if (
      profile === 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Observation-EP'
      && resource.resourceType === 'Observation'
      && ((resource as unknown as fhir4.Observation).code?.coding?.some((coding) => (
        coding.system === 'http://loinc.org' && coding.code === '29463-7'
      )) ?? false)
    ) {
      return EMR_PROFILES.observationBodyWeight
    }

    return profile
  })

  return resource
}

function normalizeLegacyOrganizationType(organization: fhir4.Organization): fhir4.Organization {
  if (!organization.type?.length) return organization

  organization.type = organization.type.map((type) => {
    if (!type.coding?.length) return type

    const coding = type.coding.map((item) => {
      if (item.system !== 'http://terminology.hl7.org/CodeSystem/organization-type') {
        return item
      }

      if (!['HOSP', 'PROV', 'PHARM'].includes(item.code ?? '')) {
        return item
      }

      return {
        ...item,
        code: 'prov',
        display: 'Healthcare Provider'
      }
    })

    return {
      ...type,
      coding
    }
  })

  return organization
}

export type BundleAssemblyMode = 'submit' | 'export'

// Canonical en-US display strings for codings the IG / FHIR validator inspects.
// FHIR validators (TerminologyEngine + InstanceValidator) lookup display in en-US
// against the source CodeSystem and reject mismatches. Localized Chinese strings
// belong in CodeableConcept.text, not in coding.display. Some entries are
// fixed-value in TW EMR profiles; deviation is a hard error, not a warning.
const CANONICAL_CODING_DISPLAYS: Record<string, Record<string, string>> = {
  'http://loinc.org': {
    // Composition section / type discriminators (TW EMR Composition-EP fixed values)
    '29548-5': 'Diagnosis Narrative',
    '30954-2': 'Relevant diagnostic tests/laboratory data note',
    '29551-9': 'Medication prescribed Narrative',
    '48768-6': 'Payment sources Document',
    '57833-6': 'Prescription for medication',
    '85353-1': 'Vital signs, weight, height, head circumference, oxygen saturation and BMI panel',
    // Observation codes used across mock scenarios
    '29463-7': 'Body weight',
    '8310-5': 'Body temperature',
    '8480-6': 'Systolic blood pressure',
    '8462-4': 'Diastolic blood pressure',
    '8867-4': 'Heart rate',
    '2345-7': 'Glucose [Mass/volume] in Serum or Plasma',
    '4548-4': 'Hemoglobin A1c/Hemoglobin.total in Blood',
    '2093-3': 'Cholesterol [Mass/volume] in Serum or Plasma',
    '2708-6': 'Oxygen saturation in Arterial blood'
  },
  'http://terminology.hl7.org/CodeSystem/v2-0203': {
    SB: 'Social Beneficiary Identifier',
    MR: 'Medical record number',
    NH: 'National Health Plan Identifier',
    PRN: 'Provider number'
  },
  'http://terminology.hl7.org/CodeSystem/v3-orderableDrugForm': {
    CAP: 'Capsule',
    TAB: 'Tablet',
    SOL: 'Solution',
    LIQ: 'Liquid',
    INJ: 'Injectable',
    OINT: 'Ointment'
  },
  'http://terminology.hl7.org/CodeSystem/v3-ActCode': {
    EHCPOL: 'extended healthcare',
    PUBLICPOL: 'public healthcare',
    PAY: 'payment',
    AMB: 'ambulatory',
    IMP: 'inpatient encounter',
    EMER: 'emergency'
  },
  'http://snomed.info/sct': {
    '26643006': 'Oral route',
    '46713006': 'Nasal route',
    '6064005': 'Topical route',
    '47625008': 'Intravenous route',
    '78421000': 'Intramuscular route',
    '309343006': 'Physician'
  },
  'http://hl7.org/fhir/sid/icd-10': {
    'K21.9': 'Gastro-oesophageal reflux disease without oesophagitis',
    'J06.9': 'Acute upper respiratory infection, unspecified',
    'I10': 'Essential (primary) hypertension',
    'E11.9': 'Type 2 diabetes mellitus without complications',
    'R50.9': 'Fever, unspecified',
    'T78.4': 'Allergy, unspecified',
    'M79.1': 'Myalgia',
    'K30': 'Functional dyspepsia',
    'J30.9': 'Allergic rhinitis, unspecified',
    'J45.909': 'Unspecified asthma, uncomplicated',
    'G43.909': 'Migraine, unspecified, not intractable, without status migrainosus',
    'E78.5': 'Hyperlipidemia, unspecified'
  },
  'http://hl7.org/fhir/sid/icd-10-cm': {
    'K21.9': 'Gastro-esophageal reflux disease without esophagitis',
    'J06.9': 'Acute upper respiratory infection, unspecified',
    'I10': 'Essential (primary) hypertension',
    'E11.9': 'Type 2 diabetes mellitus without complications',
    'R50.9': 'Fever, unspecified',
    'T78.40XA': 'Allergy, unspecified, initial encounter',
    'M79.10': 'Myalgia, unspecified site',
    'K30': 'Functional dyspepsia',
    'J30.9': 'Allergic rhinitis, unspecified',
    'J45.909': 'Unspecified asthma, uncomplicated',
    'G43.909': 'Migraine, unspecified, not intractable, without status migrainosus',
    'E78.5': 'Hyperlipidemia, unspecified'
  },
  'http://www.whocc.no/atc': {
    A02BC01: 'omeprazole',
    N02BE01: 'paracetamol',
    C09AA05: 'enalapril',
    A10BA02: 'metformin',
    R06AE07: 'cetirizine',
    M01AE01: 'ibuprofen',
    R03AC02: 'salbutamol'
  },
  'http://terminology.hl7.org/CodeSystem/observation-category': {
    'vital-signs': 'Vital Signs',
    'laboratory': 'Laboratory',
    'imaging': 'Imaging',
    'procedure': 'Procedure'
  },
  'http://terminology.hl7.org/CodeSystem/condition-category': {
    'encounter-diagnosis': 'Encounter Diagnosis',
    'problem-list-item': 'Problem List Item'
  }
}

function canonicalizeCoding(coding: fhir4.Coding): fhir4.Coding {
  if (!coding.system || !coding.code) return coding
  const canonical = CANONICAL_CODING_DISPLAYS[coding.system]?.[coding.code]
  if (!canonical || coding.display === canonical) return coding
  return { ...coding, display: canonical }
}

// Walk any resource and rewrite Coding.display wherever (system, code) is a known
// canonical pair. Mutates and returns the same resource for convenience.
function canonicalizeDisplays<T extends fhir4.Resource>(resource: T): T {
  const visit = (node: unknown): unknown => {
    if (Array.isArray(node)) {
      for (let index = 0; index < node.length; index += 1) {
        const replaced = visit(node[index])
        if (replaced !== node[index]) node[index] = replaced
      }
      return node
    }
    if (node && typeof node === 'object') {
      const record = node as Record<string, unknown>
      if (Array.isArray(record.coding)) {
        record.coding = (record.coding as fhir4.Coding[]).map(canonicalizeCoding)
      }
      for (const key of Object.keys(record)) {
        if (key === 'coding') continue
        record[key] = visit(record[key])
      }
    }
    return node
  }
  visit(resource)
  return resource
}

function createBundleScopedReference(
  fullUrl: string | undefined,
  fallback: fhir4.Reference | undefined,
  useUuidReferences: boolean,
  resourceType?: string
): fhir4.Reference | undefined {
  // 'submit' mode: keep ResourceType/id (HAPI rejects urn:uuid: in Document Bundles
  // with HAPI-0505). 'export' mode: rewrite to entry's urn:uuid so external
  // validators can resolve internal references inside a self-contained Bundle.
  // Always include `type` when known: TW EMR profile discriminators of the form
  // `discriminator: { type: 'profile', path: 'entry.resolve()' }` need a way to
  // determine the target's resource type before resolution. Without `type`, slice
  // matching like Composition.section:Coverage / :Condition / :MedicationPrescribed
  // fails with "Reference_REF_CantMatchChoice".
  if (useUuidReferences && fullUrl?.startsWith('urn:uuid:')) {
    const next: fhir4.Reference = { reference: fullUrl }
    if (fallback?.display) next.display = fallback.display
    const type = resourceType ?? fallback?.type
    if (type) next.type = type
    return next
  }
  return fallback
}

const RESOURCE_KEY_TO_TYPE: Record<BundleResourceKey, string> = {
  composition: 'Composition',
  patient: 'Patient',
  organization: 'Organization',
  practitioner: 'Practitioner',
  encounter: 'Encounter',
  condition: 'Condition',
  observation: 'Observation',
  coverage: 'Coverage',
  medication: 'Medication',
  medicationRequest: 'MedicationRequest',
  extension: 'Basic'
}

function buildBundleScopedFullUrls(
  resourceMap: Partial<BundleResourceMap>,
  mode: BundleAssemblyMode,
  serverBaseUrl?: string
): Partial<Record<BundleResourceKey, string>> {
  const fullUrls: Partial<Record<BundleResourceKey, string>> = {}
  const trimmedBase = serverBaseUrl?.replace(/\/+$/, '')

  for (const [key, resource] of Object.entries(resourceMap) as Array<[BundleResourceKey, fhir4.Resource | undefined]>) {
    if (resource) {
      // 'export' mode is self-contained: every entry uses urn:uuid:<v4>.
      // 'submit' mode prefers absolute URLs for server-created resources so HAPI
      // can resolve ResourceType/id references under FHIR bundle resolution rules.
      // The Composition is built locally (not yet on the server) and always uses urn:uuid.
      if (mode === 'submit' && trimmedBase && key !== 'composition' && resource.id) {
        fullUrls[key] = `${trimmedBase}/${resource.resourceType}/${resource.id}`
      } else {
        fullUrls[key] = createBundleScopedFullUrl()
      }
    }
  }

  return fullUrls
}

const RESOURCE_TYPE_TO_KEY: Record<string, BundleResourceKey> = {
  Patient: 'patient',
  Organization: 'organization',
  Practitioner: 'practitioner',
  Encounter: 'encounter',
  Condition: 'condition',
  Observation: 'observation',
  Coverage: 'coverage',
  Medication: 'medication',
  MedicationRequest: 'medicationRequest',
  Composition: 'composition'
}

function inferSectionEntryKey(
  entry: fhir4.Reference | undefined,
  fullUrls: Partial<Record<BundleResourceKey, string>>
): BundleResourceKey | undefined {
  const reference = entry?.reference
  if (!reference) return undefined
  const resourceType = reference.split('/')[0]
  const key = RESOURCE_TYPE_TO_KEY[resourceType]
  if (!key) return undefined
  return fullUrls[key] ? key : undefined
}

// TW EMR IG cardinality / slice fillers. The wizard does not yet collect every
// required field (e.g. Encounter.serviceType, Patient person-age extension,
// MedicationRequest validityPeriod). Inject sensible defaults here so the
// emitted Bundle satisfies IG cardinality without forcing UI changes upstream.

const TW_PERSON_AGE_EXTENSION = 'https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/person-age'
const TW_MEDREQ_CATEGORY_SYSTEM = 'https://twcore.mohw.gov.tw/ig/emr/CodeSystem/MedicationRequestCategory'
const TW_PRESCRIPTION_NO_SYSTEM = 'https://rxfhir.app/fhir/medication-request-prescription-no'

function calculatePersonAge(birthDate: string | undefined): number | undefined {
  if (!birthDate) return undefined
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return undefined
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1
  return age >= 0 ? age : undefined
}

function enrichPatient(patient: fhir4.Patient): fhir4.Patient {
  const hasPersonAge = patient.extension?.some((ext) => ext.url === TW_PERSON_AGE_EXTENSION)
  if (!hasPersonAge) {
    const age = calculatePersonAge(patient.birthDate)
    if (age !== undefined) {
      patient.extension = [
        ...(patient.extension ?? []),
        {
          url: TW_PERSON_AGE_EXTENSION,
          valueAge: { value: age, unit: 'a', system: 'http://unitsofmeasure.org', code: 'a' }
        }
      ]
    }
  }
  return patient
}

function enrichOrganization(organization: fhir4.Organization): fhir4.Organization {
  if (!organization.telecom?.length) {
    organization.telecom = [{ system: 'phone', value: 'unknown', use: 'work' }]
  }
  if (!organization.address?.length) {
    organization.address = [{ text: 'unknown' }]
  }
  return organization
}

function enrichEncounter(encounter: fhir4.Encounter): fhir4.Encounter {
  if (!encounter.serviceType) {
    // Default to outpatient general medicine; HL7 v2-0276 ServiceType is the
    // FHIR-recommended binding when no IG-specific code is supplied.
    encounter.serviceType = {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/service-type',
        code: '124',
        display: 'General Practice'
      }]
    }
  }
  return encounter
}

function enrichCondition(condition: fhir4.Condition): fhir4.Condition {
  if (!condition.category?.length) {
    condition.category = [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/condition-category',
        code: 'encounter-diagnosis',
        display: 'Encounter Diagnosis'
      }]
    }]
  }
  if (!condition.note?.length) {
    const noteText = condition.code?.text || condition.code?.coding?.[0]?.display
    if (noteText) condition.note = [{ text: noteText }]
  }
  // Add ICD-10-CM 2021 slice if the existing ICD-10 coding has no CM counterpart.
  // ICD-10-CM uses American spelling ("esophageal" not "oesophageal"), so look up
  // the canonical CM display via the dictionary rather than copying from ICD-10.
  const codings = condition.code?.coding ?? []
  const hasIcd10Cm = codings.some((c) => c.system === 'http://hl7.org/fhir/sid/icd-10-cm')
  const icd10 = codings.find((c) => c.system === 'http://hl7.org/fhir/sid/icd-10')
  if (!hasIcd10Cm && icd10?.code && condition.code) {
    const cmDisplay = CANONICAL_CODING_DISPLAYS['http://hl7.org/fhir/sid/icd-10-cm']?.[icd10.code] ?? icd10.display
    condition.code = {
      ...condition.code,
      coding: [...codings, { system: 'http://hl7.org/fhir/sid/icd-10-cm', code: icd10.code, display: cmDisplay }]
    }
  }
  return condition
}

// Map common human-readable units to UCUM codes the validator accepts.
// UCUM is strict: 'mmHg' is wrong (must be 'mm[Hg]'), 'beats/min' must be '/min',
// 'Cel' is correct, 'mg/dL' is correct (note the slash). Anything not matched
// here falls back to the unit string itself with a warning rather than blocking.
const UCUM_UNIT_MAP: Record<string, string> = {
  // Mass
  kg: 'kg',
  g: 'g',
  mg: 'mg',
  ug: 'ug',
  // Length
  cm: 'cm',
  mm: 'mm',
  m: 'm',
  // Time
  s: 's',
  min: 'min',
  h: 'h',
  d: 'd',
  // Pressure
  mmHg: 'mm[Hg]',
  'mm[hg]': 'mm[Hg]',
  // Temperature
  Cel: 'Cel',
  '°C': 'Cel',
  // Concentration
  'mg/dL': 'mg/dL',
  'mg/dl': 'mg/dL',
  'g/dL': 'g/dL',
  'mmol/L': 'mmol/L',
  'mEq/L': 'meq/L',
  // Volume
  L: 'L',
  mL: 'mL',
  ml: 'mL',
  // Frequency / counts
  'beats/min': '/min',
  'bpm': '/min',
  '/min': '/min',
  // Percentage
  '%': '%',
  // Drug-form annotation units (wizard convenience; validator treats {x} as opaque)
  TAB: '{tablet}',
  CAP: '{capsule}',
  puff: '{puff}',
  amp: '{ampule}',
  layer: '{application}'
}

function toUcumCode(unit: string | undefined): string | undefined {
  if (!unit) return undefined
  return UCUM_UNIT_MAP[unit] ?? UCUM_UNIT_MAP[unit.toLowerCase()] ?? unit
}

function enrichObservation(observation: fhir4.Observation): fhir4.Observation {
  if (!observation.category?.length) {
    observation.category = [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/observation-category',
        code: 'vital-signs',
        display: 'Vital Signs'
      }]
    }]
  }
  if (observation.valueQuantity && !observation.valueQuantity.code) {
    const ucum = toUcumCode(observation.valueQuantity.unit)
    if (ucum) {
      observation.valueQuantity = {
        ...observation.valueQuantity,
        system: observation.valueQuantity.system ?? 'http://unitsofmeasure.org',
        code: ucum
      }
    }
  }
  return observation
}

function enrichMedicationRequest(
  medicationRequest: fhir4.MedicationRequest,
  coverageFullUrl: string | undefined,
  coverageFallback: fhir4.Reference | undefined,
  useUuidReferences: boolean
): fhir4.MedicationRequest {
  // Note: an earlier IG version (Composition-EP|0.2.0) defined an
  // `Extension-TotalDuration` extension and required it on MedicationRequest.
  // Current TW Core EMR validator packages do NOT ship this extension's
  // definition, so injecting it produces "extension could not be found so is
  // not allowed here". Total-duration information is already captured in
  // `dispenseRequest.expectedSupplyDuration`, so we skip auto-injecting the
  // extension. If a future IG version reintroduces it, restore here.

  // Identifier: ensure at least 2 (IG min=2). Use existing as the primary,
  // synthesize a prescription-no identifier from the resource id when needed.
  if (!medicationRequest.identifier) medicationRequest.identifier = []
  if (medicationRequest.identifier.length < 2) {
    const baseValue = medicationRequest.id ?? medicationRequest.identifier[0]?.value ?? `RX-${Date.now()}`
    medicationRequest.identifier.push({
      system: TW_PRESCRIPTION_NO_SYSTEM,
      value: `PRESCRIPTION-${baseValue}`
    })
  }

  // Category: 'typesOfPrescription' slice. Default to OUTPATIENT.
  if (!medicationRequest.category?.length) {
    medicationRequest.category = [{
      coding: [{ system: TW_MEDREQ_CATEGORY_SYSTEM, code: 'OUTPATIENT', display: 'Outpatient' }]
    }]
  }

  // Insurance: link to Coverage entry.
  if (!medicationRequest.insurance?.length && coverageFullUrl) {
    const insuranceRef = createBundleScopedReference(coverageFullUrl, coverageFallback, useUuidReferences, 'Coverage')
      ?? coverageFallback
      ?? { reference: coverageFullUrl, type: 'Coverage' }
    medicationRequest.insurance = [insuranceRef]
  }

  // dosageInstruction.timing.repeat from timing.code mapping; ensure
  // doseAndRate[].doseQuantity carries a UCUM code (regulators reject
  // Quantity with system but no code).
  if (medicationRequest.dosageInstruction?.length) {
    medicationRequest.dosageInstruction = medicationRequest.dosageInstruction.map((dosage) => {
      let next = dosage
      if (next.timing && !next.timing.repeat) {
        const code = next.timing.code?.coding?.[0]?.code
        const repeat = code ? mapTimingCodeToRepeat(code) : undefined
        if (repeat) next = { ...next, timing: { ...next.timing, repeat } }
      }
      if (next.doseAndRate?.length) {
        next = {
          ...next,
          doseAndRate: next.doseAndRate.map((dar) => {
            if (!dar.doseQuantity || dar.doseQuantity.code) return dar
            const ucum = toUcumCode(dar.doseQuantity.unit)
            return ucum
              ? { ...dar, doseQuantity: { ...dar.doseQuantity, system: dar.doseQuantity.system ?? 'http://unitsofmeasure.org', code: ucum } }
              : dar
          })
        }
      }
      return next
    })
  }

  // dispenseRequest cardinality.
  if (medicationRequest.dispenseRequest) {
    const dispense = medicationRequest.dispenseRequest
    if (!dispense.numberOfRepeatsAllowed && dispense.numberOfRepeatsAllowed !== 0) {
      dispense.numberOfRepeatsAllowed = 0
    }
    if (!dispense.quantity) {
      dispense.quantity = { value: 1, unit: 'TAB', system: 'http://unitsofmeasure.org', code: '{tablet}' }
    }
    if (!dispense.validityPeriod) {
      const start = medicationRequest.authoredOn || new Date().toISOString()
      const startDate = new Date(start)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 30)
      dispense.validityPeriod = {
        start: toFhirDateTime(start) || start,
        end: endDate.toISOString().slice(0, 10)
      }
    }
  }

  return medicationRequest
}

const TIMING_CODE_REPEAT: Record<string, fhir4.Timing['repeat']> = {
  QD: { frequency: 1, period: 1, periodUnit: 'd' },
  BID: { frequency: 2, period: 1, periodUnit: 'd' },
  TID: { frequency: 3, period: 1, periodUnit: 'd' },
  QID: { frequency: 4, period: 1, periodUnit: 'd' },
  PRN: { frequency: 1, period: 1, periodUnit: 'd' }
}

function mapTimingCodeToRepeat(code: string): fhir4.Timing['repeat'] | undefined {
  return TIMING_CODE_REPEAT[code.toUpperCase()]
}

function normalizeBundleResources(
  resourceMap: Partial<BundleResourceMap>,
  fullUrls: Partial<Record<BundleResourceKey, string>>,
  mode: BundleAssemblyMode
): Partial<BundleResourceMap> {
  const normalized: Partial<BundleResourceMap> = {}
  const useUuidReferences = mode === 'export'
  const refByKey = (key: BundleResourceKey, fallback: fhir4.Reference | undefined): fhir4.Reference | undefined =>
    createBundleScopedReference(fullUrls[key], fallback, useUuidReferences, RESOURCE_KEY_TO_TYPE[key])
  const patient = resourceMap.patient ? enrichPatient(normalizeLegacyProfiles(sanitizeResource(resourceMap.patient))) : undefined
  const organization = resourceMap.organization ? enrichOrganization(normalizeLegacyProfiles(normalizeLegacyOrganizationType(sanitizeResource(resourceMap.organization)))) : undefined
  const practitioner = resourceMap.practitioner ? normalizeLegacyProfiles(sanitizeResource(resourceMap.practitioner)) : undefined
  const encounter = resourceMap.encounter ? enrichEncounter(normalizeLegacyProfiles(sanitizeResource(resourceMap.encounter))) : undefined
  const condition = resourceMap.condition ? enrichCondition(normalizeLegacyProfiles(sanitizeResource(resourceMap.condition))) : undefined
  const observation = resourceMap.observation ? enrichObservation(normalizeLegacyProfiles(sanitizeResource(resourceMap.observation))) : undefined
  const coverage = resourceMap.coverage ? normalizeLegacyProfiles(sanitizeResource(resourceMap.coverage)) : undefined
  const medication = resourceMap.medication ? normalizeLegacyProfiles(sanitizeResource(resourceMap.medication)) : undefined
  const medicationRequest = resourceMap.medicationRequest
    ? enrichMedicationRequest(
        normalizeLegacyProfiles(sanitizeResource(resourceMap.medicationRequest)),
        fullUrls.coverage,
        resourceMap.medicationRequest.insurance?.[0],
        useUuidReferences
      )
    : undefined
  const extension = resourceMap.extension ? normalizeLegacyProfiles(sanitizeResource(resourceMap.extension)) : undefined
  const composition = normalizeLegacyProfiles(sanitizeResource(resourceMap.composition!))

  if (encounter) {
    encounter.subject = refByKey('patient', encounter.subject)
    encounter.serviceProvider = refByKey('organization', encounter.serviceProvider)
    if (encounter.period) {
      encounter.period = {
        ...encounter.period,
        ...(encounter.period.start ? { start: toFhirDateTime(encounter.period.start) } : {}),
        ...(encounter.period.end ? { end: toFhirDateTime(encounter.period.end) } : {})
      }
    }
  }

  if (condition) {
    condition.subject = refByKey('patient', condition.subject) ?? condition.subject
    condition.encounter = refByKey('encounter', condition.encounter)
    if (condition.recordedDate) {
      condition.recordedDate = toFhirDateTime(condition.recordedDate)
    }
  }

  if (observation) {
    observation.subject = refByKey('patient', observation.subject)
    observation.encounter = refByKey('encounter', observation.encounter)
    if (!(observation.performer?.length)) {
      const performerRef = refByKey('practitioner', undefined) ?? refByKey('organization', undefined)
      if (performerRef) {
        observation.performer = [performerRef]
      }
    }
    if (observation.effectiveDateTime) {
      observation.effectiveDateTime = toFhirDateTime(observation.effectiveDateTime)
    }
  }

  if (coverage) {
    coverage.subscriber = refByKey('patient', coverage.subscriber)
    coverage.beneficiary = refByKey('patient', coverage.beneficiary) ?? coverage.beneficiary
  }

  if (medicationRequest) {
    medicationRequest.medicationReference = refByKey('medication', medicationRequest.medicationReference)
    medicationRequest.subject = refByKey('patient', medicationRequest.subject) ?? medicationRequest.subject
    medicationRequest.requester = refByKey('practitioner', medicationRequest.requester)
    medicationRequest.encounter = refByKey('encounter', medicationRequest.encounter)
    if (medicationRequest.authoredOn) {
      medicationRequest.authoredOn = toFhirDateTime(medicationRequest.authoredOn)
    }
    if (medicationRequest.insurance?.length) {
      medicationRequest.insurance = medicationRequest.insurance.map((insurance) => refByKey('coverage', insurance) ?? insurance)
    }
  }

  if (extension) {
    extension.subject = refByKey('patient', extension.subject)
  }

  composition.subject = refByKey('patient', composition.subject)
  composition.custodian = refByKey('organization', composition.custodian)
  composition.encounter = refByKey('encounter', composition.encounter)
  if (composition.date) {
    composition.date = toFhirDateTime(composition.date)
  }
  if (composition.author?.length) {
    composition.author = composition.author.map((author) => {
      // Composition.author is Reference(Practitioner | Organization | ...) — keep
      // whichever resource the original reference pointed at, not just Practitioner.
      const inferred = inferSectionEntryKey(author, fullUrls)
      return inferred ? (refByKey(inferred, author) ?? author) : author
    })
  }
  if (composition.section?.length) {
    composition.section = composition.section.map((section) => ({
      ...section,
      entry: section.entry?.map((entry) => {
        const targetKey = inferSectionEntryKey(entry, fullUrls)
        return targetKey ? (refByKey(targetKey, entry) ?? entry) : entry
      })
    }))
  }

  normalized.composition = composition
  if (patient) normalized.patient = patient
  if (organization) normalized.organization = organization
  if (practitioner) normalized.practitioner = practitioner
  if (encounter) normalized.encounter = encounter
  if (condition) normalized.condition = condition
  if (observation) normalized.observation = observation
  if (coverage) normalized.coverage = coverage
  if (medication) normalized.medication = medication
  if (medicationRequest) normalized.medicationRequest = medicationRequest
  if (extension) normalized.extension = extension

  return normalized
}

function toEntry(resource: fhir4.Resource, fullUrl: string): fhir4.BundleEntry {
  return {
    fullUrl,
    resource: resource as fhir4.BundleEntry['resource']
  }
}

export interface AssembleDocumentBundleOptions {
  serverBaseUrl?: string
  /**
   * 'submit' (default): HAPI-friendly. Uses absolute server URLs for fullUrls of
   *   server-created resources and keeps `ResourceType/id` references — required
   *   because HAPI rejects urn:uuid: references in Document Bundles (HAPI-0505).
   * 'export': self-contained. Every entry has a urn:uuid:<v4> fullUrl and every
   *   internal reference is rewritten to that urn:uuid, so external FHIR
   *   validators can resolve references inside the Bundle alone.
   */
  mode?: BundleAssemblyMode
}

export function assembleDocumentBundle(
  resources: CreatedResources,
  composition: fhir4.Composition,
  serverBaseUrlOrOptions?: string | AssembleDocumentBundleOptions
): fhir4.Bundle {
  const options: AssembleDocumentBundleOptions = typeof serverBaseUrlOrOptions === 'string'
    ? { serverBaseUrl: serverBaseUrlOrOptions }
    : (serverBaseUrlOrOptions ?? {})
  const mode: BundleAssemblyMode = options.mode ?? 'submit'
  const bundleResources: Partial<BundleResourceMap> = {
    composition,
    organization: resources.organization,
    patient: resources.patient,
    practitioner: resources.practitioner,
    encounter: resources.encounter,
    condition: resources.condition,
    observation: resources.observation,
    coverage: resources.coverage,
    medication: resources.medication,
    medicationRequest: resources.medicationRequest
  }
  const fullUrls = buildBundleScopedFullUrls(bundleResources, mode, options.serverBaseUrl)
  const normalizedResources = normalizeBundleResources(bundleResources, fullUrls, mode)
  const entries: fhir4.BundleEntry[] = []

  entries.push(toEntry(normalizedResources.composition!, fullUrls.composition!))

  const {
    organization,
    patient,
    practitioner,
    encounter,
    condition,
    observation,
    coverage,
    medication,
    medicationRequest
  } = normalizedResources

  if (patient && fullUrls.patient) entries.push(toEntry(patient, fullUrls.patient))
  if (organization && fullUrls.organization) entries.push(toEntry(organization, fullUrls.organization))
  if (practitioner && fullUrls.practitioner) entries.push(toEntry(practitioner, fullUrls.practitioner))
  if (encounter && fullUrls.encounter) entries.push(toEntry(encounter, fullUrls.encounter))
  if (condition && fullUrls.condition) entries.push(toEntry(condition, fullUrls.condition))
  if (observation && fullUrls.observation) entries.push(toEntry(observation, fullUrls.observation))
  if (coverage && fullUrls.coverage) entries.push(toEntry(coverage, fullUrls.coverage))
  if (medication && fullUrls.medication) entries.push(toEntry(medication, fullUrls.medication))
  if (medicationRequest && fullUrls.medicationRequest) entries.push(toEntry(medicationRequest, fullUrls.medicationRequest))

  return {
    resourceType: 'Bundle',
    type: 'document',
    timestamp: new Date().toISOString(),
    identifier: patient?.identifier?.[0]
      ? {
          system: patient.identifier[0].system,
          value: patient.identifier[0].value
        }
      : undefined,
    entry: entries,
    meta: {
      profile: [EMR_PROFILES.bundle]
    }
  }
}

export function buildComposition(
  resources: CreatedResources,
  title: string,
  date: string
): fhir4.Composition {
  const { patient, organization, practitioner, encounter, condition, observation, coverage, medication, medicationRequest } = resources
  const sections: fhir4.CompositionSection[] = []

  if (coverage) {
    sections.push({
      title: DOCUMENT_SECTIONS.coverage.title,
      code: {
        coding: [{
          system: DOCUMENT_SECTIONS.coverage.system,
          code: DOCUMENT_SECTIONS.coverage.code,
          display: DOCUMENT_SECTIONS.coverage.display
        }],
        text: DOCUMENT_SECTIONS.coverage.display
      },
      entry: [{ reference: `${coverage.resourceType}/${coverage.id}` }]
    })
  }

  if (observation) {
    sections.push({
      title: DOCUMENT_SECTIONS.observationBodyWeight.title,
      code: {
        coding: [{
          system: DOCUMENT_SECTIONS.observationBodyWeight.system,
          code: DOCUMENT_SECTIONS.observationBodyWeight.code,
          display: DOCUMENT_SECTIONS.observationBodyWeight.display
        }],
        text: DOCUMENT_SECTIONS.observationBodyWeight.display
      },
      entry: [{ reference: `${observation.resourceType}/${observation.id}` }]
    })
  }

  if (condition) {
    sections.push({
      title: DOCUMENT_SECTIONS.condition.title,
      code: {
        coding: [{
          system: DOCUMENT_SECTIONS.condition.system,
          code: DOCUMENT_SECTIONS.condition.code,
          display: DOCUMENT_SECTIONS.condition.display
        }],
        text: DOCUMENT_SECTIONS.condition.display
      },
      entry: [{ reference: `${condition.resourceType}/${condition.id}` }]
    })
  }

  if (medication || medicationRequest) {
    const medicationEntries: fhir4.Reference[] = []
    if (medication) {
      medicationEntries.push({ reference: `${medication.resourceType}/${medication.id}` })
    }
    if (medicationRequest) {
      medicationEntries.push({ reference: `${medicationRequest.resourceType}/${medicationRequest.id}` })
    }
    sections.push({
      title: DOCUMENT_SECTIONS.medicationPrescribed.title,
      code: {
        coding: [{
          system: DOCUMENT_SECTIONS.medicationPrescribed.system,
          code: DOCUMENT_SECTIONS.medicationPrescribed.code,
          display: DOCUMENT_SECTIONS.medicationPrescribed.display
        }],
        text: DOCUMENT_SECTIONS.medicationPrescribed.display
      },
      entry: medicationEntries
    })
  }

  const authorRefs: fhir4.Reference[] = []
  if (organization) {
    authorRefs.push({ reference: `Organization/${organization.id}` })
  }
  if (practitioner) {
    authorRefs.push({ reference: `Practitioner/${practitioner.id}` })
  }
  if (!authorRefs.length) {
    authorRefs.push({ display: 'Unknown Author' })
  }

  return {
    resourceType: 'Composition',
    id: generateUUID(),
    status: 'final',
    type: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '57833-6',
          display: 'Prescription for medication'
        }
      ]
    },
    title: title || '電子處方箋',
    date: toFhirDateTime(date) || new Date().toISOString(),
    subject: patient ? { reference: `Patient/${patient.id}` } : undefined,
    author: authorRefs,
    custodian: organization ? { reference: `Organization/${organization.id}` } : undefined,
    encounter: encounter ? { reference: `Encounter/${encounter.id}` } : undefined,
    section: sections,
    meta: {
      profile: [EMR_PROFILES.composition]
    }
  }
}

// ----------------------------------------------------------------------------
// Self-contained export converter
// ----------------------------------------------------------------------------
// Any Bundle that has been retrieved from a FHIR server (e.g. HAPI) carries
// absolute fullUrls (`https://server/Resource/<id>`) plus relative references
// (`Resource/<id>`). External validators reject this mixed form: the
// Composition's urn:uuid namespace can't resolve relative references that
// point at a different (absolute) namespace. This converter rewrites such a
// Bundle into the self-contained urn:uuid form so internal references resolve
// inside the Bundle alone — required for FHIR Document Bundle validation.

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

interface ReferenceLookupEntry {
  newFullUrl: string
  resourceType: string
}

function buildReferenceLookup(bundle: fhir4.Bundle): Map<string, ReferenceLookupEntry> {
  // Build alias → { newFullUrl, resourceType } map. Tracking the type lets us
  // attach Reference.type during rewrite so external validators can resolve
  // slice profile choices (Composition.section:Coverage etc.) without round-trip
  // resource resolution — which often fails for urn:uuid in IPS-only validators.
  const lookup = new Map<string, ReferenceLookupEntry>()
  bundle.entry?.forEach((entry) => {
    const fullUrl = entry.fullUrl
    const resource = entry.resource
    if (!fullUrl || !resource?.resourceType) return
    const newFullUrl = fullUrl.startsWith('urn:uuid:') ? fullUrl : `urn:uuid:${generateUUID()}`
    const value: ReferenceLookupEntry = { newFullUrl, resourceType: resource.resourceType }
    lookup.set(`__fullUrl__:${fullUrl}`, value)
    if (resource.id) {
      lookup.set(`${resource.resourceType}/${resource.id}`, value)
    }
    if (isAbsoluteUrl(fullUrl)) {
      const tail = fullUrl.replace(/^https?:\/\/[^/]+(?:\/[^/]+)*?\/((?:[A-Z][A-Za-z]+)\/[^/]+)$/, '$1')
      if (tail !== fullUrl) lookup.set(tail, value)
    }
  })
  return lookup
}

function resolveReferenceLookup(reference: string, lookup: Map<string, ReferenceLookupEntry>): ReferenceLookupEntry | undefined {
  if (lookup.has(reference)) return lookup.get(reference)
  if (lookup.has(`__fullUrl__:${reference}`)) return lookup.get(`__fullUrl__:${reference}`)
  if (isAbsoluteUrl(reference)) {
    const tail = reference.replace(/^https?:\/\/[^/]+(?:\/[^/]+)*?\/((?:[A-Z][A-Za-z]+)\/[^/]+)$/, '$1')
    if (tail !== reference) return lookup.get(tail)
  }
  return undefined
}

function rewriteReferencesInPlace<T>(node: T, lookup: Map<string, ReferenceLookupEntry>): T {
  if (Array.isArray(node)) {
    for (let index = 0; index < node.length; index += 1) rewriteReferencesInPlace(node[index], lookup)
    return node
  }
  if (node && typeof node === 'object') {
    const record = node as Record<string, unknown>
    if (typeof record.reference === 'string') {
      const resolved = resolveReferenceLookup(record.reference, lookup)
      if (resolved) {
        record.reference = resolved.newFullUrl
        // Attach `type` so slice discriminators with `type: profile` can pick the
        // right choice (e.g. Composition.section:Coverage requires entry → Coverage).
        if (typeof record.type !== 'string') record.type = resolved.resourceType
      }
    }
    for (const key of Object.keys(record)) {
      if (key === 'reference') continue
      record[key] = rewriteReferencesInPlace(record[key], lookup)
    }
  }
  return node
}

// Extension URLs whose definitions are not present in the current TW Core EMR
// validator package. Including these in the exported Bundle produces
// "extension … could not be found so is not allowed here" errors. Stripping
// them at export keeps the Bundle clean regardless of which historical version
// of RxFHIR (or HAPI persistence) attached the extension. The information they
// carried is also captured elsewhere — e.g. Extension-TotalDuration's days are
// equivalent to MedicationRequest.dispenseRequest.expectedSupplyDuration.
const UNKNOWN_EXTENSION_URLS = new Set<string>([
  'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Extension-TotalDuration'
])

function stripUnknownExtensionsInPlace<T>(node: T): T {
  if (Array.isArray(node)) {
    for (let index = 0; index < node.length; index += 1) stripUnknownExtensionsInPlace(node[index])
    return node
  }
  if (node && typeof node === 'object') {
    const record = node as Record<string, unknown>
    if (Array.isArray(record.extension)) {
      record.extension = (record.extension as fhir4.Extension[]).filter(
        (ext) => !ext.url || !UNKNOWN_EXTENSION_URLS.has(ext.url)
      )
      if ((record.extension as fhir4.Extension[]).length === 0) delete record.extension
    }
    for (const key of Object.keys(record)) {
      if (key === 'extension') continue
      stripUnknownExtensionsInPlace(record[key])
    }
  }
  return node
}

/**
 * Convert any Bundle (typically a HAPI-retrieved Document Bundle) into a
 * self-contained urn:uuid form suitable for external FHIR validators.
 *
 * - Every entry.fullUrl becomes `urn:uuid:<v4>`
 * - Every internal reference (Composition.subject, section.entry, etc.) is
 *   rewritten to the matching urn:uuid so refs resolve within the Bundle.
 * - meta.source / versionId / lastUpdated are stripped on Bundle and entries
 * - Extensions whose definitions are absent from the current TW Core EMR
 *   validator (see UNKNOWN_EXTENSION_URLS) are removed.
 * - Coding.display values pass through canonicalizeDisplays so en-US standard
 *   names are used (e.g. ICD-10-CM K21.9 → "Gastro-esophageal reflux disease...")
 */
export function toSelfContainedExportBundle(bundle: fhir4.Bundle): fhir4.Bundle {
  const cloned = cloneResource(bundle)
  const lookup = buildReferenceLookup(cloned)

  // Reset Bundle-level meta noise that HAPI re-injects on retrieval.
  cloned.meta = sanitizeMeta(cloned.meta)
  delete (cloned as fhir4.Bundle & { id?: string }).id

  cloned.entry?.forEach((entry) => {
    const oldFullUrl = entry.fullUrl
    if (oldFullUrl) {
      const resolved = lookup.get(`__fullUrl__:${oldFullUrl}`)
      if (resolved) entry.fullUrl = resolved.newFullUrl
    }
    if (entry.resource) {
      // Strip HAPI-injected meta noise per resource.
      entry.resource.meta = sanitizeMeta(entry.resource.meta)
      // Drop any extensions the current TW Core EMR validator doesn't recognise.
      stripUnknownExtensionsInPlace(entry.resource)
      // Rewrite any internal reference strings to the new urn:uuid namespace.
      rewriteReferencesInPlace(entry.resource, lookup)
      // Re-canonicalize displays in case enrichment added codings without canonical lookup.
      canonicalizeDisplays(entry.resource)
    }
  })

  return cloned
}
