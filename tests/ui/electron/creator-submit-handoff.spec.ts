import { closeRxFhir, expect, getLocationHash, test } from '../helpers/launchElectron'
import { mockBundleValidate, mockBundleValidateUnavailable, mockCreatorSubmissionFlow } from '../helpers/mockFhir'
import { seedZustandPersistedState } from '../helpers/persistedState'
import { selectors } from '../helpers/selectors'

const seededPatientIdentifier = 'E2E-CREATOR-001'
const seededPatientName = 'Creator Flow Patient'

const seededCreatorState = {
  currentStep: 10,
  resources: {
    organization: {
      resourceType: 'Organization',
      id: 'seed-org',
      name: 'Creator Flow Clinic',
      identifier: [{ value: 'ORG-CREATOR-001' }]
    },
    patient: {
      resourceType: 'Patient',
      id: 'seed-patient',
      identifier: [{ value: seededPatientIdentifier }],
      name: [{ text: seededPatientName }]
    },
    practitioner: {
      resourceType: 'Practitioner',
      id: 'seed-practitioner',
      name: [{ text: 'Dr. Creator Flow' }]
    },
    encounter: {
      resourceType: 'Encounter',
      id: 'seed-encounter',
      status: 'finished',
      class: { code: 'AMB' }
    },
    condition: {
      resourceType: 'Condition',
      id: 'seed-condition',
      code: { text: 'Creator Flow Condition' },
      subject: { reference: 'Patient/seed-patient' }
    },
    observation: {
      resourceType: 'Observation',
      id: 'seed-observation',
      status: 'final',
      code: { text: 'Blood Pressure' },
      subject: { reference: 'Patient/seed-patient' }
    },
    coverage: {
      resourceType: 'Coverage',
      id: 'seed-coverage',
      status: 'active'
    },
    medication: {
      resourceType: 'Medication',
      id: 'seed-medication',
      code: { text: 'Creator Flow Medication' }
    },
    medicationRequest: {
      resourceType: 'MedicationRequest',
      id: 'seed-medication-request',
      status: 'active',
      intent: 'order',
      subject: { reference: 'Patient/seed-patient' },
      encounter: { reference: 'Encounter/seed-encounter' },
      requester: { reference: 'Practitioner/seed-practitioner' },
      medicationReference: { reference: 'Medication/seed-medication' }
    },
    extension: {
      resourceType: 'Basic',
      id: 'seed-extension',
      code: { text: 'Creator Flow Extension' }
    }
  },
  drafts: {},
  feedbacks: {},
  lastUpdatedResourceKey: 'extension',
  draftSavedAt: '2026-04-11T08:00:00.000Z'
}

test('submits a prepared creator bundle and hands off to consumer search', async ({ launchApp }) => {
  let app = await launchApp()

  try {
    await seedZustandPersistedState(app.page, 'rxfhir-creator-draft', seededCreatorState)
    await closeRxFhir(app)

    app = await launchApp()
    await mockBundleValidate(app.page, {
      resourceType: 'OperationOutcome',
      issue: [
        {
          severity: 'warning',
          code: 'business-rule',
          diagnostics: 'Mock server warning for Bundle validation.'
        }
      ]
    })
    await mockCreatorSubmissionFlow(app.page, {
      patientIdentifier: seededPatientIdentifier,
      patientName: seededPatientName,
      bundleId: 'mock-created-bundle',
      compositionId: 'mock-created-composition',
      compositionTitle: 'Creator Handoff Bundle'
    })

    await expect(app.page.locator('#comp-title')).toBeVisible()
    await expect(app.page.getByTestId(selectors.creator.compositionAudit)).toBeVisible()
    await app.page.locator('#comp-title').fill('Creator Handoff Bundle')
    await app.page.locator('#comp-date').fill('2026-04-11T10:30')
    await app.page.locator('[data-live-demo-submit="composition"]').click()

    await expect(app.page.getByTestId(selectors.creator.bundleSuccess)).toBeVisible()
    await app.page.getByTestId(selectors.creator.goToConsumer).click()

    await expect(app.page.getByTestId(selectors.consumer.results.root)).toBeVisible()
    await expect(app.page.getByTestId(selectors.consumer.search.basicInput)).toHaveValue(seededPatientIdentifier)
    await expect(app.page.locator('[data-result-id="mock-created-bundle"]')).toBeVisible()
    await expect(app.page.getByTestId(selectors.consumer.detail.root)).toBeVisible()
  } finally {
    await closeRxFhir(app)
  }
})

