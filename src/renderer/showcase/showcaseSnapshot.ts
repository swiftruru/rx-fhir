import { assembleDocumentBundle } from '../services/bundleService'
import { extractBundleHistoryMetadata, extractBundleSummary } from '../services/searchService'
import type { QueryStep } from '../services/fhirClient'
import { getScenarioById } from '../mocks/selectors'
import type { MockScenarioPack } from '../mocks/types'
import type { SupportedLocale } from '../i18n'
import type { FhirRequestEntry } from '../store/fhirInspectorStore'
import type { FeatureShowcaseSnapshot } from './types'

const PATIENT_IDENTIFIER_SYSTEM = 'https://www.moe.edu.tw/student-id'
const ORGANIZATION_IDENTIFIER_SYSTEM = 'https://twcore.mohw.gov.tw/ig/emr/CodeSystem/organization-identifier'
const PRACTITIONER_IDENTIFIER_SYSTEM = 'https://www.mohw.gov.tw/practitioner-license'
const COVERAGE_IDENTIFIER_SYSTEM = 'https://www.nhi.gov.tw/coverage-id'
const MEDICATION_REQUEST_IDENTIFIER_SYSTEM = 'https://rxfhir.app/fhir/medication-request-key'

function humanDisplay(locale: SupportedLocale, familyName: string, givenName: string): string {
  return locale === 'en'
    ? `${familyName} ${givenName}`.trim()
    : `${familyName}${givenName}`.trim()
}

function organizationTypeDisplay(type: MockScenarioPack['creator']['organization']['type'], locale: SupportedLocale): string {
  const labels = {
    hospital: locale === 'en' ? 'Hospital' : '醫院',
    clinic: locale === 'en' ? 'Clinic' : '診所',
    pharmacy: locale === 'en' ? 'Pharmacy' : '藥局'
  } as const
  return labels[type]
}

function encounterDisplay(code: MockScenarioPack['creator']['encounter']['class'], locale: SupportedLocale): string {
  const labels = {
    AMB: locale === 'en' ? 'Ambulatory (Outpatient)' : '門診 (Ambulatory)',
    EMER: locale === 'en' ? 'Emergency' : '急診',
    IMP: locale === 'en' ? 'Inpatient' : '住院'
  } as const
  return labels[code]
}

function coverageTypeDisplay(type: MockScenarioPack['creator']['coverage']['type'], locale: SupportedLocale): string {
  const labels = {
    EHCPOL: locale === 'en' ? 'National Health Insurance (NHI)' : '全民健保（NHI）',
    PAY: locale === 'en' ? 'Self-pay' : '自費',
    PUBLICPOL: locale === 'en' ? 'Public Insurance' : '公保'
  } as const
  return labels[type]
}

function routeDisplay(route: MockScenarioPack['creator']['medicationRequest']['route'], locale: SupportedLocale): string {
  const labels = {
    '26643006': locale === 'en' ? 'Oral' : '口服',
    '47625008': locale === 'en' ? 'Intravenous' : '靜脈注射',
    '78421000': locale === 'en' ? 'Intramuscular' : '肌肉注射',
    '6064005': locale === 'en' ? 'Topical' : '外用',
    '46713006': locale === 'en' ? 'Inhalation' : '吸入'
  } as const
  return labels[route]
}

function frequencyDisplay(frequency: MockScenarioPack['creator']['medicationRequest']['frequency'], locale: SupportedLocale): string {
  const labels = {
    QD: locale === 'en' ? 'Once daily' : '每日一次',
    BID: locale === 'en' ? 'Twice daily' : '每日兩次',
    TID: locale === 'en' ? 'Three times daily' : '每日三次',
    QID: locale === 'en' ? 'Four times daily' : '每日四次',
    PRN: locale === 'en' ? 'As needed' : '需要時使用'
  } as const
  return labels[frequency]
}

