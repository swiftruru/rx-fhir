import { closeRxFhir, expect, test } from '../helpers/launchElectron'
import { selectors } from '../helpers/selectors'

test('restores creator draft data after relaunch', async ({ launchApp }) => {
  let app = await launchApp()

  try {
    await app.page.locator('#org-name').fill('E2E Draft Clinic')
    await app.page.locator('#org-id').fill('E2E-DRAFT-001')

    await expect
      .poll(() => app.page.evaluate(() => window.localStorage.getItem('rxfhir-creator-draft')))
      .not.toBeNull()

    await expect(app.page.getByTestId(selectors.creator.draftStatus)).toBeVisible()

    await closeRxFhir(app)
    app = await launchApp()

    await expect(app.page.getByTestId(selectors.creator.draftRestored)).toBeVisible()
    await expect(app.page.locator('#org-name')).toHaveValue('E2E Draft Clinic')
    await expect(app.page.locator('#org-id')).toHaveValue('E2E-DRAFT-001')
  } finally {
    await closeRxFhir(app)
  }
})
