import type { Page } from '@playwright/test'
import { readJsonFixture } from './fixtureLoader'

interface MockFhirResponseOptions {
  status?: number
  statusText?: string
}

async function fulfillFhirRoute(
  page: Page,
  fixturePath: string,
  options: MockFhirResponseOptions = {}
): Promise<void> {
  const body = JSON.stringify(await readJsonFixture(fixturePath))

  await page.route('**/Bundle?**', async (route) => {
    await route.fulfill({
      status: options.status ?? 200,
      statusText: options.statusText ?? 'OK',
      contentType: 'application/fhir+json',
      body
    })
  })
}

export async function mockFhirSearchSuccess(page: Page): Promise<void> {
  await fulfillFhirRoute(page, 'fhir/search-success.bundle.json')
}

export async function mockFhirSearchEmpty(page: Page): Promise<void> {
  await fulfillFhirRoute(page, 'fhir/search-empty.bundle.json')
}

export async function mockFhirSearchError(page: Page): Promise<void> {
  await fulfillFhirRoute(page, 'fhir/search-error.operation-outcome.json', {
    status: 500,
    statusText: 'Mock Search Failed'
  })
}

export async function mockFhirBundleById(
  page: Page,
  bundleId: string,
  fixturePath = 'fhir/history-bundle.bundle.json'
): Promise<void> {
  const body = JSON.stringify(await readJsonFixture(fixturePath))

  await page.route(`**/Bundle/${bundleId}`, async (route) => {
    await route.fulfill({
      status: 200,
      statusText: 'OK',
      contentType: 'application/fhir+json',
      body
    })
  })
}
