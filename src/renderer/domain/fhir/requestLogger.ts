import { useFhirInspectorStore } from '../../features/creator/store/fhirInspectorStore'
import { getAuthHeaders } from './fhirAuth'

function getCurrentModule(): string {
  const hash = window.location.hash
  if (hash.includes('/creator')) return 'creator'
  if (hash.includes('/consumer')) return 'consumer'
  if (hash.includes('/settings')) return 'settings'
  return 'app'
}

export function resetLoggedRequests(): void {
  useFhirInspectorStore.getState().clear()
}

export const FHIR_HEADERS = {
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

/** Mask sensitive header values before they reach the request inspector. */
function maskSensitiveHeaders(headers: Record<string, string>): Record<string, string> {
  const masked: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    if (/^(authorization|x-participant-token)$/i.test(key) && value) {
      const prefix = /^bearer /i.test(value) ? 'Bearer ' : ''
      masked[key] = `${prefix}••••••`
    } else {
      masked[key] = value
    }
  }
  return masked
}

function parseResponsePayload(text: string): unknown {
  if (!text.trim()) return undefined

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

export async function performLoggedRequest(
  url: string,
  init: {
    method: 'GET' | 'POST' | 'PUT'
    resourceType?: string
    reasonCode?: 'check-existing' | 'create' | 'update' | 'search' | 'validate'
    headers?: HeadersInit
    body?: unknown
    signal?: AbortSignal
  }
): Promise<Response> {
  const authHeaders = await getAuthHeaders()
  const mergedHeaders = { ...headersToObject(init.headers), ...authHeaders }

  const requestId = useFhirInspectorStore.getState().startRequest({
    method: init.method,
    url,
    resourceType: init.resourceType,
    reasonCode: init.reasonCode,
    requestHeaders: maskSensitiveHeaders(mergedHeaders),
    requestBody: init.body
  }, getCurrentModule())

  try {
    const response = await fetch(url, {
      method: init.method,
      headers: mergedHeaders,
      signal: init.signal,
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
