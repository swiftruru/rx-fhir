import { createAuditIssueFactory, buildFhirAuditReport, getStepKeyForResourceType, pushIssue, resolveReferenceInBundle } from './utils'
import { isValidFhirDateTime } from '../dateTime'
import type { FhirAuditIssue, FhirAuditReport } from './types'

const EXPECTED_PROFILES: Partial<Record<string, string>> = {
  Bundle: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Bundle-EP',
  Composition: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Composition-EP',
  Organization: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Organization-EP',
  Patient: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Patient-EP',
  Practitioner: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Practitioner-EP',
  Encounter: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Encounter-EP',
  Condition: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Condition-EP',
  Observation: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Observation-EP-BodyWeight',
  Coverage: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Coverage-EMR',
  Medication: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Medication-EP',
  MedicationRequest: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/MedicationRequest-EP'
}

function hasText(value?: string | null): boolean {
  return Boolean(value?.trim())
}

function getResourceLabel(resourceType?: string, resourceId?: string): string {
  if (resourceType && resourceId) return `${resourceType}/${resourceId}`
  if (resourceType) return resourceType
  return 'FHIR resource'
}

function getBundleResources(bundle: fhir4.Bundle): fhir4.Resource[] {
  const resources: fhir4.Resource[] = []

  for (const entry of bundle.entry ?? []) {
    if (entry.resource) {
      resources.push(entry.resource as fhir4.Resource)
    }
  }

  return resources
}

function validateMetaProfile(resource: fhir4.Resource, issues: FhirAuditIssue[], makeIssue: ReturnType<typeof createAuditIssueFactory>): void {
  const expectedProfile = EXPECTED_PROFILES[resource.resourceType]
  if (!expectedProfile) return

  const profiles = resource.meta?.profile ?? []
  if (profiles.includes(expectedProfile)) return

  pushIssue(
    issues,
    makeIssue,
    'warning',
    `${getResourceLabel(resource.resourceType, resource.id)} is missing the expected TW Core profile metadata.`,
    {
      resourceType: resource.resourceType,
      resourceId: resource.id,
      fieldPath: 'meta.profile',
      stepKey: getStepKeyForResourceType(resource.resourceType)
    }
  )
}

function validateBundleBasics(bundle: fhir4.Bundle, issues: FhirAuditIssue[], makeIssue: ReturnType<typeof createAuditIssueFactory>): void {
  if (bundle.resourceType !== 'Bundle') {
    pushIssue(issues, makeIssue, 'error', 'The imported document is not a FHIR Bundle.', {
      resourceType: bundle.resourceType,
      fieldPath: 'resourceType'
    })
  }

  if (bundle.type !== 'document') {
    pushIssue(issues, makeIssue, 'error', 'Bundle.type must be "document" for a prescription document bundle.', {
      resourceType: 'Bundle',
      fieldPath: 'type'
    })
  }

  if (!(bundle.entry?.length)) {
    pushIssue(issues, makeIssue, 'error', 'The Bundle has no entries to audit.', {
      resourceType: 'Bundle',
      fieldPath: 'entry'
    })
    return
  }

  if (bundle.entry?.[0]?.resource?.resourceType !== 'Composition') {
    pushIssue(issues, makeIssue, 'error', 'The first Bundle entry must be a Composition resource.', {
      resourceType: 'Bundle',
      fieldPath: 'entry[0]',
      stepKey: 'composition'
    })
  }

  validateMetaProfile(bundle, issues, makeIssue)
}

function validateResourceIdentity(resource: fhir4.Resource, index: number, issues: FhirAuditIssue[], makeIssue: ReturnType<typeof createAuditIssueFactory>): void {
  if (!hasText(resource.resourceType)) {
    pushIssue(issues, makeIssue, 'error', `Bundle entry ${index + 1} is missing resourceType.`, {
      fieldPath: `entry[${index}].resource.resourceType`
    })
  }

  if (!hasText(resource.id)) {
    pushIssue(
      issues,
      makeIssue,
      'error',
      `${resource.resourceType || `Bundle entry ${index + 1}`} is missing a resource id.`,
      {
        resourceType: resource.resourceType,
        fieldPath: `entry[${index}].resource.id`,
        stepKey: getStepKeyForResourceType(resource.resourceType)
      }
    )
  }
}

