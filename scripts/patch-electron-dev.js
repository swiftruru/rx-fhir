#!/usr/bin/env node
/**
 * patch-electron-dev.js
 * Patches the local Electron.app bundle so that in dev mode
 * the menu bar, dock, and About panel all show "RxFHIR" instead of "Electron".
 *
 * Runs automatically via the "postinstall" npm script.
 */

import { readFileSync, writeFileSync, existsSync, renameSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')
const APP_NAME = 'RxFHIR'

const DIST_DIR = join(projectRoot, 'node_modules/electron/dist')
const ELECTRON_APP = join(DIST_DIR, 'Electron.app')
const RENAMED_APP  = join(DIST_DIR, `${APP_NAME}.app`)
const PATH_TXT     = join(projectRoot, 'node_modules/electron/path.txt')

// ── 1. Rename Electron.app → RxFHIR.app (Dock label comes from folder name) ──
if (existsSync(ELECTRON_APP)) {
  renameSync(ELECTRON_APP, RENAMED_APP)
  console.log(`[patch] ✓ Renamed Electron.app → ${APP_NAME}.app`)
} else if (existsSync(RENAMED_APP)) {
  console.log(`[patch] ✓ ${APP_NAME}.app already in place`)
} else {
  console.warn('[patch] ✗ Electron.app not found — skipping')
  process.exit(0)
}

// ── 2. Update path.txt so electron package finds the binary ──
const newBinaryPath = `${APP_NAME}.app/Contents/MacOS/Electron`
writeFileSync(PATH_TXT, newBinaryPath, 'utf-8')
console.log(`[patch] ✓ path.txt → ${newBinaryPath}`)

// ── 3. Patch Info.plist (CFBundleName + CFBundleDisplayName) ──
const PLIST_PATH = join(RENAMED_APP, 'Contents/Info.plist')
let plist = readFileSync(PLIST_PATH, 'utf-8')
plist = plist
  .replace(
    /<key>CFBundleDisplayName<\/key>\s*<string>.*?<\/string>/,
    `<key>CFBundleDisplayName</key>\n\t<string>${APP_NAME}</string>`
  )
  .replace(
    /<key>CFBundleName<\/key>\s*<string>.*?<\/string>/,
    `<key>CFBundleName</key>\n\t<string>${APP_NAME}</string>`
  )
writeFileSync(PLIST_PATH, plist, 'utf-8')
console.log(`[patch] ✓ Info.plist → CFBundleName = "${APP_NAME}"`)

// ── 4. Replace electron.icns with RxFHIR icon ──
if (process.platform !== 'darwin') {
  console.log('[patch] Non-macOS: skipping icon patch.')
  process.exit(0)
}

const ICON_SRC  = join(projectRoot, 'build/icon.png')
const ICNS_DEST = join(RENAMED_APP, 'Contents/Resources/electron.icns')

if (!existsSync(ICON_SRC)) {
  console.warn('[patch] build/icon.png not found — skipping icon patch.')
  process.exit(0)
}

try {
  const iconsetDir = join(projectRoot, 'build/icon.iconset')
  execSync(`mkdir -p "${iconsetDir}"`)

  const sizes = [16, 32, 64, 128, 256, 512]
  for (const size of sizes) {
    execSync(`sips -z ${size} ${size} "${ICON_SRC}" --out "${iconsetDir}/icon_${size}x${size}.png"`, { stdio: 'ignore' })
    execSync(`sips -z ${size * 2} ${size * 2} "${ICON_SRC}" --out "${iconsetDir}/icon_${size}x${size}@2x.png"`, { stdio: 'ignore' })
  }

  execSync(`iconutil -c icns "${iconsetDir}" -o "${ICNS_DEST}"`)
  execSync(`rm -rf "${iconsetDir}"`)
  console.log('[patch] ✓ electron.icns → replaced with RxFHIR icon')
} catch (e) {
  console.warn(`[patch] Icon patch failed: ${e.message}`)
}
