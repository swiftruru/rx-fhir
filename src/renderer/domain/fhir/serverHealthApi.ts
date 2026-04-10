import { getFhirBaseUrl } from './baseUrl'
import { FHIR_HEADERS } from './requestLogger'

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
    const capabilityStatement = (await response.json()) as fhir4.CapabilityStatement
    return {
      online: true,
      name: capabilityStatement.name || capabilityStatement.title,
      version: capabilityStatement.fhirVersion
    }
  } catch {
    return { online: false }
  }
}
