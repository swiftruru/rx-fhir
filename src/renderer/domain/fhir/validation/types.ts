import type { ResourceKey } from '../../../types/fhir'

export type FhirAuditSeverity = 'error' | 'warning' | 'info'
export type FhirAuditSource = 'local' | 'server'
export type FhirAuditStatus = 'idle' | 'running' | 'local-only' | 'hybrid'
export type FhirAuditSourceStatus = 'completed' | 'skipped' | 'unavailable'

export interface FhirAuditIssue {
  id: string
  source: FhirAuditSource
  severity: FhirAuditSeverity
  message: string
  resourceType?: string
  resourceId?: string
  fieldPath?: string
  stepKey?: ResourceKey
  code?: string
}

export interface FhirAuditReport {
  status: FhirAuditStatus
  generatedAt: string
  issues: FhirAuditIssue[]
  errorCount: number
  warningCount: number
  infoCount: number
  hasBlockingErrors: boolean
  sources: {
    local: {
      status: Extract<FhirAuditSourceStatus, 'completed'>
    }
    server: {
      status: FhirAuditSourceStatus
      message?: string
    }
  }
}

export interface AuditedBundleSummary {
  id: string
  date?: string
  patientName?: string
  patientIdentifier?: string
  organizationName?: string
  conditions?: string[]
  medications?: string[]
  source?: 'server' | 'imported' | 'preview'
  fileName?: string
  serverUrl?: string
  raw: fhir4.Bundle
  auditReport?: FhirAuditReport
}
