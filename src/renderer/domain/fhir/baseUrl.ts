export const DEFAULT_SERVER_URL = 'https://hapi.fhir.org/baseR4'

export function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

export function getFhirBaseUrl(): string {
  return localStorage.getItem('fhirServerUrl') || DEFAULT_SERVER_URL
}

export function setFhirBaseUrl(url: string): void {
  localStorage.setItem('fhirServerUrl', url)
}
