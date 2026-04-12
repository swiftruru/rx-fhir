import { runLocalBundleAudit } from './localAudit'
import { runServerBundleAudit } from './serverAudit'
import { buildFhirAuditReport } from './utils'
import type { FhirAuditReport } from './types'

export function mergeAuditReports(
  localReport: FhirAuditReport,
  serverReport: FhirAuditReport
): FhirAuditReport {
  if (serverReport.sources.server.status !== 'completed') {
    return buildFhirAuditReport(
      [...localReport.issues, ...serverReport.issues],
      'local-only',
      serverReport.sources.server.status,
      serverReport.sources.server.message
    )
  }

  return buildFhirAuditReport(
    [...localReport.issues, ...serverReport.issues],
    'hybrid',
    'completed',
    serverReport.sources.server.message
  )
}

export async function runHybridBundleAudit(
  bundle: fhir4.Bundle,
  baseUrl?: string
): Promise<FhirAuditReport> {
  const localReport = runLocalBundleAudit(bundle)
  const serverReport = await runServerBundleAudit(bundle, baseUrl)
  return mergeAuditReports(localReport, serverReport)
}
