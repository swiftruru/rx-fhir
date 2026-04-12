import { closeRxFhir, expect, test } from '../helpers/launchElectron'
import { mockBundleValidateUnavailable } from '../helpers/mockFhir'
import { seedZustandPersistedState } from '../helpers/persistedState'
import { selectors } from '../helpers/selectors'

const blockingCreatorState = {
  currentStep: 10,
  resources: {
    organization: {
      resourceType: 'Organization',
      id: 'blocking-org',
      name: 'Blocking Clinic',
      identifier: [{ value: 'ORG-BLOCK-001' }]
    },
    patient: {
      resourceType: 'Patient',
      id: 'blocking-patient',
      identifier: [{ value: 'BLOCK-001' }],
      name: [{ text: 'Blocking Patient' }]
    },
    encounter: {
      resourceType: 'Encounter',
      id: 'blocking-encounter',
      status: 'finished',
      class: { code: 'AMB' }
    },
    medicationRequest: {
      resourceType: 'MedicationRequest',
      id: 'blocking-med-request',
      status: 'active',
      intent: 'order',
      subject: { reference: 'Patient/blocking-patient' },
      encounter: { reference: 'Encounter/blocking-encounter' },
      medicationReference: { reference: 'Medication/blocking-medication' }
    }
  },
  drafts: {},
  feedbacks: {},
  lastUpdatedResourceKey: 'medicationRequest',
  draftSavedAt: '2026-04-11T08:00:00.000Z'
}

test('blocks Creator submission when audit finds blocking errors', async ({ launchApp }) => {
  let app = await launchApp()

  try {
    await seedZustandPersistedState(app.page, 'rxfhir-creator-draft', blockingCreatorState)
    await closeRxFhir(app)

    app = await launchApp()
    await mockBundleValidateUnavailable(app.page)

    await expect(app.page.locator('#comp-title')).toBeVisible()
    await expect(app.page.getByTestId(selectors.creator.compositionAudit)).toBeVisible()
    await expect(app.page.getByTestId(selectors.creator.compositionAudit)).toContainText('MedicationRequest.medicationReference')

    await app.page.locator('#comp-title').fill('Blocking Bundle')
    await app.page.locator('#comp-date').fill('2026-04-11T12:30')
    await app.page.locator('[data-live-demo-submit="composition"]').click()

    await expect(app.page.getByTestId(selectors.creator.compositionAudit)).toContainText('MedicationRequest.medicationReference')
    await expect(app.page.getByTestId(selectors.creator.bundleSuccess)).toHaveCount(0)
  } finally {
    await closeRxFhir(app)
  }
})
