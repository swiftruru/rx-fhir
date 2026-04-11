import { closeRxFhir, expect, test } from '../helpers/launchElectron'
import { mockFhirBundleById } from '../helpers/mockFhir'
import { seedZustandPersistedState } from '../helpers/persistedState'
import { selectors } from '../helpers/selectors'

const seededSubmissionRecord = {
  id: 'submission-history-record-1',
  type: 'bundle' as const,
  bundleId: 'mock-history-bundle-1',
  patientName: 'E2E Submission Patient',
  patientIdentifier: 'E2E-SUB-0001',
  organizationName: 'E2E Submission Clinic',
  organizationIdentifier: 'ORG-E2E-SUB-1',
  practitionerName: 'Dr. Submission',
  conditionDisplay: 'Mock Follow-up Visit',
  submittedAt: '2026-04-11T09:30:00+08:00',
  serverUrl: 'https://example.fhir.test',
  compositionDate: '2026-04-11'
}

test('uses persisted submission history to prefill search and open bundle detail', async ({ launchApp }) => {
  let app = await launchApp()

  try {
    await seedZustandPersistedState(app.page, 'rxfhir-history', {
      records: [seededSubmissionRecord]
    })
  } finally {
    await closeRxFhir(app)
  }

  app = await launchApp()

  try {
    await app.page.getByTestId(selectors.app.nav.consumer).click()
    await mockFhirBundleById(app.page, seededSubmissionRecord.bundleId)

    await app.page.getByTestId(selectors.consumer.middleTabs.history).click()
    await expect(app.page.getByTestId(selectors.consumer.history.root)).toBeVisible()
    await expect(app.page.getByTestId(selectors.consumer.history.innerTabs.submissions)).toHaveAttribute('data-state', 'active')
    await expect(app.page.getByTestId(selectors.consumer.history.submissionList.root)).toBeVisible()

    const submissionCard = app.page
      .locator('[data-testid="consumer.history.submission-card"][data-bundle-id="mock-history-bundle-1"]')
      .first()

    await expect(submissionCard).toBeVisible()

    await submissionCard.getByTestId(selectors.consumer.history.submissionList.fill).click()
    await expect(app.page.getByTestId(selectors.consumer.middleTabs.results)).toHaveAttribute('data-state', 'active')
    await expect(app.page.getByTestId(selectors.consumer.search.basicInput)).toHaveValue('E2E-SUB-0001')

    await app.page.getByTestId(selectors.consumer.middleTabs.history).click()
    await submissionCard.getByTestId(selectors.consumer.history.submissionList.view).click()

    await expect(app.page.getByTestId(selectors.consumer.detail.root)).toBeVisible()
    await expect(app.page.getByTestId(selectors.consumer.detail.root)).toContainText('E2E Submission Patient')
    await expect(app.page.getByTestId(selectors.consumer.detail.root)).toContainText('Ibuprofen 200mg')
  } finally {
    await closeRxFhir(app)
  }
})
