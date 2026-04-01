import { create } from 'zustand'
import type { ResourceKey } from '../types/fhir.d'
import { getNextScenarioMock, getScenarioIds } from '../mocks/selectors'
import type { MockFillMode, MockLocale, MockScenarioCategory } from '../mocks/types'

interface MockState {
  activeScenarioId?: string
  category: MockScenarioCategory | 'all'
  fillMode: MockFillMode
  scenarioIndex: number
  lastFilledResourceKey?: ResourceKey
  setCategory: (category: MockScenarioCategory | 'all') => void
  setFillMode: (mode: MockFillMode) => void
  activateScenario: (scenarioId: string, resourceKey?: ResourceKey) => void
  getRandomCreatorMock: <K extends ResourceKey>(key: K, locale?: MockLocale) => ReturnType<typeof getNextScenarioMock<K>>
  getNextCreatorMock: <K extends ResourceKey>(key: K, locale?: MockLocale) => ReturnType<typeof getNextScenarioMock<K>>
  reset: () => void
}

function getRandomScenarioId(category: MockScenarioCategory | 'all'): string | undefined {
  const scenarioIds = getScenarioIds(category)
  if (scenarioIds.length === 0) return undefined
  return scenarioIds[Math.floor(Math.random() * scenarioIds.length)]
}

export const useMockStore = create<MockState>((set, get) => ({
  activeScenarioId: undefined,
  category: 'all',
  fillMode: 'cycle',
  scenarioIndex: 0,
  lastFilledResourceKey: undefined,

  setCategory: (category) =>
    set({
      category,
      activeScenarioId: undefined,
      scenarioIndex: 0,
      lastFilledResourceKey: undefined
    }),

  setFillMode: (fillMode) =>
    set({
      fillMode,
      activeScenarioId: undefined,
      scenarioIndex: 0,
      lastFilledResourceKey: undefined
    }),

  activateScenario: (scenarioId, resourceKey) =>
    set({
      activeScenarioId: scenarioId,
      lastFilledResourceKey: resourceKey
    }),

  getRandomCreatorMock: (key, locale) => {
    const { category } = get()
    const nextScenarioId = getRandomScenarioId(category)
    if (!nextScenarioId) return undefined

    set({
      activeScenarioId: nextScenarioId,
      lastFilledResourceKey: key
    })

    return getNextScenarioMock(key, nextScenarioId, locale)
  },

  getNextCreatorMock: (key, locale) => {
    const { activeScenarioId, category, fillMode, lastFilledResourceKey, scenarioIndex } = get()
    const scenarioIds = getScenarioIds(category)

    if (scenarioIds.length === 0) return undefined

    let nextScenarioId = activeScenarioId
    let nextScenarioIndex = scenarioIndex

    const shouldAdvanceScenario = !activeScenarioId || lastFilledResourceKey === key

    if (fillMode === 'random') {
      if (shouldAdvanceScenario) {
        nextScenarioId = getRandomScenarioId(category)
      }
    } else if (shouldAdvanceScenario) {
      nextScenarioId = scenarioIds[scenarioIndex % scenarioIds.length]
      nextScenarioIndex = (scenarioIndex + 1) % scenarioIds.length
    }

    set({
      activeScenarioId: nextScenarioId,
      scenarioIndex: nextScenarioIndex,
      lastFilledResourceKey: key
    })

    return getNextScenarioMock(key, nextScenarioId, locale)
  },

  reset: () =>
    set({
      activeScenarioId: undefined,
      scenarioIndex: 0,
      lastFilledResourceKey: undefined
    })
}))
