import { useCallback } from 'react'
import type { ResourceKey } from '../types/fhir.d'
import { useAppStore } from '../store/appStore'
import { useMockStore } from '../store/mockStore'

export function useCreatorMockFill<T extends Record<string, unknown>>(
  resourceKey: ResourceKey,
  applyValue: (key: keyof T, value: T[keyof T]) => void
): () => void {
  const getNextCreatorMock = useMockStore((state) => state.getNextCreatorMock)
  const locale = useAppStore((state) => state.locale)

  return useCallback(() => {
    const mock = getNextCreatorMock(resourceKey, locale) as Partial<T> | undefined
    if (!mock) return

    Object.entries(mock).forEach(([key, value]) => {
      applyValue(key as keyof T, value as T[keyof T])
    })
  }, [applyValue, getNextCreatorMock, locale, resourceKey])
}
