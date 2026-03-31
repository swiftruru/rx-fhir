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

export async function searchBundles(params: SearchParams): Promise<fhir4.Bundle> {
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
        qs.set('composition.patient.identifier', params.identifier)
      } else if (params.name) {
        qs.set('composition.patient.name', params.name)
      }
      break

    case 'date':
      if (params.identifier) qs.set('composition.patient.identifier', params.identifier)
      if (params.date) qs.set('composition.date', params.date)
      break

    case 'complex':
      if (params.identifier) qs.set('composition.patient.identifier', params.identifier)
      if (params.complexSearchBy === 'organization' && params.organizationId) {
        qs.set('composition.patient.organization.identifier', params.organizationId)
      } else if (params.complexSearchBy === 'author' && params.authorName) {
        qs.set('composition.author.name', params.authorName)
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
