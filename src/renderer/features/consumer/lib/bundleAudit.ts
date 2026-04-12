import { extractBundleSummary } from '../../../services/searchService'
import { buildFhirAuditFingerprint, runLocalBundleAudit, type AuditedBundleSummary } from '../../../domain/fhir/validation'

function sanitizeBundleIdSegment(value?: string): string | undefined {
  if (!value) return undefined

  const normalized = value
    .trim()
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return normalized || undefined
}

export function ensureConsumerBundleId(bundle: fhir4.Bundle, source: AuditedBundleSummary['source'] = 'preview'): fhir4.Bundle {
  if (bundle.id) return bundle

  const composition = bundle.entry?.find((entry) => entry.resource?.resourceType === 'Composition')?.resource as fhir4.Composition | undefined
  const fallbackId =
    sanitizeBundleIdSegment(bundle.identifier?.value)
    ?? sanitizeBundleIdSegment(composition?.id)
    ?? `${source}-${Date.now()}`

  return {
    ...bundle,
    id: fallbackId
  }
}

export function withLocalAudit(summary: AuditedBundleSummary): AuditedBundleSummary {
  if (summary.auditReport) return summary
  return {
    ...summary,
    auditReport: runLocalBundleAudit(summary.raw)
  }
}

export function shouldAuditConsumerBundle(summary: Pick<AuditedBundleSummary, 'source'>): boolean {
  return summary.source === 'imported' || summary.source === 'preview'
}

export function attachServerContext(
  summary: AuditedBundleSummary,
  serverUrl?: string
): AuditedBundleSummary {
  if (!serverUrl || summary.serverUrl === serverUrl) return summary
  return {
    ...summary,
    serverUrl
  }
}

export function buildPreviewBundleSummary(
  bundle: fhir4.Bundle,
  serverUrl?: string
): AuditedBundleSummary {
  const normalizedBundle = ensureConsumerBundleId(bundle, 'preview')
  const summary = extractBundleSummary(normalizedBundle, {
    source: 'preview',
    serverUrl
  })

  if (!summary) {
    throw new Error('The current Bundle preview could not be prepared for Consumer.')
  }

  return withLocalAudit(summary)
}

export function buildBundleAuditCacheKey(summary: Pick<AuditedBundleSummary, 'id' | 'source' | 'serverUrl' | 'fileName'>): string {
  return [
    summary.source ?? 'server',
    summary.serverUrl ?? '',
    summary.fileName ?? '',
    summary.id
  ].join('::')
}

export function buildBundleAuditFingerprintKey(summary: Pick<AuditedBundleSummary, 'raw'>): string {
  return buildFhirAuditFingerprint(summary.raw)
}
