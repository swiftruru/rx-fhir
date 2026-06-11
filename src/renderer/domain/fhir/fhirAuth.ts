/**
 * OAuth2 client-credentials support for FHIR servers that sit behind an
 * authorization gateway (e.g. the TW CAT conference server, which requires a
 * Keycloak-issued bearer token plus a static participant token on every call).
 *
 * The renderer owns all auth logic; the Electron main process only provides a
 * CORS shim (see main/services/corsService.ts) so these cross-origin,
 * custom-header requests survive Chromium's preflight.
 */

import { useFhirInspectorStore } from '../../features/creator/store/fhirInspectorStore'

/** Tag the token-exchange log with the active route (inlined to avoid a cycle with requestLogger). */
function currentModule(): string {
  const hash = window.location.hash
  if (hash.includes('/converter')) return 'converter'
  if (hash.includes('/creator')) return 'creator'
  if (hash.includes('/settings')) return 'settings'
  return 'app'
}

export interface OAuthConfig {
  enabled: boolean
  /** Token endpoint, e.g. https://.../realms/twcat2026/protocol/openid-connect/token */
  tokenUrl: string
  clientId: string
  clientSecret: string
  /** Sent as the X-Participant-Token header on both token exchange and FHIR calls. */
  participantToken: string
}

const STORAGE_KEY = 'rxfhir-oauth-config'

export const EMPTY_OAUTH_CONFIG: OAuthConfig = {
  enabled: false,
  tokenUrl: '',
  clientId: '',
  clientSecret: '',
  participantToken: ''
}

/**
 * Build-time credentials injected from .env.local (gitignored). Lets the app
 * pre-fill / auto-enable the conference OAuth section without the user typing
 * secrets. Empty strings when the env vars are absent (e.g. CI, other devs).
 */
/** Defaults for the conference server's quick-fill button. */
export const TWCAT_OAUTH_DEFAULTS: Omit<OAuthConfig, 'enabled'> = {
  tokenUrl: import.meta.env.RENDERER_VITE_TWCAT_TOKEN_URL
    || 'https://twcat-oauthsrv.dicom.org.tw/realms/twcat2026/protocol/openid-connect/token',
  clientId: import.meta.env.RENDERER_VITE_TWCAT_CLIENT_ID || 'hapifhir',
  clientSecret: import.meta.env.RENDERER_VITE_TWCAT_CLIENT_SECRET || '',
  participantToken: import.meta.env.RENDERER_VITE_TWCAT_PARTICIPANT_TOKEN || ''
}

/** True when .env.local supplied a complete, ready-to-use conference config. */
function hasEnvSeed(): boolean {
  return Boolean(TWCAT_OAUTH_DEFAULTS.clientSecret && TWCAT_OAUTH_DEFAULTS.participantToken)
}

export function getOAuthConfig(): OAuthConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<OAuthConfig>
      return { ...EMPTY_OAUTH_CONFIG, ...parsed }
    }
  } catch {
    // fall through to env seed / empty
  }

  // No saved config yet: seed from .env.local so the conference server works
  // out of the box. Non-conference users get the empty (disabled) config.
  if (hasEnvSeed()) {
    return { ...EMPTY_OAUTH_CONFIG, ...TWCAT_OAUTH_DEFAULTS, enabled: true }
  }
  return { ...EMPTY_OAUTH_CONFIG }
}

export function setOAuthConfig(config: OAuthConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // Ignore storage failures; auth simply stays in-memory/disabled.
  }
  // Any config change invalidates a cached token (different client/participant).
  clearTokenCache()
}

export function isOAuthConfigured(config: OAuthConfig = getOAuthConfig()): boolean {
  return Boolean(
    config.enabled
    && config.tokenUrl.trim()
    && config.clientId.trim()
    && config.clientSecret.trim()
  )
}

interface CachedToken {
  accessToken: string
  /** Epoch ms after which the token must be refreshed. */
  expiresAt: number
  /** Fingerprint of the config that produced this token. */
  signature: string
}

