import { describe, expect, it } from 'vitest'
import {
  extractBundleHistoryMetadata,
  extractBundleSummary,
  extractSearchResults
} from '../searchResults'

describe('searchResults', () => {
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
      },
      {
        resource: {
          resourceType: 'Organization',
          id: 'org-1',
          identifier: [{ value: 'ORG-1' }],
          name: 'Example Hospital'
        } satisfies fhir4.Organization
      },
      {
        resource: {
          resourceType: 'Practitioner',
          id: 'practitioner-1',
          name: [{ text: 'Dr. Chen' }]
        } satisfies fhir4.Practitioner
      },
      {
        resource: {
          resourceType: 'Condition',
          id: 'condition-1',
          subject: { reference: 'Patient/patient-1' },
          code: { text: 'Hypertension' }
        } satisfies fhir4.Condition
      },
      {
        resource: {
          resourceType: 'Medication',
          id: 'medication-1',
          code: { text: 'Amlodipine' }
        } satisfies fhir4.Medication
      }
    ]
  }

  it('extracts summary fields from a document bundle', () => {
    expect(extractBundleSummary(bundle)).toMatchObject({
      id: 'bundle-1',
      patientName: 'Alice Example',
      patientIdentifier: 'P-001',
      organizationName: 'Example Hospital',
      date: '2026-04-10T10:00:00Z',
      conditions: ['Hypertension'],
      medications: ['Amlodipine'],
      source: 'server'
    })
  })

  it('extracts history metadata and search results', () => {
    expect(extractBundleHistoryMetadata(bundle)).toEqual({
      patientName: 'Alice Example',
      patientIdentifier: 'P-001',
      organizationName: 'Example Hospital',
      organizationIdentifier: 'ORG-1',
      practitionerName: 'Dr. Chen',
      conditionDisplay: 'Hypertension'
    })

    const searchset: fhir4.Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [{ resource: bundle }]
    }

    expect(extractSearchResults(searchset)).toHaveLength(1)
    expect(extractSearchResults(searchset)[0]?.id).toBe('bundle-1')
  })
})
