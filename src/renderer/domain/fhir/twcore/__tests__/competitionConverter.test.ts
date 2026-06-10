import { describe, expect, it } from 'vitest'
import {
  convertCompetitionProblem,
  TWCORE_PROFILES,
  type CompetitionProblem
} from '../competitionConverter'

const PROBLEM: CompetitionProblem = {
  patients: [{
    id: '1', idSystem: 'https://www.tph.mohw.gov.tw', idNumber: 'V215757393', active: true,
    name: '林欣妤', telecomSystem: 'phone', telecomUse: 'mobile', telecomValue: '0907548171',
    gender: 'unknown', birthDate: '1953-02-04', address: '新北市板橋區四川路2段209巷228號', organization: '1'
  }],
  organizations: [{
    id: '1', identifierValue: '0131060029', idSystem: 'https://twcore.mohw.gov.tw/ig/twcore/CodeSystem/organization-identifier-tw',
    active: true, type: 'prov', name: '衛生福利部臺北醫院', telecomSystem: 'phone', telecomUse: 'work',
    telecomValue: '02-2555-3000', address: '新北市新莊區思源路127號'
  }],
  practitioners: [{
    id: '1', medicalLicenseNumber: '醫字第135790號', medicalLicenseSystem: 'https://www.tph.mohw.gov.tw/fhir/practitioner-license',
    active: true, name: '陳雅安', gender: 'female', birthday: '1958-10-27', qualificationCode: 'Qual-0001', qualificationIssuer: '1'
  }],
  practitionerroles: [{
    id: '1', identifierValue: 'KP00034', idSystem: 'https://www.tph.mohw.gov.tw', active: true,
    practitionerId: '1', organizationId: '1', roleCode: 'PR-0003', roleText: '家庭醫學科醫師', specialtyCode: 'Spec-0001'
  }],
  conditions: [{
    id: '1', clinicalStatus: 'active', verificationStatus: 'confirmed', category: 'encounter-diagnosis',
    severity: '255604002', conditionCode: 'Cond-0012', conditionText: '感冒/上呼吸道不適', patientId: '1',
    onsetDate: '2026-06-10T05:14:18.549Z', asserterId: '1', recorderId: '1', note: '主訴感冒。'
  }],
  encounters: [{
    id: '1', idSystem: 'https://www.tph.mohw.gov.tw/fhir/encounter', status: 'finished', class: 'AMB', type: 'AMB',
    serviceType: '01', serviceTypeText: '家醫科門診', patientId: '1', periodStart: '2026-06-10T05:14:18.549Z',
    periodEnd: '2026-06-10T05:39:18.549Z', serviceProviderId: '1', participantType: 'ATND', practitionerId: '1',
    conditionId: '1', diagnosisUse: 'AD'
  }]
}

// Deterministic urn:uuid factory so reference resolution is assertable.
function makeCounter(): () => string {
  let n = 0
  return () => `0000000${++n}`.slice(-8) + '-0000-4000-8000-000000000000'
}

