import type { CodeOverrides, ProvenanceEntry } from './competitionConverter'

/**
 * Learn competition-code → standard-coding mappings from a pasted Gazelle error
 * report, correlated with the converter's provenance. Lets each problem teach the
 * converter the codes it didn't know, accumulating a local dictionary over time.
 */

const STORAGE_KEY = 'rxfhir-twcore-code-overrides'

export function getCodeOverrides(): CodeOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CodeOverrides) : {}
  } catch {
    return {}
  }
}

export function saveCodeOverrides(overrides: CodeOverrides): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  } catch {
    // ignore storage failures
  }
}

export function clearCodeOverrides(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore storage failures
  }
}

export function countOverrides(overrides: CodeOverrides): number {
  return Object.values(overrides).reduce((sum, codes) => sum + Object.keys(codes).length, 0)
}

export interface LearnedMapping {
  category: string
  /** Competition code, e.g. 'Cond-0019'. */
  code: string
  system: string
  /** Standard target code, e.g. '22298006'. */
  target: string
}

/**
 * Extracts new mappings from the Gazelle error text using the provenance of the
 * bundle that produced those errors. Handles two error shapes:
 *  - reference: "Expected 'Condition/http://snomed.info/sct|22298006', got 'urn:uuid:…'"
 *  - coding:    "X.field.coding[0].system Expected '…'" + "…coding[0].code Expected '…'"
 */
export function learnFromGazelleErrors(errorText: string, provenance: ProvenanceEntry[]): LearnedMapping[] {
  const learned: LearnedMapping[] = []
  const seen = new Set<string>()
  const add = (category?: string, code?: string, system?: string, target?: string): void => {
    if (!category || !code || !system || !target) return
    const key = `${category}|${code}`
    if (seen.has(key)) return
    seen.add(key)
    learned.push({ category, code, system, target })
  }

  // Form A — reference errors point at a resource by urn:uuid we can trace.
  const refRe = /Expected\s+'([A-Za-z]+)\/([^|']+)\|([^']+?)\s*',?\s*got\s+'(urn:uuid:[0-9a-fA-F-]+)'/g
  for (const m of errorText.matchAll(refRe)) {
    const [, type, system, value, gotUrn] = m
    const prov = provenance.find((p) => p.fullUrl === gotUrn && p.resourceType === type)
      ?? provenance.find((p) => p.fullUrl === gotUrn)
    if (prov) add(prov.category, prov.code, system.trim(), value.trim())
  }

  // Form B — paired coding system/code "field is missing" errors.
  const lines = errorText.split('\n').map((l) => l.trim()).filter(Boolean)
  const slots = new Map<string, { resourceType: string; field: string; system?: string; code?: string }>()
  for (let i = 0; i < lines.length - 1; i++) {
    const codingMatch = lines[i].match(/^([A-Za-z]+)\.(.+?)\.coding\[\d+\]\.(system|code)$/)
    if (!codingMatch) continue
    const expectedMatch = lines[i + 1].match(/^Expected\s+'([^']+)'/)
    if (!expectedMatch) continue
    const resourceType = codingMatch[1]
    const field = codingMatch[2].replace(/\[\d+\]/g, '')
    const slotKey = `${resourceType}.${field}`
    const slot = slots.get(slotKey) ?? { resourceType, field }
    if (codingMatch[3] === 'system') slot.system = expectedMatch[1]
    else slot.code = expectedMatch[1]
    slots.set(slotKey, slot)
  }
  for (const slot of slots.values()) {
    const prov = provenance.find((p) => p.resourceType === slot.resourceType && slot.field.startsWith(p.field))
    if (prov) add(prov.category, prov.code, slot.system, slot.code)
  }

  // Form C — "Type/system|code" + "Resource not found" for non-referenced
  // resources (e.g. Procedure). Only learn when exactly one candidate resource of
  // that type carries a primary code, to avoid ambiguous guesses.
  for (let i = 0; i < lines.length - 1; i++) {
    if (!/^Resource not found in submission$/i.test(lines[i + 1])) continue
    const m = lines[i].match(/^([A-Za-z]+)\/([^|]+)\|(.+)$/)
    if (!m) continue
    const [, type, system, code] = m
    const candidates = provenance.filter((p) => p.resourceType === type && p.field === 'code')
    if (candidates.length === 1) add(candidates[0].category, candidates[0].code, system.trim(), code.trim())
  }

  return learned
}

export function mergeOverrides(base: CodeOverrides, learned: LearnedMapping[]): CodeOverrides {
  const next: CodeOverrides = JSON.parse(JSON.stringify(base)) as CodeOverrides
  for (const item of learned) {
    next[item.category] = next[item.category] ?? {}
    next[item.category][item.code] = { system: item.system, code: item.target }
  }
  return next
}
