import { closeRxFhir, expect, test } from '../helpers/launchElectron'
import { mockBundleValidateUnavailable, mockFhirSearchSuccess } from '../helpers/mockFhir'
import { selectors } from '../helpers/selectors'

test('restores the consumer workspace and selected bundle across relaunch', async ({ launchApp }) => {
  let app = await launchApp()

  try {
    await app.page.getByTestId(selectors.app.nav.consumer).click()
    await mockFhirSearchSuccess(app.page)
    await mockBundleValidateUnavailable(app.page)

    await app.page.getByTestId(selectors.consumer.search.basicInput).fill('E2E-0001')
    await app.page.getByTestId(selectors.consumer.search.basicSubmit).click()

    await expect(app.page.getByTestId(selectors.consumer.results.root)).toBeVisible()
    await app.page.locator('[data-result-id="mock-search-bundle-a"]').click()
    await expect(app.page.getByTestId(selectors.consumer.detail.root)).toBeVisible()

    await closeRxFhir(app)
    app = await launchApp()

    await mockFhirSearchSuccess(app.page)
    await mockBundleValidateUnavailable(app.page)
    await app.page.getByTestId(selectors.app.nav.consumer).click()

    await expect(app.page.getByTestId(selectors.consumer.search.basicInput)).toHaveValue('E2E-0001')
    await expect(app.page.locator('[data-result-id="mock-search-bundle-a"]')).toBeVisible()
    await expect(app.page.getByTestId(selectors.consumer.detail.root)).toBeVisible()
    await expect(app.page.getByTestId(selectors.consumer.detail.root)).toContainText('E2E Search Patient A')
  } finally {
    await closeRxFhir(app)
  }
})
