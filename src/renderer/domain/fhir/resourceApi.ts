import { getFhirBaseUrl, trimTrailingSlash } from './baseUrl'
import { FHIR_HEADERS, performLoggedRequest } from './requestLogger'

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

export async function checkResourceExists(
  resourceType: string,
  id: string,
  serverUrl: string
): Promise<boolean> {
  const base = trimTrailingSlash(serverUrl)
  try {
    const response = await fetch(`${base}/${resourceType}/${id}`, {
      method: 'GET',
      headers: { Accept: 'application/fhir+json' }
    })
    if (response.status === 404) return false
    return response.ok
  } catch {
    return true
  }
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
      try {
        return {
          resource: await fetchResourceById<T>(resourceType, duplicateId),
          reused: true
        }
      } catch (fetchError) {
        const msg = fetchError instanceof Error ? fetchError.message : ''
        if (msg.includes('(410)')) {
          return {
            resource: await putResource<T>(resourceType, duplicateId, body),
            reused: false
          }
        }
        throw fetchError
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
