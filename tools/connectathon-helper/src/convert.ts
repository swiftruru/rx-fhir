/**
 * 重用 RxFHIR 的競賽轉換器，把題目來源 JSON 轉成 twcore bundle（含 counts 與 provenance）。
 * UUID 改用 Node 的 randomUUID 注入，避免依賴瀏覽器全域 crypto。
 */
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import {
  convertCompetitionProblem,
  type CompetitionProblem,
  type ProvenanceEntry
} from '../../../src/renderer/domain/fhir/twcore/competitionConverter.js'

export type BundleType = 'collection' | 'transaction'

export interface ConvertOutput {
  bundle: fhir4.Bundle
  counts: Record<string, number>
  provenance: ProvenanceEntry[]
}

export function isBundle(json: unknown): json is fhir4.Bundle {
  return !!json && typeof json === 'object' && (json as { resourceType?: string }).resourceType === 'Bundle'
}

export function convertProblem(problem: CompetitionProblem, bundleType: BundleType = 'collection'): ConvertOutput {
  const { bundle, counts, provenance } = convertCompetitionProblem(problem, { bundleType, uuid: randomUUID })
  return { bundle, counts, provenance }
}

export interface LoadedInput {
  /** 轉換或載入後的 bundle。 */
  bundle: fhir4.Bundle
  counts?: Record<string, number>
  provenance?: ProvenanceEntry[]
  /** true 代表輸入本來就是 bundle（沒有 provenance／院內碼對照可用）。 */
  fromBundle: boolean
}

/** 讀一個 JSON 檔：若是 Bundle 直接用；若是題目來源則轉換。 */
export function loadInput(filePath: string, bundleType: BundleType = 'collection'): LoadedInput {
  const json = JSON.parse(readFileSync(filePath, 'utf8')) as unknown
  if (isBundle(json)) {
    const counts: Record<string, number> = {}
    for (const e of json.entry ?? []) {
      const t = e.resource?.resourceType
      if (t) counts[t] = (counts[t] ?? 0) + 1
    }
    return { bundle: json, counts, fromBundle: true }
  }
  const out = convertProblem(json as CompetitionProblem, bundleType)
  return { ...out, fromBundle: false }
}
