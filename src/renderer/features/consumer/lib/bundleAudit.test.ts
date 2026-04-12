import { describe, expect, it } from 'vitest'
import { buildBundleAuditCacheKey, buildPreviewBundleSummary, shouldAuditConsumerBundle } from './bundleAudit'

function buildPreviewBundle(): fhir4.Bundle {
  return {
    resourceType: 'Bundle',
    type: 'document',
    entry: [
      {
        resource: {
          resourceType: 'Composition',
          id: 'preview-composition-1',
          status: 'final',
          type: {
            coding: [{ code: '60591-5' }]
          },
          date: '2026-04-11T10:00:00Z',
          title: 'Preview Bundle',
          subject: { reference: 'Patient/patient-1' },
          author: [{ reference: 'Practitioner/preview-practitioner-1' }]
        } satisfies fhir4.Composition
      },
      {
        resource: {
          resourceType: 'Patient',
          id: 'patient-1',
          identifier: [{ value: 'PREVIEW-001' }],
          name: [{ text: 'Preview Patient' }]
        } satisfies fhir4.Patient
      }
    ]
  }
}

describe('bundleAudit helpers', () => {
  it('builds a preview bundle summary with preview source and local audit', () => {
    const summary = buildPreviewBundleSummary(buildPreviewBundle(), 'https://example.test/baseR4')

    expect(summary.source).toBe('preview')
    expect(summary.serverUrl).toBe('https://example.test/baseR4')
    expect(summary.id).toBe('preview-composition-1')
    expect(summary.auditReport).toBeDefined()
    expect(summary.auditReport?.sources.local.status).toBe('completed')
  })

  it('includes source and server context in the audit cache key', () => {
    const summary = buildPreviewBundleSummary(buildPreviewBundle(), 'https://example.test/baseR4')
    const previewKey = buildBundleAuditCacheKey(summary)
    const importedKey = buildBundleAuditCacheKey({
      id: summary.id,
      source: 'imported',
      fileName: 'preview.json',
      serverUrl: summary.serverUrl
    })

    expect(previewKey).not.toBe(importedKey)
  })

  it('only audits imported and preview bundles in Consumer', () => {
    expect(shouldAuditConsumerBundle({ source: 'preview' })).toBe(true)
    expect(shouldAuditConsumerBundle({ source: 'imported' })).toBe(true)
    expect(shouldAuditConsumerBundle({ source: 'server' })).toBe(false)
  })
})
