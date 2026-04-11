import { closeRxFhir, expect, test } from '../helpers/launchElectron'
import { mockFhirSearchEmpty, mockFhirSearchError, mockSlowFhirSearch } from '../helpers/mockFhir'
import { selectors } from '../helpers/selectors'

test('shows an empty state for a mocked search with no results', async ({ launchApp }) => {
  const app = await launchApp()

  try {
    await app.page.getByTestId(selectors.app.nav.consumer).click()
    await mockFhirSearchEmpty(app.page)

    await app.page.getByTestId(selectors.consumer.search.basicInput).fill('E2E-NO-RESULTS')
    await app.page.getByTestId(selectors.consumer.search.basicSubmit).click()

    await expect(app.page.getByTestId(selectors.consumer.results.empty)).toBeVisible()
    await expect(app.page.locator('[data-result-id]')).toHaveCount(0)
  } finally {
    await closeRxFhir(app)
  }
})

test('shows an error state for a mocked search failure', async ({ launchApp }) => {
  const app = await launchApp()

  try {
    await app.page.getByTestId(selectors.app.nav.consumer).click()
    await mockFhirSearchError(app.page)

    await app.page.getByTestId(selectors.consumer.search.basicInput).fill('E2E-ERROR')
    await app.page.getByTestId(selectors.consumer.search.basicSubmit).click()

    await expect(app.page.getByTestId(selectors.consumer.results.error)).toBeVisible()
    await expect(app.page.getByText('E2E mock search failed')).toBeVisible()
  } finally {
    await closeRxFhir(app)
  }
})

test('shows a cancelled state when the user aborts an in-flight search', async ({ launchApp }) => {
  const app = await launchApp()

  try {
    await app.page.getByTestId(selectors.app.nav.consumer).click()
    await mockSlowFhirSearch(app.page)

    await app.page.getByTestId(selectors.consumer.search.basicInput).fill('E2E-CANCEL')
    await app.page.getByTestId(selectors.consumer.search.basicSubmit).click()

    await expect(app.page.getByTestId(selectors.consumer.results.loading)).toBeVisible()
    await app.page.getByTestId(selectors.consumer.search.basicCancel).click()

    await expect(app.page.getByTestId(selectors.consumer.results.cancelled)).toBeVisible()
  } finally {
    await closeRxFhir(app)
  }
})
