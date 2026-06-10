/**
 * TW Core competition converter.
 *
 * Maps the FHIRfox-style problem JSON (a flat, simplified description of
 * patients / organizations / encounters / practitionerRoles / practitioners /
 * conditions) into TW Core (twcore) profiled FHIR resources and assembles a
 * Bundle that passes the **Gazelle/Prism competition validator**.
 *
 * Important: the Gazelle validator compares the submission against a canonical
 * gold answer and is much stricter than the FHIR server's $validate. The rules
 * below were derived from its error report for scenario TWCORE-OPD-001:
 *
 *  - Bundle.type = collection, Bundle.meta.profile = Bundle-twcore.
 *  - References are *logical* tokens `ResourceType/{system}|{value}` (matched by
 *    the target resource's identifier — or, for Condition, by its clinical code),
 *    NOT urn:uuid.
 *  - Patient national IDs use the MOI system `http://www.moi.gov.tw`.
 *  - Practitioner / PractitionerRole identifiers carry use=official + type MD.
 *  - Opaque competition codes map to standard codings via COMPETITION_CODE_MAP
 *    (e.g. Cond-0012 → SNOMED 363746003, serviceType 01 → service-type 124).
 *  - Encounter.participant.individual references the Practitioner (not the role)
 *    and carries the encounter period; reasonCode mirrors the condition's SNOMED.
 */

export const TWCORE_PROFILES = {
  bundle: 'https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/Bundle-twcore',
  patient: 'https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/Patient-twcore',
  organization: 'https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/Organization-twcore',
  encounter: 'https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/Encounter-twcore',
  condition: 'https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/Condition-twcore',
  practitioner: 'https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/Practitioner-twcore',
  practitionerRole: 'https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/PractitionerRole-twcore',
  allergyIntolerance: 'https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/AllergyIntolerance-twcore',
  observation: 'https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/Observation-vital-signs-twcore',
  observationLab: 'https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/Observation-laboratoryResult-twcore',
  procedure: 'https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/Procedure-twcore',
  diagnosticReport: 'https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/DiagnosticReport-twcore',
  medicationRequest: 'https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/MedicationRequest-twcore'
} as const

const SNOMED = 'http://snomed.info/sct'
const LOINC = 'http://loinc.org'
const UCUM = 'http://unitsofmeasure.org'
const SERVICE_TYPE = 'http://terminology.hl7.org/CodeSystem/service-type'
const ADMIT_SOURCE = 'http://terminology.hl7.org/CodeSystem/admit-source'
const DISCHARGE_DISPOSITION = 'http://terminology.hl7.org/CodeSystem/discharge-disposition'
const GTS_ABBREVIATION = 'http://terminology.hl7.org/CodeSystem/v3-GTSAbbreviation'
const OBSERVATION_CATEGORY = 'http://terminology.hl7.org/CodeSystem/observation-category'
const V2_0203 = 'http://terminology.hl7.org/CodeSystem/v2-0203'
const V2_0131 = 'http://terminology.hl7.org/CodeSystem/v2-0131'
const MOI = 'http://www.moi.gov.tw'

/**
 * Vital-sign competition code → its TW Core profile + LOINC coding(s). Each vital
 * sign has a dedicated profile (heart-rate, pulse-oximetry, …); oxygen saturation
 * carries TWO LOINC codes. Observations aren't referenced by other resources, so
 * they can't be auto-learned — extend this map by hand.
 */
const TWCORE_OBS = 'https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition'
const VITAL_SIGN_MAP: Record<string, { profile: string; codes: string[] }> = {
  'VS-0003': { profile: `${TWCORE_OBS}/Observation-body-weight-twcore`, codes: ['29463-7'] },
  'VS-0005': { profile: `${TWCORE_OBS}/Observation-body-temperature-twcore`, codes: ['8310-5'] },
  'VS-0006': { profile: `${TWCORE_OBS}/Observation-heart-rate-twcore`, codes: ['8867-4'] },
  'VS-0007': { profile: `${TWCORE_OBS}/Observation-respiratory-rate-twcore`, codes: ['9279-1'] },
  'VS-0008': { profile: `${TWCORE_OBS}/Observation-bloodPressure-twcore`, codes: ['85354-9'] },
  'VS-0012': { profile: `${TWCORE_OBS}/Observation-pulse-oximetry-twcore`, codes: ['2708-6', '59408-5'] }
}
/** LOINC component codes for the blood-pressure panel. */
const BP_SYSTOLIC = '8480-6'
const BP_DIASTOLIC = '8462-4'

const SYS = {
  orgType: 'http://terminology.hl7.org/CodeSystem/organization-type',
  actCode: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
  participationType: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
  diagnosisRole: 'http://terminology.hl7.org/CodeSystem/diagnosis-role',
  conditionClinical: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
  conditionVerStatus: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
  conditionCategory: 'http://terminology.hl7.org/CodeSystem/condition-category',
  snomed: SNOMED
} as const

const ENCOUNTER_CLASS_DISPLAY: Record<string, string> = {
  AMB: 'ambulatory',
  IMP: 'inpatient encounter',
  EMER: 'emergency',
  HH: 'home health',
  VR: 'virtual'
}

/**
 * Competition code → standard coding, seeded from the TWCORE-OPD-001 gold answer.
 * Extend this as new scenarios reveal more of the competition's code dictionary.
 * `system` is the target CodeSystem; lookups fall back to `.text` when a code is
 * not present here.
 */
