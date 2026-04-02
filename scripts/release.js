#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')
const packageJsonPath = join(projectRoot, 'package.json')
const readmePath = join(projectRoot, 'README.md')
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const DEFAULT_BRANCHES = new Set(['main', 'master'])
const TEMPLATE_TODO = 'TODO: replace this line before releasing.'

function usage() {
  console.log(`Usage:
  npm run release -- <patch|minor|major|X.Y.Z> [options]

Options:
  --notes-file <path>   Copy release notes into changelog/vX.Y.Z.md before tagging
                        Use "-" to read notes from stdin.
  --allow-branch <name> Allow releasing from a branch other than main/master
  --skip-checks         Skip "npm run typecheck"
  --dry-run             Print the planned actions without changing files
  --help, -h            Show this message

Examples:
  npm run release -- patch
  npm run release -- 1.2.0
  npm run release -- patch --notes-file ./notes/v1.2.0.md
`)
}

function fail(message) {
  console.error(`[release] ${message}`)
  process.exit(1)
}

function git(args) {
  try {
    return execFileSync('git', args, {
      cwd: projectRoot,
      encoding: 'utf8'
    }).trim()
  } catch (error) {
    fail(`git ${args.join(' ')} failed.`)
  }
}

function gitLines(args) {
  const output = git(args)
  return output ? output.split('\n').filter(Boolean) : []
}

function run(command, args, options = {}) {
  console.log(`[release] ${command} ${args.join(' ')}`)

  if (options.dryRun) {
    return
  }

  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: options.shell ?? false
  })

  if (result.status !== 0) {
    fail(`${command} ${args.join(' ')} failed with exit code ${result.status ?? 'unknown'}.`)
  }
}

function parseArgs(argv) {
  const parsed = {
    positional: [],
    notesFile: null,
    allowBranch: null,
    skipChecks: false,
    dryRun: false
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--help' || arg === '-h') {
      usage()
      process.exit(0)
    }

    if (arg === '--notes-file') {
      const value = argv[index + 1]
      if (!value) {
        fail('Missing value for --notes-file.')
      }
      parsed.notesFile = value
      index += 1
      continue
    }

    if (arg === '--allow-branch') {
      const value = argv[index + 1]
      if (!value) {
        fail('Missing value for --allow-branch.')
      }
      parsed.allowBranch = value
      index += 1
      continue
    }

    if (arg === '--skip-checks') {
      parsed.skipChecks = true
      continue
    }

    if (arg === '--dry-run') {
      parsed.dryRun = true
      continue
    }

    if (arg.startsWith('--')) {
      fail(`Unknown option: ${arg}`)
    }

    parsed.positional.push(arg)
  }

  if (parsed.positional.length !== 1) {
    usage()
    process.exit(parsed.positional.length === 0 ? 1 : 0)
  }

  return parsed
}

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
  if (!match) {
    fail(`Unsupported version format: ${version}`)
  }

  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10)
  }
}

function resolveTargetVersion(currentVersion, releaseArg) {
  if (/^\d+\.\d+\.\d+$/.test(releaseArg)) {
    return releaseArg
  }

  const current = parseVersion(currentVersion)

  if (releaseArg === 'patch') {
    return `${current.major}.${current.minor}.${current.patch + 1}`
  }

  if (releaseArg === 'minor') {
    return `${current.major}.${current.minor + 1}.0`
  }

  if (releaseArg === 'major') {
    return `${current.major + 1}.0.0`
  }

  fail(`Unsupported release argument: ${releaseArg}`)
}

function getDirtyPaths() {
  return new Set([
    ...gitLines(['diff', '--name-only']),
    ...gitLines(['diff', '--cached', '--name-only']),
    ...gitLines(['ls-files', '--others', '--exclude-standard'])
  ])
}

function readNotesFile(notesFile) {
  if (notesFile === '-') {
    return readFileSync(0, 'utf8')
  }

  return readFileSync(resolve(process.cwd(), notesFile), 'utf8')
}

function changelogTemplate(versionTag) {
  return `# RxFHIR ${versionTag}

## Added

- ${TEMPLATE_TODO}

## Changed

- ${TEMPLATE_TODO}

## Fixed

- ${TEMPLATE_TODO}
`
}

