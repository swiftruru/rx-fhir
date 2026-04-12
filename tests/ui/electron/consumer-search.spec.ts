import { closeRxFhir, expect, test } from '../helpers/launchElectron'
import { readJsonFixture } from '../helpers/fixtureLoader'
import { mockFhirSearchSuccess } from '../helpers/mockFhir'
import { selectors } from '../helpers/selectors'

test('runs a mocked FHIR search and opens detail, diff, and export controls', async ({ launchApp }) => {
  const app = await launchApp()

  try {
    await app.page.getByTestId(selectors.app.nav.consumer).click()
    await mockFhirSearchSuccess(app.page)

    await app.page.getByTestId(selectors.consumer.search.basicInput).fill('E2E-SEARCH-QUERY')
    await app.page.getByTestId(selectors.consumer.search.basicSubmit).click()

    await expect(app.page.getByTestId(selectors.consumer.results.root)).toBeVisible()
    await expect(app.page.locator('[data-result-id="mock-search-bundle-a"]')).toBeVisible()
    await expect(app.page.locator('[data-result-id="mock-search-bundle-b"]')).toBeVisible()

    await app.page.locator('[data-result-id="mock-search-bundle-a"]').click()
    await expect(app.page.getByTestId(selectors.consumer.detail.root)).toBeVisible()
    await expect(app.page.getByTestId(selectors.consumer.detail.audit)).toHaveCount(0)

    await app.page.getByTestId(selectors.consumer.detail.jsonView).click()
    await expect(app.page.getByTestId(selectors.consumer.detail.jsonView)).toHaveAttribute('aria-pressed', 'true')

    await app.page.getByTestId(selectors.consumer.detail.structuredView).click()
    await expect(app.page.getByTestId(selectors.consumer.detail.structuredView)).toHaveAttribute('aria-pressed', 'true')
    await app.page.getByTestId(selectors.consumer.detail.exportTrigger).click()
    await expect(app.page.getByTestId(selectors.consumer.detail.exportJson)).toBeVisible()
    await expect(app.page.getByTestId(selectors.consumer.detail.exportPostman)).toBeVisible()
    await expect(app.page.getByTestId(selectors.consumer.detail.exportHtml)).toBeVisible()

    await app.page.getByTestId(selectors.consumer.results.compare('mock-search-bundle-b')).click()
    await expect(app.page.locator('[role="dialog"]')).toBeVisible()
    await app.page.keyboard.press('Escape')
    await expect(app.page.locator('[role="dialog"]')).toBeHidden()
  } finally {
    await closeRxFhir(app)
  }
})

test('does not rerun a completed Consumer search when navigating away and back', async ({ launchApp }) => {
  const app = await launchApp()
  let searchRequestCount = 0

  try {
    const searchFixture = await readJsonFixture('fhir/search-success.bundle.json')

    await app.page.route('**/Bundle?**', async (route) => {
      searchRequestCount += 1
      await route.fulfill({
        status: 200,
        statusText: 'OK',
        contentType: 'application/fhir+json',
        body: JSON.stringify(searchFixture)
      })
    })

    await app.page.getByTestId(selectors.app.nav.consumer).click()
    await app.page.getByTestId(selectors.consumer.search.basicInput).fill('E2E-SEARCH-QUERY')
    await app.page.getByTestId(selectors.consumer.search.basicSubmit).click()

    await expect(app.page.locator('[data-result-id="mock-search-bundle-a"]')).toBeVisible()
    await expect.poll(() => searchRequestCount).toBe(1)

    await app.page.getByTestId(selectors.app.nav.settings).click()
    await expect(app.page.getByTestId(selectors.settings.tabs.server)).toBeVisible()

    await app.page.getByTestId(selectors.app.nav.consumer).click()
    await expect(app.page.locator('[data-result-id="mock-search-bundle-a"]')).toBeVisible()
    await expect(app.page.getByTestId(selectors.consumer.search.basicInput)).toHaveValue('E2E-SEARCH-QUERY')
    await expect(app.page.getByTestId(selectors.consumer.results.loading)).toHaveCount(0)
    await expect.poll(() => searchRequestCount).toBe(1)
  } finally {
    await closeRxFhir(app)
  }
})
