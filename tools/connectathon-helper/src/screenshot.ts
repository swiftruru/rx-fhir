/**
 * Step 30 / 300（選用）：用 Playwright 對「指定 URL」截圖 → step_{id}_{時間戳}.png。
 * 純截圖，不做任何登入或導航（尊重「Gazelle/FHIRfox 純紀錄」原則）。
 * Playwright 由 repo 根目錄的安裝提供（不另裝瀏覽器）。
 */
import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { launchChromium } from './browser.js'

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

export async function screenshotUrl(url: string, dir: string, stepId: number): Promise<string> {
  mkdirSync(dir, { recursive: true })
  const file = resolve(join(dir, `step_${stepId}_${timestamp()}.png`))
  const browser = await launchChromium()
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 })
    await page.screenshot({ path: file, fullPage: true })
  } finally {
    await browser.close()
  }
  return file
}
