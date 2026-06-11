/**
 * 共用的 Playwright Chromium 啟動，附上友善的「瀏覽器未安裝」提示。
 * Chromium 由 repo 根目錄的 Playwright 提供；首次使用前需 `npx playwright install chromium`。
 */
import { chromium, type Browser } from 'playwright'

export async function launchChromium(): Promise<Browser> {
  try {
    return await chromium.launch()
  } catch (e) {
    if (e instanceof Error && /Executable doesn't exist|playwright install/i.test(e.message)) {
      throw new Error('Playwright Chromium 尚未安裝；請先在 repo 根目錄執行：npx playwright install chromium')
    }
    throw e
  }
}
