import { closeRxFhir, expect, test } from '../helpers/launchElectron'
import { mockFhirSearchSuccess } from '../helpers/mockFhir'
import { selectors } from '../helpers/selectors'

test('records a search, pins it in history, and surfaces it in saved searches', async ({ launchApp }) => {
  const app = await launchApp()

  try {
    await app.page.getByTestId(selectors.app.nav.consumer).click()
    await mockFhirSearchSuccess(app.page)

    await app.page.getByTestId(selectors.consumer.search.basicInput).fill('E2E-HISTORY-QUERY')
    await app.page.getByTestId(selectors.consumer.search.basicSubmit).click()

    await expect(app.page.getByTestId(selectors.consumer.results.root)).toBeVisible()
    await expect(app.page.locator('[data-result-id="mock-search-bundle-a"]')).toBeVisible()

    await app.page.getByTestId(selectors.consumer.middleTabs.history).click()
    await expect(app.page.getByTestId(selectors.consumer.history.root)).toBeVisible()

    await app.page.getByTestId(selectors.consumer.history.innerTabs.searches).click()
    await expect(app.page.getByTestId(selectors.consumer.history.searchList.root)).toBeVisible()

    const historyCard = app.page
      .locator('[data-testid="consumer.history.search-card"][data-search-identifier="E2E-HISTORY-QUERY"]')
      .first()

    await expect(historyCard).toBeVisible()
    await expect(historyCard).toHaveAttribute('data-pinned', 'false')

    await historyCard.getByTestId(selectors.consumer.history.searchList.pin).click()
    await expect(historyCard).toHaveAttribute('data-pinned', 'true')
    await expect(historyCard.getByTestId(selectors.consumer.history.searchList.pinnedBadge)).toBeVisible()

    await historyCard.getByTestId(selectors.consumer.history.searchList.run).click()

    await expect(app.page.getByTestId(selectors.consumer.middleTabs.results)).toHaveAttribute('data-state', 'active')
    await expect(app.page.getByTestId(selectors.consumer.results.root)).toBeVisible()
    await expect(app.page.locator('[data-result-id="mock-search-bundle-a"]')).toBeVisible()
    await expect(app.page.getByTestId(selectors.consumer.search.basicInput)).toHaveValue('E2E-HISTORY-QUERY')

    await app.page.getByTestId(selectors.consumer.middleTabs.quickstart).click()

    const savedSearchesToggle = app.page.getByTestId(selectors.consumer.savedSearches.toggle('dashboard'))
    await expect(savedSearchesToggle).toBeVisible()

    if ((await savedSearchesToggle.getAttribute('aria-expanded')) !== 'true') {
      await savedSearchesToggle.click()
    }

    const savedRow = app.page
      .locator('[data-testid="consumer.saved-search.row"][data-search-identifier="E2E-HISTORY-QUERY"]')
      .first()

    await expect(savedRow).toBeVisible()
    await expect(savedRow).toHaveAttribute('data-pinned', 'true')
  } finally {
    await closeRxFhir(app)
  }
})
