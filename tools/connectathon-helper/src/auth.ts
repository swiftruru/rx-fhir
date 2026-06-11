/**
 * 取得聯測所需的兩個憑證：
 *  - Step 10：X-Participant-Token（TWCAT Proxy 產生；目前由 .env 手動提供）
 *  - Step 15：OAuth access_token（向 Keycloak 取得，支援 client_credentials 與 password 兩種 grant）
 * 兩者組成後續所有 FHIR 交易要帶的 HTTP Header。
 */
import { type Config, validateForOAuth } from './config.js'

export interface TokenResult {
  accessToken: string
  tokenType: string
  expiresIn: number
  /** 取得時間（epoch ms）。 */
  obtainedAt: number
}

/** Step 10：取得 X-Participant-Token。 */
export function getParticipantToken(cfg: Config): string {
  if (cfg.participantToken) return cfg.participantToken
  if (cfg.proxyBaseUrl) {
    throw new Error('TWCAT_PROXY_BASE_URL 自動取得尚未實作；請改在 .env 填入 TWCAT_PARTICIPANT_TOKEN（從 TWCAT Proxy 取得後貼入）。')
  }
  throw new Error('缺少 X-Participant-Token：請在 .env 設定 TWCAT_PARTICIPANT_TOKEN。')
}

let cache: { token: TokenResult; signature: string } | null = null
const EXPIRY_SKEW_MS = 30_000

function signature(cfg: Config): string {
  return [cfg.grant, cfg.tokenUrl, cfg.clientId, cfg.clientSecret, cfg.username, cfg.participantToken].join('|')
}

function isFresh(token: TokenResult): boolean {
  return Date.now() < token.obtainedAt + token.expiresIn * 1000 - EXPIRY_SKEW_MS
}

/** Step 15：向 Keycloak 取得 access_token（強制重新取得）。 */
export async function requestAccessToken(cfg: Config): Promise<TokenResult> {
  const missing = validateForOAuth(cfg)
  if (missing.length) throw new Error(`取 OAuth token 前缺少設定：${missing.join(', ')}`)

  const body = new URLSearchParams()
  body.set('grant_type', cfg.grant)
  body.set('client_id', cfg.clientId)
  if (cfg.clientSecret) body.set('client_secret', cfg.clientSecret)
  if (cfg.grant === 'password') {
    body.set('username', cfg.username ?? '')
    body.set('password', cfg.password ?? '')
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' }
  const participant = getParticipantToken(cfg)
  if (participant) headers['X-Participant-Token'] = participant

  const response = await fetch(cfg.tokenUrl, { method: 'POST', headers, body })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`OAuth 取得 token 失敗（HTTP ${response.status}）：${text.slice(0, 400)}`)
  }

  let json: { access_token?: string; token_type?: string; expires_in?: number }
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`OAuth 回應非 JSON：${text.slice(0, 200)}`)
  }
  if (!json.access_token) throw new Error('OAuth 回應沒有 access_token。')

  const token: TokenResult = {
    accessToken: json.access_token,
    tokenType: json.token_type ?? 'Bearer',
    expiresIn: json.expires_in ?? 300,
    obtainedAt: Date.now()
  }
  cache = { token, signature: signature(cfg) }
  return token
}

/** 取得有效 token，沿用快取直到快過期才重新換（含 refresh）。 */
export async function getAccessToken(cfg: Config): Promise<TokenResult> {
  if (cache && cache.signature === signature(cfg) && isFresh(cache.token)) return cache.token
  return requestAccessToken(cfg)
}

/** 後續 FHIR 交易要帶的 HTTP Header（Step 10 + 15 組合）。 */
export async function getAuthHeaders(cfg: Config): Promise<Record<string, string>> {
  const token = await getAccessToken(cfg)
  return {
    Authorization: `${token.tokenType} ${token.accessToken}`,
    'X-Participant-Token': getParticipantToken(cfg)
  }
}
