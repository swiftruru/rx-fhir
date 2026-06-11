#!/usr/bin/env -S npx tsx
/**
 * FHIR 聯測松輔助工具 CLI。
 *
 * 憑證    token                取得 X-Participant-Token 與 OAuth access_token（Step 10/15）
 * 轉換    convert <file>        題目JSON→bundle，顯示數量與合規檢查（Step 20/140）
 * 上傳    upload <file>         合規檢查後 POST collection 到 FHIR 主機（Step 120/230）
 * 對照    codemap <problem>     院內碼→國際碼對照表（Step 150/260）
 * 截圖    screenshot [url]      Playwright 截指定 URL（Step 30/300）
 * 紀錄    record --step N ...    手動步驟收錄連結/截圖/備註/狀態
 * 報告    report [--pdf]        依 Step 10–300 輸出 .md（與 .pdf）
 * 狀態    status               列出各步驟狀態
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { Command } from 'commander'
import { loadConfig, mask, validateForOAuth } from './config.js'
import { getParticipantToken, requestAccessToken } from './auth.js'
import { loadRunState, upsertStep, saveRunState, type StepStatus } from './runState.js'
import { STEPS, getStep } from './steps.js'
import { loadInput } from './convert.js'
import { checkBundleConformance, parseExpectedCounts } from './checks/conformance.js'
import { buildCodeMappingTable } from './checks/codeMapping.js'
import { uploadBundle } from './fhirClient.js'

function collect(value: string, prev: string[]): string[] {
  return [...prev, value]
}

function printConformance(bundle: fhir4.Bundle, expected?: string): boolean {
  const result = checkBundleConformance(bundle, expected ? parseExpectedCounts(expected) : undefined)
  console.log(`  Bundle.type=collection : ${result.isCollection ? '✅' : '❌ ' + (result.bundleType ?? '—')}`)
  console.log(`  Bundle.meta.profile    : ${result.bundleHasProfile ? '✅' : '❌'}`)
  console.log(`  每個 entry 有 meta.profile : ${result.entriesMissingProfile.length === 0 ? '✅' : '❌ 缺：' + [...new Set(result.entriesMissingProfile)].join(', ')}`)
  console.log(`  資源數量：${Object.entries(result.counts).map(([t, n]) => `${t}×${n}`).join('  ')}`)
  if (result.countDiff) {
    for (const r of result.countDiff) console.log(`    ${r.ok ? '✅' : '❌'} ${r.type} ${r.actual}/${r.expected}`)
  }
  console.log(`  → ${result.allPass ? '✅ 全部通過' : '❌ 有未通過項目'}`)
  return result.allPass
}

const program = new Command()
program.name('twcat').description('FHIR 聯測松（TWCAT / Gazelle）輔助工具').version('0.1.0')

// ── 憑證 ──
program
  .command('token')
  .description('Step 10 / 15：取得 X-Participant-Token 與 OAuth access_token')
  .action(async () => {
    const cfg = loadConfig()
    console.log(`\n設定：grant=${cfg.grant}  token端點=${cfg.tokenUrl}\n`)
    try {
      const participant = getParticipantToken(cfg)
      console.log(`✅ Step 10  X-Participant-Token：${mask(participant)}`)
      upsertStep(10, { status: 'done', data: { participantToken: mask(participant), source: 'env' } })
    } catch (e) {
      console.error(`❌ Step 10  ${(e as Error).message}`)
      upsertStep(10, { status: 'failed', notes: (e as Error).message })
      process.exitCode = 1
      return
    }
    const missing = validateForOAuth(cfg)
    if (missing.length) {
      const msg = `取 OAuth token 前缺少設定：${missing.join(', ')}`
      console.error(`❌ Step 15  ${msg}`)
      upsertStep(15, { status: 'failed', notes: msg })
      process.exitCode = 1
      return
    }
    try {
      const token = await requestAccessToken(cfg)
      console.log(`✅ Step 15  access_token：${mask(token.accessToken)}  (${token.tokenType}, expires_in=${token.expiresIn}s)`)
      upsertStep(15, { status: 'done', data: { accessToken: mask(token.accessToken), tokenType: token.tokenType, expiresIn: token.expiresIn, grant: cfg.grant } })
      console.log('\n已寫入 run.json（Step 10 / 15）。\n')
    } catch (e) {
      console.error(`❌ Step 15  ${(e as Error).message}`)
      upsertStep(15, { status: 'failed', notes: (e as Error).message })
      process.exitCode = 1
    }
  })

// ── 轉換 + 合規（Step 20 / 140）──
program
  .command('convert <file>')
  .description('題目來源 JSON → bundle；顯示數量與合規檢查（Step 20/140）')
  .option('-t, --type <bundleType>', 'collection 或 transaction', 'collection')
  .option('-e, --expect <counts>', '案例摘要期望數量，例如 "Patient:1, Encounter:8"')
  .option('-o, --out <file>', '另存轉換後 bundle 到指定路徑')
  .action((file: string, opts: { type: 'collection' | 'transaction'; expect?: string; out?: string }) => {
    const input = loadInput(resolve(file), opts.type)
    console.log(`\n轉換結果（${input.fromBundle ? '直接讀入 bundle' : '由題目轉換'}）：`)
    console.log(`  資源數量：${Object.entries(input.counts ?? {}).map(([t, n]) => `${t}×${n}`).join('  ')}\n合規檢查：`)
    printConformance(input.bundle, opts.expect)
    if (opts.out) {
      writeFileSync(resolve(opts.out), JSON.stringify(input.bundle, null, 2), 'utf8')
      console.log(`\n已存 bundle：${resolve(opts.out)}`)
    }
  })

// ── 上傳（Step 120 / 230）──
program
  .command('upload <file>')
  .description('合規檢查後 POST collection 到大會 FHIR 主機（Step 120/230）')
  .option('-t, --type <bundleType>', 'collection 或 transaction', 'collection')
  .option('-s, --step <id>', '要記錄到哪個步驟（120 或 230）', '120')
  .option('-e, --expect <counts>', '案例摘要期望數量')
  .option('--proxy <url>', 'Step 230 的 Proxy 連結，一併記錄')
  .option('--force', '即使合規檢查未過也照樣上傳')
  .action(async (file: string, opts: { type: 'collection' | 'transaction'; step: string; expect?: string; proxy?: string; force?: boolean }) => {
    const stepId = Number.parseInt(opts.step, 10)
    const input = loadInput(resolve(file), opts.type)
    console.log('\n上傳前合規檢查：')
    const pass = printConformance(input.bundle, opts.expect)
    if (!pass && !opts.force) {
      console.error('\n❌ 合規檢查未通過，已中止上傳（加 --force 可強制上傳）。')
      upsertStep(stepId, { status: 'failed', notes: '合規檢查未通過，未上傳' })
      process.exitCode = 1
      return
    }
    const cfg = loadConfig()
    console.log('\n上傳中…')
    try {
      const result = await uploadBundle(cfg, input.bundle)
      const ok = result.ok || result.reachedPrism
      console.log(`  HTTP ${result.httpStatus}${result.location ? '  ' + result.location : ''}  ${result.reachedPrism ? '（已送達 Prism）' : '（未送達）'}`)
      const links = opts.proxy ? [opts.proxy] : []
      upsertStep(stepId, {
        status: ok ? 'done' : 'failed',
        links,
        data: { httpStatus: result.httpStatus, location: result.location, reachedPrism: result.reachedPrism, counts: input.counts }
      })
      console.log(`\n已寫入 run.json（Step ${stepId}）。`)
      console.log('提醒：FHIRfox/Gazelle 驗證請手動取連結與截圖，再用 `record` 收錄。\n')
    } catch (e) {
      console.error(`❌ 上傳失敗：${(e as Error).message}`)
      upsertStep(stepId, { status: 'failed', notes: (e as Error).message })
      process.exitCode = 1
    }
  })

// ── 院內碼對照（Step 150 / 260）──
program
  .command('codemap <problemFile>')
  .description('院內碼 → 國際碼對照表（Step 150/260；需題目來源 JSON）')
  .option('-t, --type <bundleType>', 'collection 或 transaction', 'collection')
  .option('-s, --step <id>', '記錄到哪個步驟（150 或 260）', '150')
  .action((problemFile: string, opts: { type: 'collection' | 'transaction'; step: string }) => {
    const input = loadInput(resolve(problemFile), opts.type)
    if (input.fromBundle || !input.provenance) {
      console.error('❌ 院內碼對照需要「題目來源 JSON」（不是已轉好的 bundle），才有 provenance 可對照。')
      process.exitCode = 1
      return
    }
    const rows = buildCodeMappingTable(input.provenance)
    console.log('\n院內碼 → 國際碼對照表：\n')
    for (const r of rows) {
      console.log(`  ${r.mapped ? '✅' : '⚠️ '} ${r.category.padEnd(16)} ${r.competitionCode.padEnd(12)} → ${r.mapped ? `${r.system} | ${r.standardCode}` : '(未對應，以 text 帶過)'}`)
    }
    const unmapped = rows.filter((r) => !r.mapped).length
    console.log(`\n共 ${rows.length} 個院內碼，${unmapped} 個未對應。`)
    upsertStep(Number.parseInt(opts.step, 10), { status: unmapped === 0 ? 'done' : 'to-verify', data: rows })
  })

// ── 截圖（Step 30 / 300）──
program
  .command('screenshot [url]')
  .description('Playwright 截指定 URL（預設 PRODUCT_UI_URL）（Step 30/300）')
  .option('-s, --step <id>', '記錄到哪個步驟', '30')
  .action(async (url: string | undefined, opts: { step: string }) => {
    const cfg = loadConfig()
    const target = url ?? cfg.productUiUrl
    if (!target) {
      console.error('❌ 請提供 URL，或在 .env 設定 PRODUCT_UI_URL。')
      process.exitCode = 1
      return
    }
    const stepId = Number.parseInt(opts.step, 10)
    console.log(`截圖中：${target}`)
    const { screenshotUrl } = await import('./screenshot.js')
    try {
      const file = await screenshotUrl(target, cfg.screenshotDir, stepId)
      console.log(`✅ 已存截圖：${file}`)
      const prev = loadRunState().steps[stepId]
      upsertStep(stepId, { status: 'done', screenshots: [...(prev?.screenshots ?? []), file], links: prev?.links ?? [] })
    } catch (e) {
      console.error(`❌ 截圖失敗：${(e as Error).message}`)
      process.exitCode = 1
    }
  })

// ── 通用紀錄（手動步驟）──
program
  .command('record')
  .description('收錄手動步驟的狀態/連結/截圖/備註（Step 100/110/130/160/200/300…）')
  .requiredOption('-s, --step <id>', '步驟編號')
  .option('--status <status>', 'pending|done|skipped|failed|to-verify|partially-verify|paused', 'done')
  .option('--link <url>', '連結（可重複）', collect, [])
  .option('--shot <path>', '截圖路徑（可重複）', collect, [])
  .option('--note <text>', '備註')
  .option('--case <id>', '設定測試案例編號')
  .option('--instance <id>', '設定 Test Instance ID')
  .action((opts: { step: string; status: StepStatus; link: string[]; shot: string[]; note?: string; case?: string; instance?: string }) => {
    const stepId = Number.parseInt(opts.step, 10)
    if (!getStep(stepId)) {
      console.error(`❌ 未知步驟：${stepId}`)
      process.exitCode = 1
      return
    }
    const prev = loadRunState().steps[stepId]
    const links = [...(prev?.links ?? []), ...opts.link]
    const screenshots = [...(prev?.screenshots ?? []), ...opts.shot]
    upsertStep(stepId, { status: opts.status, links, screenshots, notes: opts.note ?? prev?.notes })
    if (opts.case || opts.instance) {
      const state = loadRunState()
      if (opts.case) state.caseId = opts.case
      if (opts.instance) state.testInstanceId = opts.instance
      saveRunState(state)
    }
    console.log(`✅ 已記錄 Step ${stepId}（status=${opts.status}，連結 ${links.length}、截圖 ${screenshots.length}）。`)
  })

// ── 報告 ──
program
  .command('report')
  .description('依 Step 10–300 輸出 Markdown（與 PDF）報告')
  .option('--pdf', '同時輸出 PDF')
  .action(async (opts: { pdf?: boolean }) => {
    const cfg = loadConfig()
    const state = loadRunState()
    const now = new Date()
    const stamp = now.toISOString().replace(/[:.]/g, '-')
    mkdirSync(cfg.reportDir, { recursive: true })
    const { renderMarkdown } = await import('./report/markdown.js')
    const md = renderMarkdown(state, now.toISOString())
    const mdPath = resolve(join(cfg.reportDir, `report_${stamp}.md`))
    writeFileSync(mdPath, md, 'utf8')
    console.log(`✅ 已輸出 Markdown：${mdPath}`)
    if (opts.pdf) {
      const { renderPdf } = await import('./report/pdf.js')
      const pdfPath = resolve(join(cfg.reportDir, `report_${stamp}.pdf`))
      await renderPdf(md, pdfPath)
      console.log(`✅ 已輸出 PDF：${pdfPath}`)
    }
  })

// ── 狀態 ──
program
  .command('status')
  .description('列出 run.json 內各步驟狀態')
  .action(() => {
    const state = loadRunState()
    console.log('')
    for (const def of STEPS) {
      const r = state.steps[def.id]
      console.log(`  Step ${String(def.id).padStart(3)} [${def.required ? 'R' : 'O'}] ${(r?.status ?? '—').padEnd(16)} ${def.title}`)
    }
    console.log('')
  })

program.parseAsync(process.argv).catch((e) => {
  console.error(e instanceof Error ? e.message : String(e))
  process.exitCode = 1
})
