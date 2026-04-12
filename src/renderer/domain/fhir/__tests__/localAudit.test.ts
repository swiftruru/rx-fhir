import { describe, expect, it } from 'vitest'
import { assembleDocumentBundle, buildComposition } from '../bundleBuilder'
import { runLocalBundleAudit } from '../validation'

function buildValidBundle(): fhir4.Bundle {
  const resources = {
    organization: {
      resourceType: 'Organization',
      id: 'org-1',
      name: 'Audit Clinic',
      identifier: [{ value: 'ORG-001' }],
      meta: {
        profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Organization-EP']
      }
    } satisfies fhir4.Organization,
    patient: {
      resourceType: 'Patient',
      id: 'patient-1',
      identifier: [{ value: 'PAT-001' }],
      name: [{ text: 'Audit Patient' }],
      meta: {
        profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Patient-EP']
      }
    } satisfies fhir4.Patient,
    practitioner: {
      resourceType: 'Practitioner',
      id: 'practitioner-1',
      identifier: [{ value: 'DOC-001' }],
      name: [{ text: 'Dr. Audit' }],
      meta: {
        profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Practitioner-EP']
      }
    } satisfies fhir4.Practitioner,
    encounter: {
      resourceType: 'Encounter',
      id: 'encounter-1',
      status: 'finished',
      class: { code: 'AMB' },
      meta: {
        profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Encounter-EP']
      }
    } satisfies fhir4.Encounter,
    condition: {
      resourceType: 'Condition',
      id: 'condition-1',
      subject: { reference: 'Patient/patient-1' },
      encounter: { reference: 'Encounter/encounter-1' },
      code: {
        coding: [{ code: 'J06.9', display: 'Acute upper respiratory infection' }],
        text: 'Acute upper respiratory infection'
      },
      meta: {
        profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Condition-EP']
      }
    } satisfies fhir4.Condition,
    observation: {
      resourceType: 'Observation',
      id: 'observation-1',
      status: 'final',
      subject: { reference: 'Patient/patient-1' },
      encounter: { reference: 'Encounter/encounter-1' },
      code: {
        coding: [{ system: 'http://loinc.org', code: '29463-7', display: 'Body weight' }],
        text: 'Body weight'
      },
      valueQuantity: { value: 72, unit: 'kg' },
      meta: {
        profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Observation-EP-BodyWeight']
      }
    } satisfies fhir4.Observation,
    coverage: {
      resourceType: 'Coverage',
      id: 'coverage-1',
      status: 'active',
      identifier: [{ value: 'NHI-001' }],
      subscriberId: 'NHI-001',
      beneficiary: { reference: 'Patient/patient-1' },
      payor: [{ reference: 'Organization/org-1' }],
      meta: {
        profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Coverage-EMR']
      }
    } satisfies fhir4.Coverage,
    medication: {
      resourceType: 'Medication',
      id: 'medication-1',
      code: {
        coding: [{ code: 'N02BE01', display: 'Acetaminophen' }],
        text: 'Acetaminophen'
      },
      meta: {
        profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Medication-EP']
      }
    } satisfies fhir4.Medication,
    medicationRequest: {
      resourceType: 'MedicationRequest',
      id: 'medication-request-1',
      status: 'active',
      intent: 'order',
      subject: { reference: 'Patient/patient-1' },
      encounter: { reference: 'Encounter/encounter-1' },
      requester: { reference: 'Practitioner/practitioner-1' },
      medicationReference: { reference: 'Medication/medication-1' },
      meta: {
        profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/MedicationRequest-EP']
      }
    } satisfies fhir4.MedicationRequest
  }

  const composition = buildComposition(resources, 'Audit Prescription', '2026-04-11T10:00:00Z')
  const bundle = assembleDocumentBundle(resources, composition)

  return {
    ...bundle,
    id: 'bundle-1'
  }
}

describe('runLocalBundleAudit', () => {
  it('normalizes datetime-local Composition.date into a FHIR dateTime', () => {
    const composition = buildComposition({}, 'Audit Prescription', '2026-03-19T10:55')

    expect(composition.date).toMatch(/^2026-03-19T10:55:00(?:Z|[+-]\d{2}:\d{2})$/)
  })

  it('passes a structurally valid document bundle', () => {
    const report = runLocalBundleAudit(buildValidBundle())

    expect(report.hasBlockingErrors).toBe(false)
    expect(report.errorCount).toBe(0)
    expect(report.warningCount).toBe(0)
  })

  it('reports structural bundle errors and step mapping', () => {
    const validBundle = buildValidBundle()
    const patient = validBundle.entry?.find((entry) => entry.resource?.resourceType === 'Patient')?.resource as fhir4.Patient
    const composition = validBundle.entry?.find((entry) => entry.resource?.resourceType === 'Composition')?.resource as fhir4.Composition

    const invalidBundle: fhir4.Bundle = {
      ...validBundle,
      type: 'collection',
      entry: [
        { resource: { ...patient, id: undefined } },
        { resource: { ...composition, subject: { reference: 'Patient/missing-patient' } } },
        ...(validBundle.entry ?? []).filter((entry) => !['Patient', 'Composition'].includes(entry.resource?.resourceType ?? ''))
      ]
    }

    const report = runLocalBundleAudit(invalidBundle)

    expect(report.hasBlockingErrors).toBe(true)
    expect(report.issues.some((issue) => issue.message.includes('Bundle.type must be "document"'))).toBe(true)
    expect(report.issues.some((issue) => issue.message.includes('first Bundle entry must be a Composition'))).toBe(true)
    expect(report.issues.some((issue) => issue.stepKey === 'patient' && issue.fieldPath === 'entry[0].resource.id')).toBe(true)
    expect(report.issues.some((issue) => issue.stepKey === 'composition' && issue.fieldPath === 'subject.reference')).toBe(true)
  })

  it('reports invalid Composition.date values before server validation', () => {
    const invalidBundle = buildValidBundle()
    const composition = invalidBundle.entry?.find((entry) => entry.resource?.resourceType === 'Composition')?.resource as fhir4.Composition
    composition.date = '2026-03-19T10:55'

    const report = runLocalBundleAudit(invalidBundle)

    expect(report.hasBlockingErrors).toBe(true)
    expect(report.issues.some((issue) => issue.stepKey === 'composition' && issue.fieldPath === 'date')).toBe(true)
  })
})
