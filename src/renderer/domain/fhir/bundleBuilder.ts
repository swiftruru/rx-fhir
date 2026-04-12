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

const DOCUMENT_SECTIONS = {
  coverage: {
    title: '保險資訊',
    system: 'http://loinc.org',
    code: '29762-2',
    display: 'Social history Narrative'
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
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
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

function createBundleScopedReference(fullUrl?: string, fallback?: fhir4.Reference): fhir4.Reference | undefined {
  if (!fullUrl) return fallback
  return {
    ...fallback,
    reference: fullUrl
  }
}

function buildBundleScopedFullUrls(resourceMap: Partial<BundleResourceMap>): Partial<Record<BundleResourceKey, string>> {
  const fullUrls: Partial<Record<BundleResourceKey, string>> = {}

  for (const [key, resource] of Object.entries(resourceMap) as Array<[BundleResourceKey, fhir4.Resource | undefined]>) {
    if (resource) {
      fullUrls[key] = createBundleScopedFullUrl()
    }
  }

  return fullUrls
}

function buildReferenceLookup(
  resourceMap: Partial<BundleResourceMap>,
  fullUrls: Partial<Record<BundleResourceKey, string>>
): Map<string, string> {
  const lookup = new Map<string, string>()

  for (const [key, resource] of Object.entries(resourceMap) as Array<[BundleResourceKey, fhir4.Resource | undefined]>) {
    const fullUrl = fullUrls[key]
    if (resource?.resourceType && resource.id && fullUrl) {
      lookup.set(`${resource.resourceType}/${resource.id}`, fullUrl)
    }
  }

  return lookup
}

function normalizeBundleResources(
  resourceMap: Partial<BundleResourceMap>,
  fullUrls: Partial<Record<BundleResourceKey, string>>
): Partial<BundleResourceMap> {
  const normalized: Partial<BundleResourceMap> = {}
  const referenceLookup = buildReferenceLookup(resourceMap, fullUrls)

  const patient = resourceMap.patient ? normalizeLegacyProfiles(sanitizeResource(resourceMap.patient)) : undefined
  const organization = resourceMap.organization ? normalizeLegacyProfiles(normalizeLegacyOrganizationType(sanitizeResource(resourceMap.organization))) : undefined
  const practitioner = resourceMap.practitioner ? normalizeLegacyProfiles(sanitizeResource(resourceMap.practitioner)) : undefined
  const encounter = resourceMap.encounter ? normalizeLegacyProfiles(sanitizeResource(resourceMap.encounter)) : undefined
  const condition = resourceMap.condition ? normalizeLegacyProfiles(sanitizeResource(resourceMap.condition)) : undefined
  const observation = resourceMap.observation ? normalizeLegacyProfiles(sanitizeResource(resourceMap.observation)) : undefined
  const coverage = resourceMap.coverage ? normalizeLegacyProfiles(sanitizeResource(resourceMap.coverage)) : undefined
  const medication = resourceMap.medication ? normalizeLegacyProfiles(sanitizeResource(resourceMap.medication)) : undefined
  const medicationRequest = resourceMap.medicationRequest ? normalizeLegacyProfiles(sanitizeResource(resourceMap.medicationRequest)) : undefined
  const extension = resourceMap.extension ? normalizeLegacyProfiles(sanitizeResource(resourceMap.extension)) : undefined
  const composition = normalizeLegacyProfiles(sanitizeResource(resourceMap.composition!))

  if (encounter) {
    encounter.subject = createBundleScopedReference(fullUrls.patient, encounter.subject)
    encounter.serviceProvider = createBundleScopedReference(fullUrls.organization, encounter.serviceProvider)
    if (encounter.period) {
      encounter.period = {
        ...encounter.period,
        ...(encounter.period.start ? { start: toFhirDateTime(encounter.period.start) } : {}),
        ...(encounter.period.end ? { end: toFhirDateTime(encounter.period.end) } : {})
      }
    }
  }

  if (condition) {
    condition.subject = createBundleScopedReference(fullUrls.patient, condition.subject) ?? condition.subject
    condition.encounter = createBundleScopedReference(fullUrls.encounter, condition.encounter)
  }

  if (observation) {
    observation.subject = createBundleScopedReference(fullUrls.patient, observation.subject)
    observation.encounter = createBundleScopedReference(fullUrls.encounter, observation.encounter)
    if (!(observation.performer?.length)) {
      const performerRef = createBundleScopedReference(fullUrls.practitioner) ?? createBundleScopedReference(fullUrls.organization)
      if (performerRef) {
        observation.performer = [performerRef]
      }
    }
    if (observation.effectiveDateTime) {
      observation.effectiveDateTime = toFhirDateTime(observation.effectiveDateTime)
    }
  }

  if (coverage) {
    coverage.subscriber = createBundleScopedReference(fullUrls.patient, coverage.subscriber)
    coverage.beneficiary = createBundleScopedReference(fullUrls.patient, coverage.beneficiary) ?? coverage.beneficiary
  }

  if (medicationRequest) {
    medicationRequest.medicationReference = createBundleScopedReference(fullUrls.medication, medicationRequest.medicationReference)
    medicationRequest.subject = createBundleScopedReference(fullUrls.patient, medicationRequest.subject) ?? medicationRequest.subject
    medicationRequest.requester = createBundleScopedReference(fullUrls.practitioner, medicationRequest.requester)
    medicationRequest.encounter = createBundleScopedReference(fullUrls.encounter, medicationRequest.encounter)
  }

  if (extension) {
    extension.subject = createBundleScopedReference(fullUrls.patient, extension.subject)
  }

  composition.subject = createBundleScopedReference(fullUrls.patient, composition.subject)
  composition.author = composition.author?.length
    ? composition.author.map((author) => {
        const mappedReference = author.reference ? referenceLookup.get(author.reference) : undefined
        return mappedReference ? { ...author, reference: mappedReference } : author
      })
    : composition.author
  composition.custodian = createBundleScopedReference(fullUrls.organization, composition.custodian)
  composition.encounter = createBundleScopedReference(fullUrls.encounter, composition.encounter)
  composition.section = composition.section?.map((section) => ({
    ...section,
    entry: section.entry?.map((entry) => {
      const mappedReference = entry.reference ? referenceLookup.get(entry.reference) : undefined
      return mappedReference ? { ...entry, reference: mappedReference } : entry
    })
  }))

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

export function assembleDocumentBundle(
  resources: CreatedResources,
  composition: fhir4.Composition
): fhir4.Bundle {
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
  const fullUrls = buildBundleScopedFullUrls(bundleResources)
  const normalizedResources = normalizeBundleResources(bundleResources, fullUrls)
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