function buildScenarioResources(scenario: MockScenarioPack, locale: SupportedLocale, prefix: string) {
  const organization: fhir4.Organization = {
    resourceType: 'Organization',
    id: `${prefix}-organization`,
    active: true,
    name: scenario.creator.organization.name,
    type: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/organization-type',
        code: scenario.creator.organization.type.toUpperCase().slice(0, 4),
        display: organizationTypeDisplay(scenario.creator.organization.type, locale)
      }]
    }],
    identifier: [{
      system: ORGANIZATION_IDENTIFIER_SYSTEM,
      value: scenario.creator.organization.identifier
    }]
  }

  const patient: fhir4.Patient = {
    resourceType: 'Patient',
    id: `${prefix}-patient`,
    identifier: [{
      use: 'official',
      system: PATIENT_IDENTIFIER_SYSTEM,
      value: scenario.creator.patient.studentId
    }],
    name: [{
      use: 'official',
      text: humanDisplay(locale, scenario.creator.patient.familyName, scenario.creator.patient.givenName),
      family: scenario.creator.patient.familyName,
      given: [scenario.creator.patient.givenName]
    }],
    gender: scenario.creator.patient.gender,
    birthDate: scenario.creator.patient.birthDate
  }

  const practitioner: fhir4.Practitioner = {
    resourceType: 'Practitioner',
    id: `${prefix}-practitioner`,
    identifier: [{
      system: PRACTITIONER_IDENTIFIER_SYSTEM,
      value: scenario.creator.practitioner.licenseNumber
    }],
    name: [{
      use: 'official',
      text: humanDisplay(locale, scenario.creator.practitioner.familyName, scenario.creator.practitioner.givenName),
      family: scenario.creator.practitioner.familyName,
      given: [scenario.creator.practitioner.givenName]
    }],
    qualification: [{
      code: {
        text: scenario.creator.practitioner.qualification
      }
    }]
  }

  const encounter: fhir4.Encounter = {
    resourceType: 'Encounter',
    id: `${prefix}-encounter`,
    status: 'finished',
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: scenario.creator.encounter.class,
      display: encounterDisplay(scenario.creator.encounter.class, locale)
    },
    subject: { reference: `Patient/${patient.id}` },
    serviceProvider: { reference: `Organization/${organization.id}` },
    participant: [{
      individual: { reference: `Practitioner/${practitioner.id}` }
    }],
    period: {
      start: scenario.creator.encounter.periodStart,
      end: scenario.creator.encounter.periodEnd
    }
  }

  const condition: fhir4.Condition = {
    resourceType: 'Condition',
    id: `${prefix}-condition`,
    clinicalStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
        code: scenario.creator.condition.clinicalStatus
      }]
    },
    code: {
      coding: [{
        system: 'http://hl7.org/fhir/sid/icd-10-cm',
        code: scenario.creator.condition.icdCode,
        display: scenario.creator.condition.icdDisplay
      }],
      text: scenario.creator.condition.icdDisplay
    },
    subject: { reference: `Patient/${patient.id}` },
    encounter: { reference: `Encounter/${encounter.id}` }
  }

  const observation: fhir4.Observation = {
    resourceType: 'Observation',
    id: `${prefix}-observation`,
    status: scenario.creator.observation.status,
    code: {
      coding: [{
        system: 'http://loinc.org',
        code: scenario.creator.observation.loincCode,
        display: scenario.creator.observation.display
      }],
      text: scenario.creator.observation.display
    },
    subject: { reference: `Patient/${patient.id}` },
    encounter: { reference: `Encounter/${encounter.id}` },
    valueQuantity: {
      value: scenario.creator.observation.value,
      unit: scenario.creator.observation.unit,
      system: 'http://unitsofmeasure.org'
    },
    effectiveDateTime: scenario.creator.encounter.periodStart
  }

  const coverage: fhir4.Coverage = {
    resourceType: 'Coverage',
    id: `${prefix}-coverage`,
    status: 'active',
    subscriberId: scenario.creator.coverage.subscriberId,
    type: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: scenario.creator.coverage.type,
        display: coverageTypeDisplay(scenario.creator.coverage.type, locale)
      }],
      text: coverageTypeDisplay(scenario.creator.coverage.type, locale)
    },
    identifier: [{
      system: COVERAGE_IDENTIFIER_SYSTEM,
      value: scenario.creator.coverage.subscriberId
    }],
    beneficiary: { reference: `Patient/${patient.id}` },
    payor: [{ reference: `Organization/${organization.id}` }],
    period: {
      start: scenario.creator.coverage.periodStart,
      end: scenario.creator.coverage.periodEnd
    }
  }

  const medication: fhir4.Medication = {
    resourceType: 'Medication',
    id: `${prefix}-medication`,
    code: {
      coding: [{
        system: scenario.creator.medication.codeSystem === 'atc'
          ? 'http://www.whocc.no/atc'
          : 'https://www.nhi.gov.tw/medication-code',
        code: scenario.creator.medication.code,
        display: scenario.creator.medication.display
      }],
      text: scenario.creator.medication.display
    }
  }

  const medicationRequest: fhir4.MedicationRequest = {
    resourceType: 'MedicationRequest',
    id: `${prefix}-medication-request`,
    identifier: [{
      system: MEDICATION_REQUEST_IDENTIFIER_SYSTEM,
      value: JSON.stringify({
        patient: scenario.creator.patient.studentId,
        medication: scenario.creator.medication.code,
        encounter: encounter.id
      })
    }],
    status: 'active',
    intent: 'order',
    medicationReference: {
      reference: `Medication/${medication.id}`,
      display: scenario.creator.medication.display
    },
    subject: { reference: `Patient/${patient.id}` },
    requester: { reference: `Practitioner/${practitioner.id}` },
    encounter: { reference: `Encounter/${encounter.id}` },
    dosageInstruction: [{
      text: `${scenario.creator.medicationRequest.doseValue} ${scenario.creator.medicationRequest.doseUnit} ${frequencyDisplay(scenario.creator.medicationRequest.frequency, locale)}`,
      patientInstruction: scenario.creator.medicationRequest.note,
      route: {
        coding: [{
          system: 'http://snomed.info/sct',
          code: scenario.creator.medicationRequest.route,
          display: routeDisplay(scenario.creator.medicationRequest.route, locale)
        }]
      },
      doseAndRate: [{
        doseQuantity: {
          value: scenario.creator.medicationRequest.doseValue,
          unit: scenario.creator.medicationRequest.doseUnit,
          system: 'http://unitsofmeasure.org'
        }
      }],
      timing: {
        code: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-GTSAbbreviation',
            code: scenario.creator.medicationRequest.frequency
          }],
          text: frequencyDisplay(scenario.creator.medicationRequest.frequency, locale)
        }
      }
    }],
    dispenseRequest: scenario.creator.medicationRequest.durationDays ? {
      expectedSupplyDuration: {
        value: scenario.creator.medicationRequest.durationDays,
        unit: locale === 'en' ? 'days' : '天',
        system: 'http://unitsofmeasure.org',
        code: 'd'
      }
    } : undefined
  }

  const extension: fhir4.Basic = {
    resourceType: 'Basic',
    id: `${prefix}-extension`,
    code: {
      coding: [{
        system: 'https://rxfhir.app/codes/basic-extension',
        code: scenario.creator.extension.codeCode,
        display: scenario.creator.extension.codeDisplay
      }],
      text: scenario.creator.extension.codeDisplay
    },
    subject: { reference: `Patient/${patient.id}` },
    extension: [
      {
        url: scenario.creator.extension.ext1Url,
        valueString: scenario.creator.extension.ext1Value
      },
      ...(scenario.creator.extension.ext2Url && scenario.creator.extension.ext2Value
        ? [{
            url: scenario.creator.extension.ext2Url,
            valueString: scenario.creator.extension.ext2Value
          }]
        : [])
    ]
  }

  const composition: fhir4.Composition = {
    resourceType: 'Composition',
    id: `${prefix}-composition`,
    status: 'final',
    type: {
      coding: [{
        system: 'http://loinc.org',
        code: '57833-6',
        display: locale === 'en' ? 'Prescription for medication' : '處方箋'
      }]
    },
    title: scenario.creator.composition.title,
    date: scenario.creator.composition.date,
    subject: { reference: `Patient/${patient.id}` },
    author: [{ reference: `Practitioner/${practitioner.id}` }],
    custodian: { reference: `Organization/${organization.id}` },
    encounter: { reference: `Encounter/${encounter.id}` },
    section: [
      {
        title: locale === 'en' ? 'Diagnosis' : '診斷',
        entry: [{ reference: `Condition/${condition.id}` }]
      },
      {
        title: locale === 'en' ? 'Observation' : '檢驗檢查',
        entry: [{ reference: `Observation/${observation.id}` }]
      },
      {
        title: locale === 'en' ? 'Medication' : '處方內容',
        entry: [{ reference: `MedicationRequest/${medicationRequest.id}` }]
      }
    ]
  }

  return {
    organization,
    patient,
    practitioner,
    encounter,
    condition,
    observation,
    coverage,
    medication,
    medicationRequest,
    extension,
    composition
  }
}