function validateComposition(bundle: fhir4.Bundle, composition: fhir4.Composition, issues: FhirAuditIssue[], makeIssue: ReturnType<typeof createAuditIssueFactory>): void {
  const context = {
    resourceType: 'Composition',
    resourceId: composition.id,
    stepKey: 'composition' as const
  }

  if (!hasText(composition.status)) {
    pushIssue(issues, makeIssue, 'error', 'Composition.status is required.', {
      ...context,
      fieldPath: 'status'
    })
  }
  if (!hasText(composition.title)) {
    pushIssue(issues, makeIssue, 'error', 'Composition.title is required.', {
      ...context,
      fieldPath: 'title'
    })
  }
  if (!hasText(composition.date)) {
    pushIssue(issues, makeIssue, 'error', 'Composition.date is required.', {
      ...context,
      fieldPath: 'date'
    })
  } else if (!isValidFhirDateTime(composition.date)) {
    pushIssue(issues, makeIssue, 'error', 'Composition.date must be a valid FHIR dateTime. If time is included, it should include seconds and a timezone offset.', {
      ...context,
      fieldPath: 'date'
    })
  }

  if (!composition.subject?.reference) {
    pushIssue(issues, makeIssue, 'error', 'Composition.subject must reference a Patient in the Bundle.', {
      ...context,
      fieldPath: 'subject.reference'
    })
  } else if (!resolveReferenceInBundle<fhir4.Patient>(bundle, 'Patient', composition.subject.reference)) {
    pushIssue(issues, makeIssue, 'error', 'Composition.subject points to a Patient that is not present in the Bundle.', {
      ...context,
      fieldPath: 'subject.reference'
    })
  }

  const authorReferences = composition.author?.map((author) => author.reference).filter((reference): reference is string => hasText(reference)) ?? []
  if (!authorReferences.length) {
    pushIssue(issues, makeIssue, 'error', 'Composition.author must reference at least one author resource in the Bundle.', {
      ...context,
      fieldPath: 'author[0].reference'
    })
  } else if (!authorReferences.every((reference) => {
    const normalizedReference = reference.replace(/^urn:uuid:/, '')
    return (bundle.entry ?? []).some((entry) => {
      const resource = entry.resource
      if (!resource?.resourceType) return false
      const directReference = resource.id ? `${resource.resourceType}/${resource.id}` : undefined
      return reference === directReference
        || reference === resource.id
        || normalizedReference === resource.id
        || entry.fullUrl === reference
    })
  })) {
    pushIssue(issues, makeIssue, 'error', 'Composition.author includes a reference that is not present in the Bundle.', {
      ...context,
      fieldPath: 'author.reference'
    })
  }

  if (composition.custodian?.reference && !resolveReferenceInBundle<fhir4.Organization>(bundle, 'Organization', composition.custodian.reference)) {
    pushIssue(issues, makeIssue, 'error', 'Composition.custodian points to an Organization that is not present in the Bundle.', {
      ...context,
      fieldPath: 'custodian.reference'
    })
  }

  if (composition.encounter?.reference && !resolveReferenceInBundle<fhir4.Encounter>(bundle, 'Encounter', composition.encounter.reference)) {
    pushIssue(issues, makeIssue, 'error', 'Composition.encounter points to an Encounter that is not present in the Bundle.', {
      ...context,
      fieldPath: 'encounter.reference'
    })
  }
}

function validatePatient(patient: fhir4.Patient, issues: FhirAuditIssue[], makeIssue: ReturnType<typeof createAuditIssueFactory>): void {
  const context = {
    resourceType: 'Patient',
    resourceId: patient.id,
    stepKey: 'patient' as const
  }

  if (!hasText(patient.identifier?.[0]?.value)) {
    pushIssue(issues, makeIssue, 'warning', 'Patient.identifier is missing a usable value.', {
      ...context,
      fieldPath: 'identifier[0].value'
    })
  }

  const patientName = patient.name?.[0]?.text ?? `${patient.name?.[0]?.family ?? ''}${patient.name?.[0]?.given?.join('') ?? ''}`
  if (!hasText(patientName)) {
    pushIssue(issues, makeIssue, 'warning', 'Patient.name is missing a readable display value.', {
      ...context,
      fieldPath: 'name[0]'
    })
  }
}

