import { closeRxFhir, expect, test } from '../helpers/launchElectron'
import { readFixtureText } from '../helpers/fixtureLoader'
import { selectors } from '../helpers/selectors'

test('imports a local Bundle through drag and drop', async ({ launchApp }) => {
  const app = await launchApp()

  try {
    await app.page.getByTestId(selectors.app.nav.consumer).click()
    await expect(app.page.getByTestId(selectors.consumer.dropzoneRoot)).toBeVisible()

    const bundleContent = await readFixtureText('bundle/imported-local-bundle.json')
    const dataTransfer = await app.page.evaluateHandle((payload) => {
      const transfer = new DataTransfer()
      const file = new File([payload], 'imported-local-bundle.json', {
        type: 'application/json'
      })
      transfer.items.add(file)
      return transfer
    }, bundleContent)

    await app.page.dispatchEvent(`[data-testid="${selectors.consumer.dropzoneRoot}"]`, 'dragenter', {
      dataTransfer
    })
    await expect(app.page.getByTestId(selectors.consumer.dropzoneOverlay)).toBeVisible()

    await app.page.dispatchEvent(`[data-testid="${selectors.consumer.dropzoneRoot}"]`, 'drop', {
      dataTransfer
    })

    await expect(app.page.locator('[data-result-id="local-import-bundle-001"]')).toBeVisible()
    await expect(app.page.getByTestId(selectors.consumer.detail.root)).toBeVisible()
    await expect(app.page.getByTestId(selectors.consumer.detail.root).getByText('Local Import Patient')).toBeVisible()
  } finally {
    await closeRxFhir(app)
  }
})
