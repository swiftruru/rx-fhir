import { closeRxFhir, expect, test } from '../helpers/launchElectron'
import { mockFhirServerHealth } from '../helpers/mockFhir'
import { selectors } from '../helpers/selectors'

test('tests, saves, and restores the server settings flow', async ({ launchApp }) => {
  let app = await launchApp()

  try {
    await app.page.getByTestId(selectors.app.nav.settings).click()
    await app.page.getByTestId(selectors.settings.tabs.server).click()
    await mockFhirServerHealth(app.page, {
      name: 'E2E Mock FHIR Server',
      fhirVersion: '4.0.1',
      rest: [
        {
          mode: 'server',
          resource: [
            {
              type: 'Bundle',
              operation: [{ name: 'validate' }]
            }
          ]
        }
      ]
    })

    await app.page.getByTestId(selectors.settings.server.urlInput).fill('https://mock.fhir.test/baseR4')
    await app.page.getByTestId(selectors.settings.server.testConnection).click()
    await expect(app.page.getByTestId(selectors.settings.server.testSuccess)).toContainText('E2E Mock FHIR Server')

    await app.page.getByTestId(selectors.settings.server.save).click()
    await expect(app.page.getByTestId(selectors.settings.server.saved)).toBeVisible()

    await app.page.getByTestId(selectors.settings.server.testConnection).click()
    await expect(app.page.getByTestId(selectors.settings.server.statusIndicator)).toContainText('online')
    await expect(app.page.getByTestId(selectors.settings.server.statusCard)).toContainText('E2E Mock FHIR Server')
    await expect(app.page.getByTestId(selectors.settings.server.statusCard)).toContainText('R4.0.1')
    await expect(app.page.getByTestId(selectors.settings.server.capabilities)).toContainText('Bundle $validate')
    await expect(app.page.getByTestId(selectors.settings.server.bundleValidateCapability)).toContainText('可用')

    await closeRxFhir(app)
    app = await launchApp()

    await app.page.getByTestId(selectors.app.nav.settings).click()
    await app.page.getByTestId(selectors.settings.tabs.server).click()
    await expect(app.page.getByTestId(selectors.settings.server.urlInput)).toHaveValue('https://mock.fhir.test/baseR4')
  } finally {
    await closeRxFhir(app)
  }
})
