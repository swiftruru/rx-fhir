import type { BundleSummary } from '../../../types/fhir'

export interface DiffField {
  /** i18n key, reuses detail.sections.*.fieldName */
  labelKey: string
  valueA: string | undefined
  valueB: string | undefined
  isDifferent: boolean
}

export interface DiffSection {
  /** i18n key, reuses detail.sections.*.title */
  titleKey: string
  fields: DiffField[]
  hasDifference: boolean
  /** true if at least one bundle has this resource */
  isPresent: boolean
}

export interface BundleDiffResult {
  sections: DiffSection[]
  totalDifferences: number
}

function getResource<T extends fhir4.Resource>(
  entries: fhir4.BundleEntry[],
  type: string
): T | undefined {
  return entries.find((e) => e.resource?.resourceType === type)?.resource as T | undefined
}

function mkField(
  labelKey: string,
  valueA: string | undefined | null,
  valueB: string | undefined | null
): DiffField {
  const a = valueA?.trim() || undefined
  const b = valueB?.trim() || undefined
  return { labelKey, valueA: a, valueB: b, isDifferent: a !== b }
}

function mkSection(
  titleKey: string,
  fields: DiffField[],
  presentA: boolean,
  presentB: boolean
): DiffSection {
  const isPresent = presentA || presentB
  return {
    titleKey,
    fields,
    hasDifference: fields.some((f) => f.isDifferent),
    isPresent,
  }
}

