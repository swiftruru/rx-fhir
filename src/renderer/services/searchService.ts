import type { BundleSummary } from '../types/fhir.d'

export function extractBundleSummary(bundle: fhir4.Bundle): BundleSummary | null {
  if (!bundle.id || bundle.resourceType !== 'Bundle') return null

  let patientName: string | undefined
  let patientIdentifier: string | undefined
  let organizationName: string | undefined
  let date: string | undefined
  const conditions: string[] = []
  const medications: string[] = []

  for (const entry of bundle.entry || []) {
    const resource = entry.resource
    if (!resource) continue

    switch (resource.resourceType) {
      case 'Patient': {
        const p = resource as fhir4.Patient
        patientName = p.name?.[0]?.text || p.name?.[0]?.family
        patientIdentifier = p.identifier?.[0]?.value
        break
      }
      case 'Organization': {
        const o = resource as fhir4.Organization
        organizationName = o.name
        break
      }
      case 'Composition': {
        const c = resource as fhir4.Composition
        date = c.date
        break
      }
      case 'Condition': {
        const c = resource as fhir4.Condition
        const code = c.code?.coding?.[0]?.display || c.code?.text || c.code?.coding?.[0]?.code
        if (code) conditions.push(code)
        break
      }
      case 'MedicationRequest': {
        const mr = resource as fhir4.MedicationRequest
        const medName =
          mr.medicationCodeableConcept?.text ||
          mr.medicationCodeableConcept?.coding?.[0]?.display
        if (medName) medications.push(medName)
        break
      }
      case 'Medication': {
        const m = resource as fhir4.Medication
        const medName = m.code?.text || m.code?.coding?.[0]?.display
        if (medName) medications.push(medName)
        break
      }
    }
  }

  return {
    id: bundle.id,
    date,
    patientName,
    patientIdentifier,
    organizationName,
    conditions,
    medications,
    raw: bundle
  }
}

export function extractSearchResults(searchBundle: fhir4.Bundle): BundleSummary[] {
  if (!searchBundle.entry) return []

  return searchBundle.entry
    .map((entry) => {
      const resource = entry.resource
      if (resource?.resourceType === 'Bundle') {
        return extractBundleSummary(resource as fhir4.Bundle)
      }
      return null
    })
    .filter((s): s is BundleSummary => s !== null)
}
