/**
 * 執行狀態（output/run.json）的讀寫。每個步驟記錄狀態、連結、截圖、備註與資料，
 * 供報告彙整使用。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export type StepStatus =
  | 'pending'
  | 'done'
  | 'skipped'
  | 'failed'
  | 'to-verify'
  | 'partially-verify'
  | 'paused'

export interface StepResult {
  id: number
  status: StepStatus
  links: string[]
  screenshots: string[]
  notes?: string
  data?: unknown
  updatedAt: string
}

export interface RunState {
  caseId?: string
  testInstanceId?: string
  steps: Record<number, StepResult>
}

const DEFAULT_PATH = './output/run.json'

export function runStatePath(): string {
  return process.env.RUN_STATE_PATH?.trim() || DEFAULT_PATH
}

export function loadRunState(path = runStatePath()): RunState {
  if (!existsSync(path)) return { steps: {} }
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as RunState
  } catch {
    return { steps: {} }
  }
}

export function saveRunState(state: RunState, path = runStatePath()): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(state, null, 2), 'utf8')
}

/** 更新（或建立）某一步驟的結果並存檔。 */
export function upsertStep(id: number, patch: Partial<Omit<StepResult, 'id' | 'updatedAt'>>, path = runStatePath()): StepResult {
  const state = loadRunState(path)
  const prev = state.steps[id] ?? { id, status: 'pending', links: [], screenshots: [] }
  const next: StepResult = {
    ...prev,
    ...patch,
    id,
    links: patch.links ?? prev.links,
    screenshots: patch.screenshots ?? prev.screenshots,
    updatedAt: new Date().toISOString()
  }
  state.steps[id] = next
  saveRunState(state, path)
  return next
}
