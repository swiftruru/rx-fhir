import type { Page } from '@playwright/test'
import type { UpdateCheckResult } from '../../../src/shared/contracts/electron'

interface RxFhirE2EBridge {
  reset: () => void
  setUpdateMocks: (payload: {
    cachedUpdateResult?: UpdateCheckResult | null
    checkForUpdatesResult?: UpdateCheckResult | null
  }) => void
  emitUpdateResult: (result: UpdateCheckResult) => void
  getCalls: () => {
    openExternalUrls: string[]
    skippedUpdateVersions: string[]
    checkForUpdatesCount: number
  }
}

type WindowWithBridge = Window & {
  __rxfhirE2E?: RxFhirE2EBridge
}

export async function resetE2EBridge(page: Page): Promise<void> {
  await page.evaluate(() => {
    ;(window as WindowWithBridge).__rxfhirE2E?.reset()
  })
}

export async function setE2EUpdateMocks(
  page: Page,
  payload: {
    cachedUpdateResult?: UpdateCheckResult | null
    checkForUpdatesResult?: UpdateCheckResult | null
  }
): Promise<void> {
  await page.evaluate((nextPayload) => {
    ;(window as WindowWithBridge).__rxfhirE2E?.setUpdateMocks(nextPayload)
  }, payload)
}

export async function emitE2EUpdateResult(page: Page, result: UpdateCheckResult): Promise<void> {
  await page.evaluate((nextResult) => {
    ;(window as WindowWithBridge).__rxfhirE2E?.emitUpdateResult(nextResult)
  }, result)
}

export async function getE2EBridgeCalls(page: Page): Promise<{
  openExternalUrls: string[]
  skippedUpdateVersions: string[]
  checkForUpdatesCount: number
}> {
  return page.evaluate(() => {
    return (window as WindowWithBridge).__rxfhirE2E?.getCalls() ?? {
      openExternalUrls: [],
      skippedUpdateVersions: [],
      checkForUpdatesCount: 0
    }
  })
}
