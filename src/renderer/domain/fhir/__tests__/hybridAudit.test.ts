import { afterEach, describe, expect, it, vi } from 'vitest'
import { assembleDocumentBundle, buildComposition } from '../bundleBuilder'
import { runHybridBundleAudit } from '../validation'
import { useFhirInspectorStore } from '../../../features/creator/store/fhirInspectorStore'

function buildBundleForHybridAudit(): fhir4.Bundle {
  const resources = {
    organization: {
      resourceType: 'Organization',
      id: 'org-1',
      name: 'Hybrid Clinic',
      identifier: [{ value: 'ORG-HYBRID' }],
      meta: { profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Organization-EP'] }
    } satisfies fhir4.Organization,
    patient: {
      resourceType: 'Patient',
      id: 'patient-1',
      identifier: [{ value: 'PAT-HYBRID' }],
      name: [{ text: 'Hybrid Patient' }],
      meta: { profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Patient-EP'] }
    } satisfies fhir4.Patient,
    practitioner: {
      resourceType: 'Practitioner',
      id: 'practitioner-1',
      name: [{ text: 'Dr. Hybrid' }],
      meta: { profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Practitioner-EP'] }
    } satisfies fhir4.Practitioner,
    encounter: {
      resourceType: 'Encounter',
      id: 'encounter-1',
      status: 'finished',
      class: { code: 'AMB' },
      meta: { profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Encounter-EP'] }
    } satisfies fhir4.Encounter,
    medication: {
      resourceType: 'Medication',
      id: 'medication-1',
      code: { coding: [{ code: 'N02BE01', display: 'Acetaminophen' }], text: 'Acetaminophen' },
      meta: { profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Medication-EP'] }
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
      meta: { profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/MedicationRequest-EP'] }
    } satisfies fhir4.MedicationRequest
  }

  return {
    ...assembleDocumentBundle(resources, buildComposition(resources, 'Hybrid Bundle', '2026-04-11T10:00:00Z')),
    id: 'bundle-hybrid'
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  useFhirInspectorStore.getState().clear()
})

describe('runHybridBundleAudit', () => {
  it('merges server validation issues into the local audit report', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      resourceType: 'OperationOutcome',
      issue: [
        {
          severity: 'warning',
          code: 'business-rule',
          diagnostics: 'Server warning from $validate.',
          expression: ['Bundle.entry[0].resource']
        }
      ]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/fhir+json' }
    })))

    const report = await runHybridBundleAudit(buildBundleForHybridAudit())

    expect(report.status).toBe('hybrid')
    expect(report.sources.server.status).toBe('completed')
    expect(report.issues.some((issue) => issue.source === 'server' && issue.message.includes('Server warning'))).toBe(true)
  })

  it('falls back to local-only when server validation is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      resourceType: 'OperationOutcome',
      issue: [
        {
          severity: 'information',
          code: 'not-supported',
          diagnostics: 'Bundle $validate is not supported.'
        }
      ]
    }), {
      status: 501,
      statusText: 'Not Implemented',
      headers: { 'Content-Type': 'application/fhir+json' }
    })))

    const report = await runHybridBundleAudit(buildBundleForHybridAudit())

    expect(report.status).toBe('local-only')
    expect(report.sources.server.status).toBe('unavailable')
    expect(report.issues.some((issue) => issue.source === 'server' && issue.severity === 'info')).toBe(true)
  })

  it('downgrades server environment limitation messages to info', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      resourceType: 'OperationOutcome',
      issue: [
        {
          severity: 'error',
          code: 'exception',
          diagnostics: "Profile reference 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Patient-EP' has not been checked because it could not be found, and the validator is set to not fetch unknown profiles",
          expression: ['Bundle.entry[1].resource.meta.profile[0]']
        },
        {
          severity: 'warning',
          code: 'business-rule',
          diagnostics: "CodeSystem is unknown and can't be validated: http://loinc.org for 'http://loinc.org#57833-6'",
          expression: ['Bundle.entry[0].resource.type']
        },
        {
          severity: 'warning',
          code: 'business-rule',
          diagnostics: "None of the codings provided are in the value set 'FHIR Document Type Codes' (http://hl7.org/fhir/ValueSet/doc-typecodes|4.0.1), and a coding is recommended to come from this value set (codes = http://loinc.org#57833-6)",
          expression: ['Bundle.entry[0].resource.type']
        },
        {
          severity: 'warning',
          code: 'business-rule',
          diagnostics: "Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation)",
          expression: ['Bundle.entry[1].resource']
        },
        {
          severity: 'error',
          code: 'structure',
          diagnostics: "Unable to resolve the profile reference 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Patient-EP'",
          expression: ['Bundle.entry[0].resource/*Composition/example*/.subject']
        },
        {
          severity: 'error',
          code: 'structure',
          diagnostics: 'Invalid Resource target type. Found Patient, but expected one of ([Group, Device, Substance])',
          expression: ['Bundle.entry[0].resource/*Composition/example*/.subject']
        },
        {
          severity: 'error',
          code: 'processing',
          diagnostics: "Slicing cannot be evaluated: Problem evaluating slicing expression for element in profile https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Composition-EP|0.1.0 path Bundle.entry[0].resource/*Composition/example*/.section[3].entry[0] (fhirPath = true and resolve().conformsTo('https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Medication-EP')): Unable to resolve the reference https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Medication-EP",
          expression: ['Bundle.entry[0].resource/*Composition/example*/.section[3].entry[0]']
        },
        {
          severity: 'warning',
          code: 'processing',
          diagnostics: 'Composition.section:MedicationPrescribed.entry:Medication: Found 0 matches, but unable to check minimum required (Composition.section.entry) due to lack of slicing validation (from https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Composition-EP|0.1.0)',
          expression: ['Bundle.entry[0].resource/*Composition/example*/.section[3]']
        }
      ]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/fhir+json' }
    })))

    const report = await runHybridBundleAudit(buildBundleForHybridAudit())

    expect(report.status).toBe('hybrid')
    expect(report.errorCount).toBe(0)
    expect(report.warningCount).toBe(0)
    expect(report.infoCount).toBeGreaterThanOrEqual(8)
    expect(report.sources.server.message).toContain('downgraded to info')
  })
})
