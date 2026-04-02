#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

const DEFAULT_ATTEMPTS = 3
const DEFAULT_DELAY_MS = 15_000
const npmCommand = 'npm'
const useShell = process.platform === 'win32'

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function showHelp() {
  console.log(`Usage: node scripts/npm-ci-with-retry.js

Environment variables:
  NPM_CI_MAX_ATTEMPTS    Number of install attempts (default: ${DEFAULT_ATTEMPTS})
  NPM_CI_RETRY_DELAY_MS  Base delay before retrying in milliseconds (default: ${DEFAULT_DELAY_MS})
`)
}

const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  showHelp()
  process.exit(0)
}

const maxAttempts = parsePositiveInt(process.env.NPM_CI_MAX_ATTEMPTS, DEFAULT_ATTEMPTS)
const retryDelayMs = parsePositiveInt(process.env.NPM_CI_RETRY_DELAY_MS, DEFAULT_DELAY_MS)

const npmEnv = {
  ...process.env,
  npm_config_fetch_retries:
    process.env.npm_config_fetch_retries ?? process.env.NPM_CONFIG_FETCH_RETRIES ?? '5',
  npm_config_fetch_retry_factor:
    process.env.npm_config_fetch_retry_factor ?? process.env.NPM_CONFIG_FETCH_RETRY_FACTOR ?? '2',
  npm_config_fetch_retry_mintimeout:
    process.env.npm_config_fetch_retry_mintimeout ?? process.env.NPM_CONFIG_FETCH_RETRY_MINTIMEOUT ?? '20000',
  npm_config_fetch_retry_maxtimeout:
    process.env.npm_config_fetch_retry_maxtimeout ?? process.env.NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT ?? '120000',
  npm_config_prefer_offline:
    process.env.npm_config_prefer_offline ?? process.env.NPM_CONFIG_PREFER_OFFLINE ?? 'true',
  npm_config_audit:
    process.env.npm_config_audit ?? process.env.NPM_CONFIG_AUDIT ?? 'false',
  npm_config_fund:
    process.env.npm_config_fund ?? process.env.NPM_CONFIG_FUND ?? 'false'
}

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  console.log(`[ci] npm ci attempt ${attempt}/${maxAttempts}`)

  const result = spawnSync(npmCommand, ['ci'], {
    stdio: 'inherit',
    env: npmEnv,
    shell: useShell
  })

  if (result.error) {
    console.error(`[ci] npm ci failed to start: ${result.error.message}`)
  }

  if (result.signal) {
    console.error(`[ci] npm ci terminated by signal ${result.signal}`)
  }

  if (result.status === 0) {
    process.exit(0)
  }

  if (attempt === maxAttempts) {
    process.exit(result.status ?? 1)
  }

  const delayMs = retryDelayMs * attempt
  console.warn(
    `[ci] npm ci failed with exit code ${result.status ?? 'unknown'}. Retrying in ${delayMs}ms...`
  )
  await sleep(delayMs)
}
