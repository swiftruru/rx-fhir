import type { ResourceKey } from '../types/fhir'
import { mockResourcePresetSources } from './resourcePresets'
import { mockScenarioPackSources } from './scenarioPacks'
import type {
  CompositionMockInput,
  CompositionMockSource,
  ConditionMockInput,
  ConditionMockSource,
  CoverageMockInput,
  EncounterMockInput,
  ExtensionMockInput,
  ExtensionMockSource,
  LocalizedString,
  LocalizedText,
  MedicationMockInput,
  MedicationMockSource,
  MedicationRequestMockInput,
  MedicationRequestMockSource,
  MockLocale,
  MockResourceData,
  MockResourcePresetMap,
  MockResourcePresetSourceMap,
  MockPrescriptionTemplate,
  MockScenarioCategory,
  MockScenarioPack,
  MockScenarioPackSource,
  ObservationMockInput,
  ObservationMockSource,
  OrganizationMockInput,
  OrganizationMockSource,
  PatientMockInput,
  PatientMockSource,
  PractitionerMockInput,
  PractitionerMockSource
} from './types'
import { validateMockScenarioPacks } from './validate'

validateMockScenarioPacks(mockScenarioPackSources)

const PRESCRIPTION_TEMPLATE_CATEGORIES: Array<Extract<MockScenarioCategory, 'foundation' | 'acute' | 'chronic' | 'pediatric'>> = [
  'foundation',
  'acute',
  'chronic',
  'pediatric'
]

