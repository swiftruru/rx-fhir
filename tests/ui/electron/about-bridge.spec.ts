import { closeRxFhir, expect, test } from '../helpers/launchElectron'
import { emitE2EUpdateResult, getE2EBridgeCalls, resetE2EBridge, setE2EUpdateMocks } from '../helpers/e2eBridge'
import { selectors } from '../helpers/selectors'

test('shows the up-to-date state after a stubbed update check', async ({ launchApp }) => {
  const app = await launchApp()

  try {
    await resetE2EBridge(app.page)
    await setE2EUpdateMocks(app.page, {
      checkForUpdatesResult: {
        status: 'up-to-date',
        currentVersion: '1.0.35'
      }
    })

    await app.page.getByTestId(selectors.app.nav.about).click()
    await app.page.getByTestId(selectors.about.update.check).click()

    await expect(app.page.getByTestId(selectors.about.update.statuses.upToDate)).toBeVisible()

    const calls = await getE2EBridgeCalls(app.page)
    expect(calls.checkForUpdatesCount).toBe(1)
  } finally {
    await closeRxFhir(app)
  }
})

test('routes external links and update actions through the stubbed desktop bridge', async ({ launchApp }) => {
  const app = await launchApp()

  try {
    await resetE2EBridge(app.page)
    await setE2EUpdateMocks(app.page, {
      cachedUpdateResult: null,
      checkForUpdatesResult: null
    })

    await app.page.getByTestId(selectors.app.nav.about).click()

    await emitE2EUpdateResult(app.page, {
      status: 'update-available',
      currentVersion: '1.0.35',
      latestVersion: '9.9.9',
      releaseUrl: 'https://example.test/releases/9.9.9',
      releaseName: 'RxFHIR v9.9.9'
    })

    await expect(app.page.getByTestId(selectors.about.update.indicator)).toBeVisible()
    await expect(app.page.getByTestId(selectors.about.update.statuses.available)).toBeVisible()

    await app.page.getByTestId(selectors.about.external.github).click()
    await app.page.getByTestId(selectors.about.external.homepage).click()
    await app.page.getByTestId(selectors.about.update.openReleases).click()
    await app.page.getByTestId(selectors.about.update.skipVersion).click()

    await expect(app.page.getByTestId(selectors.about.update.statuses.available)).toBeHidden()

    const calls = await getE2EBridgeCalls(app.page)
    expect(calls.openExternalUrls).toEqual([
      'https://github.com/swiftruru/rx-fhir',
      'https://swift.moe',
      'https://example.test/releases/9.9.9'
    ])
    expect(calls.skippedUpdateVersions).toEqual(['9.9.9'])
  } finally {
    await closeRxFhir(app)
  }
})