const COMPETITION_CODE_MAP: Record<string, Record<string, { system: string; code: string }>> = {
  condition: {
    'Cond-0012': { system: SNOMED, code: '363746003' },
    'Cond-0014': { system: SNOMED, code: '10509002' },
    'Cond-0019': { system: SNOMED, code: '22298006' },
    'Cond-0022': { system: SNOMED, code: '49436004' },
    'Cond-0040': { system: SNOMED, code: '396275006' },
    'Cond-0050': { system: SNOMED, code: '44054006' },
    'Cond-0054': { system: SNOMED, code: '386661006' },
    'Cond-0056': { system: SNOMED, code: '65966004' }
  },
  serviceType: {
    '01': { system: SERVICE_TYPE, code: '124' },
    '10': { system: SERVICE_TYPE, code: '200' },
    emergency: { system: SERVICE_TYPE, code: '117' },
    cardiology: { system: SNOMED, code: '394579002' },
    endo: { system: SNOMED, code: '394583002' }
  },
  role: {
    'PR-0003': { system: SNOMED, code: '59058001' },
    'PR-0027': { system: SNOMED, code: '82296001' }
  },
  specialty: {
    'Spec-0001': { system: SNOMED, code: '419772000' },
    'Spec-0015': { system: SNOMED, code: '394583002' },
    'Spec-0045': { system: SNOMED, code: '24251000087109' }
  },
  qualification: { 'Qual-0001': { system: SNOMED, code: '158965000' } },
  allergy: {},
  procedure: { 'Proc-0012': { system: SNOMED, code: '77477000' } },
  procedureFunction: {
    'Perf-0001': { system: SNOMED, code: '405279007' },
    'Perf-0004': { system: SNOMED, code: '304292004' },
    'Perf-0014': { system: SNOMED, code: '66862007' }
  },
  bodySite: {
    chest: { system: SNOMED, code: '43799004' },
    head: { system: SNOMED, code: '69536005' },
    'coronary-artery': { system: SNOMED, code: '41801008' }
  },
  medication: {
    'Med-0036': { system: SNOMED, code: '373444002' },
    'Med-0025': { system: SNOMED, code: '7034005' },
    'Med-0040': { system: SNOMED, code: '386876001' },
    'Med-0038': { system: SNOMED, code: '386952008' },
    'Med-0032': { system: SNOMED, code: '386873009' },
    'Med-0035': { system: SNOMED, code: '387584000' },
    'Med-0047': { system: SNOMED, code: '384978002' },
    'Med-0054': { system: SNOMED, code: '372523007' },
    'Med-0053': { system: SNOMED, code: '387135004' }
  },
  labObservation: {
    'Lab-0001': { system: LOINC, code: '6690-2' },
    'Lab-0005': { system: LOINC, code: '777-3' },
    'Lab-0007': { system: LOINC, code: '14771-0' },
    'Lab-0008': { system: LOINC, code: '4548-4' },
    'Lab-0009': { system: LOINC, code: '2093-3' },
    'Lab-0012': { system: LOINC, code: '2089-1' },
    'Lab-0021': { system: LOINC, code: '1988-5' },
    'Lab-0027': { system: LOINC, code: '6301-6' }
  },
  diagnosticReport: {
    'Rep-0001': { system: LOINC, code: '57021-8' },
    'Rep-0002': { system: LOINC, code: '24331-1' },
    'Rep-0004': { system: LOINC, code: '4548-4' },
    'Rep-0005': { system: LOINC, code: '14771-0' }
  },
  route: {
    'Route-0001': { system: SNOMED, code: '26643006' },
    'Route-0004': { system: SNOMED, code: '34206005' }
  },
  timing: {
    'Tim-0001': { system: GTS_ABBREVIATION, code: 'QD' },
    'Tim-0002': { system: GTS_ABBREVIATION, code: 'BID' },
    'Tim-0010': { system: GTS_ABBREVIATION, code: 'PM' }
  }
}

function mapCode(category: keyof typeof COMPETITION_CODE_MAP, code?: string): { system: string; code: string } | undefined {
  if (!code) return undefined
  return COMPETITION_CODE_MAP[category]?.[code]
}

/** ROC national ID / resident certificate number: one letter + nine digits. */
function isTwNationalId(value?: string): boolean {
  return Boolean(value && /^[A-Z][0-9]{9}$/.test(value))
}

// ─── Source (problem JSON) shapes ───────────────────────────────────────────

export interface SourcePatient {
  id: string
  idSystem?: string
  idNumber?: string
  active?: boolean
  name?: string
  telecomSystem?: string
  telecomUse?: string
  telecomValue?: string
  gender?: string
  birthDate?: string
  address?: string
  organization?: string
  // Optional emergency contact (Patient.contact).
  contactRelationship?: string
  contactName?: string
  contactTelecomSystem?: string
  contactTelecomUse?: string
  contactTelecomValue?: string
}

export interface SourceOrganization {
  id: string
  identifierValue?: string
  idSystem?: string
  active?: boolean
  type?: string
  name?: string
  telecomSystem?: string
  telecomUse?: string
  telecomValue?: string
  address?: string
}

export interface SourceEncounter {
  id: string
  idSystem?: string
  status?: string
  class?: string
  type?: string
  reasonCode?: string
  serviceType?: string
  serviceTypeText?: string
  patientId?: string
  periodStart?: string
  periodEnd?: string
  serviceProviderId?: string
  participantType?: string
  practitionerId?: string
  conditionId?: string
  diagnosisUse?: string
  /** Encounter.hospitalization.admitSource code (e.g. 'emd'). */
  admitSource?: string
  /** Encounter.hospitalization.dischargeDisposition code (e.g. 'home'). */
  dischargeDisposition?: string
}

export interface SourceProcedure {
  id: string
  status?: string
  category?: string
  procedureCode?: string
  procedureText?: string
  patientId?: string
  encounterId?: string
  performedDate?: string
  performerId?: string
  performerFunction?: string
  bodySite?: string
  reasonCode?: string
  outcome?: string
}

export interface SourceObservationVitalSign {
  id: string
  status?: string
  categoryCode?: string
  /** Competition vital-sign code (e.g. 'VS-0006'), mapped to LOINC via VITAL_SIGN_MAP. */
  observationCode?: string
  patientId?: string
  encounterId?: string
  effectiveDate?: string
  performerId?: string
  valueQuantity?: number
  valueUnit?: string
  rangeLow?: number
  rangeHigh?: number
  // Blood pressure panel components (e.g. VS-0008).
  systolicValue?: number
  systolicUnit?: string
  diastolicValue?: number
  diastolicUnit?: string
}

export interface SourcePractitionerRole {
  id: string
  identifierValue?: string
  idSystem?: string
  active?: boolean
  practitionerId?: string
  organizationId?: string
  roleCode?: string
  roleText?: string
  specialtyCode?: string
  periodStart?: string
  periodEnd?: string
  telecomSystem?: string
  telecomUse?: string
  telecomValue?: string
}

export interface SourcePractitioner {
  id: string
  medicalLicenseNumber?: string
  medicalLicenseSystem?: string
  active?: boolean
  name?: string
  telecomSystem?: string
  telecomUse?: string
  telecomValue?: string
  address?: string
  gender?: string
  birthday?: string
  qualificationCode?: string
  qualificationIssuer?: string
}

export interface SourceCondition {
  id: string
  clinicalStatus?: string
  verificationStatus?: string
  category?: string
  severity?: string
  conditionCode?: string
  conditionText?: string
  patientId?: string
  onsetDate?: string
  asserterId?: string
  recorderId?: string
  note?: string
}

