import type { SearchParams } from '../types/fhir.d'
import { useFhirInspectorStore } from '../store/fhirInspectorStore'
import i18n from '../i18n'

export const DEFAULT_SERVER_URL = 'https://hapi.fhir.org/baseR4'

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

export function getFhirBaseUrl(): string {
  return localStorage.getItem('fhirServerUrl') || DEFAULT_SERVER_URL
}

export function setFhirBaseUrl(url: string): void {
  localStorage.setItem('fhirServerUrl', url)
}

export function resetLoggedRequests(): void {
  useFhirInspectorStore.getState().clear()
}

const FHIR_HEADERS = {
  'Content-Type': 'application/fhir+json',
  Accept: 'application/fhir+json'
}

function headersToObject(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {}

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries())
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers)
  }

  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key, String(value)])
  )
}

function parseResponsePayload(text: string): unknown {
  if (!text.trim()) return undefined

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

interface OperationOutcomeLike {
  issue?: Array<{
    diagnostics?: string
  }>
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function extractOperationOutcome(error: unknown): OperationOutcomeLike | undefined {
  const message = getErrorMessage(error)
  const jsonMatch = message.match(/(\{[\s\S]*\})\s*$/)
  if (!jsonMatch) return undefined

  try {
    return JSON.parse(jsonMatch[1]) as OperationOutcomeLike
  } catch {
    return undefined
  }
}

async function performLoggedRequest(
  url: string,
  init: {
    method: 'GET' | 'POST' | 'PUT'
    resourceType?: string
    reasonCode?: 'check-existing' | 'create' | 'update' | 'search'
    headers?: HeadersInit
    body?: unknown
  }
): Promise<Response> {
  const requestId = useFhirInspectorStore.getState().startRequest({
    method: init.method,
    url,
    resourceType: init.resourceType,
    reasonCode: init.reasonCode,
    requestHeaders: headersToObject(init.headers),
    requestBody: init.body
  })

  try {
    const response = await fetch(url, {
      method: init.method,
      headers: init.headers,
      body: typeof init.body === 'string' || init.body === undefined
        ? init.body
        : JSON.stringify(init.body)
    })

    const responseText = await response.clone().text()
    useFhirInspectorStore.getState().finishRequest(requestId, {
      ok: response.ok,
      responseStatus: response.status,
      responseStatusText: response.statusText,
      responseHeaders: headersToObject(response.headers),
      responseBody: parseResponsePayload(responseText)
    })

    return response
  } catch (error) {
    useFhirInspectorStore.getState().finishRequest(requestId, {
      ok: false,
      errorMessage: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

export async function postResource<T extends fhir4.Resource>(
  resourceType: string,
  body: Omit<T, 'id'>
): Promise<T> {
  const url = `${getFhirBaseUrl()}/${resourceType}`
  const response = await performLoggedRequest(url, {
    method: 'POST',
    resourceType,
    reasonCode: 'create',
    headers: FHIR_HEADERS,
    body
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`POST ${resourceType} failed (${response.status}): ${errorText}`)
  }
  return response.json() as Promise<T>
}

export async function fetchBundleById(
  bundleId: string,
  serverUrl?: string
): Promise<fhir4.Bundle> {
  const baseUrl = trimTrailingSlash(serverUrl || getFhirBaseUrl())
  const url = `${baseUrl}/Bundle/${bundleId}`
  const response = await performLoggedRequest(url, {
    method: 'GET',
    resourceType: 'Bundle',
    reasonCode: 'search',
    headers: FHIR_HEADERS
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`GET Bundle/${bundleId} failed (${response.status}): ${errorText}`)
  }
  return response.json() as Promise<fhir4.Bundle>
}

async function fetchResourceById<T extends fhir4.Resource>(
  resourceType: string,
  id: string
): Promise<T> {
  const url = `${getFhirBaseUrl()}/${resourceType}/${id}`
  const response = await performLoggedRequest(url, {
    method: 'GET',
    resourceType,
    reasonCode: 'check-existing',
    headers: FHIR_HEADERS
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`GET ${resourceType}/${id} failed (${response.status}): ${errorText}`)
  }
  return response.json() as Promise<T>
}

function extractDuplicateExistingResourceId(resourceType: string, error: unknown): string | undefined {
  const errorMessage = getErrorMessage(error)
  const idPattern = new RegExp(`${resourceType}/([A-Za-z0-9._-]+)`, 'i')
  const duplicatePattern = new RegExp(`duplicate existing resource:\\s*${resourceType}/([A-Za-z0-9._-]+)`, 'i')

  const directMatch = errorMessage.match(duplicatePattern) ?? errorMessage.match(idPattern)
  if (directMatch?.[1]) return directMatch[1]

  const outcome = extractOperationOutcome(error)
  const diagnostics = outcome?.issue
    ?.map((issue) => issue.diagnostics)
    .filter((value): value is string => Boolean(value))

  for (const text of diagnostics ?? []) {
    const match = text.match(duplicatePattern) ?? text.match(idPattern)
    if (match?.[1]) return match[1]
  }

  return undefined
}

function isDuplicateExistingResourceError(error: unknown): boolean {
  const errorMessage = getErrorMessage(error)
  if (/duplicate existing resource/i.test(errorMessage)) {
    return true
  }

  const outcome = extractOperationOutcome(error)
  return outcome?.issue?.some((issue) => /duplicate existing resource/i.test(issue.diagnostics ?? '')) ?? false
}

/**
 * Search for an existing resource; if found return it, otherwise POST a new one.
 * Avoids custom headers (If-None-Exist) that trigger CORS preflight failures.
 */
export interface FindOrCreateResult<T extends fhir4.Resource> {
  resource: T
  reused: boolean
}

export async function findOrCreateDetailed<T extends fhir4.Resource>(
  resourceType: string,
  searchParams: Record<string, string>,
  body: Omit<T, 'id'>
): Promise<FindOrCreateResult<T>> {
  const qs = new URLSearchParams(searchParams)
  const searchUrl = `${getFhirBaseUrl()}/${resourceType}?${qs}`
  const searchRes = await performLoggedRequest(searchUrl, {
    method: 'GET',
    resourceType,
    reasonCode: 'check-existing',
    headers: FHIR_HEADERS
  })
  if (searchRes.ok) {
    const bundle = await searchRes.json() as fhir4.Bundle
    if (bundle.entry && bundle.entry.length > 0) {
      return {
        resource: bundle.entry[0].resource as T,
        reused: true
      }
    }
  }

  try {
    return {
      resource: await postResource<T>(resourceType, body),
      reused: false
    }
  } catch (error) {
    const duplicateId = extractDuplicateExistingResourceId(resourceType, error)
    if (duplicateId) {
      return {
        resource: await fetchResourceById<T>(resourceType, duplicateId),
        reused: true
      }
    }

    if (isDuplicateExistingResourceError(error)) {
      const retrySearchRes = await performLoggedRequest(searchUrl, {
        method: 'GET',
        resourceType,
        reasonCode: 'check-existing',
        headers: FHIR_HEADERS
      })

      if (retrySearchRes.ok) {
        const retryBundle = await retrySearchRes.json() as fhir4.Bundle
        if (retryBundle.entry && retryBundle.entry.length > 0) {
          return {
            resource: retryBundle.entry[0].resource as T,
            reused: true
          }
        }
      }
    }

    throw error
  }
}

export async function findOrCreate<T extends fhir4.Resource>(
  resourceType: string,
  searchParams: Record<string, string>,
  body: Omit<T, 'id'>
): Promise<T> {
  const result = await findOrCreateDetailed(resourceType, searchParams, body)
  return result.resource
}

export async function putResource<T extends fhir4.Resource>(
  resourceType: string,
  id: string,
  body: Omit<T, 'id'>
): Promise<T> {
  const url = `${getFhirBaseUrl()}/${resourceType}/${id}`
  const response = await performLoggedRequest(url, {
    method: 'PUT',
    resourceType,
    reasonCode: 'update',
    headers: FHIR_HEADERS,
    body: { ...body, id }
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`PUT ${resourceType}/${id} failed (${response.status}): ${errorText}`)
  }
  return response.json() as Promise<T>
}

export interface QueryStep {
  step: number
  label: string
  labelKey?: string
  url: string
  note?: string
  noteKey?: string
  noteOptions?: Record<string, unknown>
  fetchedCount?: number
  matchedCount?: number
}

function tConsumer(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, { ns: 'consumer', ...options })
}

function formatQueryStepLabel(step: number, key: string): string {
  return `${step}. ${tConsumer(key)}`
}

function buildBundleSearchUrl(params: URLSearchParams): string {
  const query = params.toString()
  return query ? `${getFhirBaseUrl()}/Bundle?${query}` : `${getFhirBaseUrl()}/Bundle`
}

function getDocumentComposition(bundle: fhir4.Bundle): fhir4.Composition | undefined {
  const composition = bundle.entry?.[0]?.resource
  return composition?.resourceType === 'Composition' ? composition as fhir4.Composition : undefined
}

function normalizeReference(reference?: string): string | undefined {
  if (!reference) return undefined

  const trimmed = reference.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith('urn:uuid:')) return trimmed

  const withoutHistory = trimmed.split('/_history/')[0]
  const parts = withoutHistory.split('/').filter(Boolean)
  if (parts.length < 2) return withoutHistory

  return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`
}

function resolveBundleResource<T extends fhir4.Resource>(
  bundle: fhir4.Bundle,
  resourceType: T['resourceType'],
  reference?: string
): T | undefined {
  const normalizedReference = normalizeReference(reference)
  if (!normalizedReference) return undefined

  return bundle.entry?.find((entry) => {
    const resource = entry.resource
    if (!resource || resource.resourceType !== resourceType) return false
    const resourceRef = resource.id ? `${resourceType}/${resource.id}` : undefined
    const normalizedResourceRef = normalizeReference(resourceRef)
    const normalizedFullUrl = normalizeReference(entry.fullUrl)
    return normalizedReference === normalizedResourceRef || normalizedReference === normalizedFullUrl
  })?.resource as T | undefined
}

function normalizeSearchText(value: string): string {
  return value.trim().replace(/\s+/g, '').toLowerCase()
}

function getPractitionerSearchNames(practitioner: fhir4.Practitioner | undefined): string[] {
  if (!practitioner) return []

  return (practitioner.name ?? []).flatMap((name) => {
    const candidates = [name.text]
    const joined = `${name.family ?? ''}${name.given?.join('') ?? ''}`.trim()
    if (joined) candidates.push(joined)
    const spaced = [name.family, ...(name.given ?? [])].filter(Boolean).join(' ')
    if (spaced) candidates.push(spaced)
    return candidates.filter((candidate): candidate is string => Boolean(candidate))
  })
}

function matchesAuthorName(bundle: fhir4.Bundle, authorName: string): boolean {
  const composition = getDocumentComposition(bundle)
  if (!composition?.author?.length) return false

  const target = normalizeSearchText(authorName)
  if (!target) return true

  return composition.author.some((author) => {
    const candidates = new Set<string>()
    if (author.display) candidates.add(author.display)

    const practitioner = resolveBundleResource<fhir4.Practitioner>(bundle, 'Practitioner', author.reference)
    getPractitionerSearchNames(practitioner).forEach((name) => candidates.add(name))

    if (!practitioner) {
      bundle.entry
        ?.filter((entry) => entry.resource?.resourceType === 'Practitioner')
        .forEach((entry) => {
          getPractitionerSearchNames(entry.resource as fhir4.Practitioner).forEach((name) => candidates.add(name))
        })
    }

    return [...candidates].some((candidate) => {
      const normalized = normalizeSearchText(candidate)
      return normalized.includes(target) || target.includes(normalized)
    })
  })
}

export async function searchBundles(
  params: SearchParams,
  onStep?: (step: QueryStep) => void
): Promise<fhir4.Bundle> {
  // Complex org search: resolve Organization ID first, then query Bundle
  if (params.mode === 'complex' && params.complexSearchBy === 'organization' && params.organizationId) {
    const orgUrl = `${getFhirBaseUrl()}/Organization?identifier=${encodeURIComponent(params.organizationId)}`
    onStep?.({
      step: 1,
      label: formatQueryStepLabel(1, 'search.queryStepTexts.resolveOrganizationId'),
      labelKey: 'search.queryStepTexts.resolveOrganizationId',
      url: orgUrl
    })
    const orgRes = await performLoggedRequest(orgUrl, {
      method: 'GET',
      resourceType: 'Organization',
      reasonCode: 'search',
      headers: FHIR_HEADERS
    })
    if (!orgRes.ok) {
      const errorText = await orgRes.text()
      throw new Error(`Search failed (${orgRes.status}): ${errorText}`)
    }
    const orgBundle = await orgRes.json() as fhir4.Bundle
    const orgId = orgBundle.entry?.[0]?.resource?.id
    if (!orgId) throw new Error(tConsumer('search.queryStepTexts.organizationNotFound'))

    // HAPI public server does not support composition.custodian chain;
    // fetch by identifier only, then filter client-side by custodian reference
    const qs = new URLSearchParams()
    if (params.identifier) qs.set('identifier', params.identifier)
    const searchUrl = buildBundleSearchUrl(qs)
    onStep?.({
      step: 2,
      label: formatQueryStepLabel(2, 'search.queryStepTexts.searchBundle'),
      labelKey: 'search.queryStepTexts.searchBundle',
      url: searchUrl,
      note: tConsumer('search.queryStepTexts.custodianFallback'),
      noteKey: 'search.queryStepTexts.custodianFallback'
    })
    const response = await performLoggedRequest(searchUrl, {
      method: 'GET',
      resourceType: 'Bundle',
      reasonCode: 'search',
      headers: FHIR_HEADERS
    })
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Search failed (${response.status}): ${errorText}`)
    }
    const allBundles = await response.json() as fhir4.Bundle
    const orgRef = `Organization/${orgId}`
    const filtered = (allBundles.entry ?? []).filter(entry => {
      const inner = entry.resource as fhir4.Bundle | undefined
      const composition = inner?.entry?.[0]?.resource as fhir4.Composition | undefined
      return composition?.custodian?.reference === orgRef
    })
    onStep?.({
      step: 3,
      label: formatQueryStepLabel(3, 'search.queryStepTexts.clientFilter'),
      labelKey: 'search.queryStepTexts.clientFilter',
      url: `Composition.custodian.reference = "${orgRef}"`,
      note: tConsumer('search.queryStepTexts.filteredCounts', {
        fetched: allBundles.entry?.length ?? 0,
        matched: filtered.length
      }),
      noteKey: 'search.queryStepTexts.filteredCounts',
      noteOptions: {
        fetched: allBundles.entry?.length ?? 0,
        matched: filtered.length
      },
      fetchedCount: allBundles.entry?.length ?? 0,
      matchedCount: filtered.length
    })
    return { ...allBundles, entry: filtered, total: filtered.length }
  }

  if (params.mode === 'complex' && params.complexSearchBy === 'author' && params.authorName) {
    const qs = new URLSearchParams()
    if (params.identifier) qs.set('identifier', params.identifier)
    const searchUrl = buildBundleSearchUrl(qs)
    onStep?.({
      step: 1,
      label: formatQueryStepLabel(1, 'search.queryStepTexts.searchBundle'),
      labelKey: 'search.queryStepTexts.searchBundle',
      url: searchUrl,
      note: tConsumer('search.queryStepTexts.authorFallback'),
      noteKey: 'search.queryStepTexts.authorFallback'
    })
    const response = await performLoggedRequest(searchUrl, {
      method: 'GET',
      resourceType: 'Bundle',
      reasonCode: 'search',
      headers: FHIR_HEADERS
    })
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Search failed (${response.status}): ${errorText}`)
    }
    const allBundles = await response.json() as fhir4.Bundle
    const filtered = (allBundles.entry ?? []).filter((entry) => {
      const inner = entry.resource as fhir4.Bundle | undefined
      return inner?.resourceType === 'Bundle' && matchesAuthorName(inner, params.authorName!)
    })
    onStep?.({
      step: 2,
      label: formatQueryStepLabel(2, 'search.queryStepTexts.clientFilter'),
      labelKey: 'search.queryStepTexts.clientFilter',
      url: `Practitioner.name ~= "${params.authorName}"`,
      note: tConsumer('search.queryStepTexts.filteredCounts', {
        fetched: allBundles.entry?.length ?? 0,
        matched: filtered.length
      }),
      noteKey: 'search.queryStepTexts.filteredCounts',
      noteOptions: {
        fetched: allBundles.entry?.length ?? 0,
        matched: filtered.length
      },
      fetchedCount: allBundles.entry?.length ?? 0,
      matchedCount: filtered.length
    })
    return { ...allBundles, entry: filtered, total: filtered.length }
  }

  const searchUrl = buildSearchUrl(params)
  const response = await performLoggedRequest(searchUrl, {
    method: 'GET',
    resourceType: 'Bundle',
    reasonCode: 'search',
    headers: FHIR_HEADERS
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Search failed (${response.status}): ${errorText}`)
  }
  return response.json() as Promise<fhir4.Bundle>
}