function validateChangelog(changelogPath) {
  if (!existsSync(changelogPath)) {
    fail(`Missing changelog file: ${relative(projectRoot, changelogPath)}`)
  }

  const content = readFileSync(changelogPath, 'utf8').trim()
  if (!content) {
    fail(`Changelog is empty: ${relative(projectRoot, changelogPath)}`)
  }

  if (content.includes(TEMPLATE_TODO) || content.includes('vX.Y.Z')) {
    fail(
      `Changelog still contains placeholder content: ${relative(projectRoot, changelogPath)}`
    )
  }
}

function updateReadmeVersion(version) {
  const readme = readFileSync(readmePath, 'utf8')
  const updated = readme.replace(/version-[^-"]+-/, `version-${version}-`)

  if (updated === readme) {
    fail('Could not update the README version badge.')
  }

  writeFileSync(readmePath, updated, 'utf8')
}

function maybeOpenEditor(changelogRelativePath) {
  const editor = process.env.VISUAL || process.env.EDITOR

  if (!editor) {
    fail(
      `Created ${changelogRelativePath}. Set $EDITOR or rerun with --notes-file to finish the release.`
    )
  }

  console.log(`[release] Opening ${changelogRelativePath} in ${editor}`)
  run(editor, [changelogRelativePath], { shell: true })
}

const args = parseArgs(process.argv.slice(2))
const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
const currentVersion = pkg.version
const targetVersion = resolveTargetVersion(currentVersion, args.positional[0])

if (targetVersion === currentVersion) {
  fail(`Target version ${targetVersion} matches the current package version.`)
}

const currentBranch = git(['branch', '--show-current'])
const allowedBranch = args.allowBranch

if (allowedBranch) {
  if (currentBranch !== allowedBranch) {
    fail(`Current branch is ${currentBranch}. Release is limited to ${allowedBranch}.`)
  }
} else if (!DEFAULT_BRANCHES.has(currentBranch)) {
  fail(`Current branch is ${currentBranch}. Release from main/master or pass --allow-branch.`)
}

const versionTag = `v${targetVersion}`
const changelogRelativePath = `changelog/${versionTag}.md`
const changelogPath = join(projectRoot, changelogRelativePath)
const dirtyPaths = getDirtyPaths()
const disallowedDirtyPaths = [...dirtyPaths].filter((path) => path !== changelogRelativePath)

if (disallowedDirtyPaths.length > 0) {
  fail(
    `Working tree must be clean before releasing. Commit or stash: ${disallowedDirtyPaths.join(', ')}`
  )
}

if (git(['tag', '--list', versionTag])) {
  fail(`Tag already exists locally: ${versionTag}`)
}

let notesSource = 'existing changelog'
let notesContent = null

if (args.notesFile) {
  notesSource = args.notesFile === '-' ? 'stdin' : args.notesFile
  notesContent = readNotesFile(args.notesFile)
} else if (!existsSync(changelogPath)) {
  notesSource = 'generated template'
}

if (args.dryRun) {
  console.log(`[release] Current version: ${currentVersion}`)
  console.log(`[release] Target version: ${targetVersion}`)
  console.log(`[release] Branch: ${currentBranch}`)
  console.log(`[release] Changelog source: ${notesSource}`)
  if (!args.skipChecks) {
    console.log('[release] Would run npm run typecheck')
  }
  console.log(`[release] Would run npm version ${targetVersion} --no-git-tag-version`)
  console.log(`[release] Would update README badge to ${targetVersion}`)
  console.log(`[release] Would commit: Release ${versionTag}`)
  console.log(`[release] Would create tag: ${versionTag}`)
  console.log(`[release] Would push branch ${currentBranch} with --follow-tags`)
  process.exit(0)
}

if (notesContent !== null) {
  writeFileSync(changelogPath, notesContent.trimEnd() + '\n', 'utf8')
  console.log(`[release] Wrote ${changelogRelativePath} from ${notesSource}`)
} else if (!existsSync(changelogPath)) {
  writeFileSync(changelogPath, changelogTemplate(versionTag), 'utf8')
  console.log(`[release] Created ${changelogRelativePath}`)
  maybeOpenEditor(changelogRelativePath)
}

validateChangelog(changelogPath)

if (!args.skipChecks) {
  run(npmCommand, ['run', 'typecheck'])
}

run(npmCommand, ['version', targetVersion, '--no-git-tag-version'])
updateReadmeVersion(targetVersion)

run('git', ['add', 'package.json', 'package-lock.json', 'README.md', changelogRelativePath])
run('git', ['commit', '-m', `Release ${versionTag}`])
run('git', ['tag', '-a', versionTag, '-m', `Release ${versionTag}`])
run('git', ['push', 'origin', currentBranch, '--follow-tags'])
