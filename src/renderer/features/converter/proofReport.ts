/**
 * 產生「單一案例」的證明報告 HTML：數量、合規檢查、院內碼對照、送出結果。
 * 存成 .html 後可直接開啟並用瀏覽器列印成 PDF（不需額外 IPC）。
 */
import type { ConformanceResult } from '../../domain/fhir/twcore/conformanceCheck'
import type { CodeMapRow } from '../../domain/fhir/twcore/codeMapping'

export interface ProofReportInput {
  generatedAt: string
  counts: Record<string, number>
  conformance: ConformanceResult | null
  codeMap: CodeMapRow[]
  submit?: { httpStatus?: number; location?: string; reachedPrism?: boolean } | null
}

function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
}

function yesNo(ok: boolean): string {
  return ok ? '<span class="ok">✔ 通過</span>' : '<span class="bad">✘ 未通過</span>'
}

export function buildProofReportHtml(input: ProofReportInput): string {
  const { counts, conformance, codeMap, submit } = input

  const countsRows = Object.entries(counts)
    .map(([t, n]) => `<tr><td>${esc(t)}</td><td>${esc(n)}</td></tr>`)
    .join('')

  const conformanceRows = conformance
    ? [
        `<tr><td>Bundle.type = collection</td><td>${yesNo(conformance.isCollection)} (${esc(conformance.bundleType ?? '—')})</td></tr>`,
        `<tr><td>Bundle.meta.profile</td><td>${yesNo(conformance.bundleHasProfile)}</td></tr>`,
        `<tr><td>每個 entry 有 meta.profile</td><td>${conformance.entriesMissingProfile.length === 0 ? yesNo(true) : yesNo(false) + ' 缺：' + esc([...new Set(conformance.entriesMissingProfile)].join(', '))}</td></tr>`,
        ...(conformance.countDiff ?? []).map((r) => `<tr><td>數量 ${esc(r.type)}</td><td>${yesNo(r.ok)} ${esc(r.actual)}/${esc(r.expected)}</td></tr>`)
      ].join('')
    : ''

  const codeRows = codeMap
    .map((r) => `<tr><td>${esc(r.category)}</td><td>${esc(r.competitionCode)}</td><td>${r.mapped ? esc(r.system) + ' | ' + esc(r.standardCode) : '<span class="warn">未對應（text）</span>'}</td></tr>`)
    .join('')

  const submitHtml = submit
    ? `<h2>送出結果</h2><table><tr><td>HTTP 狀態</td><td>${esc(submit.httpStatus ?? '—')}</td></tr><tr><td>位置</td><td>${esc(submit.location ?? '—')}</td></tr><tr><td>是否送達 Prism</td><td>${submit.reachedPrism ? yesNo(true) : yesNo(false)}</td></tr></table>`
    : ''

  return `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><title>RxFHIR 證明報告</title>
<style>
  body { font-family: "PingFang TC","Microsoft JhengHei","Noto Sans TC",-apple-system,sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 820px; margin: 24px auto; padding: 0 16px; }
  h1 { font-size: 22px; border-bottom: 2px solid #d4779a; padding-bottom: 6px; }
  h2 { font-size: 16px; margin-top: 22px; color: #8e3b5a; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; margin: 6px 0 14px; }
  th, td { border: 1px solid #ccc; padding: 5px 9px; text-align: left; }
  th { background: #f6e8ee; }
  .ok { color: #15803d; font-weight: 600; }
  .bad { color: #b91c1c; font-weight: 600; }
  .warn { color: #b45309; }
  .meta { color: #666; font-size: 12px; }
  @media print { body { margin: 0; } }
</style></head>
<body>
  <h1>RxFHIR — 賽道轉換證明報告</h1>
  <p class="meta">產生時間：${esc(input.generatedAt)}　|　角色：CONTENT_CREATOR_NTUNHS_FhirWork (TWCORE_CREATOR)</p>

  <h2>資源數量與種類</h2>
  <table><tr><th>Resource</th><th>數量</th></tr>${countsRows}</table>

  ${conformanceRows ? `<h2>合規檢查</h2><table><tr><th>項目</th><th>結果</th></tr>${conformanceRows}</table>` : ''}

  ${codeRows ? `<h2>院內碼 → 國際碼對照</h2><table><tr><th>類別</th><th>院內碼</th><th>國際碼</th></tr>${codeRows}</table>` : ''}

  ${submitHtml}

  <p class="meta">提示：在瀏覽器開啟本檔，按 Cmd/Ctrl+P 即可另存為 PDF。</p>
</body></html>`
}
