/**
 * 集中載入並驗證 .env 設定。所有機敏資訊只從環境變數讀取，不寫死在程式碼。
 */
import 'dotenv/config'

export type OAuthGrant = 'client_credentials' | 'password'

export interface Config {
  // Step 15 — Keycloak OAuth
  grant: OAuthGrant
  tokenUrl: string
  clientId: string
  clientSecret: string
  username?: string
  password?: string
  // Step 10 — X-Participant-Token
  participantToken: string
  proxyBaseUrl?: string
  // Step 120 / 230 — FHIR 主機
  fhirBaseUrl: string
  fhirProxyBaseUrl?: string
  // Step 20 — meta.profile
  metaProfileUrls: string[]
  // 純紀錄用連結
  fhirfoxValidatorUrl?: string
  onestopValidatorUrl?: string
  gazelleBaseUrl?: string
  testInstanceId?: string
  // Step 30 — 自家產品 UI
  productUiUrl?: string
  // 輸出
  screenshotDir: string
  reportDir: string
}

function env(key: string, fallback = ''): string {
  return (process.env[key] ?? fallback).trim()
}

function normalizeGrant(value: string): OAuthGrant {
  return value.toLowerCase() === 'password' ? 'password' : 'client_credentials'
}

export function loadConfig(): Config {
  return {
    grant: normalizeGrant(env('KEYCLOAK_GRANT_TYPE', env('OAUTH_GRANT_TYPE', 'client_credentials'))),
    tokenUrl: env('KEYCLOAK_TOKEN_ENDPOINT', 'https://twcat-oauthsrv.dicom.org.tw/realms/twcat2026/protocol/openid-connect/token'),
    clientId: env('KEYCLOAK_CLIENT_ID', 'hapifhir'),
    clientSecret: env('KEYCLOAK_CLIENT_SECRET'),
    username: env('KEYCLOAK_USERNAME') || undefined,
    password: env('KEYCLOAK_PASSWORD') || undefined,
    participantToken: env('TWCAT_PARTICIPANT_TOKEN'),
    proxyBaseUrl: env('TWCAT_PROXY_BASE_URL') || undefined,
    fhirBaseUrl: env('FHIR_BASE_URL', 'https://twcat-fhirsrv.dicom.org.tw/fhir'),
    fhirProxyBaseUrl: env('FHIR_PROXY_BASE_URL') || undefined,
    metaProfileUrls: env('META_PROFILE_URLS').split(',').map((s) => s.trim()).filter(Boolean),
    fhirfoxValidatorUrl: env('FHIRFOX_VALIDATOR_URL') || undefined,
    onestopValidatorUrl: env('ONESTOP_VALIDATOR_URL') || undefined,
    gazelleBaseUrl: env('GAZELLE_BASE_URL') || undefined,
    testInstanceId: env('TEST_INSTANCE_ID') || undefined,
    productUiUrl: env('PRODUCT_UI_URL') || undefined,
    screenshotDir: env('SCREENSHOT_DIR', './output/screenshots'),
    reportDir: env('REPORT_DIR', './output/reports')
  }
}

/** 取 OAuth token 前的必要欄位檢查；回傳缺漏項目（空陣列代表 OK）。 */
export function validateForOAuth(cfg: Config): string[] {
  const missing: string[] = []
  if (!cfg.tokenUrl) missing.push('KEYCLOAK_TOKEN_ENDPOINT')
  if (!cfg.clientId) missing.push('KEYCLOAK_CLIENT_ID')
  if (cfg.grant === 'client_credentials' && !cfg.clientSecret) missing.push('KEYCLOAK_CLIENT_SECRET')
  if (cfg.grant === 'password') {
    if (!cfg.username) missing.push('KEYCLOAK_USERNAME')
    if (!cfg.password) missing.push('KEYCLOAK_PASSWORD')
  }
  return missing
}

/** 遮罩機敏字串供顯示／紀錄（保留頭尾，中間以 … 取代）。 */
export function mask(value: string | undefined): string {
  if (!value) return '(空)'
  if (value.length <= 12) return '••••••'
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}
