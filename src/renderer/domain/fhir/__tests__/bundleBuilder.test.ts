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

    expect(bundle.resourceType).toBe('Bundle')
    expect(bundle.type).toBe('document')
    expect(bundle.entry?.[0]?.resource).toEqual(composition)
    expect(bundle.identifier).toEqual({
      system: 'https://hospital.example/patients',
      value: 'P-001'
    })
    expect(bundle.entry).toHaveLength(3)
  })
})
