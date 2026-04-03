import type { CreatorDraftValues } from '../store/creatorStore'
import type { ResourceKey } from '../types/fhir.d'

export interface CreatorSubmissionSnapshot {
  bundleId: string
  submittedAt: string
  drafts: CreatorDraftValues
}

export interface CreatorStepDiff {
  key: ResourceKey
  changeCount: number
  previousSummary?: string
  currentSummary?: string
}

export interface CreatorSubmissionDiffResult {
  changedSteps: CreatorStepDiff[]
  totalChangedFields: number
}

const SUMMARY_HINTS: Partial<Record<ResourceKey, string[]>> = {
  organization: ['name', 'identifier', 'type'],
  patient: ['familyName', 'givenName', 'studentId'],
  practitioner: ['familyName', 'givenName', 'license'],
  encounter: ['classCode', 'serviceType', 'status'],
  condition: ['code', 'display', 'description'],
  observation: ['code', 'display', 'value'],
  coverage: ['payor', 'policyNumber', 'type'],
  medication: ['code', 'display', 'form'],
  medicationRequest: ['medicationCode', 'dosageText', 'route', 'note'],
  extension: ['daysSupply', 'refillCount', 'note'],
  composition: ['title', 'date']
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, sortValue(nestedValue)])
    )
  }

  return value
}

function toStableString(value: unknown): string {
  return JSON.stringify(sortValue(value))
}

function cloneDrafts(drafts: CreatorDraftValues): CreatorDraftValues {
  return JSON.parse(JSON.stringify(drafts)) as CreatorDraftValues
}

function summarizeDraftStep(key: ResourceKey, values?: Record<string, unknown>): string | undefined {
  if (!values) return undefined

  const hints = SUMMARY_HINTS[key] ?? []
  const picked = hints
    .map((field) => values[field])
    .filter((value): value is string | number => (
      typeof value === 'string' ? value.trim().length > 0 : typeof value === 'number'
    ))
    .map((value) => String(value).trim())

  if (picked.length > 0) {
    return picked.slice(0, 2).join(' / ')
  }

  const fallback = Object.values(values)
    .filter((value): value is string | number => (
      typeof value === 'string' ? value.trim().length > 0 : typeof value === 'number'
    ))
    .map((value) => String(value).trim())

  return fallback.slice(0, 2).join(' / ') || undefined
}

function countChangedFields(
  previousValues?: Record<string, unknown>,
  currentValues?: Record<string, unknown>
): number {
  const previous = previousValues ?? {}
  const current = currentValues ?? {}
  const keys = new Set([...Object.keys(previous), ...Object.keys(current)])

  return Array.from(keys).reduce((count, key) => (
    toStableString(previous[key]) === toStableString(current[key]) ? count : count + 1
  ), 0)
}

export function buildCreatorSubmissionSnapshot(
  bundleId: string,
  drafts: CreatorDraftValues,
  submittedAt = new Date().toISOString()
): CreatorSubmissionSnapshot {
  return {
    bundleId,
    submittedAt,
    drafts: cloneDrafts(drafts)
  }
}

export function diffCreatorSubmissionSnapshot(
  previousSnapshot: CreatorSubmissionSnapshot | undefined,
  currentDrafts: CreatorDraftValues
): CreatorSubmissionDiffResult {
  if (!previousSnapshot) {
    return {
      changedSteps: [],
      totalChangedFields: 0
    }
  }

  const keys = new Set<ResourceKey>([
    ...(Object.keys(previousSnapshot.drafts) as ResourceKey[]),
    ...(Object.keys(currentDrafts) as ResourceKey[])
  ])

  const changedSteps = Array.from(keys).reduce<CreatorStepDiff[]>((items, key) => {
    const previousValues = previousSnapshot.drafts[key] as Record<string, unknown> | undefined
    const currentValues = currentDrafts[key] as Record<string, unknown> | undefined
    const changeCount = countChangedFields(previousValues, currentValues)

    if (changeCount === 0) return items

    return [
      ...items,
      {
        key,
        changeCount,
        previousSummary: summarizeDraftStep(key, previousValues),
        currentSummary: summarizeDraftStep(key, currentValues)
      }
    ]
  }, [])

  return {
    changedSteps,
    totalChangedFields: changedSteps.reduce((total, item) => total + item.changeCount, 0)
  }
}
