import { extractBundleSummary } from './searchResults'
import { runLocalBundleAudit, type AuditedBundleSummary } from './validation'

export type BundleFileErrorCode =
  | 'bridge-unavailable'
  | 'invalid-json'
  | 'invalid-bundle'
  | 'invalid-summary'

export class BundleFileError extends Error {
  constructor(public code: BundleFileErrorCode) {
    super(code)
    this.name = 'BundleFileError'
  }
}

export interface ImportedBundleResult {
  bundle: fhir4.Bundle
  fileName: string
  filePath?: string
  summary: AuditedBundleSummary
}

export type Translate = (key: string, options?: Record<string, unknown>) => string

function sanitizeFileSegment(value?: string): string | undefined {
  if (!value) return undefined

  const normalized = value
    .trim()
    .replace(/\.[^.]+$/, '')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return normalized || undefined
}

function getBundleEntries(bundle: fhir4.Bundle): fhir4.BundleEntry[] {
  return bundle.entry ?? []
}

export function deriveBundleFileName(bundle: fhir4.Bundle): string {
  const entries = getBundleEntries(bundle)
  const patient = entries.find((entry) => entry.resource?.resourceType === 'Patient')
    ?.resource as fhir4.Patient | undefined
  const composition = entries.find((entry) => entry.resource?.resourceType === 'Composition')
    ?.resource as fhir4.Composition | undefined

  const patientIdentifier = sanitizeFileSegment(patient?.identifier?.[0]?.value)
  const patientName = sanitizeFileSegment(patient?.name?.[0]?.text || `${patient?.name?.[0]?.family ?? ''}${patient?.name?.[0]?.given?.[0] ?? ''}`)
  const date = sanitizeFileSegment(composition?.date?.slice(0, 10))
  const bundleId = sanitizeFileSegment(bundle.id)

  const parts = ['rxfhir-bundle', patientIdentifier ?? patientName, date ?? bundleId].filter(Boolean)
  return `${parts.join('-')}.json`
}

export function deriveBaseFileName(bundle: fhir4.Bundle): string {
  const entries = getBundleEntries(bundle)
  const patient = entries.find((entry) => entry.resource?.resourceType === 'Patient')
    ?.resource as fhir4.Patient | undefined
  const composition = entries.find((entry) => entry.resource?.resourceType === 'Composition')
    ?.resource as fhir4.Composition | undefined

  const patientIdentifier = sanitizeFileSegment(patient?.identifier?.[0]?.value)
  const patientName = sanitizeFileSegment(patient?.name?.[0]?.text || `${patient?.name?.[0]?.family ?? ''}${patient?.name?.[0]?.given?.[0] ?? ''}`)
  const date = sanitizeFileSegment(composition?.date?.slice(0, 10))
  const bundleId = sanitizeFileSegment(bundle.id)

  const parts = [patientIdentifier ?? patientName, date ?? bundleId].filter(Boolean)
  return parts.join('-') || 'rxfhir-bundle'
}

function ensureBundleId(bundle: fhir4.Bundle, fileName: string): fhir4.Bundle {
  if (bundle.id) return bundle

  const fallbackId =
    sanitizeFileSegment(bundle.identifier?.value)
    ?? sanitizeFileSegment(fileName)
    ?? `imported-bundle-${Date.now()}`

  return {
    ...bundle,
    id: fallbackId
  }
}

export function parseImportedBundleJson(content: string, fileName: string): ImportedBundleResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(content) as unknown
  } catch {
    throw new BundleFileError('invalid-json')
  }

  if (!parsed || typeof parsed !== 'object' || (parsed as { resourceType?: string }).resourceType !== 'Bundle') {
    throw new BundleFileError('invalid-bundle')
  }

  const bundle = ensureBundleId(parsed as fhir4.Bundle, fileName)
  const summary = extractBundleSummary(bundle)

  if (!summary) {
    throw new BundleFileError('invalid-summary')
  }

  return {
    bundle,
    fileName,
    summary: {
      ...summary,
      source: 'imported',
      fileName,
      auditReport: runLocalBundleAudit(bundle)
    }
  }
}

export function getBundleFileErrorMessage(error: unknown, t: Translate): string {
  if (error instanceof BundleFileError) {
    switch (error.code) {
      case 'bridge-unavailable':
        return t('bundleFile.errors.unavailable')
      case 'invalid-json':
        return t('bundleFile.errors.invalidJson')
      case 'invalid-bundle':
        return t('bundleFile.errors.invalidBundle')
      case 'invalid-summary':
        return t('bundleFile.errors.invalidSummary')
    }
  }

  return error instanceof Error ? error.message : t('errors.unknown', { ns: 'common' })
}