export interface SourceAllergyIntolerance {
  id: string
  clinicalStatus?: string
  verificationStatus?: string
  type?: string
  category?: string
  criticality?: string
  allergyCode?: string
  patientId?: string
  encounterId?: string
  onsetDate?: string
  recordedDate?: string
  recorderId?: string
  asserterId?: string
  lastOccurrence?: string
  reactionSubstance?: string
  manifestation?: string
  reactionDescription?: string
  severity?: string
  exposureRoute?: string
  note?: string
}

export interface SourceLabObservation {
  id: string
  status?: string
  categoryCode?: string
  observationCode?: string
  patientId?: string
  encounterId?: string
  effectiveDate?: string
  performerId?: string
  valueQuantity?: number
  valueUnit?: string
  rangeLow?: number
  rangeHigh?: number
}

export interface SourceDiagnosticReport {
  id: string
  status?: string
  categoryCode?: string
  categoryText?: string
  reportCode?: string
  reportText?: string
  subjectId?: string
  encounterId?: string
  effectiveDateTime?: string
  issued?: string
  performerId?: string
  resultId?: string
  conclusion?: string
}

export interface SourceMedicationRequest {
  id: string
  idSystem?: string
  status?: string
  intent?: string
  medicationId?: string
  patientId?: string
  encounterId?: string
  authoredOn?: string
  requesterId?: string
  reasonReferenceId?: string
  dosageText?: string
  frequency?: number
  period?: number
  periodUnit?: string
  timingCode?: string
  routeCode?: string
  doseValue?: number
  doseCode?: string
  durationValue?: number
  durationCode?: string
}

export interface SourceMedication {
  id: string
  code?: string
  display?: string
}

export interface CompetitionProblem {
  patients?: SourcePatient[]
  organizations?: SourceOrganization[]
  encounters?: SourceEncounter[]
  practitionerroles?: SourcePractitionerRole[]
  practitioners?: SourcePractitioner[]
  conditions?: SourceCondition[]
  allergyintolerances?: SourceAllergyIntolerance[]
  observationVitalSigns?: SourceObservationVitalSign[]
  observationLaboratoryResults?: SourceLabObservation[]
  procedures?: SourceProcedure[]
  diagnosticreports?: SourceDiagnosticReport[]
  medicationrequests?: SourceMedicationRequest[]
  medications?: SourceMedication[]
}

type ResourceKind = 'Patient' | 'Organization' | 'Encounter' | 'Condition' | 'Practitioner' | 'PractitionerRole' | 'AllergyIntolerance' | 'Observation' | 'Procedure' | 'DiagnosticReport' | 'MedicationRequest'

/** Learned/overriding competition-code → standard-coding map (category → code → coding). */
export type CodeOverrides = Record<string, Record<string, { system: string; code: string }>>

export interface ConvertOptions {
  /**
   * Bundle.type. 'collection' (default) is what the Gazelle competition
   * validator requires (Bundle-twcore). 'transaction' is for POSTing to a FHIR
   * server to actually create the resources.
   */
  bundleType?: 'transaction' | 'collection'
  /** UUID factory (injectable for deterministic tests). Defaults to crypto.randomUUID. */
  uuid?: () => string
  /** Extra code mappings (e.g. learned from Gazelle errors), consulted before the built-in map. */
  codeOverrides?: CodeOverrides
}

/**
 * Records which competition code produced each coding, so Gazelle errors can be
 * correlated back to the source code (for the learn-from-errors workflow).
 */
export interface ProvenanceEntry {
  fullUrl: string
  resourceType: string
  /** FHIR field that carried the code, e.g. 'code', 'serviceType', 'reasonCode', 'specialty'. */
  field: string
  /** COMPETITION_CODE_MAP category. */
  category: string
  /** The competition code, e.g. 'Cond-0019'. */
  code: string
}

// ─── Small helpers ──────────────────────────────────────────────────────────

function escapeXhtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function narrative(summary: string): fhir4.Narrative {
  return {
    status: 'generated',
    div: `<div xmlns="http://www.w3.org/1999/xhtml"><p>${escapeXhtml(summary)}</p></div>`
  }
}

function telecom(system?: string, use?: string, value?: string): fhir4.ContactPoint[] | undefined {
  if (!value) return undefined
  const point: fhir4.ContactPoint = { value }
  if (system) point.system = system as fhir4.ContactPoint['system']
  if (use) point.use = use as fhir4.ContactPoint['use']
  return [point]
}

function period(start?: string, end?: string): fhir4.Period | undefined {
  if (!start && !end) return undefined
  const result: fhir4.Period = {}
  if (start) result.start = start
  if (end) result.end = end
  return result
}

/** Practitioner-style identifier: official + Medical License (v2-0203 MD). */
function licenseIdentifier(system?: string, value?: string): fhir4.Identifier[] | undefined {
  if (!value) return undefined
  return [{
    use: 'official',
    type: { coding: [{ system: V2_0203, code: 'MD' }] },
    ...(system ? { system } : {}),
    value
  }]
}

// ─── Converter ──────────────────────────────────────────────────────────────

export interface ConvertResult {
  bundle: fhir4.Bundle
  /** Count of resources emitted, keyed by type — handy for UI summaries. */
  counts: Record<string, number>
  /** Provenance of every competition code used, for the learn-from-errors workflow. */
  provenance: ProvenanceEntry[]
}

interface RefToken {
  system: string
  value: string
}