test('previews the assembled creator bundle directly in consumer without submitting', async ({ launchApp }) => {
  let app = await launchApp()

  try {
    await seedZustandPersistedState(app.page, 'rxfhir-creator-draft', seededCreatorState)
    await closeRxFhir(app)

    app = await launchApp()
    await mockBundleValidateUnavailable(app.page)

    await expect(app.page.locator('#comp-title')).toBeVisible()
    await app.page.locator('#comp-title').fill('Creator Preview Bundle')
    await app.page.locator('#comp-date').fill('2026-04-11T11:00')
    await app.page.getByTestId(selectors.creator.previewInConsumer).click()

    await expect(app.page.getByTestId(selectors.consumer.results.root)).toBeVisible()
    const previewReturnBanner = app.page.getByTestId(selectors.consumer.previewReturn.root)
    await expect(previewReturnBanner).toBeVisible()
    await expect.poll(async () => previewReturnBanner.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true)
    await expect(app.page.getByTestId(selectors.consumer.previewReturn.action)).toBeVisible()
    await expect(app.page.getByTestId(selectors.consumer.detail.root)).toBeVisible()
    await expect(app.page.getByTestId(selectors.consumer.detail.previewBadge)).toBeVisible()
    await expect(app.page.getByTestId(selectors.consumer.detail.root)).toContainText(seededPatientName)
    await expect(app.page.getByTestId(selectors.consumer.detail.audit)).toBeVisible()

    await app.page.getByTestId(selectors.consumer.previewReturn.action).click()

    await expect.poll(() => getLocationHash(app.page)).toBe('#/creator')
    await expect(app.page.locator('#comp-title')).toBeVisible()
    await expect(app.page.locator('#comp-title')).toHaveValue('Creator Preview Bundle')
    await expect(app.page.locator('#comp-date')).toHaveValue('2026-04-11T11:00')

    await app.page.getByTestId(selectors.app.nav.consumer).click()
    await expect.poll(() => getLocationHash(app.page)).toBe('#/consumer')
    await expect(app.page.getByTestId(selectors.consumer.middleTabs.quickstart)).toHaveAttribute('data-state', 'active')
    await expect(app.page.getByTestId(selectors.consumer.previewReturn.root)).toHaveCount(0)
    await expect(app.page.getByTestId(selectors.consumer.detail.root)).toHaveCount(0)
  } finally {
    await closeRxFhir(app)
  }
})

test('clears preview state after leaving consumer through the sidebar', async ({ launchApp }) => {
  let app = await launchApp()

  try {
    await seedZustandPersistedState(app.page, 'rxfhir-creator-draft', seededCreatorState)
    await closeRxFhir(app)

    app = await launchApp()
    await mockBundleValidateUnavailable(app.page)

    await expect(app.page.locator('#comp-title')).toBeVisible()
    await app.page.locator('#comp-title').fill('Creator Preview Bundle')
    await app.page.locator('#comp-date').fill('2026-04-11T11:00')
    await app.page.getByTestId(selectors.creator.previewInConsumer).click()

    await expect(app.page.getByTestId(selectors.consumer.previewReturn.root)).toBeVisible()
    await expect(app.page.getByTestId(selectors.consumer.detail.root)).toBeVisible()

    await app.page.getByTestId(selectors.app.nav.creator).click()
    await expect.poll(() => getLocationHash(app.page)).toBe('#/creator')
    await expect(app.page.locator('#comp-title')).toBeVisible()

    await app.page.getByTestId(selectors.app.nav.consumer).click()
    await expect.poll(() => getLocationHash(app.page)).toBe('#/consumer')
    await expect(app.page.getByTestId(selectors.consumer.middleTabs.quickstart)).toHaveAttribute('data-state', 'active')
    await expect(app.page.getByTestId(selectors.consumer.previewReturn.root)).toHaveCount(0)
    await expect(app.page.getByTestId(selectors.consumer.detail.root)).toHaveCount(0)
  } finally {
    await closeRxFhir(app)
  }
})

