export const DEFAULT_SERVER_URL = 'https://hapi.fhir.org/baseR4'

export function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

function getStorageValue(key: string): string | null {
  try {
    return typeof localStorage?.getItem === 'function' ? localStorage.getItem(key) : null
  } catch {
    return null
  }
}

export function getFhirBaseUrl(): string {
  return getStorageValue('fhirServerUrl') || DEFAULT_SERVER_URL
}

export function setFhirBaseUrl(url: string): void {
  try {
    if (typeof localStorage?.setItem === 'function') {
      localStorage.setItem('fhirServerUrl', url)
    }
  } catch {
    // Ignore storage failures and keep using the in-memory/default URL.
  }
}
