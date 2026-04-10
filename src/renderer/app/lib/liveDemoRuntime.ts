import { useLiveDemoStore } from '../stores/liveDemoStore'

export const LIVE_DEMO_ABORTED = 'LIVE_DEMO_ABORTED'
let activeLiveDemoSubmitRunId: number | null = null

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getLiveDemoStateOrAbort(runId: number) {
  const state = useLiveDemoStore.getState()
  if (state.runId !== runId || (state.status !== 'running' && state.status !== 'paused')) {
    throw new Error(LIVE_DEMO_ABORTED)
  }
  return state
}

export function isLiveDemoRunCurrent(runId: number): boolean {
  const state = useLiveDemoStore.getState()
  return state.runId === runId && (state.status === 'running' || state.status === 'paused')
}

export function getActiveLiveDemoSubmitRunId(): number | null {
  return activeLiveDemoSubmitRunId
}

export async function runWithLiveDemoSubmitContext<T>(runId: number, action: () => Promise<T>): Promise<T> {
  activeLiveDemoSubmitRunId = runId
  try {
    return await action()
  } finally {
    if (activeLiveDemoSubmitRunId === runId) {
      activeLiveDemoSubmitRunId = null
    }
  }
}

export async function waitForLiveDemoRunning(runId: number): Promise<void> {
  while (true) {
    const state = getLiveDemoStateOrAbort(runId)
    if (state.status === 'running') return
    await sleep(120)
  }
}

export async function waitForLiveDemoDelay(runId: number, ms: number): Promise<void> {
  if (ms <= 0) return

  const endAt = Date.now() + ms
  while (Date.now() < endAt) {
    await waitForLiveDemoRunning(runId)
    await sleep(Math.min(120, Math.max(20, endAt - Date.now())))
  }
}
