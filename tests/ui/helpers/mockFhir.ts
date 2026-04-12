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

export async function mockFhirSearchFixture(page: Page, fixturePath: string): Promise<void> {
  await fulfillFhirRoute(page, fixturePath)
}

async function fulfillJsonRoute(
  page: Page,
  pattern: string,
  body: unknown,
  options: MockFhirResponseOptions = {}
): Promise<void> {
  await page.route(pattern, async (route) => {
    await route.fulfill({
      status: options.status ?? 200,
      statusText: options.statusText ?? 'OK',
      contentType: 'application/fhir+json',
      body: JSON.stringify(body)
    })
  })
}

export async function mockBundleValidate(
  page: Page,
  body: unknown,
  options: MockFhirResponseOptions = {}
): Promise<void> {
  await page.route('**/Bundle/$validate', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }

    await route.fulfill({
      status: options.status ?? 200,
      statusText: options.statusText ?? 'OK',
      contentType: 'application/fhir+json',
      body: JSON.stringify(body)
    })
  })
}

export async function mockBundleValidateUnavailable(page: Page, status = 501): Promise<void> {
  await mockBundleValidate(page, {
    resourceType: 'OperationOutcome',
    issue: [
      {
        severity: 'information',
        code: 'not-supported',
        diagnostics: 'Bundle $validate is not supported by this mock server.'
      }
    ]
  }, {
    status,
    statusText: 'Not Implemented'
  })
}

export async function mockFhirSearchSuccess(page: Page): Promise<void> {
  await fulfillFhirRoute(page, 'fhir/search-success.bundle.json')
}

export async function mockFhirComplexAuthorSearchSuccess(page: Page): Promise<void> {
  await fulfillFhirRoute(page, 'fhir/search-complex-author.bundle.json')
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

export async function mockSlowFhirSearch(page: Page, delayMs = 2_000): Promise<void> {
  const body = JSON.stringify(await readJsonFixture('fhir/search-success.bundle.json'))

  await page.route('**/Bundle?**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
    await route.fulfill({
      status: 200,
      statusText: 'OK',
      contentType: 'application/fhir+json',
      body
    })
  })
}

export async function mockFhirSearchPagination(page: Page): Promise<void> {
  const pageOne = await readJsonFixture<fhir4.Bundle>('fhir/search-pagination-page-1.bundle.json')
  const pageTwo = await readJsonFixture<fhir4.Bundle>('fhir/search-pagination-page-2.bundle.json')

  await page.route('**/Bundle?**', async (route) => {
    const url = route.request().url()
    const body = url.includes('_page=2') ? pageTwo : pageOne

    await route.fulfill({
      status: 200,
      statusText: 'OK',
      contentType: 'application/fhir+json',
      body: JSON.stringify(body)
    })
  })
}

export async function mockFhirServerHealth(
  page: Page,
  payload: Partial<fhir4.CapabilityStatement> = {}
): Promise<void> {
  await fulfillJsonRoute(page, '**/metadata', {
    resourceType: 'CapabilityStatement',
    status: 'active',
    date: '2026-04-11T10:00:00Z',
    kind: 'instance',
    fhirVersion: '4.0.1',
    format: ['json'],
    name: 'RxFHIR Mock Server',
    ...payload
  })
}

interface MockCreatorSubmissionFlowOptions {
  bundleId?: string
  compositionId?: string
  patientIdentifier: string
  patientName: string
  organizationName?: string
  practitionerName?: string
  conditionText?: string
  medicationText?: string
  compositionTitle?: string
  compositionDate?: string
}

export async function mockCreatorSubmissionFlow(
  page: Page,
  options: MockCreatorSubmissionFlowOptions
): Promise<void> {
  const {
    bundleId = 'mock-created-bundle',
    compositionId = 'mock-created-composition',
    patientIdentifier,
    patientName,
    organizationName = 'Mock Creator Clinic',
    practitionerName = 'Dr. Mock Creator',
    conditionText = 'Mock Creator Condition',
    medicationText = 'Mock Creator Medication',
    compositionTitle = 'Mock Creator Bundle',
    compositionDate = '2026-04-11T10:00:00+08:00'
  } = options

  await page.route('**/Composition', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }

    const body = route.request().postDataJSON() as fhir4.Composition
    await route.fulfill({
      status: 201,
      statusText: 'Created',
      contentType: 'application/fhir+json',
      body: JSON.stringify({
        ...body,
        id: compositionId
      })
    })
  })

  await page.route('**/Bundle', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }

    const body = route.request().postDataJSON() as fhir4.Bundle
    await route.fulfill({
      status: 201,
      statusText: 'Created',
      contentType: 'application/fhir+json',
      body: JSON.stringify({
        ...body,
        id: bundleId
      })
    })
  })

  await fulfillJsonRoute(page, '**/Bundle?**', {
    resourceType: 'Bundle',
    type: 'searchset',
    total: 1,
    entry: [
      {
        resource: {
          resourceType: 'Bundle',
          id: bundleId,
          type: 'document',
          entry: [
            {
              resource: {
                resourceType: 'Composition',
                id: compositionId,
                status: 'final',
                title: compositionTitle,
                date: compositionDate
              }
            },
            {
              resource: {
                resourceType: 'Patient',
                id: 'mock-creator-patient',
                identifier: [{ value: patientIdentifier }],
                name: [{ text: patientName }]
              }
            },
            {
              resource: {
                resourceType: 'Organization',
                id: 'mock-creator-organization',
                name: organizationName
              }
            },
            {
              resource: {
                resourceType: 'Practitioner',
                id: 'mock-creator-practitioner',
                name: [{ text: practitionerName }]
              }
            },
            {
              resource: {
                resourceType: 'Condition',
                id: 'mock-creator-condition',
                code: { text: conditionText }
              }
            },
            {
              resource: {
                resourceType: 'Medication',
                id: 'mock-creator-medication',
                code: { text: medicationText }
              }
            }
          ]
        }
      }
    ]
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
