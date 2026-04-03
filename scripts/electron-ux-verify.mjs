#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import net from 'node:net'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { waitForPageTarget, parseCommonArgs } from './lib/cdp-client.mjs'
import { runElectronUxSmoke } from './lib/electron-ux-smoke-checks.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')
const require = createRequire(import.meta.url)
const electronBinary = require('electron')

function usage() {
  console.log(`Usage:
  node scripts/electron-ux-verify.mjs [--port 9234] [--match RxFHIR] [--skip-build]

Behavior:
  1. Runs a production build unless --skip-build is set
  2. Launches a fresh Electron instance with remote debugging
  3. Waits for the renderer target to become reachable
  4. Runs the Electron UX smoke checks
  5. Closes the launched test instance
`)
}

const rawArgs = process.argv.slice(2)
const { port: parsedPort, match, rest } = parseCommonArgs(rawArgs)
const port = rawArgs.includes('--port') ? parsedPort : 9234
const skipBuild = rest.includes('--skip-build')

if (rest.includes('--help') || rest.includes('-h')) {
  usage()
  process.exit(0)
}

function spawnWithCleanElectronEnv(command, args, options = {}) {
  const env = {
    ...process.env
  }

  delete env.ELECTRON_RUN_AS_NODE

  return spawn(command, args, {
    cwd: projectRoot,
    env,
    ...options
  })
}

function isPortInUse(portNumber) {
  return new Promise((resolve) => {
    const socket = net.connect({ port: portNumber, host: '127.0.0.1' })

    socket.once('connect', () => {
      socket.end()
      resolve(true)
    })

    socket.once('error', () => {
      resolve(false)
    })
  })
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawnWithCleanElectronEnv(command, args, { stdio: 'inherit' })

    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`${command} ${args.join(' ')} exited with signal ${signal}.`))
        return
      }

      if (code !== 0) {
        reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}.`))
        return
      }

      resolve()
    })
  })
}

function waitForExit(child, timeoutMs = 5000) {
  return new Promise((resolve) => {
    let settled = false

    const finish = () => {
      if (settled) return
      settled = true
      resolve()
    }

    child.once('exit', finish)

    setTimeout(() => {
      if (settled) return
      try {
        child.kill('SIGKILL')
      } catch {
        // Ignore cleanup failures.
      }
      finish()
    }, timeoutMs)
  })
}

async function main() {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

  if (await isPortInUse(port)) {
    throw new Error(`Port ${port} is already in use. Choose another port with --port.`)
  }

  if (!skipBuild) {
    console.log('[ux:electron:verify] Building project...')
    await runCommand(npmCommand, ['run', 'build'])
  }

  console.log(`[ux:electron:verify] Launching Electron on port ${port}...`)
  const electronChild = spawnWithCleanElectronEnv(
    electronBinary,
    ['.', `--remote-debugging-port=${port}`],
    {
      stdio: 'inherit'
    }
  )

  let childExitedEarly = false
  electronChild.once('exit', () => {
    childExitedEarly = true
  })

  try {
    await waitForPageTarget({ port, match, timeoutMs: 15000 })

    if (childExitedEarly) {
      throw new Error('Electron exited before the renderer target became stable.')
    }

    const checks = await runElectronUxSmoke({ port, match })

    let failed = 0
    console.log('[ux:electron:verify] Electron UX smoke results:\n')

    for (const check of checks) {
      if (check.pass) {
        console.log(`✓ ${check.label}`)
        continue
      }

      failed += 1
      console.error(`✗ ${check.label}`)
      console.error(`  details: ${JSON.stringify(check.details)}`)
    }

    if (failed > 0) {
      throw new Error(`${failed} Electron UX smoke check(s) failed.`)
    }

    console.log(`\n[ux:electron:verify] ${checks.length} checks passed.`)
  } finally {
    try {
      electronChild.kill('SIGTERM')
    } catch {
      // Ignore cleanup failures.
    }
    await waitForExit(electronChild)
  }
}

try {
  await main()
} catch (error) {
  console.error(`[ux:electron:verify] ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
