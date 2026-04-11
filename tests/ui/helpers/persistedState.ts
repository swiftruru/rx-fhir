import type { Page } from '@playwright/test'

export async function seedZustandPersistedState<T>(
  page: Page,
  storageKey: string,
  state: T,
  version = 0
): Promise<void> {
  await page.evaluate(
    ({ key, payload }) => {
      window.localStorage.setItem(key, JSON.stringify(payload))
    },
    {
      key: storageKey,
      payload: {
        state,
        version
      }
    }
  )
}