export function diffBundles(a: BundleSummary, b: BundleSummary): BundleDiffResult {
  const eA = a.raw.entry ?? []
  const eB = b.raw.entry ?? []

  const compositionA = getResource<fhir4.Composition>(eA, 'Composition')
  const compositionB = getResource<fhir4.Composition>(eB, 'Composition')
  const patientA     = getResource<fhir4.Patient>(eA, 'Patient')
  const patientB     = getResource<fhir4.Patient>(eB, 'Patient')
  const pracA        = getResource<fhir4.Practitioner>(eA, 'Practitioner')
  const pracB        = getResource<fhir4.Practitioner>(eB, 'Practitioner')
  const orgA         = getResource<fhir4.Organization>(eA, 'Organization')
  const orgB         = getResource<fhir4.Organization>(eB, 'Organization')
  const encA         = getResource<fhir4.Encounter>(eA, 'Encounter')
  const encB         = getResource<fhir4.Encounter>(eB, 'Encounter')
  const condA        = getResource<fhir4.Condition>(eA, 'Condition')
  const condB        = getResource<fhir4.Condition>(eB, 'Condition')
  const obsA         = getResource<fhir4.Observation>(eA, 'Observation')
  const obsB         = getResource<fhir4.Observation>(eB, 'Observation')
  const covA         = getResource<fhir4.Coverage>(eA, 'Coverage')
  const covB         = getResource<fhir4.Coverage>(eB, 'Coverage')
  const medA         = getResource<fhir4.Medication>(eA, 'Medication')
  const medB         = getResource<fhir4.Medication>(eB, 'Medication')
  const mrA          = getResource<fhir4.MedicationRequest>(eA, 'MedicationRequest')
  const mrB          = getResource<fhir4.MedicationRequest>(eB, 'MedicationRequest')

  const condCodeStr = (c: fhir4.Condition | undefined) =>
    c?.code?.coding?.map((x) => [x.code, x.display].filter(Boolean).join(' ')).join('; ')

  const obsResultStr = (o: fhir4.Observation | undefined) =>
    o?.valueQuantity
      ? `${o.valueQuantity.value ?? ''} ${o.valueQuantity.unit ?? ''}`.trim()
      : undefined

  const all: DiffSection[] = [
    mkSection('detail.sections.prescription.title', [
      mkField('detail.sections.prescription.docTitle', compositionA?.title,  compositionB?.title),
      mkField('detail.sections.prescription.date',     compositionA?.date,   compositionB?.date),
      mkField('detail.sections.prescription.status',   compositionA?.status, compositionB?.status),
      mkField('detail.sections.prescription.bundleId', a.id, b.id),
    ], Boolean(compositionA), Boolean(compositionB)),

    mkSection('detail.sections.patient.title', [
      mkField('detail.sections.patient.name',      patientA?.name?.[0]?.text,         patientB?.name?.[0]?.text),
      mkField('detail.sections.patient.identifier',patientA?.identifier?.[0]?.value,  patientB?.identifier?.[0]?.value),
      mkField('detail.sections.patient.gender',    patientA?.gender,                  patientB?.gender),
      mkField('detail.sections.patient.birthDate', patientA?.birthDate,               patientB?.birthDate),
    ], Boolean(patientA), Boolean(patientB)),

    mkSection('detail.sections.practitioner.title', [
      mkField('detail.sections.practitioner.name',          pracA?.name?.[0]?.text,                    pracB?.name?.[0]?.text),
      mkField('detail.sections.practitioner.licenseNumber', pracA?.identifier?.[0]?.value,             pracB?.identifier?.[0]?.value),
      mkField('detail.sections.practitioner.qualification', pracA?.qualification?.[0]?.code?.text,     pracB?.qualification?.[0]?.code?.text),
    ], Boolean(pracA), Boolean(pracB)),

    mkSection('detail.sections.organization.title', [
      mkField('detail.sections.organization.name',       orgA?.name,                              orgB?.name),
      mkField('detail.sections.organization.identifier', orgA?.identifier?.[0]?.value,            orgB?.identifier?.[0]?.value),
      mkField('detail.sections.organization.type',       orgA?.type?.[0]?.coding?.[0]?.display,   orgB?.type?.[0]?.coding?.[0]?.display),
    ], Boolean(orgA), Boolean(orgB)),

    mkSection('detail.sections.encounter.title', [
      mkField('detail.sections.encounter.type',   encA?.class?.display, encB?.class?.display),
      mkField('detail.sections.encounter.start',  encA?.period?.start,  encB?.period?.start),
      mkField('detail.sections.encounter.end',    encA?.period?.end,    encB?.period?.end),
      mkField('detail.sections.encounter.status', encA?.status,         encB?.status),
    ], Boolean(encA), Boolean(encB)),

    mkSection('detail.sections.condition.title', [
      mkField('detail.sections.condition.code',           condCodeStr(condA), condCodeStr(condB)),
      mkField('detail.sections.condition.clinicalStatus', condA?.clinicalStatus?.coding?.[0]?.code, condB?.clinicalStatus?.coding?.[0]?.code),
    ], Boolean(condA), Boolean(condB)),

    mkSection('detail.sections.observation.title', [
      mkField('detail.sections.observation.item',   obsA?.code?.text,    obsB?.code?.text),
      mkField('detail.sections.observation.result', obsResultStr(obsA),  obsResultStr(obsB)),
      mkField('detail.sections.observation.status', obsA?.status,        obsB?.status),
    ], Boolean(obsA), Boolean(obsB)),

    mkSection('detail.sections.coverage.title', [
      mkField('detail.sections.coverage.type',          covA?.type?.text,     covB?.type?.text),
      mkField('detail.sections.coverage.insuranceId',   covA?.subscriberId,   covB?.subscriberId),
      mkField('detail.sections.coverage.effectiveDate', covA?.period?.start,  covB?.period?.start),
    ], Boolean(covA), Boolean(covB)),

    mkSection('detail.sections.medicationAndRequest.title', [
      mkField('detail.sections.medicationAndRequest.medicationName', medA?.code?.text,                                          medB?.code?.text),
      mkField('detail.sections.medicationAndRequest.medicationCode', medA?.code?.coding?.[0]?.code,                            medB?.code?.coding?.[0]?.code),
      mkField('detail.sections.medicationAndRequest.form',           medA?.form?.text,                                         medB?.form?.text),
      mkField('detail.sections.medicationAndRequest.dose',           mrA?.dosageInstruction?.[0]?.text,                        mrB?.dosageInstruction?.[0]?.text),
      mkField('detail.sections.medicationAndRequest.route',          mrA?.dosageInstruction?.[0]?.route?.coding?.[0]?.display, mrB?.dosageInstruction?.[0]?.route?.coding?.[0]?.display),
    ], Boolean(medA), Boolean(medB)),
  ]

  const sections = all.filter((s) => s.isPresent)
  const totalDifferences = sections.reduce(
    (sum, s) => sum + s.fields.filter((f) => f.isDifferent).length,
    0
  )

  return { sections, totalDifferences }
}
