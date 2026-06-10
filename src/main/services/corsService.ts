import electron from 'electron'

const { session } = electron

/**
 * The conference FHIR/OAuth servers (and many HAPI deployments behind a gateway)
 * do not return CORS headers on preflight (OPTIONS) responses. Once the renderer
 * attaches an `Authorization` or `X-Participant-Token` header the request stops
 * being "simple", the browser issues a preflight, and the missing
 * `Access-Control-Allow-*` headers make Chromium block the call — surfacing in the
 * app as a bogus "連線失敗 / Offline".
 *
 * Rather than disabling `webSecurity` globally, we surgically inject permissive
 * CORS response headers for outbound http(s) requests. Existing `Access-Control-*`
 * headers are stripped first so we never emit a duplicate `Access-Control-Allow-Origin`
 * (two values is invalid and Chromium rejects it).
 */
const ALLOWED_METHODS = 'GET, POST, PUT, DELETE, PATCH, OPTIONS'
const ALLOWED_HEADERS = [
  'Authorization',
  'X-Participant-Token',
  'Content-Type',
  'Accept',
  'Prefer',
  'If-Match',
  'If-None-Exist',
  'X-Requested-With'
].join(', ')

export function installCorsShim(): void {
  const filter = { urls: ['https://*/*', 'http://*/*'] }

  session.defaultSession.webRequest.onHeadersReceived(filter, (details, callback) => {
    const responseHeaders = details.responseHeaders ?? {}
    const cleaned: Record<string, string[]> = {}

    for (const [key, value] of Object.entries(responseHeaders)) {
      if (/^access-control-/i.test(key)) continue
      cleaned[key] = Array.isArray(value) ? value : [String(value)]
    }

    cleaned['Access-Control-Allow-Origin'] = ['*']
    cleaned['Access-Control-Allow-Methods'] = [ALLOWED_METHODS]
    cleaned['Access-Control-Allow-Headers'] = [ALLOWED_HEADERS]

    callback({ responseHeaders: cleaned })
  })
}
