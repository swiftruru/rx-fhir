import type { MockScenarioPack } from './types'
import type { CreatorDraftValues } from '../store/creatorStore'

function toDateTimeLocalValue(value?: string): string | undefined {
  if (!value) return undefined
  const normalized = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/)?.[1]
  if (normalized) return normalized

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
}

export function buildTemplateDraftsFromScenario(scenario: MockScenarioPack): CreatorDraftValues {
  const { creator } = scenario

  return {
    organization: {
      name: creator.organization.name,
      identifier: creator.organization.identifier,
      type: creator.organization.type
    },
    patient: {
      familyName: creator.patient.familyName,
      givenName: creator.patient.givenName,
      studentId: creator.patient.studentId,
      gender: creator.patient.gender,
      birthDate: creator.patient.birthDate
    },
    practitioner: {
      familyName: creator.practitioner.familyName,
      givenName: creator.practitioner.givenName,
      licenseNumber: creator.practitioner.licenseNumber,
      qualification: creator.practitioner.qualification
    },
    encounter: {
      class: creator.encounter.class,
      periodStart: toDateTimeLocalValue(creator.encounter.periodStart),
      periodEnd: toDateTimeLocalValue(creator.encounter.periodEnd)
    },
    condition: {
      icdCode: creator.condition.icdCode,
      icdDisplay: creator.condition.icdDisplay,
      clinicalStatus: creator.condition.clinicalStatus
    },
    observation: {
      loincCode: creator.observation.loincCode,
      display: creator.observation.display,
      value: creator.observation.value,
      unit: creator.observation.unit,
      status: creator.observation.status
    },
    coverage: {
      type: creator.coverage.type,
      subscriberId: creator.coverage.subscriberId,
      periodStart: creator.coverage.periodStart,
      periodEnd: creator.coverage.periodEnd
    },
    medication: {
      code: creator.medication.code,
      display: creator.medication.display,
      codeSystem: creator.medication.codeSystem,
      form: creator.medication.form
    },
    medicationRequest: {
      doseValue: creator.medicationRequest.doseValue,
      doseUnit: creator.medicationRequest.doseUnit,
      frequency: creator.medicationRequest.frequency,
      route: creator.medicationRequest.route,
      durationDays: creator.medicationRequest.durationDays,
      note: creator.medicationRequest.note
    },
    extension: {
      codeCode: creator.extension.codeCode,
      codeDisplay: creator.extension.codeDisplay,
      ext1Url: creator.extension.ext1Url,
      ext1Value: creator.extension.ext1Value,
      ext2Url: creator.extension.ext2Url,
      ext2Value: creator.extension.ext2Value
    },
    composition: {
      title: creator.composition.title,
      date: toDateTimeLocalValue(creator.composition.date)
    }
  }
}
