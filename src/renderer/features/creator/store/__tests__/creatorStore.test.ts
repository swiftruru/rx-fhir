import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const STORAGE_KEY = 'rxfhir-creator-draft'

type CreatorStoreModule = typeof import('../creatorStore')

let useCreatorStore: CreatorStoreModule['useCreatorStore']

function createMemoryStorage(): Storage {
  const store = new Map<string, string>()

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    }
  }
}

function buildPersistedDraftState() {
  return {
    state: {
      currentStep: 0,
      resources: {},
      drafts: {
        organization: {
          name: 'National Taiwan University Hospital',
          identifier: 'NTUH001',
          type: 'hospital'
        }
      },
      feedbacks: {},
      draftSavedAt: '2026-04-10T13:36:39.293Z'
    },
    version: 0
  }
}

async function readPersistedState(): Promise<{
  currentStep: number
  resources: Record<string, unknown>
  drafts: Record<string, unknown>
} | undefined> {
  const storage = useCreatorStore.persist.getOptions().storage
  const stored = await storage?.getItem(STORAGE_KEY)
  return stored?.state as {
    currentStep: number
    resources: Record<string, unknown>
    drafts: Record<string, unknown>
  } | undefined
}

describe('creatorStore persistence', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.stubGlobal('localStorage', createMemoryStorage())
    ;({ useCreatorStore } = await import('../creatorStore'))
    useCreatorStore.persist.clearStorage()
    useCreatorStore.getState().reset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('persists draft work before bundle submission', async () => {
    useCreatorStore.getState().setDraft('patient', { name: 'Alice Example' })

    await vi.waitFor(async () => {
      const stored = await readPersistedState()
      expect(stored?.drafts.patient).toEqual({ name: 'Alice Example' })
    })
  })

  it('clears persisted resources after bundle submission', async () => {
    useCreatorStore.getState().setDraft('patient', { name: 'Alice Example' })
    useCreatorStore.getState().markBundleSubmitted('bundle-1')

    await vi.waitFor(async () => {
      const stored = await readPersistedState()
      expect(stored?.currentStep).toBe(0)
      expect(stored?.resources).toEqual({})
      expect(stored?.drafts).toEqual({})
    })
  })

  it('marks an unfinished persisted draft as restored after hydration', async () => {
    const storage = useCreatorStore.persist.getOptions().storage

    await storage?.setItem(STORAGE_KEY, buildPersistedDraftState())

    await useCreatorStore.persist.rehydrate()

    const state = useCreatorStore.getState()
    expect(state.draftHydrated).toBe(true)
    expect(state.draftRestored).toBe(true)
    expect(state.draftStatus).toBe('saved')
    expect(state.drafts.organization).toEqual({
      name: 'National Taiwan University Hospital',
      identifier: 'NTUH001',
      type: 'hospital'
    })
  })

  it('sets restored draft flags during initial store hydration', async () => {
    vi.resetModules()
    vi.stubGlobal('localStorage', createMemoryStorage())
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buildPersistedDraftState()))

    const module = await import('../creatorStore')
    useCreatorStore = module.useCreatorStore

    await vi.waitFor(() => {
      expect(useCreatorStore.persist.hasHydrated()).toBe(true)
    })

    const state = useCreatorStore.getState()
    expect(state.draftHydrated).toBe(true)
    expect(state.draftRestored).toBe(true)
    expect(state.draftStatus).toBe('saved')
    expect(state.drafts.organization).toEqual({
      name: 'National Taiwan University Hospital',
      identifier: 'NTUH001',
      type: 'hospital'
    })
  })
})
