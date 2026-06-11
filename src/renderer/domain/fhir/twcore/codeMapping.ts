/**
 * 院內碼 → 國際碼對照表。用轉換時產生的 provenance（哪個資源、哪個欄位、用了哪個
 * 競賽碼）對回 COMPETITION_CODE_MAP，列出每個院內碼被轉成的標準碼。
 * App（Converter 面板）與 CLI（聯測工具）共用此邏輯。
 */
import { COMPETITION_CODE_MAP, type ProvenanceEntry } from './competitionConverter'

export interface CodeMapRow {
  resourceType: string
  field: string
  category: string
  /** 院內碼，例如 Cond-0019。 */
  competitionCode: string
  /** 標準碼系統（SNOMED/LOINC/…），未對應時 undefined。 */
  system?: string
  /** 國際碼，未對應時 undefined（代表以 .text 帶過）。 */
  standardCode?: string
  mapped: boolean
}

export function buildCodeMappingTable(provenance: ProvenanceEntry[]): CodeMapRow[] {
  const rows: CodeMapRow[] = []
  const seen = new Set<string>()
  for (const p of provenance) {
    if (!p.code) continue
    const key = `${p.category}|${p.code}`
    if (seen.has(key)) continue
    seen.add(key)
    const mapped = COMPETITION_CODE_MAP[p.category]?.[p.code]
    rows.push({
      resourceType: p.resourceType,
      field: p.field,
      category: p.category,
      competitionCode: p.code,
      system: mapped?.system,
      standardCode: mapped?.code,
      mapped: Boolean(mapped)
    })
  }
  return rows.sort((a, b) => a.category.localeCompare(b.category) || a.competitionCode.localeCompare(b.competitionCode))
}
