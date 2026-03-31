import type { CreatedResources } from '../types/fhir.d'

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function fullUrl(resource: fhir4.Resource): string {
  return `urn:uuid:${resource.id || generateUUID()}`
}

function toEntry(resource: fhir4.Resource): fhir4.BundleEntry {
  return {
    fullUrl: fullUrl(resource),
    resource: resource as fhir4.BundleEntry['resource']
  }
}

export function assembleDocumentBundle(
  resources: CreatedResources,
  composition: fhir4.Composition
): fhir4.Bundle {
  const entries: fhir4.BundleEntry[] = []

  // Composition MUST be the first entry
  entries.push(toEntry(composition))

  // Add all other created resources
  const {
    organization,
    patient,
    practitioner,
    encounter,
    condition,
    observation,
    coverage,
    medication,
    medicationRequest,
    extension
  } = resources

  if (patient) entries.push(toEntry(patient))
  if (organization) entries.push(toEntry(organization))
  if (practitioner) entries.push(toEntry(practitioner))
  if (encounter) entries.push(toEntry(encounter))
  if (condition) entries.push(toEntry(condition))
  if (observation) entries.push(toEntry(observation))
  if (coverage) entries.push(toEntry(coverage))
  if (medication) entries.push(toEntry(medication))
  if (medicationRequest) entries.push(toEntry(medicationRequest))
  if (extension) entries.push(toEntry(extension))

  const bundle: fhir4.Bundle = {
    resourceType: 'Bundle',
    type: 'document',
    timestamp: new Date().toISOString(),
    // Store patient identifier at Bundle level for reliable searching
    identifier: patient?.identifier?.[0] ? {
      system: patient.identifier[0].system,
      value: patient.identifier[0].value
    } : undefined,
    entry: entries,
    meta: {
      profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Bundle-EP']
    }
  }

  return bundle
}

export function buildComposition(
  resources: CreatedResources,
  title: string,
  date: string
): fhir4.Composition {
  const { patient, organization, practitioner, encounter, condition, observation } = resources

  const sections: fhir4.CompositionSection[] = []

  if (condition) {
    sections.push({
      title: '診斷',
      code: {
        coding: [{ system: 'http://loinc.org', code: '29548-5', display: 'Diagnosis' }]
      },
      entry: [{ reference: `${condition.resourceType}/${condition.id}` }]
    })
  }

  if (observation) {
    sections.push({
      title: '檢驗檢查',
      code: {
        coding: [{ system: 'http://loinc.org', code: '30954-2', display: 'Relevant diagnostic tests' }]
      },
      entry: [{ reference: `${observation.resourceType}/${observation.id}` }]
    })
  }

  const authorRef: fhir4.Reference = practitioner
    ? { reference: `Practitioner/${practitioner.id}` }
    : { display: 'Unknown Author' }

  const composition: fhir4.Composition = {
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
    date: date || new Date().toISOString(),
    subject: patient ? { reference: `Patient/${patient.id}` } : undefined,
    author: [authorRef],
    custodian: organization ? { reference: `Organization/${organization.id}` } : undefined,
    encounter: encounter ? { reference: `Encounter/${encounter.id}` } : undefined,
    section: sections,
    meta: {
      profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Composition-EP']
    }
  }

  return composition
}
