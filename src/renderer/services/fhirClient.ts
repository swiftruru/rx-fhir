import type { SearchParams } from '../types/fhir.d'

const DEFAULT_SERVER_URL = 'https://hapi.fhir.org/baseR4'

export function getFhirBaseUrl(): string {
  return localStorage.getItem('fhirServerUrl') || DEFAULT_SERVER_URL
}

export function setFhirBaseUrl(url: string): void {
  localStorage.setItem('fhirServerUrl', url)
}

const FHIR_HEADERS = {
  'Content-Type': 'application/fhir+json',
  Accept: 'application/fhir+json'
}

export async function postResource<T extends fhir4.Resource>(
  resourceType: string,
  body: Omit<T, 'id'>
): Promise<T> {
  const url = `${getFhirBaseUrl()}/${resourceType}`
  const response = await fetch(url, {
    method: 'POST',
    headers: FHIR_HEADERS,
    body: JSON.stringify(body)
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`POST ${resourceType} failed (${response.status}): ${errorText}`)
  }
  return response.json() as Promise<T>
}

/**
 * Search for an existing resource; if found return it, otherwise POST a new one.
 * Avoids custom headers (If-None-Exist) that trigger CORS preflight failures.
 */
export async function findOrCreate<T extends fhir4.Resource>(
  resourceType: string,
  searchParams: Record<string, string>,
  body: Omit<T, 'id'>
): Promise<T> {
  const qs = new URLSearchParams(searchParams)
  const searchUrl = `${getFhirBaseUrl()}/${resourceType}?${qs}`
  const searchRes = await fetch(searchUrl, { method: 'GET', headers: FHIR_HEADERS })
  if (searchRes.ok) {
    const bundle = await searchRes.json() as fhir4.Bundle
    if (bundle.entry && bundle.entry.length > 0) {
      return bundle.entry[0].resource as T
    }
  }
  return postResource<T>(resourceType, body)
}

export async function putResource<T extends fhir4.Resource>(
  resourceType: string,
  id: string,
  body: Omit<T, 'id'>
): Promise<T> {
  const url = `${getFhirBaseUrl()}/${resourceType}/${id}`
  const response = await fetch(url, {
    method: 'PUT',
    headers: FHIR_HEADERS,
    body: JSON.stringify({ ...body, id })
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
  url: string
  note?: string
}

export async function searchBundles(
  params: SearchParams,
  onStep?: (step: QueryStep) => void
): Promise<fhir4.Bundle> {
  // Complex org search: resolve Organization ID first, then query Bundle
  if (params.mode === 'complex' && params.complexSearchBy === 'organization' && params.organizationId) {
    const orgUrl = `${getFhirBaseUrl()}/Organization?identifier=${encodeURIComponent(params.organizationId)}`
    onStep?.({ step: 1, label: '① 解析機構 ID', url: orgUrl })
    const orgRes = await fetch(orgUrl, { method: 'GET', headers: FHIR_HEADERS })
    if (!orgRes.ok) {
      const errorText = await orgRes.text()
      throw new Error(`Search failed (${orgRes.status}): ${errorText}`)
    }
    const orgBundle = await orgRes.json() as fhir4.Bundle
    const orgId = orgBundle.entry?.[0]?.resource?.id
    if (!orgId) throw new Error('找不到符合機構代碼的機構')

    // HAPI public server does not support composition.custodian chain;
    // fetch by identifier only, then filter client-side by custodian reference
    const qs = new URLSearchParams()
    if (params.identifier) qs.set('identifier', params.identifier)
    const searchUrl = `${getFhirBaseUrl()}/Bundle?${qs.toString()}`
    onStep?.({ step: 2, label: '② 查詢 Bundle', url: searchUrl, note: `(custodian chain 不支援，改用 identifier 撈回後過濾)` })
    const response = await fetch(searchUrl, { method: 'GET', headers: FHIR_HEADERS })
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
      label: '③ Client 端過濾',
      url: `Composition.custodian.reference = "${orgRef}"`,
      note: `取得 ${allBundles.entry?.length ?? 0} 筆 → 符合 ${filtered.length} 筆`
    })
    return { ...allBundles, entry: filtered, total: filtered.length }
  }

  const searchUrl = buildSearchUrl(params)
  const response = await fetch(searchUrl, {
    method: 'GET',
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
