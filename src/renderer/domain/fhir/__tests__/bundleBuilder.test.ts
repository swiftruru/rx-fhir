import { describe, expect, it } from 'vitest'
import {
  assembleDocumentBundle,
  buildComposition,
  hardenResourceForServer,
  resolveBundleAssemblyMode,
  shouldConvertBundleToSelfContainedExport,
  toSelfContainedExportBundle
} from '../bundleBuilder'

describe('hardenResourceForServer', () => {
  it('adds the TW Core required telecom, address, and narrative to a bare Organization', () => {
    const hardened = hardenResourceForServer({
      resourceType: 'Organization',
      active: true,
      name: '馬偕紀念醫院',
      identifier: [{ system: 'https://twcore.mohw.gov.tw/ig/emr/CodeSystem/organization-identifier', value: 'MMHF001' }],
      meta: { profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Organization-EP'] }
    } satisfies fhir4.Organization)

    expect(hardened.telecom?.length).toBeGreaterThanOrEqual(1)
    expect(hardened.address?.length).toBeGreaterThanOrEqual(1)
    expect(hardened.text?.status).toBe('generated')
    expect(hardened.text?.div).toContain('xhtml')
  })

  it('does not mutate the input resource', () => {
    const original: fhir4.Organization = {
      resourceType: 'Organization',
      name: 'Clinic',
      identifier: [{ value: 'C-1' }]
    }
    hardenResourceForServer(original)
    expect(original.telecom).toBeUndefined()
    expect(original.address).toBeUndefined()
    expect(original.text).toBeUndefined()
  })

  it('passes Bundles through untouched', () => {
    const bundle: fhir4.Bundle = { resourceType: 'Bundle', type: 'document', entry: [] }
    expect(hardenResourceForServer(bundle)).toBe(bundle)
  })
})

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

  it('IG cardinality enrichers fill missing required fields without overwriting existing data', () => {
    const resources = {
      patient: {
        resourceType: 'Patient',
        id: 'p1',
        identifier: [{ system: 'https://hospital.example/patients', value: 'P-001' }],
        name: [{ text: 'Alice Example' }],
        birthDate: '2000-06-09'
      } satisfies fhir4.Patient,
      organization: {
        resourceType: 'Organization',
        id: 'o1',
        name: 'Example Hospital'
      } satisfies fhir4.Organization,
      practitioner: { resourceType: 'Practitioner', id: 'pr1', name: [{ text: 'Dr.' }] } satisfies fhir4.Practitioner,
      encounter: {
        resourceType: 'Encounter',
        id: 'e1',
        status: 'finished',
        class: { code: 'AMB' },
        subject: { reference: 'Patient/p1' },
        period: { start: '2026-03-19T10:55', end: '2026-03-19T11:05' }
      } satisfies fhir4.Encounter,
      condition: {
        resourceType: 'Condition',
        id: 'c1',
        code: {
          coding: [{ system: 'http://hl7.org/fhir/sid/icd-10', code: 'K21.9', display: 'GERD' }],
          text: 'GERD'
        },
        subject: { reference: 'Patient/p1' }
      } satisfies fhir4.Condition,
      observation: {
        resourceType: 'Observation',
        id: 'ob1',
        status: 'final',
        code: { coding: [{ system: 'http://loinc.org', code: '29463-7', display: 'Body weight' }] },
        valueQuantity: { value: 54, unit: 'kg', system: 'http://unitsofmeasure.org' },
        subject: { reference: 'Patient/p1' }
      } satisfies fhir4.Observation,
      coverage: {
        resourceType: 'Coverage',
        id: 'cov1',
        status: 'active',
        beneficiary: { reference: 'Patient/p1' },
        payor: [{ display: 'NHI' }]
      } satisfies fhir4.Coverage,
      medication: {
        resourceType: 'Medication',
        id: 'm1',
        code: { coding: [{ system: 'http://www.whocc.no/atc', code: 'A02BC01', display: 'omeprazole' }] }
      } satisfies fhir4.Medication,
      medicationRequest: {
        resourceType: 'MedicationRequest',
        id: 'mr1',
        status: 'active',
        intent: 'order',
        identifier: [{ system: 'https://rxfhir.app/fhir/medication-request-key', value: 'k1' }],
        medicationReference: { reference: 'Medication/m1' },
        subject: { reference: 'Patient/p1' },
        dosageInstruction: [{
          text: '20 mg QD',
          timing: { code: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-GTSAbbreviation', code: 'QD' }] } }
        }],
        dispenseRequest: { expectedSupplyDuration: { value: 14, unit: 'd', system: 'http://unitsofmeasure.org', code: 'd' } }
      } satisfies fhir4.MedicationRequest
    }

    const composition = buildComposition(resources, '電子處方箋', '2026-04-10T10:55:00')
    const bundle = assembleDocumentBundle(resources, composition, { mode: 'export' })

    const patientEntry = bundle.entry?.find((e) => e.resource?.resourceType === 'Patient')!
    const organizationEntry = bundle.entry?.find((e) => e.resource?.resourceType === 'Organization')!
    const encounterEntry = bundle.entry?.find((e) => e.resource?.resourceType === 'Encounter')!
    const conditionEntry = bundle.entry?.find((e) => e.resource?.resourceType === 'Condition')!
    const observationEntry = bundle.entry?.find((e) => e.resource?.resourceType === 'Observation')!
    const medicationRequestEntry = bundle.entry?.find((e) => e.resource?.resourceType === 'MedicationRequest')!

    const bundledPatient = patientEntry.resource as fhir4.Patient
    const bundledOrg = organizationEntry.resource as fhir4.Organization
    const bundledEncounter = encounterEntry.resource as fhir4.Encounter
    const bundledCondition = conditionEntry.resource as fhir4.Condition
    const bundledObservation = observationEntry.resource as fhir4.Observation
    const bundledMedReq = medicationRequestEntry.resource as fhir4.MedicationRequest

    // Patient gets person-age extension derived from birthDate
    expect(bundledPatient.extension?.some((ext) =>
      ext.url === 'https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/person-age'
      && ext.valueAge?.code === 'a'
    )).toBe(true)

    // Organization fallback telecom + address
    expect(bundledOrg.telecom?.[0]?.system).toBe('phone')
    expect(bundledOrg.address?.[0]?.text).toBe('unknown')

    // Encounter class maps HL7 AMB → TW CaseType 01; serviceType filled when missing
    expect(bundledEncounter.class?.system).toBe('https://standard-interoperability-lab.com/fhir/CodeSystem/casetype')
    expect(bundledEncounter.class?.code).toBe('01')
    expect(bundledEncounter.serviceType?.coding?.[0]?.code).toBe('124')

    // Condition: category, note, ICD-10-CM slice
    expect(bundledCondition.category?.[0]?.coding?.[0]?.code).toBe('problem-list-item')
    expect(bundledCondition.note?.[0]?.text).toBeTruthy()
    expect(bundledCondition.code?.coding).toEqual([{
      system: 'https://twcore.mohw.gov.tw/ig/twcore/CodeSystem/icd-10-cm-2021-tw',
      code: 'K21.9',
      display: '胃食道逆性疾病未伴有食道炎'
    }])

    // Observation: VSCat + UCUM code on valueQuantity
    expect(bundledObservation.category?.[0]?.coding?.[0]?.code).toBe('vital-signs')
    expect(bundledObservation.valueQuantity?.code).toBe('kg')

    // MedicationRequest: 2nd identifier, category, insurance, timing.repeat, dispense fields
    expect(bundledMedReq.identifier?.length).toBeGreaterThanOrEqual(2)
    expect(bundledMedReq.extension?.some((ext) => (
      ext.url === 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Extension-TotalDuration'
    ))).toBe(true)
    expect(bundledMedReq.category?.[0]?.coding?.[0]).toEqual({
      system: 'https://twcore.mohw.gov.tw/ig/emr/CodeSystem/prescription',
      code: 'B',
      display: '慢性病處方箋'
    })
    expect(bundledMedReq.insurance?.[0]?.reference).toBeTruthy()
    expect(bundledMedReq.dosageInstruction?.[0]?.timing?.repeat?.frequency).toBe(1)
    expect(bundledMedReq.dispenseRequest?.numberOfRepeatsAllowed).toBe(0)
    expect(bundledMedReq.dispenseRequest?.quantity?.value).toBeGreaterThanOrEqual(1)
    expect(bundledMedReq.dispenseRequest?.validityPeriod?.start).toBeTruthy()
  })

  it('export mode emits urn:uuid fullUrls and rewrites internal references', () => {
    const resources = {
      patient: {
        resourceType: 'Patient',
        id: '250782',
        identifier: [{ system: 'https://hospital.example/patients', value: 'P-001' }],
        name: [{ text: 'Alice Example' }]
      } satisfies fhir4.Patient,
      organization: {
        resourceType: 'Organization',
        id: '250781',
        name: 'Example Hospital'
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
        period: { start: '2026-03-19T10:55', end: '2026-03-19T11:05' }
      } satisfies fhir4.Encounter
    }

    const composition = buildComposition(resources, '電子處方箋', '2026-04-10T10:55:00')
    const bundle = assembleDocumentBundle(resources, composition, {
      serverBaseUrl: 'https://hapi.example/fhir',
      mode: 'export'
    })

    const compositionEntry = bundle.entry?.[0]!
    const patientEntry = bundle.entry?.find((entry) => entry.resource?.resourceType === 'Patient')!
    const encounterEntry = bundle.entry?.find((entry) => entry.resource?.resourceType === 'Encounter')!
    const bundledComposition = compositionEntry.resource as fhir4.Composition
    const bundledEncounter = encounterEntry.resource as fhir4.Encounter

    // Every entry uses lowercase v4 urn:uuid (no absolute URLs even with serverBaseUrl)
    expect(bundle.entry?.every((entry) => /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(entry.fullUrl ?? ''))).toBe(true)

    // Composition references resolve via urn:uuid back to the matching entry fullUrls
    expect(bundledComposition.subject?.reference).toBe(patientEntry.fullUrl)
    expect(bundledComposition.encounter?.reference).toBe(encounterEntry.fullUrl)

    // Encounter internal references rewritten too
    expect(bundledEncounter.subject?.reference).toBe(patientEntry.fullUrl)

    // Composition.date gains a timezone (regression: dateTime without TZ broke validators)
    expect(bundledComposition.date).toMatch(/^2026-04-10T10:55:00(?:Z|[+-]\d{2}:\d{2})$/)
  })

  it('toSelfContainedExportBundle converts a HAPI-retrieved Bundle to urn:uuid form with matching internal references', () => {
    // Simulate the shape that HAPI returns after a Document Bundle POST: Composition
    // sits at urn:uuid while Patient/Org/Encounter use absolute server URLs and
    // relative `ResourceType/id` references — the form that fails external validators.
    const hapiBundle: fhir4.Bundle = {
      resourceType: 'Bundle',
      id: '132015363',
      type: 'document',
      meta: {
        versionId: '1',
        lastUpdated: '2026-05-07T11:29:31.566+00:00',
        source: '#noise',
        profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Bundle-EP']
      },
      timestamp: '2026-05-07T11:29:29.912Z',
      entry: [
        {
          fullUrl: 'urn:uuid:98f057b0-a620-4b81-9d79-6df80826fdeb',
          resource: {
            resourceType: 'Composition',
            id: 'comp-1',
            status: 'final',
            type: { coding: [{ system: 'http://loinc.org', code: '57833-6', display: 'Prescription for medication' }] },
            subject: { reference: 'Patient/132015357' },
            encounter: { reference: 'Encounter/132015358' },
            author: [{ reference: 'Organization/131580890' }],
            custodian: { reference: 'Organization/131580890' },
            date: '2026-04-14T10:55:00+08:00',
            title: 'Outpatient',
            section: [{
              code: { coding: [{ system: 'http://loinc.org', code: '48768-6', display: 'Payment sources Document' }] },
              entry: [{ reference: 'Coverage/131602373' }]
            }]
          } satisfies fhir4.Composition
        },
        {
          fullUrl: 'https://hapi.fhir.org/baseR4/Patient/132015357',
          resource: {
            resourceType: 'Patient',
            id: '132015357',
            meta: { versionId: '3', lastUpdated: '2026-04-01T00:00:00Z', source: '#noise' }
          } satisfies fhir4.Patient
        },
        {
          fullUrl: 'https://hapi.fhir.org/baseR4/Organization/131580890',
          resource: { resourceType: 'Organization', id: '131580890', name: 'NTUH' } satisfies fhir4.Organization
        },
        {
          fullUrl: 'https://hapi.fhir.org/baseR4/Encounter/132015358',
          resource: { resourceType: 'Encounter', id: '132015358', status: 'finished', class: { code: 'AMB' } } satisfies fhir4.Encounter
        },
        {
          fullUrl: 'https://hapi.fhir.org/baseR4/Coverage/131602373',
          resource: { resourceType: 'Coverage', id: '131602373', status: 'active', payor: [{ display: 'NHI' }], beneficiary: { reference: 'Patient/132015357' } } satisfies fhir4.Coverage
        }
      ]
    }

    const exportable = toSelfContainedExportBundle(hapiBundle)

    // Every entry now has a urn:uuid fullUrl
    expect(exportable.entry?.every((e) => /^urn:uuid:[0-9a-f-]{36}$/.test(e.fullUrl ?? ''))).toBe(true)

    const compEntry = exportable.entry?.[0]!
    const patientEntry = exportable.entry?.find((e) => e.resource?.resourceType === 'Patient')!
    const orgEntry = exportable.entry?.find((e) => e.resource?.resourceType === 'Organization')!
    const encounterEntry = exportable.entry?.find((e) => e.resource?.resourceType === 'Encounter')!
    const coverageEntry = exportable.entry?.find((e) => e.resource?.resourceType === 'Coverage')!
    const bundledComp = compEntry.resource as fhir4.Composition
    const bundledCoverage = coverageEntry.resource as fhir4.Coverage

    // Composition references resolve to entry urn:uuids inside the same Bundle
    expect(bundledComp.subject?.reference).toBe(patientEntry.fullUrl)
    expect(bundledComp.encounter?.reference).toBe(encounterEntry.fullUrl)
    expect(bundledComp.custodian?.reference).toBe(orgEntry.fullUrl)
    expect(bundledComp.author?.[0]?.reference).toBe(orgEntry.fullUrl)
    expect(bundledComp.section?.[0]?.entry?.[0]?.reference).toBe(coverageEntry.fullUrl)

    // Cross-entry references inside non-Composition resources are also rewritten
    expect(bundledCoverage.beneficiary?.reference).toBe(patientEntry.fullUrl)

    // HAPI meta noise is stripped from Bundle and entries
    expect(exportable.meta).not.toHaveProperty('versionId')
    expect(exportable.meta).not.toHaveProperty('lastUpdated')
    expect(exportable.meta).not.toHaveProperty('source')
    // Patient.meta becomes undefined (only had source/versionId/lastUpdated, all stripped)
    expect(patientEntry.resource?.meta?.source).toBeUndefined()
  })

  it('toSelfContainedExportBundle preserves Extension-TotalDuration on MedicationRequest', () => {
    const hapiBundle: fhir4.Bundle = {
      resourceType: 'Bundle',
      type: 'document',
      entry: [
        {
          fullUrl: 'urn:uuid:c11c3f9f-6152-4670-8604-001a82c9ea99',
          resource: {
            resourceType: 'MedicationRequest',
            id: 'mr-1',
            status: 'active',
            intent: 'order',
            extension: [
              {
                url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Extension-TotalDuration',
                valueQuantity: { value: 14, unit: 'days', system: 'http://unitsofmeasure.org', code: 'd' }
              }
            ],
            subject: { reference: 'Patient/p-1' },
            medicationReference: { reference: 'Medication/m-1' }
          } satisfies fhir4.MedicationRequest
        }
      ]
    }

    const exportable = toSelfContainedExportBundle(hapiBundle)
    const medReq = exportable.entry?.[0]?.resource as fhir4.MedicationRequest
    expect(medReq.extension?.some((e) => e.url === 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Extension-TotalDuration')).toBe(true)
  })

  it('enrichPatient keeps only one medicalRecord identifier for TW Patient-EP', () => {
    const resources = {
      patient: {
        resourceType: 'Patient',
        id: 'patient-1',
        identifier: [
          {
            system: 'https://rxfhir.app/fhir/medical-record-number',
            value: 'MR-001',
            type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'MR' }] }
          },
          {
            system: 'https://www.moe.edu.tw/student-id',
            value: 'S1101001',
            type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'MR' }] }
          }
        ],
        name: [{ text: 'Alice Example' }],
        birthDate: '2000-01-01'
      } satisfies fhir4.Patient,
      organization: {
        resourceType: 'Organization',
        id: 'org-1',
        name: 'Example Hospital'
      } satisfies fhir4.Organization
    }

    const composition = buildComposition(resources, '電子處方箋', '2026-04-10T10:00:00Z')
    const bundle = assembleDocumentBundle(resources, composition)
    const patient = bundle.entry?.find((entry) => entry.resource?.resourceType === 'Patient')?.resource as fhir4.Patient

    expect(patient.identifier).toHaveLength(1)
    expect(patient.identifier?.[0]?.value).toBe('MR-001')
  })

  it('enrichCoverage maps legacy EHCPOL coding to TW PaymentCategory', () => {
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
      } satisfies fhir4.Organization,
      coverage: {
        resourceType: 'Coverage',
        id: 'cov-1',
        status: 'active',
        type: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
            code: 'EHCPOL',
            display: 'extended healthcare'
          }],
          text: '全民健保（NHI）'
        },
        beneficiary: { reference: 'Patient/patient-1' },
        payor: [{ display: 'NHI' }]
      } satisfies fhir4.Coverage
    }

    const composition = buildComposition(resources, '電子處方箋', '2026-04-10T10:00:00Z')
    const bundle = assembleDocumentBundle(resources, composition)
    const coverage = bundle.entry?.find((entry) => entry.resource?.resourceType === 'Coverage')?.resource as fhir4.Coverage

    expect(coverage.type?.coding?.[0]?.system).toBe('https://twcore.mohw.gov.tw/ig/emr/CodeSystem/paymentcategory')
    expect(coverage.type?.coding?.[0]?.code).toBe('4')
    expect(coverage.type?.text).toBe('全民健保（NHI）')
  })

  it('replaces server-reused Condition category and ICD display during assembly', () => {
    const resources = {
      patient: { resourceType: 'Patient', id: 'p1', identifier: [{ system: 'x', value: 'p-1' }], name: [{ text: 'A' }] } satisfies fhir4.Patient,
      organization: { resourceType: 'Organization', id: 'o1', name: 'Hosp' } satisfies fhir4.Organization,
      condition: {
        resourceType: 'Condition',
        id: '257196',
        meta: { profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Condition-EP'] },
        clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }] },
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-category',
            code: 'encounter-diagnosis',
            display: 'Encounter Diagnosis'
          }]
        }],
        code: {
          text: '胃食道逆流疾病',
          coding: [{
            system: 'https://twcore.mohw.gov.tw/ig/twcore/CodeSystem/icd-10-cm-2021-tw',
            code: 'K21.9',
            display: '胃食道逆流疾病'
          }]
        },
        subject: { reference: 'Patient/p1' }
      } satisfies fhir4.Condition
    }

    const composition = buildComposition(resources, '電子處方箋', '2026-04-10T10:55:00')
    const bundle = assembleDocumentBundle(resources, composition, { mode: 'export' })
    const condition = bundle.entry?.find((e) => e.resource?.resourceType === 'Condition')?.resource as fhir4.Condition

    expect(condition.category?.[0]?.coding?.[0]?.code).toBe('problem-list-item')
    expect(condition.clinicalStatus?.coding?.[0]?.display).toBe('Active')
    expect(condition.code?.coding?.[0]).toEqual({
      system: 'https://twcore.mohw.gov.tw/ig/twcore/CodeSystem/icd-10-cm-2021-tw',
      code: 'K21.9',
      display: '胃食道逆性疾病未伴有食道炎'
    })
  })

  it('rebuilds stale Composition sections and canonical LOINC displays during assembly', () => {
    const resources = {
      patient: { resourceType: 'Patient', id: 'p1', identifier: [{ system: 'x', value: 'p-1' }], name: [{ text: 'A' }], birthDate: '2000-01-01' } satisfies fhir4.Patient,
      organization: { resourceType: 'Organization', id: 'o1', name: 'Hosp' } satisfies fhir4.Organization,
      practitioner: { resourceType: 'Practitioner', id: 'pr1', name: [{ text: 'Dr.' }] } satisfies fhir4.Practitioner,
      encounter: { resourceType: 'Encounter', id: 'e1', status: 'finished', class: { code: 'AMB' }, period: { start: '2026-03-19T10:55' } } satisfies fhir4.Encounter,
      coverage: {
        resourceType: 'Coverage',
        id: 'cov1',
        status: 'active',
        beneficiary: { reference: 'Patient/p1' },
        payor: [{ display: 'NHI' }]
      } satisfies fhir4.Coverage,
      condition: {
        resourceType: 'Condition',
        id: 'c1',
        code: {
          coding: [{
            system: 'https://twcore.mohw.gov.tw/ig/twcore/CodeSystem/icd-10-cm-2021-tw',
            code: 'K21.9',
            display: '胃食道逆流疾病'
          }],
          text: '胃食道逆流'
        },
        subject: { reference: 'Patient/p1' }
      } satisfies fhir4.Condition,
      observation: {
        resourceType: 'Observation',
        id: 'ob1',
        status: 'final',
        code: { coding: [{ system: 'http://loinc.org', code: '29463-7', display: 'Body weight' }] },
        valueQuantity: { value: 54, unit: 'kg', system: 'http://unitsofmeasure.org' },
        subject: { reference: 'Patient/p1' }
      } satisfies fhir4.Observation,
      medication: {
        resourceType: 'Medication',
        id: 'm1',
        code: { coding: [{ system: 'http://www.whocc.no/atc', code: 'A02BC01', display: 'omeprazole' }] }
      } satisfies fhir4.Medication,
      medicationRequest: {
        resourceType: 'MedicationRequest',
        id: 'mr1',
        status: 'active',
        intent: 'order',
        category: [{
          coding: [{
            system: 'https://twcore.mohw.gov.tw/ig/emr/CodeSystem/prescription',
            code: 'B',
            display: '慢性病連續處方箋：處方用藥，一次給予8日(含)以上之用藥量'
          }]
        }],
        medicationReference: { reference: 'Medication/m1' },
        subject: { reference: 'Patient/p1' },
        dispenseRequest: { expectedSupplyDuration: { value: 14, unit: 'd', system: 'http://unitsofmeasure.org', code: 'd' } }
      } satisfies fhir4.MedicationRequest
    }

    const staleComposition = {
      resourceType: 'Composition',
      id: 'stale-comp',
      status: 'final',
      type: { coding: [{ system: 'http://loinc.org', code: '57833-6', display: 'Prescription for medication' }] },
      title: '電子處方箋',
      date: '2026-04-10T10:55:00',
      subject: { reference: 'Patient/p1' },
      section: [{
        title: '保險資訊',
        code: { coding: [{ system: 'http://loinc.org', code: '29762-2', display: 'Social history note' }] },
        entry: [{ reference: 'Coverage/cov1', type: 'Coverage' }]
      }],
      meta: { profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Composition-EP'] }
    } satisfies fhir4.Composition

    const bundle = assembleDocumentBundle(resources, staleComposition, { mode: 'export' })
    const composition = bundle.entry?.[0]?.resource as fhir4.Composition
    const condition = bundle.entry?.find((e) => e.resource?.resourceType === 'Condition')?.resource as fhir4.Condition
    const medReq = bundle.entry?.find((e) => e.resource?.resourceType === 'MedicationRequest')?.resource as fhir4.MedicationRequest

    expect(composition.section?.[0]?.code?.coding?.[0]).toEqual({
      system: 'http://loinc.org',
      code: '29762-2'
    })
    expect(composition.section?.[0]?.code?.coding?.[0]?.display).toBeUndefined()
    expect(composition.section?.map((section) => section.code?.coding?.[0]?.code)).toEqual([
      '29762-2',
      '85353-1',
      '29548-5',
      '29551-9'
    ])
    expect(composition.section?.[3]?.entry?.map((entry) => entry.type)).toEqual(['Medication', 'MedicationRequest'])
    expect(condition.code?.coding?.[0]?.display).toBe('胃食道逆性疾病未伴有食道炎')
    expect(medReq.category?.[0]?.coding?.[0]?.display).toBe('慢性病處方箋')
  })

  it('enrichCondition normalizes to TW icd-10-cm-2021-tw CodeSystem', () => {
    const resources = {
      patient: { resourceType: 'Patient', id: 'p1', identifier: [{ system: 'x', value: 'p-1' }], name: [{ text: 'A' }], birthDate: '2000-01-01' } satisfies fhir4.Patient,
      organization: { resourceType: 'Organization', id: 'o1', name: 'Hosp' } satisfies fhir4.Organization,
      practitioner: { resourceType: 'Practitioner', id: 'pr1', name: [{ text: 'Dr.' }] } satisfies fhir4.Practitioner,
      encounter: { resourceType: 'Encounter', id: 'e1', status: 'finished', class: { code: 'AMB' }, period: { start: '2026-03-19T10:55' } } satisfies fhir4.Encounter,
      condition: {
        resourceType: 'Condition',
        id: 'c1',
        code: { coding: [{ system: 'http://hl7.org/fhir/sid/icd-10', code: 'K21.9', display: 'GERD original' }] },
        subject: { reference: 'Patient/p1' }
      } satisfies fhir4.Condition
    }

    const composition = buildComposition(resources, '電子處方箋', '2026-04-10T10:55:00')
    const bundle = assembleDocumentBundle(resources, composition, { mode: 'export' })
    const conditionEntry = bundle.entry?.find((e) => e.resource?.resourceType === 'Condition')!
    const cond = conditionEntry.resource as fhir4.Condition
    expect(cond.code?.coding).toHaveLength(1)
    expect(cond.code?.coding?.[0]).toEqual({
      system: 'https://twcore.mohw.gov.tw/ig/twcore/CodeSystem/icd-10-cm-2021-tw',
      code: 'K21.9',
      display: '胃食道逆性疾病未伴有食道炎'
    })
  })

  it('resolveBundleAssemblyMode uses submit when a FHIR server base URL is configured', () => {
    expect(resolveBundleAssemblyMode('https://hapi.fhir.org/baseR4')).toBe('submit')
    expect(resolveBundleAssemblyMode('https://conference.example/fhir')).toBe('submit')
    expect(resolveBundleAssemblyMode()).toBe('export')
  })

  it('shouldConvertBundleToSelfContainedExport keeps TW submit bundles with server fullUrls', () => {
    const resources = {
      patient: { resourceType: 'Patient', id: 'p1', identifier: [{ system: 'x', value: 'p-1' }], name: [{ text: 'A' }] } satisfies fhir4.Patient,
      organization: { resourceType: 'Organization', id: 'o1', name: 'Hosp' } satisfies fhir4.Organization
    }
    const composition = buildComposition(resources, '電子處方箋', '2026-04-10T10:55:00')
    const bundle = assembleDocumentBundle(resources, composition, {
      mode: 'submit',
      serverBaseUrl: 'https://conference.example/fhir'
    })
    expect(shouldConvertBundleToSelfContainedExport(bundle)).toBe(false)
  })

  it('submit mode rewrites stale Coverage patient refs and MedRequest insurance to ResourceType/id', () => {
    const resources = {
      patient: {
        resourceType: 'Patient',
        id: '257189',
        identifier: [{ system: 'x', value: 'p-1' }],
        name: [{ text: 'Alice' }]
      } satisfies fhir4.Patient,
      organization: { resourceType: 'Organization', id: '250781', name: 'Hosp' } satisfies fhir4.Organization,
      practitioner: { resourceType: 'Practitioner', id: '250783', name: [{ text: 'Dr.' }] } satisfies fhir4.Practitioner,
      encounter: {
        resourceType: 'Encounter',
        id: '257211',
        status: 'finished',
        class: { code: 'AMB' },
        period: { start: '2026-05-16T10:20:00+08:00' }
      } satisfies fhir4.Encounter,
      coverage: {
        resourceType: 'Coverage',
        id: '250787',
        status: 'active',
        subscriber: { reference: 'Patient/250782' },
        beneficiary: { reference: 'Patient/250782' },
        payor: [{ display: 'NHI' }]
      } satisfies fhir4.Coverage,
      medication: {
        resourceType: 'Medication',
        id: '250788',
        code: { coding: [{ system: 'http://www.whocc.no/atc', code: 'A02BC01' }] }
      } satisfies fhir4.Medication,
      medicationRequest: {
        resourceType: 'MedicationRequest',
        id: '257214',
        status: 'active',
        intent: 'order',
        medicationReference: { reference: 'Medication/250788' },
        subject: { reference: 'Patient/257189' },
        insurance: [{ reference: 'https://hapi.fhir.tw/fhir/Coverage/250787', type: 'Coverage' }],
        dispenseRequest: { expectedSupplyDuration: { value: 14, unit: 'd', code: 'd' } }
      } satisfies fhir4.MedicationRequest
    }

    const composition = buildComposition(resources, '電子處方箋', '2026-04-10T10:55:00')
    const bundle = assembleDocumentBundle(resources, composition, {
      mode: 'submit',
      serverBaseUrl: 'https://hapi.fhir.tw/fhir'
    })
    const coverage = bundle.entry?.find((e) => e.resource?.resourceType === 'Coverage')?.resource as fhir4.Coverage
    const medReq = bundle.entry?.find((e) => e.resource?.resourceType === 'MedicationRequest')?.resource as fhir4.MedicationRequest

    expect(coverage.subscriber?.reference).toBe('Patient/257189')
    expect(coverage.beneficiary?.reference).toBe('Patient/257189')
    expect(medReq.insurance?.[0]?.reference).toBe('Coverage/250787')
  })

  it('submit mode uses server-absolute fullUrls for every entry including Composition', () => {
    const resources = {
      patient: {
        resourceType: 'Patient',
        id: '257189',
        identifier: [{ system: 'x', value: 'p-1' }],
        name: [{ text: 'Alice' }]
      } satisfies fhir4.Patient,
      organization: {
        resourceType: 'Organization',
        id: '250781',
        name: 'Example Hospital'
      } satisfies fhir4.Organization
    }
    const composition = buildComposition(resources, '電子處方箋', '2026-04-10T10:55:00')
    const bundle = assembleDocumentBundle(resources, composition, {
      mode: 'submit',
      serverBaseUrl: 'https://conference.example/fhir'
    })
    const base = 'https://conference.example/fhir'
    expect(bundle.entry?.every((entry) => (
      entry.fullUrl?.startsWith(`${base}/`)
    ))).toBe(true)
    const bundledComposition = bundle.entry?.[0]?.resource as fhir4.Composition
    expect(bundledComposition.subject?.reference).toBe('Patient/257189')
    expect(bundle.entry?.[0]?.fullUrl).toBe(`${base}/Composition/${composition.id}`)
  })

  it('strips HAPI meta.tag from bundled resources', () => {
    const resources = {
      patient: {
        resourceType: 'Patient',
        id: 'p1',
        identifier: [{ system: 'https://hospital.example/patients', value: 'P-001' }],
        name: [{ text: 'Alice' }],
        meta: {
          tag: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationValue',
            code: 'SUBSETTED',
            display: 'Resource encoded in summary mode'
          }]
        }
      } satisfies fhir4.Patient,
      organization: { resourceType: 'Organization', id: 'o1', name: 'Hosp' } satisfies fhir4.Organization
    }

    const composition = buildComposition(resources, '電子處方箋', '2026-04-10T10:00:00Z')
    const bundle = assembleDocumentBundle(resources, composition)
    const patient = bundle.entry?.find((e) => e.resource?.resourceType === 'Patient')?.resource as fhir4.Patient

    expect(patient.meta?.tag).toBeUndefined()
  })
})
