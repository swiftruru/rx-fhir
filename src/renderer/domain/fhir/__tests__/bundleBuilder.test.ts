import { describe, expect, it } from 'vitest'
import { assembleDocumentBundle, buildComposition } from '../bundleBuilder'

describe('bundleBuilder', () => {
  it('assembles a document bundle with Composition first and mirrored patient identifier', () => {
    const resources = {
      patient: {
        resourceType: 'Patient',
        id: 'patient-1',
        identifier: [{ system: 'https://hospital.example/patients', value: 'P-001' }],
        name: [{ text: 'Alice Example' }]
      } satisfies fhir4.Patient,
      organization: {
        resourceType: 'Organization',
        id: 'org-1',
        name: 'Example Hospital'
      } satisfies fhir4.Organization
    }

    const composition = buildComposition(resources, '電子處方箋', '2026-04-10T10:00:00Z')
    const bundle = assembleDocumentBundle(resources, composition)
    const bundledComposition = bundle.entry?.[0]?.resource as fhir4.Composition

    expect(bundle.resourceType).toBe('Bundle')
    expect(bundle.type).toBe('document')
    expect(bundledComposition.resourceType).toBe('Composition')
    expect(bundledComposition.title).toBe(composition.title)
    // Document Bundles keep ResourceType/id references for HAPI compatibility
    expect(bundledComposition.subject?.reference).toBe('Patient/patient-1')
    expect(bundledComposition.custodian?.reference).toBe('Organization/org-1')
    expect(bundle.identifier).toEqual({
      system: 'https://hospital.example/patients',
      value: 'P-001'
    })
    expect(bundle.entry).toHaveLength(3)
  })

  it('creates bundle-local urn:uuid fullUrls and rewires internal references for server-backed resources', () => {
    const resources = {
      patient: {
        resourceType: 'Patient',
        id: '250782',
        identifier: [{ system: 'https://hospital.example/patients', value: 'P-001' }],
        name: [{ text: 'Alice Example' }],
        meta: {
          profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Patient-EP'],
          source: '#server-generated-patient'
        }
      } satisfies fhir4.Patient,
      organization: {
        resourceType: 'Organization',
        id: '250781',
        name: 'Example Hospital',
        type: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/organization-type',
            code: 'HOSP',
            display: 'Hospital'
          }],
          text: '醫院'
        }],
        meta: {
          profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Organization-EP'],
          source: '#server-generated-organization'
        }
      } satisfies fhir4.Organization,
      practitioner: {
        resourceType: 'Practitioner',
        id: '250783',
        name: [{ text: 'Dr. Example' }]
      } satisfies fhir4.Practitioner,
      encounter: {
        resourceType: 'Encounter',
        id: '250806',
        status: 'finished',
        class: { code: 'AMB' },
        subject: { reference: 'Patient/250782' },
        serviceProvider: { reference: 'Organization/250781' },
        period: {
          start: '2026-03-19T10:55',
          end: '2026-03-19T11:05'
        }
      } satisfies fhir4.Encounter,
      observation: {
        resourceType: 'Observation',
        id: '250808',
        status: 'final',
        code: {
          coding: [{ system: 'http://loinc.org', code: '29463-7', display: 'Body weight' }],
          text: 'Body weight'
        },
        subject: { reference: 'Patient/250782' },
        encounter: { reference: 'Encounter/250806' },
        valueQuantity: {
          value: 54,
          unit: 'kg',
          system: 'http://unitsofmeasure.org'
        },
        meta: {
          profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Observation-EP']
        }
      } satisfies fhir4.Observation
      ,
      coverage: {
        resourceType: 'Coverage',
        id: '250787',
        status: 'active',
        subscriberId: 'COVERAGE-001',
        beneficiary: { reference: 'Patient/250782' },
        payor: [{ display: 'NHI' }],
        meta: {
          profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Coverage-EP']
        }
      } satisfies fhir4.Coverage,
      medication: {
        resourceType: 'Medication',
        id: '250788',
        code: {
          coding: [{ system: 'http://www.whocc.no/atc', code: 'A02BC01', display: 'Omeprazole' }],
          text: 'Omeprazole'
        }
      } satisfies fhir4.Medication,
      medicationRequest: {
        resourceType: 'MedicationRequest',
        id: '250809',
        status: 'active',
        intent: 'order',
        medicationReference: { reference: 'Medication/250788', display: 'Omeprazole' },
        subject: { reference: 'Patient/250782' },
        requester: { reference: 'Practitioner/250783' },
        encounter: { reference: 'Encounter/250806' }
      } satisfies fhir4.MedicationRequest,
      extension: {
        resourceType: 'Basic',
        id: '250810',
        code: {
          coding: [{
            system: 'https://twcore.mohw.gov.tw/ig/emr/CodeSystem/extension-type',
            code: 'care-note',
            display: 'Care Note'
          }],
          text: 'Care Note'
        },
        subject: { reference: 'Patient/250782' }
      } satisfies fhir4.Basic
    }

    const composition = buildComposition(resources, '電子處方箋', '2026-04-10T10:00:00Z')
    const bundle = assembleDocumentBundle(resources, composition)
    const compositionEntry = bundle.entry?.[0]!
    const patientEntry = bundle.entry?.find((entry) => entry.resource?.resourceType === 'Patient')!
    const organizationEntry = bundle.entry?.find((entry) => entry.resource?.resourceType === 'Organization')!
    const encounterEntry = bundle.entry?.find((entry) => entry.resource?.resourceType === 'Encounter')!
    const observationEntry = bundle.entry?.find((entry) => entry.resource?.resourceType === 'Observation')!
    const coverageEntry = bundle.entry?.find((entry) => entry.resource?.resourceType === 'Coverage')!
    const medicationRequestEntry = bundle.entry?.find((entry) => entry.resource?.resourceType === 'MedicationRequest')!
    const extensionEntry = bundle.entry?.find((entry) => entry.resource?.resourceType === 'Basic')
    const bundledComposition = compositionEntry.resource as fhir4.Composition
    const bundledEncounter = encounterEntry.resource as fhir4.Encounter
    const bundledPatient = patientEntry.resource as fhir4.Patient
    const bundledObservation = observationEntry.resource as fhir4.Observation
    const bundledOrganization = organizationEntry.resource as fhir4.Organization

    // All entries still get urn:uuid fullUrls for bundle-level identification
    expect(bundle.entry?.every((entry) => /^urn:uuid:[0-9a-f-]{36}$/.test(entry.fullUrl ?? ''))).toBe(true)
    // Document Bundles keep ResourceType/id references for HAPI compatibility
    // (HAPI rejects urn:uuid references in Document Bundles with HAPI-0505)
    expect(bundledComposition.subject?.reference).toBe('Patient/250782')
    expect(bundledComposition.custodian?.reference).toBe('Organization/250781')
    expect(bundledComposition.author?.map((author) => author.reference)).toEqual([
      'Organization/250781',
      'Practitioner/250783'
    ])
    expect(bundledComposition.encounter?.reference).toBe('Encounter/250806')
    expect(bundledComposition.section?.map((section) => section.code?.coding?.[0]?.code)).toEqual([
      '29762-2',
      '85353-1',
      '29551-9'
    ])
    expect(bundledComposition.section?.map((section) => section.entry?.map((entry) => entry.reference))).toEqual([
      ['Coverage/250787'],
      ['Observation/250808'],
      ['Medication/250788', 'MedicationRequest/250809']
    ])
    expect(bundledEncounter.subject?.reference).toBe('Patient/250782')
    expect(bundledEncounter.serviceProvider?.reference).toBe('Organization/250781')
    expect(bundledEncounter.period?.start).toMatch(/^2026-03-19T10:55:00(?:Z|[+-]\d{2}:\d{2})$/)
    expect(bundledEncounter.period?.end).toMatch(/^2026-03-19T11:05:00(?:Z|[+-]\d{2}:\d{2})$/)
    expect(bundledObservation.subject?.reference).toBe('Patient/250782')
    expect(bundledObservation.encounter?.reference).toBe('Encounter/250806')
    expect((bundledOrganization.type?.[0]?.coding?.[0]?.code)).toBe('prov')
    expect((bundledOrganization.type?.[0]?.coding?.[0]?.display)).toBe('Healthcare Provider')
    expect((medicationRequestEntry.resource as fhir4.MedicationRequest).medicationReference?.reference).toBe('Medication/250788')
    expect(bundledComposition.text?.status).toBe('generated')
    expect(bundledComposition.text?.div).toContain('xmlns="http://www.w3.org/1999/xhtml"')
    expect(bundledPatient.meta?.profile).toEqual(['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Patient-EP'])
    expect((coverageEntry.resource as fhir4.Coverage).meta?.profile).toEqual(['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Coverage-EMR'])
    expect((observationEntry.resource as fhir4.Observation).meta?.profile).toEqual(['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Observation-EP-BodyWeight'])
    expect(bundledPatient.meta).not.toHaveProperty('source')
    expect(extensionEntry).toBeUndefined()
  })
})
