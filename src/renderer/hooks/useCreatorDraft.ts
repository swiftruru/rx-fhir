import { useEffect } from 'react'
import type { FieldValues, UseFormWatch } from 'react-hook-form'
import { useCreatorStore } from '../store/creatorStore'
import type { ResourceKey } from '../types/fhir.d'

function isEmptyDraftValue(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (typeof value === 'number') return Number.isNaN(value)
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length === 0
  return false
}

function sanitizeDraftValues(values: Record<string, unknown>): Record<string, unknown> | undefined {
  const sanitized = Object.fromEntries(
    Object.entries(values).filter(([, value]) => !isEmptyDraftValue(value))
  )

  return Object.keys(sanitized).length > 0 ? sanitized : undefined
}

export function mergeDraftValues<T extends Record<string, unknown>>(
  baseValues: Partial<T>,
  draftValues?: Partial<T>
): Partial<T> {
  return {
    ...baseValues,
    ...draftValues
  }
}

export function useCreatorDraftAutosave<TFormValues extends FieldValues>(
  key: ResourceKey,
  watch: UseFormWatch<TFormValues>
): void {
  const setDraft = useCreatorStore((state) => state.setDraft)
  const setDraftStatus = useCreatorStore((state) => state.setDraftStatus)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined

    const subscription = watch((values) => {
      if (timer) clearTimeout(timer)
      setDraftStatus('saving')
      timer = setTimeout(() => {
        try {
          setDraft(key, sanitizeDraftValues(values as Record<string, unknown>))
        } catch {
          setDraftStatus('error')
        }
      }, 400)
    })

    return () => {
      if (timer) clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [key, setDraft, setDraftStatus, watch])
}
