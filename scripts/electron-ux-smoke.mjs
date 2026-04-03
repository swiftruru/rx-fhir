#!/usr/bin/env node

import { parseCommonArgs } from './lib/cdp-client.mjs'
import { runElectronUxSmoke } from './lib/electron-ux-smoke-checks.mjs'

const { port, match, rest } = parseCommonArgs(process.argv.slice(2))
if (rest.includes('--help') || rest.includes('-h')) {
  console.log(`Usage:
  node scripts/electron-ux-smoke.mjs [--port 9233] [--match RxFHIR]

Notes:
  - Requires a running Electron instance with remote debugging enabled.
  - Default target: port 9233, match "RxFHIR".
`)
  process.exit(0)
}

let checks = []

try {
  checks = await runElectronUxSmoke({ port, match })
} catch (error) {
  console.error(`[ux:electron:smoke] ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}

let failures = 0

console.log('[ux:electron:smoke] Running Electron UX smoke checks...\n')

for (const check of checks) {
  if (check.pass) {
    console.log(`✓ ${check.label}`)
    continue
  }

  failures += 1
  console.error(`✗ ${check.label}`)
  console.error(`  details: ${JSON.stringify(check.details)}`)
}

if (failures > 0) {
  console.error(`\n[ux:electron:smoke] ${failures} check(s) failed.`)
  process.exit(1)
}

console.log(`\n[ux:electron:smoke] ${checks.length} checks passed.`)
