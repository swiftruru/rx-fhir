#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const electronVitePackageJson = require.resolve('electron-vite/package.json')
const electronViteBin = join(dirname(electronVitePackageJson), 'bin/electron-vite.js')
const args = process.argv.slice(2)

const env = {
  ...process.env
}

delete env.ELECTRON_RUN_AS_NODE

const child = spawn(process.execPath, [electronViteBin, ...args], {
  stdio: 'inherit',
  env
})

child.on('error', (error) => {
  console.error('[run-electron-vite] Failed to launch electron-vite.', error)
  process.exit(1)
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 1)
})
