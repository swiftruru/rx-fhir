import { useCallback } from 'react'
import type { ResourceKey } from '../types/fhir.d'
import { useAppStore } from '../store/appStore'
import { useLiveDemoStore } from '../store/liveDemoStore'
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

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

  return useCallback(async () => {
    const mock = getMockValues()
    if (!mock) return

    const charDelay = playMode === 'auto' ? 75 : 40
    const spaceDelay = playMode === 'auto' ? 40 : 25
    const fieldDelay = playMode === 'auto' ? 180 : 120
    const afterTypedFieldDelay = playMode === 'auto' ? 180 : 100

    for (const [key, value] of Object.entries(mock)) {
      if (shouldTypeValue(key, value)) {
        let current = ''
        for (const char of value) {
          current += char
          applyValue(key as keyof T, current as T[keyof T])
          await sleep(char === ' ' ? spaceDelay : charDelay)
        }
        await sleep(afterTypedFieldDelay)
        continue
      }

      applyValue(key as keyof T, value as T[keyof T])
      await sleep(fieldDelay)
    }
  }, [applyValue, getMockValues, playMode])
}
