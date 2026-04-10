#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')

function readProjectFile(relativePath) {
  return readFileSync(join(projectRoot, relativePath), 'utf8')
}

function loadJson(relativePath) {
  return JSON.parse(readProjectFile(relativePath))
}

function hasPath(source, path) {
  let current = source
  for (const key of path) {
    if (!current || typeof current !== 'object' || !(key in current)) {
      return false
    }
    current = current[key]
  }
  return true
}

function includesAll(source, patterns) {
  return patterns.every((pattern) => pattern.test(source))
}

const appSource = readProjectFile('src/renderer/app/AppShell.tsx')
const resourceStepperSource = readProjectFile('src/renderer/features/creator/ResourceStepper.tsx')
const resultListSource = readProjectFile('src/renderer/features/consumer/ResultList.tsx')
const searchFormSource = readProjectFile('src/renderer/features/consumer/SearchForm.tsx')
const jsonViewerSource = readProjectFile('src/renderer/shared/components/JsonViewer.tsx')
const settingsSource = readProjectFile('src/renderer/features/settings/SettingsPage.tsx')
const statusBarSource = readProjectFile('src/renderer/app/components/StatusBar.tsx')
const zhCommon = loadJson('src/renderer/i18n/locales/zh-TW/common.json')
const enCommon = loadJson('src/renderer/i18n/locales/en/common.json')
const zhSettings = loadJson('src/renderer/i18n/locales/zh-TW/settings.json')
const enSettings = loadJson('src/renderer/i18n/locales/en/settings.json')

const checks = [
  {
    label: 'App shell keeps skip link, screen reader announcer, and labeled main landmark',
    pass: includesAll(appSource, [
      /ScreenReaderAnnouncer/,
      /accessibility\.skipToMain/,
      /id="app-main"/,
      /aria-label=\{tc\('accessibility\.mainContent'\)\}/
    ])
  },
  {
    label: 'Status bar remains labeled for assistive tech',
    pass: /aria-label=\{tc\('accessibility\.statusBar'\)\}/.test(statusBarSource)
  },
  {
    label: 'Creator stepper keeps current-step and live progress semantics',
    pass: includesAll(resourceStepperSource, [
      /aria-current=\{active \? 'step' : undefined\}/,
      /role="status"/,
      /aria-describedby="creator-stepper-progress creator-stepper-shortcuts"/
    ])
  },
  {
    label: 'Consumer results keep listbox semantics and selection state',
    pass: includesAll(resultListSource, [
      /role="listbox"/,
      /role="option"/,
      /aria-selected=\{isSelected\}/,
      /data-result-id=\{summary\.id\}/
    ])
  },
  {
    label: 'Consumer search form preserves field-level accessibility wiring',
    pass: includesAll(searchFormSource, [
      /aria-invalid=/,
      /aria-describedby=/,
      /noValidate/
    ])
  },
  {
    label: 'JsonViewer keeps summary and raw view modes',
    pass: includesAll(jsonViewerSource, [
      /defaultViewMode\?: 'summary' \| 'raw'/,
      /jsonViewer\.viewModeLabel/,
      /jsonViewer\.summary/,
      /jsonViewer\.raw/
    ])
  },
  {
    label: 'Settings page keeps accessibility preference groups for motion, text scale, zoom, and focus',
    pass: includesAll(settingsSource, [
      /accessibility\.groupLabel/,
      /accessibility\.textScale\.groupLabel/,
      /accessibility\.zoom\.groupLabel/,
      /accessibility\.focus\.groupLabel/
    ])
  },
  {
    label: 'Common locale keeps accessibility and jsonViewer translation groups',
    pass:
      hasPath(zhCommon, ['accessibility', 'skipToMain']) &&
      hasPath(enCommon, ['accessibility', 'skipToMain']) &&
      hasPath(zhCommon, ['jsonViewer', 'summary']) &&
      hasPath(enCommon, ['jsonViewer', 'summary'])
  },
  {
    label: 'Settings locale keeps text scale, zoom, and focus labels',
    pass:
      hasPath(zhSettings, ['accessibility', 'textScale', 'title']) &&
      hasPath(enSettings, ['accessibility', 'textScale', 'title']) &&
      hasPath(zhSettings, ['accessibility', 'zoom', 'title']) &&
      hasPath(enSettings, ['accessibility', 'zoom', 'title']) &&
      hasPath(zhSettings, ['accessibility', 'focus', 'title']) &&
      hasPath(enSettings, ['accessibility', 'focus', 'title'])
  }
]

let failed = 0

console.log('[a11y:check] Running accessibility smoke checks...\n')

for (const check of checks) {
  if (check.pass) {
    console.log(`✓ ${check.label}`)
    continue
  }

  failed += 1
  console.error(`✗ ${check.label}`)
}

if (failed > 0) {
  console.error(`\n[a11y:check] ${failed} check(s) failed.`)
  process.exit(1)
}

console.log(`\n[a11y:check] ${checks.length} checks passed.`)
