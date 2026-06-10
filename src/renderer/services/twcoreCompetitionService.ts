import { getFhirBaseUrl, trimTrailingSlash } from '../domain/fhir/baseUrl'
import { FHIR_HEADERS, performLoggedRequest } from '../domain/fhir/requestLogger'

/**
 * Server-side actions for the TW Core competition converter page. Both go
 * through performLoggedRequest, so OAuth headers and request-inspector logging
 * are applied automatically.
 */

export interface ResourceValidation {
  resourceType: string
  errors: string[]
  warnings: number
}

function collectIssues(outcome: unknown): { errors: string[]; warnings: number } {
  const issues = (outcome as { issue?: Array<{ severity?: string; diagnostics?: string; details?: { text?: string } }> })?.issue ?? []
  const errors: string[] = []
  let warnings = 0
  for (const issue of issues) {
    const text = issue.details?.text ?? issue.diagnostics ?? ''
    if (issue.severity === 'error' || issue.severity === 'fatal') {
      errors.push(text)
    } else if (issue.severity === 'warning') {
      warnings += 1
    }
  }
  return { errors, warnings }
}

/** Non-destructive: runs each bundle entry through {ResourceType}/$validate. */
export async function validateBundleResources(
  bundle: fhir4.Bundle,
  signal?: AbortSignal
): Promise<ResourceValidation[]> {
  const base = trimTrailingSlash(getFhirBaseUrl())
  const entries = bundle.entry ?? []

  return Promise.all(entries.map(async (entry) => {
    const resource = entry.resource
    const resourceType = resource?.resourceType ?? 'Resource'
    try {
      const response = await performLoggedRequest(`${base}/${resourceType}/$validate`, {
        method: 'POST',
        resourceType,
        reasonCode: 'validate',
        headers: FHIR_HEADERS,
        body: resource,
        signal
      })
      const outcome = await response.json().catch(() => undefined)
      const { errors, warnings } = collectIssues(outcome)
      return { resourceType, errors, warnings }
    } catch (error) {
      return { resourceType, errors: [error instanceof Error ? error.message : String(error)], warnings: 0 }
    }
  }))
}

export interface TransactionEntryResult {
  status: string
  location?: string
}

export interface TransactionResult {
  ok: boolean
  /** HTTP status of the submission (undefined only on network failure). */
  httpStatus?: number
  entries: TransactionEntryResult[]
  /** OperationOutcome diagnostics when the transaction was rejected. */
  errors: string[]
}

/**
 * Destructive: submits the Bundle to the FHIR server.
 *  - transaction/batch → POST to the server base; the server processes it and
 *    creates each entry (returns a transaction-response).
 *  - collection/document → POST to /Bundle, storing it as a single Bundle
 *    resource (what the competition validator typically consumes). Returns the
 *    stored Bundle's location.
 */
export async function submitBundle(
  bundle: fhir4.Bundle,
  signal?: AbortSignal
): Promise<TransactionResult> {
  const base = trimTrailingSlash(getFhirBaseUrl())
  const isProcessable = bundle.type === 'transaction' || bundle.type === 'batch'
  // The gateway 301-redirects a POST to the bare base, so post to base + '/'.
  const url = isProcessable ? `${base}/` : `${base}/Bundle`

  const response = await performLoggedRequest(url, {
    method: 'POST',
    resourceType: 'Bundle',
    reasonCode: 'create',
    headers: FHIR_HEADERS,
    body: bundle,
    signal
  })

  const payload = await response.json().catch(() => undefined) as fhir4.Bundle | fhir4.OperationOutcome | undefined

  if (payload?.resourceType === 'Bundle') {
    // A stored collection comes back as the Bundle itself (with an id); a
    // processed transaction comes back as a transaction-response with per-entry
    // responses.
    if (isProcessable) {
      return {
        ok: response.ok,
        httpStatus: response.status,
        entries: (payload.entry ?? []).map((entry) => ({
          status: entry.response?.status ?? '',
          location: entry.response?.location
        })),
        errors: []
      }
    }
    return {
      ok: response.ok,
      httpStatus: response.status,
      entries: [{ status: `${response.status} ${response.statusText}`, location: payload.id ? `Bundle/${payload.id}` : undefined }],
      errors: []
    }
  }

  return {
    ok: false,
    httpStatus: response.status,
    entries: [],
    errors: collectIssues(payload).errors.length > 0
      ? collectIssues(payload).errors
      : [`HTTP ${response.status} ${response.statusText}`]
  }
}
