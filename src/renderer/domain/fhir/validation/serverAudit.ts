import { getFhirBaseUrl, trimTrailingSlash } from '../baseUrl'
import { FHIR_HEADERS, performLoggedRequest } from '../requestLogger'
import { buildFhirAuditReport, createAuditIssueFactory, getStepKeyForResourceType, pushIssue } from './utils'
import type { FhirAuditIssue, FhirAuditReport } from './types'

interface OperationOutcomeIssue {
  severity?: string
  code?: string
  diagnostics?: string
  location?: string[]
  expression?: string[]
}

interface OperationOutcomeLike {
  resourceType?: string
  issue?: OperationOutcomeIssue[]
}

const VALIDATE_TIMEOUT_MS = 5_000

function isServerValidationEnvironmentIssue(message: string, fieldPath?: string): boolean {
  return [
    /unable to expand valueset because codesystem could not be found/i,
    /codesystem is unknown and can't be validated/i,
    /unable to resolve the profile reference '.+'/i,
    /profile reference '.+' has not been checked because it could not be found/i,
    /profile reference '.+' has not been checked because it is unknown/i,
    /failed to retrieve profile with url=/i,
    /validator is set to not fetch unknown profiles/i,
    /unknown extension https?:\/\/.+/i,
    /slicing cannot be evaluated: .*unable to resolve the reference https?:\/\/.+/i,
    /unable to check minimum required .* due to lack of slicing validation/i
  ].some((pattern) => pattern.test(message))
    || (
      /invalid resource target type\./i.test(message)
      && Boolean(fieldPath?.includes('Composition'))
    )
}

function isBestPracticeRecommendation(message: string): boolean {
  return [
    /best practice recommendation/i,
    /constraint failed:\s*dom-6/i,
    /none of the codings provided are in the value set 'fhir document type codes'/i,
    /none of the codings provided are in the value set 'document section codes'/i
  ].some((pattern) => pattern.test(message))
}

function shouldDowngradeServerIssue(message: string, fieldPath?: string): boolean {
  return isServerValidationEnvironmentIssue(message, fieldPath) || isBestPracticeRecommendation(message)
}

function mapServerSeverity(value?: string): 'error' | 'warning' | 'info' {
  switch (value) {
    case 'fatal':
    case 'error':
      return 'error'
    case 'warning':
      return 'warning'
    default:
      return 'warning'
  }
}

function tryParseOperationOutcome(body: string): OperationOutcomeLike | undefined {
  if (!body.trim()) return undefined

  try {
    const parsed = JSON.parse(body) as OperationOutcomeLike
    return parsed.resourceType === 'OperationOutcome' ? parsed : undefined
  } catch {
    return undefined
  }
}

function isServerUnavailable(status: number, outcome: OperationOutcomeLike | undefined, body: string): boolean {
  if ([404, 405, 501].includes(status)) return true

  const diagnosticText = [
    body,
    ...(outcome?.issue ?? []).map((issue) => issue.diagnostics ?? '')
  ].join(' ')

  return /not\s+supported|not\s+implemented|unknown\s+operation|unsupported\s+operation/i.test(diagnosticText)
}

function mapOperationOutcomeToIssues(outcome: OperationOutcomeLike): { issues: FhirAuditIssue[]; downgradedIssueCount: number } {
  const makeIssue = createAuditIssueFactory('server')
  let downgradedIssueCount = 0

  const issues = (outcome.issue ?? []).map((issue) => {
    const fieldPath = issue.expression?.[0] ?? issue.location?.[0]
    const resourceType = fieldPath?.split('.')[0]
    const diagnostics = issue.diagnostics?.trim() || 'FHIR Server validation returned an unspecified issue.'
    const severity = shouldDowngradeServerIssue(diagnostics, fieldPath)
      ? 'info'
      : mapServerSeverity(issue.severity)

    if (severity === 'info' && shouldDowngradeServerIssue(diagnostics, fieldPath)) {
      downgradedIssueCount += 1
    }

    return makeIssue(
      severity,
      diagnostics,
      {
        resourceType,
        fieldPath,
        stepKey: getStepKeyForResourceType(resourceType),
        code: issue.code
      }
    )
  })

  return { issues, downgradedIssueCount }
}

export async function runServerBundleAudit(
  bundle: fhir4.Bundle,
  baseUrl?: string
): Promise<FhirAuditReport> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), VALIDATE_TIMEOUT_MS)

  try {
    const targetBaseUrl = trimTrailingSlash(baseUrl ?? getFhirBaseUrl())
    const response = await performLoggedRequest(`${targetBaseUrl}/Bundle/$validate`, {
      method: 'POST',
      resourceType: 'Bundle',
      reasonCode: 'validate',
      headers: FHIR_HEADERS,
      body: bundle,
      signal: controller.signal
    })
    const body = await response.clone().text()
    const outcome = tryParseOperationOutcome(body)

    if (response.ok && outcome) {
      const mapped = mapOperationOutcomeToIssues(outcome)
      return buildFhirAuditReport(
        mapped.issues,
        'hybrid',
        'completed',
        mapped.downgradedIssueCount > 0
          ? 'Some server-side $validate messages were downgraded to info because they reflect validator environment limits or best-practice recommendations rather than structural errors.'
          : undefined
      )
    }

    if (!response.ok && outcome && !isServerUnavailable(response.status, outcome, body)) {
      const mapped = mapOperationOutcomeToIssues(outcome)
      return buildFhirAuditReport(
        mapped.issues,
        'hybrid',
        'completed',
        mapped.downgradedIssueCount > 0
          ? 'Some server-side $validate messages were downgraded to info because they reflect validator environment limits or best-practice recommendations rather than structural errors.'
          : undefined
      )
    }

    const issues: FhirAuditIssue[] = []
    const makeIssue = createAuditIssueFactory('server')
    pushIssue(
      issues,
      makeIssue,
      'info',
      response.ok
        ? 'The current FHIR Server did not return a structured $validate OperationOutcome response.'
        : 'The current FHIR Server does not provide Bundle $validate for this request.',
      {
        resourceType: 'Bundle'
      }
    )
    return buildFhirAuditReport(
      issues,
      'local-only',
      'unavailable',
      response.ok
        ? 'No structured OperationOutcome was returned.'
        : `Server returned ${response.status} ${response.statusText}.`
    )
  } catch (error) {
    const issues: FhirAuditIssue[] = []
    const makeIssue = createAuditIssueFactory('server')
    pushIssue(
      issues,
      makeIssue,
      'info',
      error instanceof DOMException && error.name === 'AbortError'
        ? 'Server-side Bundle $validate timed out, so only the local audit result is available.'
        : 'Server-side Bundle $validate is currently unavailable, so only the local audit result is available.',
      {
        resourceType: 'Bundle'
      }
    )

    return buildFhirAuditReport(
      issues,
      'local-only',
      'unavailable',
      error instanceof Error ? error.message : 'Validation unavailable'
    )
  } finally {
    window.clearTimeout(timeoutId)
  }
}
