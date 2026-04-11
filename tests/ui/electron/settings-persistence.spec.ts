import { closeRxFhir, expect, test } from '../helpers/launchElectron'
import { selectors } from '../helpers/selectors'

test('persists accessibility preferences across relaunch', async ({ launchApp }) => {
  let app = await launchApp()

  try {
    await app.page.getByTestId(selectors.app.nav.settings).click()
    await app.page.getByTestId(selectors.settings.tabs.accessibility).click()

    await app.page.getByTestId(selectors.settings.accessibility.textScale('scale112')).click()
    await app.page.getByTestId(selectors.settings.accessibility.zoom('zoom110')).click()

    await expect(app.page.getByTestId(selectors.settings.accessibility.textScale('scale112'))).toHaveAttribute('aria-pressed', 'true')
    await expect(app.page.getByTestId(selectors.settings.accessibility.zoom('zoom110'))).toHaveAttribute('aria-pressed', 'true')

    await closeRxFhir(app)
    app = await launchApp()

    await app.page.getByTestId(selectors.app.nav.settings).click()
    await app.page.getByTestId(selectors.settings.tabs.accessibility).click()

    await expect(app.page.getByTestId(selectors.settings.accessibility.textScale('scale112'))).toHaveAttribute('aria-pressed', 'true')
    await expect(app.page.getByTestId(selectors.settings.accessibility.zoom('zoom110'))).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => app.page.evaluate(() => document.documentElement.dataset.textScale)).toBe('scale112')
  } finally {
    await closeRxFhir(app)
  }
})