function validateOrganization(organization: fhir4.Organization, issues: FhirAuditIssue[], makeIssue: ReturnType<typeof createAuditIssueFactory>): void {
  const context = {
    resourceType: 'Organization',
    resourceId: organization.id,
    stepKey: 'organization' as const
  }

  if (!hasText(organization.name)) {
    pushIssue(issues, makeIssue, 'warning', 'Organization.name is missing.', {
      ...context,
      fieldPath: 'name'
    })
  }
  if (!hasText(organization.identifier?.[0]?.value)) {
    pushIssue(issues, makeIssue, 'warning', 'Organization.identifier is missing a usable value.', {
      ...context,
      fieldPath: 'identifier[0].value'
    })
  }
}

function validatePractitioner(practitioner: fhir4.Practitioner, issues: FhirAuditIssue[], makeIssue: ReturnType<typeof createAuditIssueFactory>): void {
  const displayName = practitioner.name?.[0]?.text ?? `${practitioner.name?.[0]?.family ?? ''}${practitioner.name?.[0]?.given?.join('') ?? ''}`
  if (hasText(displayName)) return

  pushIssue(issues, makeIssue, 'warning', 'Practitioner.name is missing a readable display value.', {
    resourceType: 'Practitioner',
    resourceId: practitioner.id,
    fieldPath: 'name[0]',
    stepKey: 'practitioner'
  })
}

function validateCondition(condition: fhir4.Condition, issues: FhirAuditIssue[], makeIssue: ReturnType<typeof createAuditIssueFactory>): void {
  if (hasText(condition.code?.coding?.[0]?.code) || hasText(condition.code?.text)) return

  pushIssue(issues, makeIssue, 'warning', 'Condition.code is missing a diagnosis code or text.', {
    resourceType: 'Condition',
    resourceId: condition.id,
    fieldPath: 'code',
    stepKey: 'condition'
  })
}

function validateObservation(observation: fhir4.Observation, issues: FhirAuditIssue[], makeIssue: ReturnType<typeof createAuditIssueFactory>): void {
  if (!hasText(observation.code?.coding?.[0]?.code) && !hasText(observation.code?.text)) {
    pushIssue(issues, makeIssue, 'warning', 'Observation.code is missing a LOINC code or text.', {
      resourceType: 'Observation',
      resourceId: observation.id,
      fieldPath: 'code',
      stepKey: 'observation'
    })
  }
}

function validateCoverage(coverage: fhir4.Coverage, issues: FhirAuditIssue[], makeIssue: ReturnType<typeof createAuditIssueFactory>): void {
  if (hasText(coverage.identifier?.[0]?.value) || hasText(coverage.subscriberId)) return

  pushIssue(issues, makeIssue, 'warning', 'Coverage is missing an identifier or subscriberId value.', {
    resourceType: 'Coverage',
    resourceId: coverage.id,
    fieldPath: 'identifier[0].value',
    stepKey: 'coverage'
  })
}

function validateMedication(medication: fhir4.Medication, issues: FhirAuditIssue[], makeIssue: ReturnType<typeof createAuditIssueFactory>): void {
  if (hasText(medication.code?.coding?.[0]?.code) || hasText(medication.code?.text)) return

  pushIssue(issues, makeIssue, 'warning', 'Medication.code is missing a medication code or text.', {
    resourceType: 'Medication',
    resourceId: medication.id,
    fieldPath: 'code',
    stepKey: 'medication'
  })
}

