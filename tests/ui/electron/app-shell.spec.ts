import { closeRxFhir, expect, getLocationHash, test } from '../helpers/launchElectron'
import { selectors } from '../helpers/selectors'

test('launches the Electron shell and navigates across primary routes', async ({ launchApp }) => {
  const app = await launchApp()

  try {
    await expect(app.page.getByTestId(selectors.app.sidebar)).toBeVisible()
    await expect(app.page.locator('[data-page-heading="true"]')).toBeVisible()
    await expect.poll(() => getLocationHash(app.page)).toBe('#/creator')

    await app.page.getByTestId(selectors.app.nav.consumer).click()
    await expect.poll(() => getLocationHash(app.page)).toBe('#/consumer')
    await expect(app.page.locator('[data-page-heading="true"]')).toBeVisible()

    await app.page.getByTestId(selectors.app.nav.settings).click()
    await expect.poll(() => getLocationHash(app.page)).toBe('#/settings')
    await expect(app.page.locator('[data-page-heading="true"]')).toBeVisible()

    await app.page.getByTestId(selectors.app.nav.about).click()
    await expect.poll(() => getLocationHash(app.page)).toBe('#/about')
    await expect(app.page.locator('[data-page-heading="true"]')).toBeVisible()

    await app.page.getByTestId(selectors.app.nav.creator).click()
    await expect.poll(() => getLocationHash(app.page)).toBe('#/creator')
  } finally {
    await closeRxFhir(app)
  }
})
