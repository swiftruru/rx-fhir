#!/usr/bin/env node

import { evaluateExpression, parseCommonArgs } from './lib/cdp-client.mjs'

function usage() {
  console.log(`Usage:
  node scripts/electron-cdp-eval.mjs [--port 9233] [--match RxFHIR] "<expression>"

Examples:
  npm run cdp:eval -- "location.hash"
  npm run cdp:eval -- --port 9233 "Object.keys(window.rxfhir)"
`)
}

const { port, match, rest } = parseCommonArgs(process.argv.slice(2))
const expression = rest.join(' ').trim()

if (!expression || expression === '--help' || expression === '-h') {
  usage()
  process.exit(expression ? 0 : 1)
}

try {
  const result = await evaluateExpression({ port, match, expression })
  console.log(JSON.stringify(result, null, 2))
} catch (error) {
  console.error(`[cdp:eval] ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
