/**
 * 依 Step 10–300 把執行狀態彙整成 Markdown 報告。
 */
import { PHASE_TITLES, STEPS, type Phase } from '../steps.js'
import { type RunState, type StepResult } from '../runState.js'

const STATUS_LABEL: Record<string, string> = {
  pending: '⏳ 未開始',
  done: '✅ 完成',
  skipped: '➖ 略過',
  failed: '❌ 失敗',
  'to-verify': '🔵 To be verify',
  'partially-verify': '🟡 Partially verify',
  paused: '⏸ Paused'
}

function renderData(data: unknown): string {
  if (data === undefined || data === null) return ''
  // 對照表（陣列）以表格呈現，其餘以 JSON code block。
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
    const keys = Object.keys(data[0] as Record<string, unknown>)
    const head = `| ${keys.join(' | ')} |`
    const sep = `| ${keys.map(() => '---').join(' | ')} |`
    const rows = data.map((r) => `| ${keys.map((k) => String((r as Record<string, unknown>)[k] ?? '')).join(' | ')} |`)
    return `\n${head}\n${sep}\n${rows.join('\n')}\n`
  }
  return `\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n`
}

function renderStep(def: { id: number; required: boolean; title: string; description: string }, r?: StepResult): string {
  const flag = def.required ? '**R**' : 'O'
  const status = r ? (STATUS_LABEL[r.status] ?? r.status) : '⏳ 未開始'
  const lines: string[] = []
  lines.push(`### Step ${def.id} ${def.title}　${flag}　${status}`)
  lines.push('')
  lines.push(`> ${def.description}`)
  if (r?.notes) lines.push(`\n**備註**：${r.notes}`)
  if (r?.links?.length) lines.push(`\n**連結**：\n${r.links.map((l) => `- ${l}`).join('\n')}`)
  if (r?.screenshots?.length) lines.push(`\n**截圖**：\n${r.screenshots.map((s) => `- ![step ${def.id}](${s})`).join('\n')}`)
  if (r?.data !== undefined) lines.push(`\n**資料**：${renderData(r.data)}`)
  lines.push('')
  return lines.join('\n')
}

export function renderMarkdown(state: RunState, generatedAt: string): string {
  const out: string[] = []
  out.push('# FHIR 聯測松執行報告')
  out.push('')
  out.push(`- 產生時間：${generatedAt}`)
  out.push(`- 角色：CONTENT_CREATOR_NTUNHS_FhirWork (TWCORE_CREATOR)`)
  if (state.caseId) out.push(`- 測試案例：${state.caseId}`)
  if (state.testInstanceId) out.push(`- Test Instance ID：${state.testInstanceId}`)
  out.push('')

  // 進度摘要
  const done = STEPS.filter((s) => state.steps[s.id]?.status === 'done').length
  const requiredTotal = STEPS.filter((s) => s.required).length
  out.push(`> 進度：${done} / ${STEPS.length} 步完成（必要步驟 ${requiredTotal} 項）`)
  out.push('')

  const phases: Phase[] = ['A', 'B', 'C', 'D']
  for (const phase of phases) {
    out.push(`## ${PHASE_TITLES[phase]}`)
    out.push('')
    for (const def of STEPS.filter((s) => s.phase === phase)) {
      out.push(renderStep(def, state.steps[def.id]))
    }
  }
  return out.join('\n')
}
