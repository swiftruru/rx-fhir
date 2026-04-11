import { closeRxFhir, expect, test } from '../helpers/launchElectron'
import { mockCreatorSubmissionFlow } from '../helpers/mockFhir'
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
      intent: 'order'
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
    await mockCreatorSubmissionFlow(app.page, {
      patientIdentifier: seededPatientIdentifier,
      patientName: seededPatientName,
      bundleId: 'mock-created-bundle',
      compositionId: 'mock-created-composition',
      compositionTitle: 'Creator Handoff Bundle'
    })

    await expect(app.page.locator('#comp-title')).toBeVisible()
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