export function buildSearchUrl(params: SearchParams): string {
  const base = `${getFhirBaseUrl()}/Bundle`
  const qs = new URLSearchParams()

  switch (params.mode) {
    case 'basic':
      if (params.identifier) {
        qs.set('identifier', params.identifier)
      } else if (params.name) {
        qs.set('composition.subject.name', params.name)
      }
      break

    case 'date':
      if (params.identifier) qs.set('identifier', params.identifier)
      if (params.date) qs.set('timestamp', params.date)
      break

    case 'complex':
      if (params.identifier) qs.set('identifier', params.identifier)
      if (params.complexSearchBy === 'author' && params.authorName) {
        qs.set('composition.author:Practitioner.name', params.authorName)
      }
      break
  }

  return `${base}?${qs.toString()}`
}

export async function checkServerHealth(baseUrl?: string): Promise<{
  online: boolean
  name?: string
  version?: string
}> {
  const url = `${baseUrl || getFhirBaseUrl()}/metadata`
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: FHIR_HEADERS,
      signal: AbortSignal.timeout(8000)
    })
    if (!response.ok) return { online: false }
    const cs = (await response.json()) as fhir4.CapabilityStatement
    return {
      online: true,
      name: cs.name || cs.title,
      version: cs.fhirVersion
    }
  } catch {
    return { online: false }
  }
}