function uniqueBy<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = getKey(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function normalizeLocale(locale?: string): MockLocale {
  return locale === 'en' ? 'en' : 'zh-TW'
}

function resolveLocalizedString(value: LocalizedString, locale?: string): string {
  const normalized = normalizeLocale(locale)
  return value[normalized]
}

function resolveLocalizedResource<TBase extends object, TText extends object>(
  source: TBase & { text: LocalizedText<TText> },
  locale?: string
): TBase & TText {
  const normalized = normalizeLocale(locale)
  const { text, ...base } = source
  return {
    ...(base as TBase),
    ...text[normalized]
  }
}

function resolvePatient(source: PatientMockSource, locale?: string): PatientMockInput {
  return resolveLocalizedResource(source, locale)
}

function resolveOrganization(source: OrganizationMockSource, locale?: string): OrganizationMockInput {
  return resolveLocalizedResource(source, locale)
}

function resolvePractitioner(source: PractitionerMockSource, locale?: string): PractitionerMockInput {
  return resolveLocalizedResource(source, locale)
}

function resolveCondition(source: ConditionMockSource, locale?: string): ConditionMockInput {
  return resolveLocalizedResource(source, locale)
}

function resolveObservation(source: ObservationMockSource, locale?: string): ObservationMockInput {
  return resolveLocalizedResource(source, locale)
}

function resolveMedication(source: MedicationMockSource, locale?: string): MedicationMockInput {
  return resolveLocalizedResource(source, locale)
}

function resolveMedicationRequest(source: MedicationRequestMockSource, locale?: string): MedicationRequestMockInput {
  return resolveLocalizedResource(source, locale)
}

function resolveComposition(source: CompositionMockSource, locale?: string): CompositionMockInput {
  return resolveLocalizedResource(source, locale)
}

function resolveExtension(source: ExtensionMockSource, locale?: string): ExtensionMockInput {
  return resolveLocalizedResource(source, locale)
}

function resolveScenarioPack(source: MockScenarioPackSource, locale?: string): MockScenarioPack {
  return {
    id: source.id,
    category: source.category,
    label: resolveLocalizedString(source.label, locale),
    description: resolveLocalizedString(source.description, locale),
    tags: source.tags,
    isPrimaryDemo: source.isPrimaryDemo,
    creator: {
      organization: resolveOrganization(source.creator.organization, locale),
      patient: resolvePatient(source.creator.patient, locale),
      practitioner: resolvePractitioner(source.creator.practitioner, locale),
      encounter: source.creator.encounter,
      condition: resolveCondition(source.creator.condition, locale),
      observation: resolveObservation(source.creator.observation, locale),
      coverage: source.creator.coverage,
      medication: resolveMedication(source.creator.medication, locale),
      medicationRequest: resolveMedicationRequest(source.creator.medicationRequest, locale),
      composition: resolveComposition(source.creator.composition, locale),
      extension: resolveExtension(source.creator.extension, locale)
    }
  }
}

function resolveResourcePreset<K extends keyof MockResourcePresetSourceMap>(
  key: K,
  locale?: string
): MockResourcePresetMap[K] {
  const presets = mockResourcePresetSources[key]

  switch (key) {
    case 'patient':
      return presets.map((preset) => resolvePatient(preset, locale)) as MockResourcePresetMap[K]
    case 'organization':
      return presets.map((preset) => resolveOrganization(preset, locale)) as MockResourcePresetMap[K]
    case 'practitioner':
      return presets.map((preset) => resolvePractitioner(preset, locale)) as MockResourcePresetMap[K]
    case 'encounter':
      return [...presets] as MockResourcePresetMap[K]
    case 'condition':
      return presets.map((preset) => resolveCondition(preset, locale)) as MockResourcePresetMap[K]
    case 'observation':
      return presets.map((preset) => resolveObservation(preset, locale)) as MockResourcePresetMap[K]
    case 'coverage':
      return [...presets] as MockResourcePresetMap[K]
    case 'medication':
      return presets.map((preset) => resolveMedication(preset, locale)) as MockResourcePresetMap[K]
    case 'medicationRequest':
      return presets.map((preset) => resolveMedicationRequest(preset, locale)) as MockResourcePresetMap[K]
    case 'composition':
      return presets.map((preset) => resolveComposition(preset, locale)) as MockResourcePresetMap[K]
    case 'extension':
      return presets.map((preset) => resolveExtension(preset, locale)) as MockResourcePresetMap[K]
    default:
      return [] as unknown as MockResourcePresetMap[K]
  }
}

function getResourceIdentity(key: ResourceKey, item: MockResourceData<ResourceKey>): string {
  switch (key) {
    case 'patient':
      return (item as PatientMockInput).studentId
    case 'organization':
      return (item as OrganizationMockInput).identifier
    case 'practitioner':
      return (item as PractitionerMockInput).licenseNumber
    case 'encounter':
      return `${(item as EncounterMockInput).class}:${(item as EncounterMockInput).periodStart}:${(item as EncounterMockInput).periodEnd ?? ''}`
    case 'condition':
      return `${(item as ConditionMockInput).icdCode}:${(item as ConditionMockInput).icdDisplay}`
    case 'observation':
      return `${(item as ObservationMockInput).loincCode}:${(item as ObservationMockInput).display}:${(item as ObservationMockInput).unit}`
    case 'coverage':
      return (item as CoverageMockInput).subscriberId
    case 'medication':
      return `${(item as MedicationMockInput).codeSystem}:${(item as MedicationMockInput).code}`
    case 'medicationRequest':
      return `${(item as MedicationRequestMockInput).doseValue}:${(item as MedicationRequestMockInput).doseUnit}:${(item as MedicationRequestMockInput).frequency}:${(item as MedicationRequestMockInput).route}:${(item as MedicationRequestMockInput).durationDays ?? ''}:${(item as MedicationRequestMockInput).note ?? ''}`
    case 'extension':
      return `${(item as ExtensionMockInput).codeCode}:${(item as ExtensionMockInput).ext1Url}:${(item as ExtensionMockInput).ext1Value}:${(item as ExtensionMockInput).ext2Url ?? ''}:${(item as ExtensionMockInput).ext2Value ?? ''}`
    case 'composition':
      return `${(item as CompositionMockInput).title}:${(item as CompositionMockInput).date}`
    default:
      return JSON.stringify(item)
  }
}

export function getScenarioSourceById(id?: string): MockScenarioPackSource | undefined {
  if (!id) return undefined
  return mockScenarioPackSources.find((scenario) => scenario.id === id)
}

export function getScenarioById(id?: string, locale?: string): MockScenarioPack | undefined {
  const source = getScenarioSourceById(id)
  return source ? resolveScenarioPack(source, locale) : undefined
}

export function getPrimaryDemoScenarioId(): string | undefined {
  return mockScenarioPackSources.find((scenario) => scenario.isPrimaryDemo)?.id
}

export function getScenarioIds(category?: MockScenarioCategory | 'all'): string[] {
  return mockScenarioPackSources
    .filter((scenario) => !category || category === 'all' || scenario.category === category)
    .map((scenario) => scenario.id)
}

export function getResolvedScenarioPacks(locale?: string): MockScenarioPack[] {
  return mockScenarioPackSources.map((scenario) => resolveScenarioPack(scenario, locale))
}

export function getPrescriptionTemplateScenarios(locale?: string): MockPrescriptionTemplate[] {
  const categoryOrder = new Map(PRESCRIPTION_TEMPLATE_CATEGORIES.map((category, index) => [category, index]))

  return getResolvedScenarioPacks(locale)
    .filter((scenario): scenario is MockScenarioPack & { category: MockPrescriptionTemplate['category'] } =>
      PRESCRIPTION_TEMPLATE_CATEGORIES.includes(
        scenario.category as MockPrescriptionTemplate['category']
      )
    )
    .sort((a, b) => {
      if (a.isPrimaryDemo && !b.isPrimaryDemo) return -1
      if (!a.isPrimaryDemo && b.isPrimaryDemo) return 1
      const categoryDelta = (categoryOrder.get(a.category) ?? 99) - (categoryOrder.get(b.category) ?? 99)
      if (categoryDelta !== 0) return categoryDelta
      return a.label.localeCompare(b.label)
    })
    .map((scenario) => ({
      id: scenario.id,
      category: scenario.category,
      label: scenario.label,
      description: scenario.description,
      tags: scenario.tags,
      isPrimaryDemo: scenario.isPrimaryDemo,
      scenario
    }))
}

export function getScenarioMock<K extends ResourceKey>(
  scenarioId: string,
  key: K,
  locale?: string
): MockResourceData<K> | undefined {
  const scenario = getScenarioById(scenarioId, locale)
  return scenario?.creator[key]
}

export function getScenarioMocksForResource<K extends ResourceKey>(
  key: K,
  locale?: string
): MockResourceData<K>[] {
  return uniqueBy(
    getResolvedScenarioPacks(locale).map((scenario) => scenario.creator[key]),
    (item) => getResourceIdentity(key, item as MockResourceData<ResourceKey>)
  )
}

export function getResourcePresets<K extends keyof MockResourcePresetMap>(
  key: K,
  locale?: string
): MockResourcePresetMap[K] {
  return resolveResourcePreset(key, locale)
}

export function getResourcePool<K extends ResourceKey>(key: K, locale?: string): MockResourceData<K>[] {
  return [
    ...getScenarioMocksForResource(key, locale),
    ...(getResourcePresets(key, locale) as MockResourceData<K>[])
  ]
}

export function getNextScenarioMock<K extends ResourceKey>(
  key: K,
  scenarioId?: string,
  locale?: string
): MockResourceData<K> | undefined {
  if (!scenarioId) return getScenarioMocksForResource(key, locale)[0]
  return getScenarioMock(scenarioId, key, locale)
}
