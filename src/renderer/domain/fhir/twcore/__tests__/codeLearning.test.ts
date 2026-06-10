import { describe, expect, it } from 'vitest'
import { learnFromGazelleErrors, mergeOverrides } from '../codeLearning'
import { convertCompetitionProblem } from '../competitionConverter'

function makeCounter(): () => string {
  let n = 0
  return () => `0000000${++n}`.slice(-8) + '-0000-4000-8000-000000000000'
}

describe('learnFromGazelleErrors', () => {
  it('learns a condition mapping from a reference error (Form A)', () => {
    const { provenance } = convertCompetitionProblem({
      patients: [{ id: '1', idNumber: 'A123456789' }],
      conditions: [{ id: '1', conditionCode: 'Cond-9999', conditionText: 'X', patientId: '1' }],
      encounters: [{ id: '1', patientId: '1', conditionId: '1' }]
    }, { uuid: makeCounter() })

    const condProv = provenance.find((p) => p.resourceType === 'Condition' && p.field === 'code')!
    const errorText = [
      'error',
      'Encounter.diagnosis[0].condition.reference',
      `Expected 'Condition/http://snomed.info/sct|99999999', got '${condProv.fullUrl}'`
    ].join('\n')

    const learned = learnFromGazelleErrors(errorText, provenance)
    expect(learned).toContainEqual({ category: 'condition', code: 'Cond-9999', system: 'http://snomed.info/sct', target: '99999999' })
  })

  it('learns a serviceType mapping from coding field-missing errors (Form B)', () => {
    const { provenance } = convertCompetitionProblem({
      patients: [{ id: '1', idNumber: 'A123456789' }],
      encounters: [{ id: '1', serviceType: '99', patientId: '1' }]
    }, { uuid: makeCounter() })

    const errorText = [
      'error', 'Encounter.serviceType.coding[0].system', "Expected 'http://terminology.hl7.org/CodeSystem/service-type', field is missing",
      'error', 'Encounter.serviceType.coding[0].code', "Expected '999', field is missing"
    ].join('\n')

    const learned = learnFromGazelleErrors(errorText, provenance)
    expect(learned).toContainEqual({ category: 'serviceType', code: '99', system: 'http://terminology.hl7.org/CodeSystem/service-type', target: '999' })
  })

  it('merges learned mappings and the converter applies them', () => {
    const learned = [{ category: 'condition', code: 'Cond-9999', system: 'http://snomed.info/sct', target: '99999999' }]
    const overrides = mergeOverrides({}, learned)
    const { bundle } = convertCompetitionProblem({
      patients: [{ id: '1', idNumber: 'A123456789' }],
      conditions: [{ id: '1', conditionCode: 'Cond-9999', conditionText: 'X', patientId: '1' }]
    }, { uuid: makeCounter(), codeOverrides: overrides })

    const condition = (bundle.entry ?? []).find((e) => e.resource?.resourceType === 'Condition')!.resource as fhir4.Condition
    expect(condition.code?.coding?.[0]).toMatchObject({ system: 'http://snomed.info/sct', code: '99999999' })
  })
})