export function convertCompetitionProblem(problem: CompetitionProblem, options: ConvertOptions = {}): ConvertResult {
  const bundleType = options.bundleType ?? 'collection'
  const makeUuid = options.uuid ?? (() => crypto.randomUUID())
  // The built-in (verified) map wins; learned overrides only fill in codes the
  // built-in map doesn't know — so a mis-learned override can never shadow a
  // verified mapping.
  const lookupCode = (category: keyof typeof COMPETITION_CODE_MAP, code?: string): { system: string; code: string } | undefined => {
    return mapCode(category, code) ?? (code ? options.codeOverrides?.[category]?.[code] : undefined)
  }

  const keyOf = (kind: ResourceKind, id: string | undefined): string => `${kind}/${id}`

  // The token (system|value) each resource is referenced by. Patients use the
  // MOI national-ID system; Conditions are referenced by their SNOMED code.
  const patientToken = (p: SourcePatient): RefToken | undefined => {
    if (!p.idNumber) return undefined
    const system = isTwNationalId(p.idNumber) ? MOI : (p.idSystem ?? MOI)
    return { system, value: p.idNumber }
  }
  const orgToken = (o: SourceOrganization): RefToken | undefined =>
    o.identifierValue && o.idSystem ? { system: o.idSystem, value: o.identifierValue } : undefined
  const practitionerToken = (p: SourcePractitioner): RefToken | undefined =>
    p.medicalLicenseNumber && p.medicalLicenseSystem ? { system: p.medicalLicenseSystem, value: p.medicalLicenseNumber } : undefined
  const conditionToken = (c: SourceCondition): RefToken | undefined => {
    const mapped = lookupCode('condition', c.conditionCode)
    return mapped ? { system: mapped.system, value: mapped.code } : undefined
  }

  // Pass 1: compute each resource's reference token (+ a urn:uuid fullUrl).
  const tokenByKey = new Map<string, RefToken>()
  const urnByKey = new Map<string, string>()
  const registerToken = (kind: ResourceKind, id: string | undefined, token?: RefToken): void => {
    if (!id) return
    urnByKey.set(keyOf(kind, id), `urn:uuid:${makeUuid()}`)
    if (token) tokenByKey.set(keyOf(kind, id), token)
  }

  problem.patients?.forEach((p) => registerToken('Patient', p.id, patientToken(p)))
  problem.organizations?.forEach((o) => registerToken('Organization', o.id, orgToken(o)))
  problem.practitioners?.forEach((p) => registerToken('Practitioner', p.id, practitionerToken(p)))
  problem.practitionerroles?.forEach((r) => registerToken('PractitionerRole', r.id, undefined))
  problem.conditions?.forEach((c) => registerToken('Condition', c.id, conditionToken(c)))
  problem.allergyintolerances?.forEach((a) => registerToken('AllergyIntolerance', a.id, undefined))
  problem.observationVitalSigns?.forEach((o) => registerToken('Observation', o.id, undefined))
  problem.observationLaboratoryResults?.forEach((o) => registerToken('Observation', `lab-${o.id}`, undefined))
  problem.procedures?.forEach((pr) => registerToken('Procedure', pr.id, undefined))
  problem.diagnosticreports?.forEach((d) => registerToken('DiagnosticReport', d.id, undefined))
  problem.medicationrequests?.forEach((m) => registerToken('MedicationRequest', m.id, undefined))
  problem.encounters?.forEach((e) => registerToken('Encounter', e.id, undefined))

  // References use urn:uuid pointing at the target entry's fullUrl — the standard
  // self-contained-bundle form. HAPI accepts it (no 422), and the Gazelle
  // validator resolves it to the target's identifier token (Type/system|value)
  // for comparison against the gold answer.
  const ref = (kind: ResourceKind, id?: string): fhir4.Reference | undefined => {
    if (!id) return undefined
    const urn = urnByKey.get(keyOf(kind, id))
    return urn ? { reference: urn } : undefined
  }

  const entries: fhir4.BundleEntry[] = []
  const counts: Record<string, number> = {}

  const push = (kind: ResourceKind, id: string | undefined, resource: fhir4.Resource): void => {
    const fullUrl = (id ? urnByKey.get(keyOf(kind, id)) : undefined) ?? `urn:uuid:${makeUuid()}`
    const entry: fhir4.BundleEntry = { fullUrl, resource: resource as fhir4.BundleEntry['resource'] }
    if (bundleType === 'transaction') {
      entry.request = { method: 'POST', url: kind }
    }
    entries.push(entry)
    counts[kind] = (counts[kind] ?? 0) + 1
  }

  // ── Patient ──
  problem.patients?.forEach((p) => {
    const token = patientToken(p)
    // Two identifiers per the gold answer: [0] national ID (v2-0203 NNxxx, MOI
    // system) and [1] medical record number (v2-0203 MR, the source idSystem +
    // the source row id).
    const identifiers: fhir4.Identifier[] = []
    if (token) {
      identifiers.push({ use: 'official', type: { coding: [{ system: V2_0203, code: 'NNxxx' }] }, system: token.system, value: token.value })
    }
    if (p.idSystem && p.id) {
      identifiers.push({ use: 'official', type: { coding: [{ system: V2_0203, code: 'MR' }] }, system: p.idSystem, value: p.id })
    }
    const resource: fhir4.Patient = {
      resourceType: 'Patient',
      meta: { profile: [TWCORE_PROFILES.patient] },
      text: narrative(`Patient: ${p.name ?? p.idNumber ?? p.id}`),
      ...(p.active !== undefined ? { active: p.active } : {}),
      ...(identifiers.length ? { identifier: identifiers } : {}),
      ...(p.name ? { name: [{ use: 'official', text: p.name }] } : {}),
      ...(telecom(p.telecomSystem, p.telecomUse, p.telecomValue) ? { telecom: telecom(p.telecomSystem, p.telecomUse, p.telecomValue) } : {}),
      ...(p.gender ? { gender: p.gender as fhir4.Patient['gender'] } : {}),
      ...(p.birthDate ? { birthDate: p.birthDate } : {}),
      ...(p.address ? { address: [{ text: p.address }] } : {})
    }
    const org = ref('Organization', p.organization)
    if (org) resource.managingOrganization = org
    if (p.contactName || p.contactRelationship || p.contactTelecomValue) {
      const contact: NonNullable<fhir4.Patient['contact']>[number] = {}
      if (p.contactRelationship) {
        contact.relationship = [{ coding: [{ system: V2_0131, code: p.contactRelationship }] }]
      }
      if (p.contactName) contact.name = { text: p.contactName }
      const contactTelecom = telecom(p.contactTelecomSystem, p.contactTelecomUse, p.contactTelecomValue)
      if (contactTelecom) contact.telecom = contactTelecom
      resource.contact = [contact]
    }
    push('Patient', p.id, resource)
  })

  // ── Organization ──
  problem.organizations?.forEach((o) => {
    const resource: fhir4.Organization = {
      resourceType: 'Organization',
      meta: { profile: [TWCORE_PROFILES.organization] },
      text: narrative(`Organization: ${o.name ?? o.identifierValue ?? o.id}`),
      ...(o.active !== undefined ? { active: o.active } : {}),
      ...(o.identifierValue ? { identifier: [{ ...(o.idSystem ? { system: o.idSystem } : {}), value: o.identifierValue }] } : {}),
      ...(o.type ? { type: [{ coding: [{ system: SYS.orgType, code: o.type }] }] } : {}),
      ...(o.name ? { name: o.name } : {}),
      ...(telecom(o.telecomSystem, o.telecomUse, o.telecomValue) ? { telecom: telecom(o.telecomSystem, o.telecomUse, o.telecomValue) } : {}),
      ...(o.address ? { address: [{ text: o.address }] } : {})
    }
    push('Organization', o.id, resource)
  })

  // ── Practitioner ──
  problem.practitioners?.forEach((p) => {
    const resource: fhir4.Practitioner = {
      resourceType: 'Practitioner',
      meta: { profile: [TWCORE_PROFILES.practitioner] },
      text: narrative(`Practitioner: ${p.name ?? p.medicalLicenseNumber ?? p.id}`),
      ...(p.active !== undefined ? { active: p.active } : {}),
      ...(licenseIdentifier(p.medicalLicenseSystem, p.medicalLicenseNumber) ? { identifier: licenseIdentifier(p.medicalLicenseSystem, p.medicalLicenseNumber) } : {}),
      ...(p.name ? { name: [{ use: 'official', text: p.name }] } : {}),
      ...(telecom(p.telecomSystem, p.telecomUse, p.telecomValue) ? { telecom: telecom(p.telecomSystem, p.telecomUse, p.telecomValue) } : {}),
      ...(p.address ? { address: [{ text: p.address }] } : {}),
      ...(p.gender ? { gender: p.gender as fhir4.Practitioner['gender'] } : {}),
      ...(p.birthday ? { birthDate: p.birthday } : {})
    }
    if (p.qualificationCode) {
      const mapped = lookupCode('qualification', p.qualificationCode)
      const qualification: NonNullable<fhir4.Practitioner['qualification']>[number] = {
        code: mapped ? { coding: [{ system: mapped.system, code: mapped.code }] } : { text: p.qualificationCode }
      }
      const issuer = ref('Organization', p.qualificationIssuer)
      if (issuer) qualification.issuer = issuer
      resource.qualification = [qualification]
    }
    push('Practitioner', p.id, resource)
  })

  // ── PractitionerRole ──
  problem.practitionerroles?.forEach((r) => {
    const resource: fhir4.PractitionerRole = {
      resourceType: 'PractitionerRole',
      meta: { profile: [TWCORE_PROFILES.practitionerRole] },
      text: narrative(`PractitionerRole: ${r.roleText ?? r.roleCode ?? r.id}`),
      ...(r.active !== undefined ? { active: r.active } : {}),
      ...(licenseIdentifier(r.idSystem, r.identifierValue) ? { identifier: licenseIdentifier(r.idSystem, r.identifierValue) } : {})
    }
    const practitioner = ref('Practitioner', r.practitionerId)
    if (practitioner) resource.practitioner = practitioner
    const organization = ref('Organization', r.organizationId)
    if (organization) resource.organization = organization
    const roleMapped = lookupCode('role', r.roleCode)
    if (roleMapped) resource.code = [{ coding: [{ system: roleMapped.system, code: roleMapped.code }] }]
    else if (r.roleText || r.roleCode) resource.code = [{ text: r.roleText ?? r.roleCode }]
    const specialtyMapped = lookupCode('specialty', r.specialtyCode)
    if (specialtyMapped) resource.specialty = [{ coding: [{ system: specialtyMapped.system, code: specialtyMapped.code }] }]
    else if (r.specialtyCode) resource.specialty = [{ text: r.specialtyCode }]
    const rolePeriod = period(r.periodStart, r.periodEnd)
    if (rolePeriod) resource.period = rolePeriod
    const roleTelecom = telecom(r.telecomSystem, r.telecomUse, r.telecomValue)
    if (roleTelecom) resource.telecom = roleTelecom
    push('PractitionerRole', r.id, resource)
  })

  // ── Condition ──
  problem.conditions?.forEach((c) => {
    const resource: fhir4.Condition = {
      resourceType: 'Condition',
      meta: { profile: [TWCORE_PROFILES.condition] },
      text: narrative(`Condition: ${c.conditionText ?? c.conditionCode ?? c.id}`),
      subject: ref('Patient', c.patientId) ?? { display: 'Unknown patient' }
    }
    if (c.clinicalStatus) {
      resource.clinicalStatus = { coding: [{ system: SYS.conditionClinical, code: c.clinicalStatus }] }
    }
    if (c.verificationStatus) {
      resource.verificationStatus = { coding: [{ system: SYS.conditionVerStatus, code: c.verificationStatus }] }
    }
    if (c.category) {
      resource.category = [{ coding: [{ system: SYS.conditionCategory, code: c.category }] }]
    }
    if (c.severity) {
      resource.severity = { coding: [{ system: SYS.snomed, code: c.severity }] }
    }
    const mapped = lookupCode('condition', c.conditionCode)
    if (mapped) {
      resource.code = { coding: [{ system: mapped.system, code: mapped.code }], ...(c.conditionText ? { text: c.conditionText } : {}) }
    } else if (c.conditionText || c.conditionCode) {
      resource.code = { text: c.conditionText ?? c.conditionCode }
    }
    if (c.onsetDate) resource.onsetDateTime = c.onsetDate
    // asserter is the patient who reported the symptom (主訴者); recorder is the
    // practitioner who recorded it — both ids are "1" but target different types.
    const asserter = ref('Patient', c.asserterId)
    if (asserter) resource.asserter = asserter
    const recorder = ref('Practitioner', c.recorderId)
    if (recorder) resource.recorder = recorder
    if (c.note) resource.note = [{ text: c.note }]
    push('Condition', c.id, resource)
  })

  // ── AllergyIntolerance ──
  problem.allergyintolerances?.forEach((a) => {
    const resource: fhir4.AllergyIntolerance = {
      resourceType: 'AllergyIntolerance',
      meta: { profile: [TWCORE_PROFILES.allergyIntolerance] },
      text: narrative(`AllergyIntolerance: ${a.allergyCode ?? a.id}`),
      patient: ref('Patient', a.patientId) ?? { display: 'Unknown patient' }
    }
    if (a.clinicalStatus) {
      resource.clinicalStatus = { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: a.clinicalStatus }] }
    }
    if (a.verificationStatus) {
      resource.verificationStatus = { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification', code: a.verificationStatus }] }
    }
    if (a.type) resource.type = a.type as fhir4.AllergyIntolerance['type']
    if (a.category) resource.category = [a.category as NonNullable<fhir4.AllergyIntolerance['category']>[number]]
    if (a.criticality) resource.criticality = a.criticality as fhir4.AllergyIntolerance['criticality']
    // The allergen code is the SNOMED reaction substance (e.g. 44027008 蝦), not
    // the opaque competition allergyCode. Fall back to a mapped/text allergyCode.
    const allergyMapped = lookupCode('allergy', a.allergyCode)
    if (a.reactionSubstance) resource.code = { coding: [{ system: SNOMED, code: a.reactionSubstance }] }
    else if (allergyMapped) resource.code = { coding: [{ system: allergyMapped.system, code: allergyMapped.code }] }
    else if (a.allergyCode) resource.code = { text: a.allergyCode }
    const allergyEncounter = ref('Encounter', a.encounterId)
    if (allergyEncounter) resource.encounter = allergyEncounter
    if (a.onsetDate) resource.onsetDateTime = a.onsetDate
    if (a.recordedDate) resource.recordedDate = a.recordedDate
    const allergyRecorder = ref('Practitioner', a.recorderId)
    if (allergyRecorder) resource.recorder = allergyRecorder
    const allergyAsserter = ref('Patient', a.asserterId)
    if (allergyAsserter) resource.asserter = allergyAsserter
    if (a.lastOccurrence) resource.lastOccurrence = a.lastOccurrence
    if (a.reactionSubstance || a.manifestation || a.reactionDescription || a.severity || a.exposureRoute) {
      const reaction: NonNullable<fhir4.AllergyIntolerance['reaction']>[number] = {
        manifestation: a.manifestation
          ? [{ coding: [{ system: SNOMED, code: a.manifestation }] }]
          : [{ text: a.reactionDescription ?? 'unknown' }]
      }
      if (a.reactionSubstance) reaction.substance = { coding: [{ system: SNOMED, code: a.reactionSubstance }] }
      if (a.reactionDescription) reaction.description = a.reactionDescription
      if (a.severity) reaction.severity = a.severity as NonNullable<fhir4.AllergyIntolerance['reaction']>[number]['severity']
      if (a.exposureRoute) reaction.exposureRoute = { coding: [{ system: SNOMED, code: a.exposureRoute }] }
      resource.reaction = [reaction]
    }
    if (a.note) resource.note = [{ text: a.note }]
    push('AllergyIntolerance', a.id, resource)
  })

  // ── Encounter ── (last: references everything else)
  problem.encounters?.forEach((e) => {
    const classCode = e.class ?? 'AMB'
    const resource: fhir4.Encounter = {
      resourceType: 'Encounter',
      meta: { profile: [TWCORE_PROFILES.encounter] },
      text: narrative(`Encounter: ${e.serviceTypeText ?? e.id}`),
      status: (e.status ?? 'finished') as fhir4.Encounter['status'],
      class: { system: SYS.actCode, code: classCode, display: ENCOUNTER_CLASS_DISPLAY[classCode] ?? classCode },
      subject: ref('Patient', e.patientId) ?? { display: 'Unknown patient' }
    }
    if (e.idSystem) resource.identifier = [{ system: e.idSystem, value: e.id }]
    if (e.type) resource.type = [{ coding: [{ system: SYS.actCode, code: e.type }] }]
    const serviceTypeMapped = lookupCode('serviceType', e.serviceType)
    if (serviceTypeMapped) {
      resource.serviceType = { coding: [{ system: serviceTypeMapped.system, code: serviceTypeMapped.code }] }
    } else if (e.serviceType || e.serviceTypeText) {
      resource.serviceType = { text: e.serviceTypeText ?? e.serviceType }
    }
    const encPeriod = period(e.periodStart, e.periodEnd)
    if (encPeriod) resource.period = encPeriod
    const serviceProvider = ref('Organization', e.serviceProviderId)
    if (serviceProvider) resource.serviceProvider = serviceProvider
    const individual = ref('Practitioner', e.practitionerId)
    if (individual) {
      const participant: fhir4.Encounter['participant'] = [{
        ...(e.participantType ? { type: [{ coding: [{ system: SYS.participationType, code: e.participantType }] }] } : {}),
        ...(encPeriod ? { period: encPeriod } : {}),
        individual
      }]
      resource.participant = participant
    }
    // reasonCode mirrors the diagnosed condition's standard (SNOMED) code.
    const reasonMapped = lookupCode('condition', e.reasonCode)
    const conditionTokenForReason = e.conditionId ? tokenByKey.get(keyOf('Condition', e.conditionId)) : undefined
    const reasonCoding = reasonMapped
      ?? (conditionTokenForReason ? { system: conditionTokenForReason.system, code: conditionTokenForReason.value } : undefined)
    if (reasonCoding) {
      resource.reasonCode = [{ coding: [{ system: reasonCoding.system, code: reasonCoding.code }] }]
    }
    const conditionRef = ref('Condition', e.conditionId)
    if (conditionRef) {
      resource.diagnosis = [{
        condition: conditionRef,
        ...(e.diagnosisUse ? { use: { coding: [{ system: SYS.diagnosisRole, code: e.diagnosisUse }] } } : {})
      }]
    }
    if (e.admitSource || e.dischargeDisposition) {
      resource.hospitalization = {
        ...(e.admitSource ? { admitSource: { coding: [{ system: ADMIT_SOURCE, code: e.admitSource }] } } : {}),
        ...(e.dischargeDisposition ? { dischargeDisposition: { coding: [{ system: DISCHARGE_DISPOSITION, code: e.dischargeDisposition }] } } : {})
      }
    }
    push('Encounter', e.id, resource)
  })

  // ── Procedure ──
  problem.procedures?.forEach((pr) => {
    const codeMapped = lookupCode('procedure', pr.procedureCode)
    const resource: fhir4.Procedure = {
      resourceType: 'Procedure',
      meta: { profile: [TWCORE_PROFILES.procedure] },
      text: narrative(`Procedure: ${pr.procedureText ?? pr.procedureCode ?? pr.id}`),
      status: (pr.status ?? 'completed') as fhir4.Procedure['status'],
      code: codeMapped
        ? { coding: [{ system: codeMapped.system, code: codeMapped.code }], ...(pr.procedureText ? { text: pr.procedureText } : {}) }
        : { text: pr.procedureText ?? pr.procedureCode ?? 'procedure' },
      subject: ref('Patient', pr.patientId) ?? { display: 'Unknown patient' }
    }
    // Procedure.category source value is already a SNOMED code.
    if (pr.category) resource.category = { coding: [{ system: SNOMED, code: pr.category }] }
    const procEncounter = ref('Encounter', pr.encounterId)
    if (procEncounter) resource.encounter = procEncounter
    if (pr.performedDate) resource.performedDateTime = pr.performedDate
    const actor = ref('Practitioner', pr.performerId)
    if (actor) {
      const fnMapped = lookupCode('procedureFunction', pr.performerFunction)
      resource.performer = [{
        ...(fnMapped ? { function: { coding: [{ system: fnMapped.system, code: fnMapped.code }] } } : (pr.performerFunction ? { function: { text: pr.performerFunction } } : {})),
        actor
      }]
    }
    const bodySiteMapped = lookupCode('bodySite', pr.bodySite)
    if (bodySiteMapped) resource.bodySite = [{ coding: [{ system: bodySiteMapped.system, code: bodySiteMapped.code }] }]
    else if (pr.bodySite) resource.bodySite = [{ text: pr.bodySite }]
    const procReason = lookupCode('condition', pr.reasonCode)
    if (procReason) resource.reasonCode = [{ coding: [{ system: procReason.system, code: procReason.code }] }]
    if (pr.outcome) resource.outcome = { coding: [{ system: SNOMED, code: pr.outcome }] }
    push('Procedure', pr.id, resource)
  })

  // ── Observation (laboratory) ──
  problem.observationLaboratoryResults?.forEach((o) => {
    const codeMapped = lookupCode('labObservation', o.observationCode)
    const unitQty = (value: number): fhir4.Quantity => ({ value, ...(o.valueUnit ? { unit: o.valueUnit, system: UCUM, code: o.valueUnit } : {}) })
    const resource: fhir4.Observation = {
      resourceType: 'Observation',
      meta: { profile: [TWCORE_PROFILES.observationLab] },
      text: narrative(`Observation: ${o.observationCode ?? o.id}`),
      status: (o.status ?? 'final') as fhir4.Observation['status'],
      category: [{ coding: [{ system: OBSERVATION_CATEGORY, code: o.categoryCode ?? 'laboratory' }] }],
      code: codeMapped ? { coding: [{ system: codeMapped.system, code: codeMapped.code }] } : { text: o.observationCode ?? 'lab' },
      subject: ref('Patient', o.patientId) ?? { display: 'Unknown patient' }
    }
    const obsEncounter = ref('Encounter', o.encounterId)
    if (obsEncounter) resource.encounter = obsEncounter
    if (o.effectiveDate) resource.effectiveDateTime = o.effectiveDate
    const performer = ref('Practitioner', o.performerId)
    if (performer) resource.performer = [performer]
    if (o.valueQuantity !== undefined) resource.valueQuantity = unitQty(o.valueQuantity)
    if (o.rangeLow !== undefined || o.rangeHigh !== undefined) {
      const range: fhir4.ObservationReferenceRange = {}
      if (o.rangeLow !== undefined) range.low = unitQty(o.rangeLow)
      if (o.rangeHigh !== undefined) range.high = unitQty(o.rangeHigh)
      resource.referenceRange = [range]
    }
    push('Observation', `lab-${o.id}`, resource)
  })

  // ── DiagnosticReport ──
  problem.diagnosticreports?.forEach((d) => {
    const codeMapped = lookupCode('diagnosticReport', d.reportCode)
    const resource: fhir4.DiagnosticReport = {
      resourceType: 'DiagnosticReport',
      meta: { profile: [TWCORE_PROFILES.diagnosticReport] },
      text: narrative(`DiagnosticReport: ${d.reportText ?? d.reportCode ?? d.id}`),
      status: (d.status ?? 'final') as fhir4.DiagnosticReport['status'],
      code: codeMapped
        ? { coding: [{ system: codeMapped.system, code: codeMapped.code }], ...(d.reportText ? { text: d.reportText } : {}) }
        : { text: d.reportText ?? d.reportCode ?? 'report' },
      subject: ref('Patient', d.subjectId) ?? { display: 'Unknown patient' }
    }
    if (d.categoryCode) {
      resource.category = [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0074', code: d.categoryCode }], ...(d.categoryText ? { text: d.categoryText } : {}) }]
    }
    const drEncounter = ref('Encounter', d.encounterId)
    if (drEncounter) resource.encounter = drEncounter
    if (d.effectiveDateTime) resource.effectiveDateTime = d.effectiveDateTime
    if (d.issued) resource.issued = d.issued
    // The gold answer's DiagnosticReport.performer is the Organization (lab), not
    // the practitioner — the source performerId maps to the Organization here.
    const drPerformer = ref('Organization', d.performerId)
    if (drPerformer) resource.performer = [drPerformer]
    const result = ref('Observation', `lab-${d.resultId}`)
    if (result) resource.result = [result]
    if (d.conclusion) resource.conclusion = d.conclusion
    push('DiagnosticReport', d.id, resource)
  })

  // ── MedicationRequest (inline medicationCodeableConcept) ──
  const medCodeById = new Map<string, string>()
  problem.medications?.forEach((m) => { if (m.code) medCodeById.set(m.id, m.code) })
  const medDisplayById = new Map<string, string>()
  problem.medications?.forEach((m) => { if (m.display) medDisplayById.set(m.id, m.display) })

  problem.medicationrequests?.forEach((m) => {
    const medCode = m.medicationId ? medCodeById.get(m.medicationId) : undefined
    const medMapped = lookupCode('medication', medCode)
    const medDisplay = m.medicationId ? medDisplayById.get(m.medicationId) : undefined
    const resource: fhir4.MedicationRequest = {
      resourceType: 'MedicationRequest',
      meta: { profile: [TWCORE_PROFILES.medicationRequest] },
      text: narrative(`MedicationRequest: ${m.dosageText ?? m.id}`),
      status: (m.status ?? 'active') as fhir4.MedicationRequest['status'],
      intent: (m.intent ?? 'order') as fhir4.MedicationRequest['intent'],
      medicationCodeableConcept: medMapped
        ? { coding: [{ system: medMapped.system, code: medMapped.code }], ...(medDisplay ? { text: medDisplay } : {}) }
        : { text: medDisplay ?? medCode ?? 'medication' },
      subject: ref('Patient', m.patientId) ?? { display: 'Unknown patient' }
    }
    if (m.idSystem) resource.identifier = [{ system: m.idSystem, value: m.id }]
    const mrEncounter = ref('Encounter', m.encounterId)
    if (mrEncounter) resource.encounter = mrEncounter
    if (m.authoredOn) resource.authoredOn = m.authoredOn
    const requester = ref('Practitioner', m.requesterId)
    if (requester) resource.requester = requester
    const reasonRef = ref('Condition', m.reasonReferenceId)
    if (reasonRef) resource.reasonReference = [reasonRef]
    const dosage: fhir4.Dosage = {}
    if (m.dosageText) dosage.text = m.dosageText
    const timingMapped = lookupCode('timing', m.timingCode)
    if (timingMapped || m.frequency !== undefined || m.period !== undefined) {
      dosage.timing = {
        ...((m.frequency !== undefined || m.period !== undefined) ? { repeat: {
          ...(m.frequency !== undefined ? { frequency: m.frequency } : {}),
          ...(m.period !== undefined ? { period: m.period } : {}),
          ...(m.periodUnit ? { periodUnit: m.periodUnit as NonNullable<fhir4.Timing['repeat']>['periodUnit'] } : {})
        } } : {}),
        ...(timingMapped ? { code: { coding: [{ system: timingMapped.system, code: timingMapped.code }] } } : {})
      }
    }
    const routeMapped = lookupCode('route', m.routeCode)
    if (routeMapped) dosage.route = { coding: [{ system: routeMapped.system, code: routeMapped.code }] }
    else if (m.routeCode) dosage.route = { text: m.routeCode }
    if (m.doseValue !== undefined) {
      dosage.doseAndRate = [{ doseQuantity: { value: m.doseValue, ...(m.doseCode ? { unit: m.doseCode, system: UCUM, code: m.doseCode } : {}) } }]
    }
    if (Object.keys(dosage).length) resource.dosageInstruction = [dosage]
    if (m.durationValue !== undefined) {
      resource.dispenseRequest = { expectedSupplyDuration: { value: m.durationValue, ...(m.durationCode ? { unit: m.durationCode, system: UCUM, code: m.durationCode } : {}) } }
    }
    push('MedicationRequest', m.id, resource)
  })

  // ── Observation (vital signs) ──
  problem.observationVitalSigns?.forEach((o) => {
    const vs = VITAL_SIGN_MAP[o.observationCode ?? '']
    const resource: fhir4.Observation = {
      resourceType: 'Observation',
      // Each vital sign has its own TW Core profile (heart-rate, pulse-oximetry…).
      meta: { profile: [vs?.profile ?? TWCORE_PROFILES.observation] },
      text: narrative(`Observation: ${o.observationCode ?? o.id}`),
      status: (o.status ?? 'final') as fhir4.Observation['status'],
      category: [{ coding: [{ system: OBSERVATION_CATEGORY, code: o.categoryCode ?? 'vital-signs' }] }],
      // Display omitted on purpose — the LOINC validator rejects non-canonical
      // display strings, and Gazelle matches Observations by code, not display.
      code: vs
        ? { coding: vs.codes.map((code) => ({ system: LOINC, code })) }
        : { text: o.observationCode ?? 'observation' },
      subject: ref('Patient', o.patientId) ?? { display: 'Unknown patient' }
    }
    const obsEncounter = ref('Encounter', o.encounterId)
    if (obsEncounter) resource.encounter = obsEncounter
    if (o.effectiveDate) resource.effectiveDateTime = o.effectiveDate
    const performer = ref('Practitioner', o.performerId)
    if (performer) resource.performer = [performer]
    if (o.systolicValue !== undefined || o.diastolicValue !== undefined) {
      // Blood-pressure panel: systolic + diastolic components instead of a value.
      resource.component = []
      if (o.systolicValue !== undefined) {
        resource.component.push({
          code: { coding: [{ system: LOINC, code: BP_SYSTOLIC }] },
          valueQuantity: { value: o.systolicValue, ...(o.systolicUnit ? { unit: o.systolicUnit, system: UCUM, code: o.systolicUnit } : {}) }
        })
      }
      if (o.diastolicValue !== undefined) {
        resource.component.push({
          code: { coding: [{ system: LOINC, code: BP_DIASTOLIC }] },
          valueQuantity: { value: o.diastolicValue, ...(o.diastolicUnit ? { unit: o.diastolicUnit, system: UCUM, code: o.diastolicUnit } : {}) }
        })
      }
    } else if (o.valueQuantity !== undefined) {
      resource.valueQuantity = {
        value: o.valueQuantity,
        ...(o.valueUnit ? { unit: o.valueUnit, system: UCUM, code: o.valueUnit } : {})
      }
    }
    if (o.rangeLow !== undefined || o.rangeHigh !== undefined) {
      const range: fhir4.ObservationReferenceRange = {}
      if (o.rangeLow !== undefined) range.low = { value: o.rangeLow, ...(o.valueUnit ? { unit: o.valueUnit, system: UCUM, code: o.valueUnit } : {}) }
      if (o.rangeHigh !== undefined) range.high = { value: o.rangeHigh, ...(o.valueUnit ? { unit: o.valueUnit, system: UCUM, code: o.valueUnit } : {}) }
      resource.referenceRange = [range]
    }
    push('Observation', o.id, resource)
  })

  // Provenance: which competition code each coding came from (decoupled from the
  // builders above), so Gazelle errors can be traced back to the source code.
  const provenance: ProvenanceEntry[] = []
  const addProv = (kind: ResourceKind, id: string | undefined, field: string, category: string, code?: string): void => {
    if (!id || !code) return
    const fullUrl = urnByKey.get(keyOf(kind, id))
    if (fullUrl) provenance.push({ fullUrl, resourceType: kind, field, category, code })
  }
  problem.conditions?.forEach((c) => addProv('Condition', c.id, 'code', 'condition', c.conditionCode))
  problem.encounters?.forEach((e) => {
    addProv('Encounter', e.id, 'serviceType', 'serviceType', e.serviceType)
    addProv('Encounter', e.id, 'reasonCode', 'condition', e.reasonCode)
  })
  problem.practitionerroles?.forEach((r) => {
    addProv('PractitionerRole', r.id, 'code', 'role', r.roleCode)
    addProv('PractitionerRole', r.id, 'specialty', 'specialty', r.specialtyCode)
  })
  problem.practitioners?.forEach((p) => addProv('Practitioner', p.id, 'qualification', 'qualification', p.qualificationCode))
  problem.procedures?.forEach((pr) => {
    addProv('Procedure', pr.id, 'code', 'procedure', pr.procedureCode)
    addProv('Procedure', pr.id, 'performer.function', 'procedureFunction', pr.performerFunction)
    addProv('Procedure', pr.id, 'bodySite', 'bodySite', pr.bodySite)
  })
  problem.observationLaboratoryResults?.forEach((o) => addProv('Observation', `lab-${o.id}`, 'code', 'labObservation', o.observationCode))
  problem.diagnosticreports?.forEach((d) => addProv('DiagnosticReport', d.id, 'code', 'diagnosticReport', d.reportCode))
  problem.medicationrequests?.forEach((m) => {
    addProv('MedicationRequest', m.id, 'medication', 'medication', m.medicationId ? medCodeById.get(m.medicationId) : undefined)
    addProv('MedicationRequest', m.id, 'dosageInstruction.timing.code', 'timing', m.timingCode)
    addProv('MedicationRequest', m.id, 'dosageInstruction.route', 'route', m.routeCode)
  })

  return {
    bundle: {
      resourceType: 'Bundle',
      meta: { profile: [TWCORE_PROFILES.bundle] },
      type: bundleType,
      entry: entries
    },
    counts,
    provenance
  }
}
