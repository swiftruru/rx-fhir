import { describe, expect, it } from 'vitest'
import {
  BundleFileError,
  deriveBaseFileName,
  deriveBundleFileName,
  getBundleFileErrorMessage,
  parseImportedBundleJson
} from '../bundleFileParsing'

describe('bundleFileParsing', () => {
  const bundle: fhir4.Bundle = {
    resourceType: 'Bundle',
    id: 'bundle-1',
    type: 'document',
    entry: [
      {
        resource: {
          resourceType: 'Composition',
          id: 'composition-1',
          status: 'final',
          type: { coding: [{ system: 'http://loinc.org', code: '57833-6' }] },
          date: '2026-04-10T10:00:00Z',
          title: 'Prescription',
          author: [{ reference: 'Practitioner/practitioner-1' }]
        } satisfies fhir4.Composition
      },
      {
        resource: {
          resourceType: 'Patient',
          id: 'patient-1',
          identifier: [{ value: 'P-001' }],
          name: [{ text: 'Alice Example' }]
        } satisfies fhir4.Patient
      }
    ]
  }

  it('derives stable export file names', () => {
    expect(deriveBundleFileName(bundle)).toBe('rxfhir-bundle-P-001-2026-04-10.json')
    expect(deriveBaseFileName(bundle)).toBe('P-001-2026-04-10')
  })

  it('parses imported bundle json and adds imported metadata', () => {
    const result = parseImportedBundleJson(JSON.stringify(bundle), 'bundle.json')
    expect(result.bundle.id).toBe('bundle-1')
    expect(result.summary.source).toBe('imported')
    expect(result.summary.fileName).toBe('bundle.json')
  })

  it('creates a fallback bundle id when the imported bundle omits one', () => {
    const result = parseImportedBundleJson(JSON.stringify({ ...bundle, id: undefined }), 'bundle.json')
    expect(result.bundle.id).toBe('bundle')
  })

  it('maps validation errors to localized keys', () => {
    const t = (key: string): string => key
    expect(getBundleFileErrorMessage(new BundleFileError('invalid-json'), t)).toBe('bundleFile.errors.invalidJson')
  })
})
