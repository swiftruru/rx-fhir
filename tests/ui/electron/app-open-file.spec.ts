import { resolve } from 'node:path'
import { closeRxFhir, expect, test } from '../helpers/launchElectron'
import { selectors } from '../helpers/selectors'

const bundleFixturePath = resolve(process.cwd(), 'tests/ui/fixtures/bundle/imported-local-bundle.json')

test('opens a bundle json file passed at startup directly in consumer', async ({ launchApp }) => {
  const app = await launchApp({
    args: [bundleFixturePath]
  })

  try {
    await expect(app.page.getByTestId(selectors.consumer.detail.root)).toBeVisible()
    await expect(app.page.getByTestId(selectors.consumer.detail.root)).toContainText('Local Import Patient')
    await expect(app.page.getByTestId(selectors.consumer.detail.audit)).toBeVisible()
  } finally {
    await closeRxFhir(app)
  }
})
