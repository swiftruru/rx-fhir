import type { ResourceKey } from '../../../types/fhir'
import type {
  FhirAuditIssue,
  FhirAuditReport,
  FhirAuditSeverity,
  FhirAuditSource,
  FhirAuditStatus,
  FhirAuditSourceStatus
} from './types'

const STEP_KEY_BY_RESOURCE_TYPE: Record<string, ResourceKey | undefined> = {
  Organization: 'organization',
  Patient: 'patient',
  Practitioner: 'practitioner',
  Encounter: 'encounter',
  Condition: 'condition',
  Observation: 'observation',
  Coverage: 'coverage',
  Medication: 'medication',
  MedicationRequest: 'medicationRequest',
  Basic: 'extension',
  Composition: 'composition',
  Bundle: undefined
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, sortValue(nestedValue)])
    )
  }

  return value
}

export function buildFhirAuditFingerprint(bundle: fhir4.Bundle): string {
  return JSON.stringify(sortValue(bundle))
}

export function getStepKeyForResourceType(resourceType?: string): ResourceKey | undefined {
  if (!resourceType) return undefined
  return STEP_KEY_BY_RESOURCE_TYPE[resourceType]
}

export function createAuditIssueFactory(source: FhirAuditSource): (
  severity: FhirAuditSeverity,
  message: string,
  context?: Omit<FhirAuditIssue, 'id' | 'source' | 'severity' | 'message'>
) => FhirAuditIssue {
  let index = 0

  return (severity, message, context = {}) => {
    index += 1
    return {
      id: `${source}-${index}`,
      source,
      severity,
      message,
      ...context
    }
  }
}

export function buildFhirAuditReport(
  issues: FhirAuditIssue[],
  status: Exclude<FhirAuditStatus, 'idle' | 'running'>,
  serverStatus: FhirAuditSourceStatus,
  serverMessage?: string
): FhirAuditReport {
  const errorCount = issues.filter((issue) => issue.severity === 'error').length
  const warningCount = issues.filter((issue) => issue.severity === 'warning').length
  const infoCount = issues.filter((issue) => issue.severity === 'info').length

  return {
    status,
    generatedAt: new Date().toISOString(),
    issues,
    errorCount,
    warningCount,
    infoCount,
    hasBlockingErrors: errorCount > 0,
    sources: {
      local: { status: 'completed' },
      server: {
        status: serverStatus,
        message: serverMessage
      }
    }
  }
}

export function resolveReferenceInBundle<T extends fhir4.Resource>(
  bundle: fhir4.Bundle,
  resourceType: T['resourceType'],
  reference?: string
): T | undefined {
  if (!reference) return undefined

  const entries = bundle.entry ?? []
  const normalizedReference = reference.replace(/^urn:uuid:/, '')

  return entries.find((entry) => {
    const resource = entry.resource
    if (!resource || resource.resourceType !== resourceType) return false

    const directReference = `${resource.resourceType}/${resource.id}`
    return reference === directReference
      || reference === resource.id
      || normalizedReference === resource.id
      || entry.fullUrl === reference
  })?.resource as T | undefined
}

export function pushIssue(
  issues: FhirAuditIssue[],
  makeIssue: ReturnType<typeof createAuditIssueFactory>,
  severity: FhirAuditSeverity,
  message: string,
  context?: Omit<FhirAuditIssue, 'id' | 'source' | 'severity' | 'message'>
): void {
  issues.push(makeIssue(severity, message, context))
}