test('resets preview state when Consumer is clicked again from the sidebar', async ({ launchApp }) => {
  let app = await launchApp()

  try {
    await seedZustandPersistedState(app.page, 'rxfhir-creator-draft', seededCreatorState)
    await closeRxFhir(app)

    app = await launchApp()
    await mockBundleValidateUnavailable(app.page)

    await expect(app.page.locator('#comp-title')).toBeVisible()
    await app.page.locator('#comp-title').fill('Creator Preview Bundle')
    await app.page.locator('#comp-date').fill('2026-04-11T11:00')
    await app.page.getByTestId(selectors.creator.previewInConsumer).click()

    await expect(app.page.getByTestId(selectors.consumer.previewReturn.root)).toBeVisible()
    await expect(app.page.getByTestId(selectors.consumer.detail.root)).toBeVisible()

    await app.page.getByTestId(selectors.app.nav.consumer).click()

    await expect.poll(() => getLocationHash(app.page)).toBe('#/consumer')
    await expect(app.page.getByTestId(selectors.consumer.middleTabs.quickstart)).toHaveAttribute('data-state', 'active')
    await expect(app.page.getByTestId(selectors.consumer.previewReturn.root)).toHaveCount(0)
    await expect(app.page.getByTestId(selectors.consumer.detail.root)).toHaveCount(0)
  } finally {
    await closeRxFhir(app)
  }
})

test('keeps the preview audit card within the detail pane when server validation returns long diagnostics', async ({ launchApp }) => {
  let app = await launchApp()

  try {
    await seedZustandPersistedState(app.page, 'rxfhir-creator-draft', seededCreatorState)
    await closeRxFhir(app)

    app = await launchApp()
    await mockBundleValidate(app.page, {
      resourceType: 'OperationOutcome',
      issue: [
        {
          severity: 'warning',
          code: 'business-rule',
          diagnostics: `https://example.org/CodeSystem/${'LONGTOKEN'.repeat(40)}`,
          expression: [`Bundle.entry[0].resource/Composition/${'very-long-field-path-'.repeat(20)}`]
        }
      ]
    })

    await expect(app.page.locator('#comp-title')).toBeVisible()
    await app.page.locator('#comp-title').fill('Creator Preview Bundle')
    await app.page.locator('#comp-date').fill('2026-04-11T11:00')
    await app.page.getByTestId(selectors.creator.previewInConsumer).click()

    const auditCard = app.page.getByTestId(selectors.consumer.detail.audit)
    await expect(auditCard).toBeVisible()
    await expect(auditCard).toContainText('LONGTOKEN')
    await expect.poll(async () => auditCard.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true)
    await expect.poll(async () => app.page.getByTestId(selectors.consumer.detail.root).evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true)
  } finally {
    await closeRxFhir(app)
  }
})

test('shows the preview audit detail below the search panel on narrow widths', async ({ launchApp }) => {
  let app = await launchApp()

  try {
    await seedZustandPersistedState(app.page, 'rxfhir-creator-draft', seededCreatorState)
    await closeRxFhir(app)

    app = await launchApp()
    await app.page.setViewportSize({ width: 900, height: 1200 })
    await mockBundleValidateUnavailable(app.page)

    await expect(app.page.locator('#comp-title')).toBeVisible()
    await app.page.locator('#comp-title').fill('Creator Narrow Preview Bundle')
    await app.page.locator('#comp-date').fill('2026-04-11T11:00')
    await app.page.getByTestId(selectors.creator.previewInConsumer).click()

    const previewReturnBanner = app.page.getByTestId(selectors.consumer.previewReturn.root)
    const detailRoot = app.page.getByTestId(selectors.consumer.detail.root)

    await expect(previewReturnBanner).toBeVisible()
    await expect(detailRoot).toBeVisible()
    await expect(detailRoot).toContainText('Bundle 稽核')

    const mainScrollBefore = await app.page.locator('#app-main').evaluate((node) => node.scrollTop)
    await app.page.mouse.wheel(0, 1200)
    await expect.poll(async () => app.page.locator('#app-main').evaluate((node) => node.scrollTop)).toBeGreaterThan(mainScrollBefore)

    const bannerBox = await previewReturnBanner.boundingBox()
    const detailBox = await detailRoot.boundingBox()

    expect(bannerBox).not.toBeNull()
    expect(detailBox).not.toBeNull()
    expect(detailBox!.y).toBeGreaterThan(bannerBox!.y + bannerBox!.height - 1)
  } finally {
    await closeRxFhir(app)
  }
})
