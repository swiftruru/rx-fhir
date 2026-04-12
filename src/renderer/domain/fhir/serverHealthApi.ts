import { getFhirBaseUrl } from './baseUrl'
import { FHIR_HEADERS } from './requestLogger'
import type { ServerCapabilities, ServerCapabilitySupport } from '../../../shared/contracts/electron'

export interface ServerHealthResult {
  online: boolean
  name?: string
  version?: string
  capabilities: ServerCapabilities
}

function matchesValidateIdentifier(value?: string): boolean {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return false

  const tail = normalized.split(/[/:#]/).filter(Boolean).at(-1) ?? normalized
  return /(^|[-_])\$?validate$/.test(tail)
}

function isValidateOperation(
  operation: Pick<fhir4.CapabilityStatementRestResourceOperation, 'name' | 'definition'>
): boolean {
  return matchesValidateIdentifier(operation.name) || matchesValidateIdentifier(operation.definition)
}

function resolveBundleValidateSupport(statement: fhir4.CapabilityStatement): ServerCapabilitySupport {
  const rest = statement.rest ?? []
  const hasSystemValidateOperation = rest.some((block) => (
    (block.operation ?? []).some(isValidateOperation)
  ))

  let sawBundleResource = false

  for (const block of rest) {
    for (const resource of block.resource ?? []) {
      if (resource.type !== 'Bundle') continue
      sawBundleResource = true

      const operations = resource.operation ?? []
      if (operations.some(isValidateOperation)) {
        return 'available'
      }
    }
  }

  if (sawBundleResource && hasSystemValidateOperation) return 'available'
  if (sawBundleResource) return 'unavailable'
  return 'unknown'
}

export function parseServerCapabilities(statement: fhir4.CapabilityStatement): ServerCapabilities {
  return {
    bundleValidate: resolveBundleValidateSupport(statement)
  }
}

export async function checkServerHealth(baseUrl?: string): Promise<ServerHealthResult> {
  const url = `${baseUrl || getFhirBaseUrl()}/metadata`
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: FHIR_HEADERS,
      signal: AbortSignal.timeout(8000)
    })
    if (!response.ok) {
      return {
        online: false,
        capabilities: {
          bundleValidate: 'unknown'
        }
      }
    }
    const capabilityStatement = (await response.json()) as fhir4.CapabilityStatement
    return {
      online: true,
      name: capabilityStatement.name || capabilityStatement.title,
      version: capabilityStatement.fhirVersion,
      capabilities: parseServerCapabilities(capabilityStatement)
    }
  } catch {
    return {
      online: false,
      capabilities: {
        bundleValidate: 'unknown'
      }
    }
  }
}