function buildBundle(
  scenario: MockScenarioPack,
  locale: SupportedLocale,
  prefix: string,
  bundleId: string
): fhir4.Bundle {
  const resources = buildScenarioResources(scenario, locale, prefix)
  const bundle = assembleDocumentBundle(resources, resources.composition)
  bundle.id = bundleId
  bundle.timestamp = resources.composition.date
  return bundle
}

function buildSubmissionRecord(bundle: fhir4.Bundle, serverUrl: string, submittedAt: string) {
  const metadata = extractBundleHistoryMetadata(bundle)
  return {
    id: `${bundle.id}-record`,
    type: 'bundle' as const,
    bundleId: bundle.id,
    patientName: metadata.patientName ?? '',
    patientIdentifier: metadata.patientIdentifier ?? '',
    organizationName: metadata.organizationName,
    organizationIdentifier: metadata.organizationIdentifier,
    practitionerName: metadata.practitionerName,
    conditionDisplay: metadata.conditionDisplay,
    submittedAt,
    serverUrl,
    compositionDate: (bundle.entry?.find((e) => e.resource?.resourceType === 'Composition')?.resource as fhir4.Composition | undefined)?.date?.slice(0, 10)
  }
}

function buildQuerySteps(serverUrl: string, identifier: string, organizationId: string, locale: SupportedLocale): QueryStep[] {
  return [
    {
      step: 1,
      label: locale === 'en' ? 'Search Bundle' : '查詢 Bundle',
      url: `${serverUrl}/Bundle?identifier=${identifier}&composition.custodian.identifier=${organizationId}`,
      note: locale === 'en'
        ? 'Filter document Bundles by patient identifier and organization code.'
        : '以病人學號與機構代碼篩選文件型 Bundle。'
    }
  ]
}