let cachedToken: CachedToken | null = null
let inFlight: Promise<string> | null = null

/** Refresh slightly before expiry to avoid races at the 5-minute boundary. */
const EXPIRY_SKEW_MS = 30_000

function configSignature(config: OAuthConfig): string {
  return [config.tokenUrl, config.clientId, config.clientSecret, config.participantToken].join('|')
}

export function clearTokenCache(): void {
  cachedToken = null
  inFlight = null
}

async function requestAccessToken(config: OAuthConfig): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.clientId,
    client_secret: config.clientSecret
  })

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded'
  }
  if (config.participantToken.trim()) {
    headers['X-Participant-Token'] = config.participantToken.trim()
  }

  // Log the token exchange into the request inspector so the "obtain token from
  // Keycloak" step is visible/screenshottable in-app. We push directly (not via
  // performLoggedRequest, which would recurse through getAuthHeaders). The
  // client_secret is masked in the logged body; the X-Participant-Token header
  // follows the inspector's normal reveal toggle.
  const requestId = useFhirInspectorStore.getState().startRequest({
    method: 'POST',
    url: config.tokenUrl,
    requestHeaders: headers,
    requestBody: { grant_type: 'client_credentials', client_id: config.clientId, client_secret: config.clientSecret ? '••••••' : '' }
  }, currentModule())

  let response: Response
  try {
    response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(15_000)
    })
  } catch (error) {
    useFhirInspectorStore.getState().finishRequest(requestId, {
      ok: false,
      errorMessage: error instanceof Error ? error.message : String(error)
    })
    throw error
  }

  const rawText = await response.clone().text().catch(() => '')
  useFhirInspectorStore.getState().finishRequest(requestId, {
    ok: response.ok,
    responseStatus: response.status,
    responseStatusText: response.statusText,
    responseHeaders: Object.fromEntries(response.headers.entries()),
    responseBody: (() => { try { return JSON.parse(rawText) } catch { return rawText } })()
  })

  if (!response.ok) {
    throw new Error(`OAuth token request failed (${response.status}): ${rawText.slice(0, 300)}`)
  }

  const json = (await response.json()) as { access_token?: string; expires_in?: number }
  if (!json.access_token) {
    throw new Error('OAuth token response did not contain an access_token')
  }

  const lifetimeMs = (json.expires_in ?? 300) * 1000
  cachedToken = {
    accessToken: json.access_token,
    expiresAt: Date.now() + Math.max(0, lifetimeMs - EXPIRY_SKEW_MS),
    signature: configSignature(config)
  }
  return json.access_token
}

/**
 * Returns a valid access token, reusing the cached one until it is about to
 * expire. Concurrent callers share a single in-flight request.
 */
export async function getAccessToken(config: OAuthConfig = getOAuthConfig()): Promise<string> {
  const signature = configSignature(config)
  if (cachedToken && cachedToken.signature === signature && Date.now() < cachedToken.expiresAt) {
    return cachedToken.accessToken
  }
  if (inFlight) return inFlight

  inFlight = requestAccessToken(config)
    .finally(() => { inFlight = null })
  return inFlight
}

/**
 * Headers to merge into every FHIR request. Returns an empty object when OAuth
 * is not configured, so non-conference servers are completely unaffected.
 *
 * Throws if a token cannot be obtained, letting callers surface a real error
 * instead of silently sending an unauthenticated request.
 */
export async function getAuthHeaders(config: OAuthConfig = getOAuthConfig()): Promise<Record<string, string>> {
  if (!isOAuthConfigured(config)) return {}

  const headers: Record<string, string> = {
    Authorization: `Bearer ${await getAccessToken(config)}`
  }
  if (config.participantToken.trim()) {
    headers['X-Participant-Token'] = config.participantToken.trim()
  }
  return headers
}

/**
 * Verifies the OAuth configuration by performing a token exchange.
 * Used by the Settings "test connection" flow to give targeted feedback.
 */
export async function verifyOAuthConfig(config: OAuthConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    clearTokenCache()
    await getAccessToken(config)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
