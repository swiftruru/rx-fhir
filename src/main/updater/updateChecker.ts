import { request } from 'node:https'

const GITHUB_API_URL = 'https://api.github.com/repos/swiftruru/rx-fhir/releases/latest'
export const GITHUB_RELEASES_PAGE = 'https://github.com/swiftruru/rx-fhir/releases'

const REQUEST_TIMEOUT_MS = 8_000

export type UpdateStatus = 'up-to-date' | 'update-available' | 'check-failed'

export interface UpdateCheckResult {
  status: UpdateStatus
  currentVersion: string
  latestVersion?: string
  releaseUrl?: string
  releaseName?: string
  error?: string
}

interface GitHubRelease {
  tag_name: string
  name: string
  html_url: string
  prerelease: boolean
  draft: boolean
}

/**
 * Compare two semver strings (major.minor.patch).
 * Returns true if `candidate` is newer than `current`.
 */
function isNewer(current: string, candidate: string): boolean {
  const parse = (v: string): number[] =>
    v.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0)

  const [cMaj, cMin, cPat] = parse(current)
  const [lMaj, lMin, lPat] = parse(candidate)

  if (lMaj !== cMaj) return lMaj > cMaj
  if (lMin !== cMin) return lMin > cMin
  return lPat > cPat
}

/**
 * Fetch the latest GitHub release via the public API.
 * No auth token required for public repositories.
 */
async function fetchLatestRelease(userAgent: string): Promise<GitHubRelease> {
  return new Promise((resolve, reject) => {
    const req = request(
      GITHUB_API_URL,
      {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'application/vnd.github.v3+json'
        }
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8')
          if (res.statusCode === 404) {
            reject(new Error('No releases found on GitHub'))
            return
          }
          if (res.statusCode !== 200) {
            reject(new Error(`GitHub API responded with status ${String(res.statusCode)}`))
            return
          }
          try {
            resolve(JSON.parse(body) as GitHubRelease)
          } catch {
            reject(new Error('Failed to parse GitHub API response'))
          }
        })
        res.on('error', reject)
      }
    )

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy()
      reject(new Error('Update check timed out'))
    })

    req.on('error', reject)
    req.end()
  })
}

/**
 * Check GitHub Releases for a newer version of the app.
 *
 * @param currentVersion - The version string from app.getVersion()
 */
export async function checkForUpdates(currentVersion: string): Promise<UpdateCheckResult> {
  try {
    const release = await fetchLatestRelease(`RxFHIR/${currentVersion}`)

    // Skip drafts and pre-releases
    if (release.draft || release.prerelease) {
      return { status: 'up-to-date', currentVersion }
    }

    const latestVersion = release.tag_name.replace(/^v/, '')

    if (isNewer(currentVersion, latestVersion)) {
      return {
        status: 'update-available',
        currentVersion,
        latestVersion,
        releaseUrl: release.html_url,
        releaseName: release.name || `v${latestVersion}`
      }
    }

    return { status: 'up-to-date', currentVersion, latestVersion }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[updater] checkForUpdates failed:', message)
    return { status: 'check-failed', currentVersion, error: message }
  }
}