describe('convertCompetitionProblem', () => {
  it('emits one resource per source entry with twcore profiles', () => {
    const { bundle, counts } = convertCompetitionProblem(PROBLEM, { uuid: makeCounter() })

    expect(counts).toEqual({ Patient: 1, Organization: 1, Practitioner: 1, PractitionerRole: 1, Condition: 1, Encounter: 1 })
    // Gazelle competition validator requires a collection bundle profiled as Bundle-twcore.
    expect(bundle.type).toBe('collection')
    expect(bundle.meta?.profile).toEqual([TWCORE_PROFILES.bundle])

    const byType = Object.fromEntries((bundle.entry ?? []).map((e) => [e.resource!.resourceType, e.resource]))
    expect(byType.Patient?.meta?.profile).toEqual([TWCORE_PROFILES.patient])
    expect(byType.PractitionerRole?.meta?.profile).toEqual([TWCORE_PROFILES.practitionerRole])
  })

  it('uses urn:uuid references pointing at fullUrls, and the Patient dual identifier', () => {
    const { bundle } = convertCompetitionProblem(PROBLEM, { uuid: makeCounter() })
    const entries = bundle.entry ?? []
    const resOf = <T>(type: string): T => entries.find((e) => e.resource?.resourceType === type)!.resource as T
    const fullUrlOf = (type: string): string => entries.find((e) => e.resource?.resourceType === type)!.fullUrl!

    const patient = resOf<fhir4.Patient>('Patient')
    const encounter = resOf<fhir4.Encounter>('Encounter')
    const condition = resOf<fhir4.Condition>('Condition')

    // References are urn:uuid pointing at the target entry's fullUrl.
    expect(fullUrlOf('Organization')).toMatch(/^urn:uuid:/)
    expect(patient.managingOrganization?.reference).toBe(fullUrlOf('Organization'))
    expect(encounter.subject?.reference).toBe(fullUrlOf('Patient'))
    expect(encounter.serviceProvider?.reference).toBe(fullUrlOf('Organization'))
    expect(encounter.participant?.[0]?.individual?.reference).toBe(fullUrlOf('Practitioner'))
    expect(encounter.participant?.[0]?.period?.start).toBe('2026-06-10T05:14:18.549Z')
    expect(encounter.diagnosis?.[0]?.condition?.reference).toBe(fullUrlOf('Condition'))
    // Condition.asserter is the patient (主訴者); recorder is the practitioner.
    expect(condition.asserter?.reference).toBe(fullUrlOf('Patient'))
    expect(condition.recorder?.reference).toBe(fullUrlOf('Practitioner'))

    // Patient carries two identifiers: national ID (NNxxx) + medical record (MR).
    expect(patient.identifier?.[0]).toMatchObject({
      system: 'http://www.moi.gov.tw', value: 'V215757393',
      type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'NNxxx' }] }
    })
    expect(patient.identifier?.[1]).toMatchObject({
      use: 'official', system: 'https://www.tph.mohw.gov.tw', value: '1',
      type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'MR' }] }
    })
  })

  it('maps competition codes to standard codings and adds identifier slices', () => {
    const { bundle } = convertCompetitionProblem(PROBLEM, { uuid: makeCounter() })
    const entries = bundle.entry ?? []
    const resOf = <T>(type: string): T => entries.find((e) => e.resource?.resourceType === type)!.resource as T

    const condition = resOf<fhir4.Condition>('Condition')
    expect(condition.code?.coding?.[0]).toMatchObject({ system: 'http://snomed.info/sct', code: '363746003' })

    const encounter = resOf<fhir4.Encounter>('Encounter')
    expect(encounter.serviceType?.coding?.[0]).toMatchObject({ system: 'http://terminology.hl7.org/CodeSystem/service-type', code: '124' })
    expect(encounter.reasonCode?.[0]?.coding?.[0]).toMatchObject({ system: 'http://snomed.info/sct', code: '363746003' })

    const role = resOf<fhir4.PractitionerRole>('PractitionerRole')
    expect(role.code?.[0]?.coding?.[0]).toMatchObject({ system: 'http://snomed.info/sct', code: '59058001' })
    expect(role.specialty?.[0]?.coding?.[0]).toMatchObject({ system: 'http://snomed.info/sct', code: '419772000' })
    expect(role.identifier?.[0]).toMatchObject({ use: 'official', type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'MD' }] } })

    const practitioner = resOf<fhir4.Practitioner>('Practitioner')
    expect(practitioner.qualification?.[0]?.code?.coding?.[0]).toMatchObject({ system: 'http://snomed.info/sct', code: '158965000' })
    expect(practitioner.identifier?.[0]).toMatchObject({ use: 'official', type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'MD' }] } })

    // Every resource still gets a generated narrative for dom-6.
    for (const entry of entries) {
      const res = entry.resource as fhir4.DomainResource
      expect(res.text?.status).toBe('generated')
    }
  })

  it('omits request entries for a collection bundle but adds them for a transaction', () => {
    const collection = convertCompetitionProblem(PROBLEM, { bundleType: 'collection', uuid: makeCounter() }).bundle
    expect((collection.entry ?? []).every((e) => e.request === undefined)).toBe(true)

    const transaction = convertCompetitionProblem(PROBLEM, { bundleType: 'transaction', uuid: makeCounter() }).bundle
    expect(transaction.type).toBe('transaction')
    expect((transaction.entry ?? []).every((e) => e.request?.method === 'POST')).toBe(true)
  })

  it('emits Patient.contact and an AllergyIntolerance with mapped codes', () => {
    const { bundle, counts } = convertCompetitionProblem({
      patients: [{
        id: '1', idNumber: 'N173245166', name: '劉思豪',
        contactRelationship: 'N', contactName: '王美玲',
        contactTelecomSystem: 'phone', contactTelecomUse: 'mobile', contactTelecomValue: '0912345678'
      }],
      conditions: [{ id: '1', conditionCode: 'Cond-0014', conditionText: '發燒與咳嗽', patientId: '1' }],
      allergyintolerances: [{
        id: '1', clinicalStatus: 'active', type: 'allergy', category: 'food', criticality: 'low',
        allergyCode: 'Al-F0007', patientId: '1', recorderId: '1', asserterId: '1',
        manifestation: '271807003', reactionSubstance: '44027008', severity: 'mild', exposureRoute: '26643006'
      }]
    }, { uuid: makeCounter() })

    expect(counts.AllergyIntolerance).toBe(1)

    const patient = (bundle.entry ?? []).find((e) => e.resource?.resourceType === 'Patient')!.resource as fhir4.Patient
    expect(patient.contact?.[0]?.relationship?.[0]?.coding?.[0]).toMatchObject({ system: 'http://terminology.hl7.org/CodeSystem/v2-0131', code: 'N' })
    expect(patient.contact?.[0]?.name?.text).toBe('王美玲')
    expect(patient.contact?.[0]?.telecom?.[0]?.value).toBe('0912345678')

    const condition = (bundle.entry ?? []).find((e) => e.resource?.resourceType === 'Condition')!.resource as fhir4.Condition
    expect(condition.code?.coding?.[0]).toMatchObject({ system: 'http://snomed.info/sct', code: '10509002' })

    const allergy = (bundle.entry ?? []).find((e) => e.resource?.resourceType === 'AllergyIntolerance')!.resource as fhir4.AllergyIntolerance
    // Allergen code is the SNOMED reaction substance, not the competition allergyCode.
    expect(allergy.code?.coding?.[0]).toMatchObject({ system: 'http://snomed.info/sct', code: '44027008' })
    expect(allergy.reaction?.[0]?.manifestation?.[0]?.coding?.[0]).toMatchObject({ system: 'http://snomed.info/sct', code: '271807003' })
    expect(allergy.reaction?.[0]?.exposureRoute?.coding?.[0]?.code).toBe('26643006')
  })

  it('emits vital-sign Observations (incl. dual-coded SpO2) and Encounter.admitSource', () => {
    const { bundle, counts } = convertCompetitionProblem({
      patients: [{ id: '1', idNumber: 'W110535315', name: '吳雅妤' }],
      encounters: [{ id: '1', class: 'EMER', patientId: '1', admitSource: 'emd' }],
      observationVitalSigns: [
        { id: '1', observationCode: 'VS-0006', patientId: '1', encounterId: '1', performerId: '1', valueQuantity: 90, valueUnit: '/min', rangeLow: 60, rangeHigh: 100 },
        { id: '2', observationCode: 'VS-0012', patientId: '1', encounterId: '1', valueQuantity: 94, valueUnit: '%' }
      ]
    }, { uuid: makeCounter() })

    expect(counts.Observation).toBe(2)
    const obs = (bundle.entry ?? []).map((e) => e.resource).filter((r) => r?.resourceType === 'Observation') as fhir4.Observation[]
    const hr = obs.find((o) => o.code?.coding?.some((c) => c.code === '8867-4'))!
    expect(hr.valueQuantity).toMatchObject({ value: 90, system: 'http://unitsofmeasure.org', code: '/min' })
    expect(hr.referenceRange?.[0]?.low?.value).toBe(60)
    // Oxygen saturation carries BOTH LOINC codes.
    const spo2 = obs.find((o) => o.code?.coding?.some((c) => c.code === '2708-6'))!
    expect(spo2.code?.coding?.map((c) => c.code)).toEqual(['2708-6', '59408-5'])

    const encounter = (bundle.entry ?? []).find((e) => e.resource?.resourceType === 'Encounter')!.resource as fhir4.Encounter
    expect(encounter.hospitalization?.admitSource?.coding?.[0]).toMatchObject({ system: 'http://terminology.hl7.org/CodeSystem/admit-source', code: 'emd' })
  })

  it('tolerates a sparse problem (only patients)', () => {
    const { bundle, counts } = convertCompetitionProblem({ patients: [{ id: '1', name: 'A' }] }, { uuid: makeCounter() })
    expect(counts).toEqual({ Patient: 1 })
    expect(bundle.entry).toHaveLength(1)
  })
})
