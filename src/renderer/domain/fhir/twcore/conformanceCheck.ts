/**
 * Pre-submit conformance checks for a TW Core competition bundle, surfaced in the
 * Converter UI so the upload rules can be confirmed (and screenshotted) in-app
 * instead of via an external script:
 *  - Bundle.type = collection
 *  - Bundle.meta.profile present
 *  - every entry resource carries a meta.profile
 *  - resource counts/types, optionally compared against the case-summary totals
 */

export interface CountDiffRow {
  type: string
  expected: number
  actual: number
  ok: boolean
}

export interface ConformanceResult {
  bundleType?: string
  isCollection: boolean
  bundleHasProfile: boolean
  /** Resource types whose resource.meta.profile is missing or empty. */
  entriesMissingProfile: string[]
  /** Count per resourceType across all entries. */
  counts: Record<string, number>
  /** Per-type comparison against expected counts (only when expectedCounts given). */
  countDiff?: CountDiffRow[]
  allPass: boolean
}

function hasProfile(meta: fhir4.Meta | undefined): boolean {
  return Array.isArray(meta?.profile)
    && meta.profile.length > 0
    && meta.profile.every((p) => typeof p === 'string' && p.startsWith('http'))
}

/**
 * Parse a forgiving "case summary" counts string such as
 * `Patient:1, Encounter:8` or one entry per line into a map. Unparseable
 * fragments are ignored.
 */
export function parseExpectedCounts(text: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const part of text.split(/[\n,;]+/)) {
    const m = part.trim().match(/^([A-Za-z]+)\s*[:x=×*]\s*(\d+)$/)
    if (m) out[m[1]] = Number.parseInt(m[2], 10)
  }
  return out
}

export function checkBundleConformance(
  bundle: fhir4.Bundle,
  expectedCounts?: Record<string, number>
): ConformanceResult {
  const isCollection = bundle.type === 'collection'
  const bundleHasProfile = hasProfile(bundle.meta)

  const counts: Record<string, number> = {}
  const entriesMissingProfile: string[] = []
  for (const entry of bundle.entry ?? []) {
    const resource = entry.resource
    if (!resource) continue
    const type = resource.resourceType
    counts[type] = (counts[type] ?? 0) + 1
    if (!hasProfile(resource.meta)) entriesMissingProfile.push(type)
  }

  let countDiff: CountDiffRow[] | undefined
  if (expectedCounts && Object.keys(expectedCounts).length > 0) {
    // Compare only the types the user listed — unlisted types are "don't care",
    // so a partial case-summary list never flags the rest as failures.
    countDiff = Object.keys(expectedCounts).sort().map((type) => {
      const expected = expectedCounts[type]
      const actual = counts[type] ?? 0
      return { type, expected, actual, ok: expected === actual }
    })
  }

  const countsOk = !countDiff || countDiff.every((r) => r.ok)
  const allPass = isCollection
    && bundleHasProfile
    && entriesMissingProfile.length === 0
    && countsOk

  return {
    bundleType: bundle.type,
    isCollection,
    bundleHasProfile,
    entriesMissingProfile,
    counts,
    countDiff,
    allPass
  }
}
