import { useCallback } from 'react'
import type { ResourceKey } from '../../../types/fhir'
import { useReducedMotion } from '../../../shared/hooks/useReducedMotion'
import { revealLiveDemoField } from '../../../app/lib/liveDemoDom'
import { waitForLiveDemoDelay, waitForLiveDemoRunning } from '../../../app/lib/liveDemoRuntime'
import { useAppStore } from '../../../app/stores/appStore'
import { useLiveDemoStore } from '../../../app/stores/liveDemoStore'
import { useMockStore } from '../store/mockStore'

const INSTANT_KEYS = new Set<string>([
  'type',
  'gender',
  'class',
  'status',
  'codeSystem',
  'form',
  'route',
  'frequency',
  'periodStart',
  'periodEnd',
  'birthDate',
  'date',
  'effectiveDate',
  'expiryDate',
  'ext1Url',
  'ext2Url'
])

function shouldTypeValue(key: string, value: unknown): value is string {
  if (typeof value !== 'string') return false
  if (INSTANT_KEYS.has(key)) return false
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false
  if (/^https?:\/\//.test(value)) return false
  return true
}

export function useCreatorMockValues<T extends Record<string, unknown>>(
  resourceKey: ResourceKey
): () => Partial<T> | undefined {
  const getNextCreatorMock = useMockStore((state) => state.getNextCreatorMock)
  const locale = useAppStore((state) => state.locale)

  return useCallback(
    () => getNextCreatorMock(resourceKey, locale) as Partial<T> | undefined,
    [getNextCreatorMock, locale, resourceKey]
  )
}

export function useCreatorMockFill<T extends Record<string, unknown>>(
  resourceKey: ResourceKey,
  applyValue: (key: keyof T, value: T[keyof T]) => void
): () => void {
  const getMockValues = useCreatorMockValues<T>(resourceKey)

  return useCallback(() => {
    const mock = getMockValues()
    if (!mock) return

    Object.entries(mock).forEach(([key, value]) => {
      applyValue(key as keyof T, value as T[keyof T])
    })
  }, [applyValue, getMockValues])
}

export function useLiveDemoTypedMockFill<T extends Record<string, unknown>>(
  resourceKey: ResourceKey,
  applyValue: (key: keyof T, value: T[keyof T]) => void
): () => Promise<void> {
  const getMockValues = useCreatorMockValues<T>(resourceKey)
  const playMode = useLiveDemoStore((state) => state.playMode)
  const reducedMotion = useReducedMotion()

  return useCallback(async () => {
    const mock = getMockValues()
    if (!mock) return
    const runId = useLiveDemoStore.getState().runId

    const charDelay = reducedMotion
      ? playMode === 'auto' ? 42 : 28
      : playMode === 'auto' ? 75 : 40
    const spaceDelay = reducedMotion
      ? playMode === 'auto' ? 24 : 16
      : playMode === 'auto' ? 40 : 25
    const fieldDelay = reducedMotion
      ? playMode === 'auto' ? 88 : 64
      : playMode === 'auto' ? 180 : 120
    const afterTypedFieldDelay = reducedMotion
      ? playMode === 'auto' ? 76 : 52
      : playMode === 'auto' ? 180 : 100

    for (const [key, value] of Object.entries(mock)) {
      await waitForLiveDemoRunning(runId)
      await revealLiveDemoField(resourceKey, key, reducedMotion)
      await waitForLiveDemoRunning(runId)

      if (shouldTypeValue(key, value)) {
        let current = ''
        for (const char of value) {
          await waitForLiveDemoRunning(runId)
          current += char
          applyValue(key as keyof T, current as T[keyof T])
          await waitForLiveDemoDelay(runId, char === ' ' ? spaceDelay : charDelay)
        }
        await waitForLiveDemoDelay(runId, afterTypedFieldDelay)
        continue
      }

      applyValue(key as keyof T, value as T[keyof T])
      await waitForLiveDemoDelay(runId, fieldDelay)
    }
  }, [applyValue, getMockValues, playMode, reducedMotion])
}
