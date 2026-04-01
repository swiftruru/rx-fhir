import { useCallback } from 'react'
import type { ResourceKey } from '../types/fhir.d'
import { useMockStore } from '../store/mockStore'

export function useCreatorMockFill<T extends Record<string, unknown>>(
  resourceKey: ResourceKey,
  applyValue: (key: keyof T, value: T[keyof T]) => void
): () => void {
  const getNextCreatorMock = useMockStore((state) => state.getNextCreatorMock)

  return useCallback(() => {
    const mock = getNextCreatorMock(resourceKey) as Partial<T> | undefined
    if (!mock) return

    Object.entries(mock).forEach(([key, value]) => {
      applyValue(key as keyof T, value as T[keyof T])
    })
  }, [applyValue, getNextCreatorMock, resourceKey])
}
