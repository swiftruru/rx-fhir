import { expect, test as base, type Page } from '@playwright/test'
import { chromium, type Browser } from 'playwright'
import { spawn, type ChildProcess } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import net from 'node:net'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..', '..', '..')
const require = createRequire(import.meta.url)
const electronBinary = require('electron') as string

export interface LaunchedElectronApp {
  browser: Browser
  electronProcess: ChildProcess
  page: Page
  port: number
}

export interface LaunchRxFhirOptions {
  args?: string[]
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' })

    socket.once('connect', () => {
      socket.end()
      resolve(true)
    })

    socket.once('error', () => {
      resolve(false)
    })
  })
}

async function reservePort(): Promise<number> {
  const startPort = 47000 + Math.floor(Math.random() * 1000)

  for (let offset = 0; offset < 100; offset += 1) {
    const candidate = startPort + offset
    if (!(await isPortInUse(candidate))) {
      return candidate
    }
  }

  throw new Error('Failed to find an available TCP port for Electron UI tests.')
}

async function connectToElectron(port: number, timeoutMs = 15_000): Promise<Browser> {
  const startedAt = Date.now()
  let lastError: unknown

  while (Date.now() - startedAt < timeoutMs) {
    try {
      return await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
    } catch (error) {
      lastError = error
      await delay(250)
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Timed out connecting to Electron on port ${port}.`)
}

async function getFirstPage(browser: Browser, timeoutMs = 15_000): Promise<Page> {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    const context = browser.contexts()[0]
    const page = context?.pages()[0]
    if (page) return page
    await delay(250)
  }

  throw new Error('Timed out waiting for the first Electron renderer page.')
}

async function dismissOnboardingIfPresent(page: Page): Promise<void> {
  const onboardingDialog = page.locator('[role="dialog"]')
  const dialogCount = await onboardingDialog.count()
  if (dialogCount === 0) return

  await page.keyboard.press('Escape')
  await expect(onboardingDialog.first()).toBeHidden({ timeout: 5_000 })
}

async function waitForAppReady(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded')
  await page.waitForSelector('[data-page-heading="true"]', { timeout: 15_000 })
  await dismissOnboardingIfPresent(page)
  await page.waitForSelector('[data-page-heading="true"]', { timeout: 15_000 })
}

async function waitForProcessExit(process: ChildProcess, timeoutMs = 5_000): Promise<void> {
  if (process.exitCode !== null) return

  await new Promise<void>((resolve) => {
    let finished = false

    const done = (): void => {
      if (finished) return
      finished = true
      resolve()
    }

    process.once('exit', done)
    setTimeout(() => {
      if (finished) return
      try {
        process.kill('SIGKILL')
      } catch {
        // Ignore cleanup failures.
      }
      done()
    }, timeoutMs)
  })
}

function spawnElectron(port: number, userDataDir: string, options: LaunchRxFhirOptions = {}): ChildProcess {
  const env = {
    ...process.env,
    RXFHIR_E2E: '1',
    RXFHIR_USER_DATA_DIR: userDataDir
  }

  delete env.ELECTRON_RUN_AS_NODE

  return spawn(
    electronBinary,
    ['.', `--remote-debugging-port=${port}`, ...(options.args ?? [])],
    {
      cwd: projectRoot,
      env,
      stdio: 'ignore'
    }
  )
}

export async function launchRxFhir(
  userDataDir: string,
  options: LaunchRxFhirOptions = {}
): Promise<LaunchedElectronApp> {
  const port = await reservePort()
  const electronProcess = spawnElectron(port, userDataDir, options)
  const browser = await connectToElectron(port)
  const page = await getFirstPage(browser)

  try {
    await waitForAppReady(page)
  } catch (error) {
    await browser.close().catch(() => undefined)
    try {
      electronProcess.kill('SIGTERM')
    } catch {
      // Ignore cleanup failures.
    }
    await waitForProcessExit(electronProcess)
    throw error
  }

  return { browser, electronProcess, page, port }
}

export async function closeRxFhir(app: LaunchedElectronApp | null | undefined): Promise<void> {
  if (!app) return

  await app.browser.close().catch(() => undefined)

  if (app.electronProcess.exitCode === null) {
    try {
      app.electronProcess.kill('SIGTERM')
    } catch {
      // Ignore cleanup failures.
    }
  }

  await waitForProcessExit(app.electronProcess)
}

export async function getLocationHash(page: Page): Promise<string> {
  return page.evaluate(() => window.location.hash)
}

type Fixtures = {
  userDataDir: string
  launchApp: (options?: LaunchRxFhirOptions) => Promise<LaunchedElectronApp>
}

export const test = base.extend<Fixtures>({
  userDataDir: async ({}, use) => {
    const dir = await mkdtemp(join(tmpdir(), 'rxfhir-playwright-'))
    await use(dir)
    await rm(dir, { recursive: true, force: true })
  },
  launchApp: async ({ userDataDir }, use) => {
    await use((options) => launchRxFhir(userDataDir, options))
  }
})

export { expect }
