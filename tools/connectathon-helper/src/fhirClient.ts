/**
 * Step 120 / 230：把 Bundle POST 到大會 FHIR 主機，帶上 Step 10/15 的 Header，保存回應。
 * collection/document → POST {base}/Bundle（存成單一 Bundle）；transaction/batch → POST {base}/。
 */
import { type Config } from './config.js'
import { getAuthHeaders } from './auth.js'

export interface UploadResult {
  url: string
  httpStatus: number
  ok: boolean
  /** 例：Bundle/{id}。 */
  location?: string
  responseBody: unknown
  /** 非 401/403 即視為已送達 Prism（即使 HAPI 因邏輯引用回 422）。 */
  reachedPrism: boolean
}

export async function uploadBundle(cfg: Config, bundle: fhir4.Bundle): Promise<UploadResult> {
  const base = cfg.fhirBaseUrl.replace(/\/+$/, '')
  const isTransaction = bundle.type === 'transaction' || bundle.type === 'batch'
  const url = isTransaction ? `${base}/` : `${base}/Bundle`

  const headers: Record<string, string> = {
    'Content-Type': 'application/fhir+json',
    Accept: 'application/fhir+json',
    ...(await getAuthHeaders(cfg))
  }

  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(bundle) })
  const text = await response.text()
  let responseBody: unknown
  try {
    responseBody = JSON.parse(text)
  } catch {
    responseBody = text
  }

  const id = (responseBody as { id?: string } | undefined)?.id
  const location = id ? `Bundle/${id}` : response.headers.get('location') ?? undefined

  return {
    url,
    httpStatus: response.status,
    ok: response.ok,
    location,
    responseBody,
    reachedPrism: response.status !== 401 && response.status !== 403
  }
}
