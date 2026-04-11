import { closeRxFhir, expect, test } from '../helpers/launchElectron'
import { mockFhirComplexAuthorSearchSuccess, mockFhirSearchSuccess } from '../helpers/mockFhir'
import { selectors } from '../helpers/selectors'

test('runs a date search and records it as a date-mode history entry', async ({ launchApp }) => {
  const app = await launchApp()

  try {
    await app.page.getByTestId(selectors.app.nav.consumer).click()
    await mockFhirSearchSuccess(app.page)

    await app.page.getByTestId('consumer.search.tab.date').click()
    await app.page.getByTestId(selectors.consumer.search.dateIdentifier).fill('E2E-DATE-001')
    await app.page.getByTestId(selectors.consumer.search.dateValue).fill('2026-04-10')
    await app.page.getByTestId(selectors.consumer.search.dateSubmit).click()

    await expect(app.page.getByTestId(selectors.consumer.results.root)).toBeVisible()
    await expect(app.page.locator('[data-result-id]')).toHaveCount(1)
    await expect(app.page.locator('[data-result-id="mock-search-bundle-a"]')).toBeVisible()
    await expect(app.page.getByText('timestamp=2026-04-10')).toBeVisible()
    await expect(app.page.getByText('Composition.date starts with "2026-04-10"')).toBeVisible()

    await app.page.getByTestId(selectors.consumer.middleTabs.history).click()
    await app.page.getByTestId(selectors.consumer.history.innerTabs.searches).click()

    const historyCard = app.page
      .locator('[data-testid="consumer.history.search-card"][data-search-mode="date"][data-search-identifier="E2E-DATE-001"]')
      .first()

    await expect(historyCard).toBeVisible()
  } finally {
    await closeRxFhir(app)
  }
})

test('runs a complex author search and records it as a complex-mode history entry', async ({ launchApp }) => {
  const app = await launchApp()

  try {
    await app.page.getByTestId(selectors.app.nav.consumer).click()
    await mockFhirComplexAuthorSearchSuccess(app.page)

    await app.page.getByTestId('consumer.search.tab.complex').click()
    await app.page.getByTestId(selectors.consumer.search.complexIdentifier).fill('E2E-COMPLEX-001')
    await app.page.getByTestId(selectors.consumer.search.complexBy).click()
    await app.page.getByRole('option', { name: /author\.name/i }).click()
    await app.page.getByTestId(selectors.consumer.search.complexAuthorName).fill('Dr. E2E Alpha')
    await app.page.getByTestId(selectors.consumer.search.complexSubmit).click()

    await expect(app.page.getByTestId(selectors.consumer.results.root)).toBeVisible()
    await expect(app.page.locator('[data-result-id]')).toHaveCount(1)
    await expect(app.page.locator('[data-result-id="mock-search-bundle-a"]')).toBeVisible()
    await expect(app.page.getByText('Practitioner.name ~= "Dr. E2E Alpha"')).toBeVisible()

    await app.page.getByTestId(selectors.consumer.middleTabs.history).click()
    await app.page.getByTestId(selectors.consumer.history.innerTabs.searches).click()

    const historyCard = app.page
      .locator('[data-testid="consumer.history.search-card"][data-search-mode="complex"][data-search-identifier="E2E-COMPLEX-001"]')
      .first()

    await expect(historyCard).toBeVisible()
  } finally {
    await closeRxFhir(app)
  }
})
