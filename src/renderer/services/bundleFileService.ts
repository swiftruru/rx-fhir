import type { BundleJsonOpenResult, BundleJsonSaveResult, RecentBundleFileEntry, RxFhirDesktopBridge, SaveFileResult } from '../types/electron'
import type { BundleSummary } from '../types/fhir.d'
import { extractBundleSummary } from './searchService'
import { buildPostmanCollection, buildCreatorPostmanCollection, buildPrescriptionHtml } from './bundleExportService'
import type { FhirRequestEntry } from '../store/fhirInspectorStore'

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

type ImportedBundleResult = {
  bundle: fhir4.Bundle
  fileName: string
  summary: BundleSummary
}

type Translate = (key: string, options?: Record<string, unknown>) => string

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

function deriveBundleFileName(bundle: fhir4.Bundle): string {
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

function requireDesktopBridge(): RxFhirDesktopBridge {
  if (!window.rxfhir) {
    throw new BundleFileError('bridge-unavailable')
  }

  return window.rxfhir
}

export async function exportBundleJson(
  bundle: fhir4.Bundle,
  defaultFileName?: string
): Promise<BundleJsonSaveResult> {
  const bridge = requireDesktopBridge()
  return bridge.saveBundleJson({
    content: JSON.stringify(bundle, null, 2),
    defaultFileName: defaultFileName ?? deriveBundleFileName(bundle)
  })
}

export async function saveFile(
  content: string,
  defaultFileName: string,
  filters: Array<{ name: string; extensions: string[] }>
): Promise<SaveFileResult> {
  const bridge = requireDesktopBridge()
  return bridge.saveFile({ content, defaultFileName, filters })
}

function deriveBaseFileName(bundle: fhir4.Bundle): string {
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

export async function exportBundlePostman(
  bundle: fhir4.Bundle,
  fhirBaseUrl: string,
  onProgress?: (checked: number, total: number) => void,
  signal?: AbortSignal
): Promise<SaveFileResult> {
  const collection = await buildPostmanCollection(bundle, fhirBaseUrl, onProgress, signal)
  const content = JSON.stringify(collection, null, 2)
  const baseName = deriveBaseFileName(bundle)
  return saveFile(content, `rxfhir-postman-${baseName}.json`, [
    { name: 'Postman Collection JSON', extensions: ['json'] }
  ])
}

export async function exportCreatorPostman(
  entries: FhirRequestEntry[],
  fhirBaseUrl: string
): Promise<SaveFileResult> {
  const collection = buildCreatorPostmanCollection(entries, fhirBaseUrl)
  const content = JSON.stringify(collection, null, 2)
  const date = new Date().toISOString().slice(0, 10)
  return saveFile(content, `rxfhir-creator-postman-${date}.json`, [
    { name: 'Postman Collection JSON', extensions: ['json'] }
  ])
}

export async function exportBundleHtml(
  bundle: fhir4.Bundle,
  locale: string
): Promise<SaveFileResult> {
  const content = buildPrescriptionHtml(bundle, locale)
  const baseName = deriveBaseFileName(bundle)
  return saveFile(content, `rxfhir-report-${baseName}.html`, [
    { name: 'HTML Report', extensions: ['html'] }
  ])
}

function csvEscapeField(value: string | undefined | null): string {
  const str = value ?? ''
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function exportResultsCsv(results: BundleSummary[]): Promise<SaveFileResult> {
  const HEADERS = ['Bundle ID', 'Patient Name', 'Patient Identifier', 'Date', 'Organization', 'Conditions', 'Medications', 'Source']
  const rows = results.map((r) => [
    r.id,
    r.patientName,
    r.patientIdentifier,
    r.date,
    r.organizationName,
    r.conditions?.join('; '),
    r.medications?.join('; '),
    r.source
  ].map(csvEscapeField))

  // Prepend UTF-8 BOM so Excel / Numbers open the file without garbling CJK characters
  const csv = '\uFEFF' + [HEADERS.map(csvEscapeField), ...rows]
    .map((row) => row.join(','))
    .join('\r\n')

  const date = new Date().toISOString().slice(0, 10)
  return saveFile(csv, `rxfhir-results-${date}.csv`, [
    { name: 'CSV File', extensions: ['csv'] }
  ])
}

export async function importBundleJson(): Promise<ImportedBundleResult | null> {
  const bridge = requireDesktopBridge()
  const result = await bridge.openBundleJson()

  if (result.canceled || !result.content || !result.fileName) {
    return null
  }

  return parseImportedBundleJson(result.content, result.fileName)
}

export async function importBundleJsonFile(file: File): Promise<ImportedBundleResult> {
  const content = await file.text()
  return parseImportedBundleJson(content, file.name)
}

function parseBridgeOpenResult(result: BundleJsonOpenResult): ImportedBundleResult | null {
  if (result.canceled || !result.content || !result.fileName) {
    return null
  }

  return parseImportedBundleJson(result.content, result.fileName)
}

export async function openRecentBundleJson(filePath: string): Promise<ImportedBundleResult | null> {
  const bridge = requireDesktopBridge()
  const result = await bridge.openRecentBundleJson(filePath)
  return parseBridgeOpenResult(result)
}

export async function listRecentBundleJsonFiles(): Promise<RecentBundleFileEntry[]> {
  const bridge = requireDesktopBridge()
  return bridge.listRecentBundleJsonFiles()
}

export async function rememberRecentBundleJson(filePath: string): Promise<void> {
  const bridge = requireDesktopBridge()
  await bridge.rememberRecentBundleJson(filePath)
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
      fileName
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
