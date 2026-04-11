import { closeRxFhir, expect, test } from '../helpers/launchElectron'
import { seedZustandPersistedState } from '../helpers/persistedState'
import { selectors } from '../helpers/selectors'

const seededSubmissionHistory = {
  records: [
    {
      id: 'submission-maintenance-a',
      type: 'bundle',
      bundleId: 'maintenance-bundle-a',
      patientName: 'Maintenance Patient A',
      patientIdentifier: 'E2E-MAINT-001',
      organizationName: 'Maintenance Clinic A',
      submittedAt: '2026-04-11T08:00:00.000Z',
      serverUrl: 'https://mock.fhir.test/baseR4'
    },
    {
      id: 'submission-maintenance-b',
      type: 'bundle',
      bundleId: 'maintenance-bundle-b',
      patientName: 'Maintenance Patient B',
      patientIdentifier: 'E2E-MAINT-002',
      organizationName: 'Maintenance Clinic B',
      submittedAt: '2026-04-11T09:00:00.000Z',
      serverUrl: 'https://mock.fhir.test/baseR4'
    }
  ]
}

const seededSearchHistory = {
  records: [
    {
      id: 'search-pinned-maintenance',
      params: {
        mode: 'basic',
        identifier: 'E2E-PINNED-001'
      },
      pinned: true,
      createdAt: '2026-04-11T08:10:00.000Z',
      lastUsedAt: '2026-04-11T09:10:00.000Z'
    },
    {
      id: 'search-recent-maintenance',
      params: {
        mode: 'basic',
        identifier: 'E2E-RECENT-001'
      },
      pinned: false,
      createdAt: '2026-04-11T08:20:00.000Z',
      lastUsedAt: '2026-04-11T09:20:00.000Z'
    }
  ]
}

test('deletes and clears submission history records from the quickstart recent records UI', async ({ launchApp }) => {
  let app = await launchApp()

  try {
    await seedZustandPersistedState(app.page, 'rxfhir-history', seededSubmissionHistory)
    await closeRxFhir(app)

    app = await launchApp()
    await app.page.getByTestId(selectors.app.nav.consumer).click()

    const toggle = app.page.getByTestId(selectors.consumer.recentRecords.toggle('dashboard'))
    await expect(toggle).toBeVisible()

    if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
      await toggle.click()
    }

    const submissionRowA = app.page.locator('[data-testid="consumer.recent-record.row"][data-record-id="submission-maintenance-a"]').first()
    const submissionRowB = app.page.locator('[data-testid="consumer.recent-record.row"][data-record-id="submission-maintenance-b"]').first()

    await expect(submissionRowA).toBeVisible()
    await expect(submissionRowB).toBeVisible()

    await submissionRowA.getByTestId(selectors.consumer.recentRecords.delete).click()
    await expect(submissionRowA).toHaveCount(0)
    await expect(submissionRowB).toBeVisible()

    await app.page.getByTestId(selectors.consumer.recentRecords.clearAll('dashboard')).click()
    await expect(app.page.getByTestId(selectors.consumer.recentRecords.dashboard)).toHaveCount(0)

    await app.page.getByTestId(selectors.consumer.middleTabs.history).click()
    await app.page.getByTestId(selectors.consumer.history.innerTabs.submissions).click()
    await expect(app.page.locator('[data-testid="consumer.history.submission-card"]')).toHaveCount(0)
  } finally {
    await closeRxFhir(app)
  }
})

test('clears recent searches and deletes pinned searches from history management UIs', async ({ launchApp }) => {
  let app = await launchApp()

  try {
    await seedZustandPersistedState(app.page, 'rxfhir-search-history', seededSearchHistory)
    await closeRxFhir(app)

    app = await launchApp()
    await app.page.getByTestId(selectors.app.nav.consumer).click()

    const toggle = app.page.getByTestId(selectors.consumer.savedSearches.toggle('dashboard'))
    await expect(toggle).toBeVisible()

    if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
      await toggle.click()
    }

    const pinnedRow = app.page
      .locator('[data-testid="consumer.saved-search.row"][data-search-identifier="E2E-PINNED-001"]')
      .first()
    const recentRow = app.page
      .locator('[data-testid="consumer.saved-search.row"][data-search-identifier="E2E-RECENT-001"]')
      .first()

    await expect(pinnedRow).toBeVisible()
    await expect(recentRow).toBeVisible()

    await app.page.getByTestId(selectors.consumer.savedSearches.clearRecent('dashboard')).click()
    await expect(recentRow).toHaveCount(0)
    await expect(pinnedRow).toBeVisible()

    await app.page.getByTestId(selectors.consumer.middleTabs.history).click()
    await app.page.getByTestId(selectors.consumer.history.innerTabs.searches).click()

    const historyPinnedCard = app.page
      .locator('[data-testid="consumer.history.search-card"][data-search-identifier="E2E-PINNED-001"]')
      .first()

    await expect(historyPinnedCard).toBeVisible()
    await historyPinnedCard.getByTestId(selectors.consumer.history.searchList.delete).click()
    await expect(app.page.locator('[data-testid="consumer.history.search-card"]')).toHaveCount(0)
  } finally {
    await closeRxFhir(app)
  }
})
