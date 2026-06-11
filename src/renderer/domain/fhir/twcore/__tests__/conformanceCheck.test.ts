import { describe, expect, it } from 'vitest'
import { checkBundleConformance, parseExpectedCounts } from '../conformanceCheck'

const PROFILE = 'https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition'

function bundle(entries: fhir4.BundleEntry[]): fhir4.Bundle {
  return {
    resourceType: 'Bundle',
    type: 'collection',
    meta: { profile: [`${PROFILE}/Bundle-twcore`] },
    entry: entries
  }
}

const patient: fhir4.BundleEntry = {
  fullUrl: 'urn:uuid:1',
  resource: { resourceType: 'Patient', meta: { profile: [`${PROFILE}/Patient-twcore`] } }
}
const encounter: fhir4.BundleEntry = {
  fullUrl: 'urn:uuid:2',
  resource: { resourceType: 'Encounter', status: 'finished', class: { code: 'AMB' }, meta: { profile: [`${PROFILE}/Encounter-twcore`] } }
}

describe('checkBundleConformance', () => {
  it('passes a well-formed collection bundle with profiled entries', () => {
    const result = checkBundleConformance(bundle([patient, encounter]))
    expect(result.isCollection).toBe(true)
    expect(result.bundleHasProfile).toBe(true)
    expect(result.entriesMissingProfile).toEqual([])
    expect(result.counts).toEqual({ Patient: 1, Encounter: 1 })
    expect(result.allPass).toBe(true)
  })

  it('flags an entry missing meta.profile and fails overall', () => {
    const bare: fhir4.BundleEntry = { fullUrl: 'urn:uuid:3', resource: { resourceType: 'Observation', status: 'final', code: {} } }
    const result = checkBundleConformance(bundle([patient, bare]))
    expect(result.entriesMissingProfile).toEqual(['Observation'])
    expect(result.allPass).toBe(false)
  })

  it('fails when the bundle is not a collection', () => {
    const b = bundle([patient])
    b.type = 'transaction'
    const result = checkBundleConformance(b)
    expect(result.isCollection).toBe(false)
    expect(result.allPass).toBe(false)
  })

  it('compares actual counts against expected and flags mismatches', () => {
    const result = checkBundleConformance(bundle([patient, encounter]), { Patient: 1, Encounter: 2 })
    expect(result.countDiff).toEqual([
      { type: 'Encounter', expected: 2, actual: 1, ok: false },
      { type: 'Patient', expected: 1, actual: 1, ok: true }
    ])
    expect(result.allPass).toBe(false)
  })

  it('passes when expected counts match', () => {
    const result = checkBundleConformance(bundle([patient, encounter]), { Patient: 1, Encounter: 1 })
    expect(result.allPass).toBe(true)
  })

  it('only compares the listed types (partial case-summary list)', () => {
    const result = checkBundleConformance(bundle([patient, encounter]), { Patient: 1 })
    expect(result.countDiff).toEqual([{ type: 'Patient', expected: 1, actual: 1, ok: true }])
    expect(result.allPass).toBe(true)
  })
})

describe('parseExpectedCounts', () => {
  it('parses comma, newline, and various separators', () => {
    expect(parseExpectedCounts('Patient:1, Encounter:8')).toEqual({ Patient: 1, Encounter: 8 })
    expect(parseExpectedCounts('Patient x 2\nMedicationRequest × 21')).toEqual({ Patient: 2, MedicationRequest: 21 })
  })

  it('ignores unparseable fragments', () => {
    expect(parseExpectedCounts('garbage, Patient:1, ???')).toEqual({ Patient: 1 })
  })
})
