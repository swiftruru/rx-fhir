import { closeRxFhir, expect, test } from '../helpers/launchElectron'
import { mockFhirSearchPagination } from '../helpers/mockFhir'
import { selectors } from '../helpers/selectors'

test('loads additional result pages through the consumer load-more flow', async ({ launchApp }) => {
  const app = await launchApp()

  try {
    await app.page.getByTestId(selectors.app.nav.consumer).click()
    await mockFhirSearchPagination(app.page)

    await app.page.getByTestId(selectors.consumer.search.basicInput).fill('E2E-PAGE')
    await app.page.getByTestId(selectors.consumer.search.basicSubmit).click()

    await expect(app.page.getByTestId(selectors.consumer.results.root)).toBeVisible()
    await expect(app.page.locator('[data-result-id="mock-page-bundle-a"]')).toBeVisible()
    await expect(app.page.locator('[data-result-id]')).toHaveCount(1)
    await expect(app.page.getByTestId(selectors.consumer.results.loadMore)).toBeVisible()

    await app.page.getByTestId(selectors.consumer.results.loadMore).click()

    await expect(app.page.locator('[data-result-id]')).toHaveCount(3)
    await expect(app.page.locator('[data-result-id="mock-page-bundle-b"]')).toBeVisible()
    await expect(app.page.locator('[data-result-id="mock-page-bundle-c"]')).toBeVisible()
    await expect(app.page.getByTestId(selectors.consumer.results.loadMore)).toBeHidden()
  } finally {
    await closeRxFhir(app)
  }
})