function validateMedicationRequest(bundle: fhir4.Bundle, medicationRequest: fhir4.MedicationRequest, issues: FhirAuditIssue[], makeIssue: ReturnType<typeof createAuditIssueFactory>): void {
  const context = {
    resourceType: 'MedicationRequest',
    resourceId: medicationRequest.id,
    stepKey: 'medicationRequest' as const
  }

  if (medicationRequest.subject?.reference && !resolveReferenceInBundle<fhir4.Patient>(bundle, 'Patient', medicationRequest.subject.reference)) {
    pushIssue(issues, makeIssue, 'error', 'MedicationRequest.subject points to a Patient that is not present in the Bundle.', {
      ...context,
      fieldPath: 'subject.reference'
    })
  }

  if (!medicationRequest.medicationCodeableConcept && !medicationRequest.medicationReference) {
    pushIssue(issues, makeIssue, 'error', 'MedicationRequest must define a medication reference or medication codeable concept.', {
      ...context,
      fieldPath: 'medicationReference'
    })
  }

  if (medicationRequest.medicationReference?.reference && !resolveReferenceInBundle<fhir4.Medication>(bundle, 'Medication', medicationRequest.medicationReference.reference)) {
    pushIssue(issues, makeIssue, 'error', 'MedicationRequest.medicationReference points to a Medication that is not present in the Bundle.', {
      ...context,
      fieldPath: 'medicationReference.reference'
    })
  }

  if (medicationRequest.requester?.reference && !resolveReferenceInBundle<fhir4.Practitioner>(bundle, 'Practitioner', medicationRequest.requester.reference)) {
    pushIssue(issues, makeIssue, 'error', 'MedicationRequest.requester points to a Practitioner that is not present in the Bundle.', {
      ...context,
      fieldPath: 'requester.reference'
    })
  }

  if (medicationRequest.encounter?.reference && !resolveReferenceInBundle<fhir4.Encounter>(bundle, 'Encounter', medicationRequest.encounter.reference)) {
    pushIssue(issues, makeIssue, 'error', 'MedicationRequest.encounter points to an Encounter that is not present in the Bundle.', {
      ...context,
      fieldPath: 'encounter.reference'
    })
  }
}

export function runLocalBundleAudit(bundle: fhir4.Bundle): FhirAuditReport {
  const issues: FhirAuditIssue[] = []
  const makeIssue = createAuditIssueFactory('local')

  validateBundleBasics(bundle, issues, makeIssue)

  for (const [index, entry] of (bundle.entry ?? []).entries()) {
    if (!entry.resource) {
      pushIssue(issues, makeIssue, 'error', `Bundle entry ${index + 1} has no resource payload.`, {
        resourceType: 'Bundle',
        fieldPath: `entry[${index}].resource`
      })
      continue
    }

    const resource = entry.resource
    validateResourceIdentity(resource, index, issues, makeIssue)
    validateMetaProfile(resource, issues, makeIssue)

    switch (resource.resourceType) {
      case 'Composition':
        validateComposition(bundle, resource as fhir4.Composition, issues, makeIssue)
        break
      case 'Patient':
        validatePatient(resource as fhir4.Patient, issues, makeIssue)
        break
      case 'Organization':
        validateOrganization(resource as fhir4.Organization, issues, makeIssue)
        break
      case 'Practitioner':
        validatePractitioner(resource as fhir4.Practitioner, issues, makeIssue)
        break
      case 'Condition':
        validateCondition(resource as fhir4.Condition, issues, makeIssue)
        break
      case 'Observation': {
        const observation = resource as fhir4.Observation
        if (observation.subject?.reference && !resolveReferenceInBundle<fhir4.Patient>(bundle, 'Patient', observation.subject.reference)) {
          pushIssue(issues, makeIssue, 'error', 'Observation.subject points to a Patient that is not present in the Bundle.', {
            resourceType: 'Observation',
            resourceId: observation.id,
            fieldPath: 'subject.reference',
            stepKey: 'observation'
          })
        }
        validateObservation(observation, issues, makeIssue)
        break
      }
      case 'Coverage':
        validateCoverage(resource as fhir4.Coverage, issues, makeIssue)
        break
      case 'Medication':
        validateMedication(resource as fhir4.Medication, issues, makeIssue)
        break
      case 'MedicationRequest':
        validateMedicationRequest(bundle, resource as fhir4.MedicationRequest, issues, makeIssue)
        break
      default:
        break
    }
  }

  const resources = getBundleResources(bundle)
  const hasComposition = resources.some((resource) => resource.resourceType === 'Composition')
  if (!hasComposition) {
    pushIssue(issues, makeIssue, 'error', 'The Bundle does not contain a Composition resource.', {
      resourceType: 'Bundle',
      fieldPath: 'entry',
      stepKey: 'composition'
    })
  }

  return buildFhirAuditReport(issues, 'local-only', 'skipped')
}
