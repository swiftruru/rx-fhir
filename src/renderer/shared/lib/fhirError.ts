type OperationOutcomeIssue = {
  diagnostics?: string
  details?: {
    text?: string
  }
}

type OperationOutcomeLike = {
  resourceType?: string
  issue?: OperationOutcomeIssue[]
}

function tryParseJson(raw: string): OperationOutcomeLike | undefined {
  try {
    return JSON.parse(raw) as OperationOutcomeLike
  } catch {
    return undefined
  }
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getDiagnostics(outcome: OperationOutcomeLike | undefined): string[] {
  if (!outcome || outcome.resourceType !== 'OperationOutcome') return []

  return (outcome.issue ?? [])
    .flatMap((issue) => [issue.diagnostics, issue.details?.text])
    .filter((value): value is string => Boolean(value))
    .map((value) => stripHtml(value))
}

function formatRawDetails(headline: string, raw: string, parsed: OperationOutcomeLike | undefined): string {
  if (parsed?.resourceType === 'OperationOutcome') {
    return `${headline}\n\n${JSON.stringify(parsed, null, 2)}`
  }

  return `${headline}\n\n${raw}`.trim()
}

type Translate = (key: string, options?: Record<string, unknown>) => string

export interface FriendlyError {
  summary: string
  diagnostic?: string
  rawDetails?: string
}

export function getFriendlyError(error: unknown, t: Translate): FriendlyError {
  if (!(error instanceof Error)) {
    return { summary: t('errors.unknown') }
  }

  const message = error.message?.trim()
  if (!message) {
    return { summary: t('errors.unknown') }
  }

  if (message === t('errors.unknown')) {
    return { summary: message }
  }

  const networkLower = message.toLowerCase()
  if (networkLower.includes('failed to fetch') || networkLower.includes('networkerror')) {
    return {
      summary: t('errors.networkFailed'),
      rawDetails: message
    }
  }

  const requestMatch = message.match(/^([A-Z]+)\s+(.+?)\s+failed\s+\((\d+)\):\s*([\s\S]+)$/)
  const searchMatch = message.match(/^(Search)\s+failed\s+\((\d+)\):\s*([\s\S]+)$/)

  if (!requestMatch && !searchMatch) {
    return { summary: message }
  }

  const headline = requestMatch
    ? `${requestMatch[1]} ${requestMatch[2]} failed (${requestMatch[3]})`
    : `Search failed (${searchMatch![2]})`
  const status = Number(requestMatch ? requestMatch[3] : searchMatch![2])
  const raw = (requestMatch ? requestMatch[4] : searchMatch![3]).trim()
  const parsed = tryParseJson(raw)
  const diagnostics = getDiagnostics(parsed)
  const diagnostic = diagnostics[0]
  const combined = [headline, raw, ...diagnostics].join(' ').toLowerCase()

  let summary = t('errors.fhirRequestFailed', { status })
  if (status === 412 || combined.includes('duplicat') || combined.includes('already exists')) {
    summary = t('errors.fhirDuplicate')
  } else if (status === 400 || status === 422 || combined.includes('invalid') || combined.includes('required')) {
    summary = t('errors.fhirValidation')
  } else if (status === 401 || status === 403) {
    summary = t('errors.fhirForbidden')
  } else if (status === 404) {
    summary = t('errors.fhirNotFound')
  }

  return {
    summary,
    diagnostic,
    rawDetails: formatRawDetails(headline, raw, parsed)
  }
}