export function buildFeatureShowcaseSnapshot(locale: SupportedLocale, serverUrl: string): FeatureShowcaseSnapshot {
  const primaryScenario = getScenarioById('foundation-gerd-01', locale)
  const secondaryScenario = getScenarioById('foundation-uri-01', locale)

  if (!primaryScenario || !secondaryScenario) {
    throw new Error(locale === 'en'
      ? 'Feature showcase scenarios are missing.'
      : 'Feature Showcase 所需的示範情境不存在。')
  }

  const primaryResources = buildScenarioResources(primaryScenario, locale, 'showcase-primary')
  const primaryBundle = buildBundle(primaryScenario, locale, 'showcase-primary', 'showcase-bundle-001')
  const secondaryBundle = buildBundle(secondaryScenario, locale, 'showcase-secondary', 'showcase-bundle-002')

  const primarySummary = extractBundleSummary(primaryBundle)
  const secondarySummary = extractBundleSummary(secondaryBundle)

  if (!primarySummary || !secondarySummary) {
    throw new Error(locale === 'en'
      ? 'Failed to build showcase bundle summaries.'
      : '無法建立 Feature Showcase 的 Bundle 摘要。')
  }

  const results = [primarySummary, secondarySummary]
  const recentRecords = [
    buildSubmissionRecord(primaryBundle, serverUrl, primaryScenario.creator.composition.date),
    buildSubmissionRecord(secondaryBundle, serverUrl, secondaryScenario.creator.composition.date)
  ]

  const now = new Date().toISOString()
  const savedSearches = [
    {
      id: 'showcase-basic-search',
      pinned: true,
      createdAt: now,
      lastUsedAt: now,
      params: {
        mode: 'basic' as const,
        identifier: primaryScenario.creator.patient.studentId
      }
    },
    {
      id: 'showcase-complex-search',
      pinned: false,
      createdAt: now,
      lastUsedAt: now,
      params: {
        mode: 'complex' as const,
        identifier: primaryScenario.creator.patient.studentId,
        organizationId: primaryScenario.creator.organization.identifier,
        complexSearchBy: 'organization' as const
      }
    },
    {
      id: 'showcase-date-search',
      pinned: false,
      createdAt: now,
      lastUsedAt: now,
      params: {
        mode: 'date' as const,
        identifier: secondaryScenario.creator.patient.studentId,
        date: secondaryScenario.creator.composition.date.slice(0, 10)
      }
    }
  ]

  const requestHistory: FhirRequestEntry[] = [
    {
      id: 'showcase-practitioner-put',
      method: 'PUT' as const,
      url: `${serverUrl}/Practitioner/${primaryResources.practitioner.id}`,
      resourceType: 'Practitioner',
      reasonCode: 'update' as const,
      requestHeaders: {
        'Content-Type': 'application/fhir+json',
        Accept: 'application/fhir+json'
      },
      requestBody: primaryResources.practitioner,
      startedAt: now,
      finishedAt: now,
      durationMs: 624,
      ok: true,
      responseStatus: 200,
      responseStatusText: 'OK',
      responseHeaders: {
        'content-type': 'application/fhir+json'
      },
      responseBody: primaryResources.practitioner
    },
    {
      id: 'showcase-practitioner-check',
      method: 'GET' as const,
      url: `${serverUrl}/Practitioner?identifier=${encodeURIComponent(`${PRACTITIONER_IDENTIFIER_SYSTEM}|${primaryScenario.creator.practitioner.licenseNumber}`)}`,
      resourceType: 'Practitioner',
      reasonCode: 'check-existing' as const,
      requestHeaders: {
        Accept: 'application/fhir+json'
      },
      startedAt: now,
      finishedAt: now,
      durationMs: 410,
      ok: true,
      responseStatus: 200,
      responseStatusText: 'OK',
      responseHeaders: {
        'content-type': 'application/fhir+json'
      },
      responseBody: {
        resourceType: 'Bundle',
        total: 1,
        entry: [{ resource: primaryResources.practitioner }]
      }
    }
  ]

  return {
    locale,
    creator: {
      currentStep: 10,
      resources: primaryResources,
      feedbacks: {
        organization: { id: primaryResources.organization.id!, outcome: 'reused', requestMethod: 'GET' },
        patient: { id: primaryResources.patient.id!, outcome: 'created', requestMethod: 'POST' },
        practitioner: { id: primaryResources.practitioner.id!, outcome: 'updated', requestMethod: 'PUT' },
        encounter: { id: primaryResources.encounter.id!, outcome: 'created', requestMethod: 'POST' },
        condition: { id: primaryResources.condition.id!, outcome: 'created', requestMethod: 'POST' },
        observation: { id: primaryResources.observation.id!, outcome: 'created', requestMethod: 'POST' },
        coverage: { id: primaryResources.coverage.id!, outcome: 'reused', requestMethod: 'GET' },
        medication: { id: primaryResources.medication.id!, outcome: 'created', requestMethod: 'POST' },
        medicationRequest: { id: primaryResources.medicationRequest.id!, outcome: 'created', requestMethod: 'POST' },
        extension: { id: primaryResources.extension.id!, outcome: 'created', requestMethod: 'POST' }
      },
      lastUpdatedResourceKey: 'composition',
      bundleId: primaryBundle.id
    },
    consumer: {
      results,
      total: results.length,
      selectedBundleId: primarySummary.id,
      quickSearchPrefill: {
        tab: 'complex',
        identifier: primaryScenario.creator.patient.studentId,
        complexBy: 'organization',
        orgId: primaryScenario.creator.organization.identifier,
        authorName: primaryScenario.creator.practitioner.givenName
      },
      quickSearchExecution: {
        params: {
          mode: 'complex',
          identifier: primaryScenario.creator.patient.studentId,
          organizationId: primaryScenario.creator.organization.identifier,
          complexSearchBy: 'organization'
        },
        lastUrl: `${serverUrl}/Bundle?identifier=${primaryScenario.creator.patient.studentId}`,
        querySteps: buildQuerySteps(
          serverUrl,
          primaryScenario.creator.patient.studentId,
          primaryScenario.creator.organization.identifier,
          locale
        )
      }
    },
    recentRecords,
    savedSearches,
    fhirRequests: {
      latest: requestHistory[0],
      history: requestHistory
    }
  }
}
