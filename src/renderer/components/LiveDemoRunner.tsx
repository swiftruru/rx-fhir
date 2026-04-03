import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LIVE_DEMO_STEPS } from '../demo/liveDemoScript'
import type { LiveDemoControllerKey, LiveDemoStepDefinition } from '../demo/types'
import { revealLiveDemoInfoPanel } from '../lib/liveDemoDom'
import { getPrimaryDemoScenarioId } from '../mocks/selectors'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { resetLoggedRequests } from '../services/fhirClient'
import { useAppStore } from '../store/appStore'
import { useCreatorStore } from '../store/creatorStore'
import { useLiveDemoStore } from '../store/liveDemoStore'
import { useMockStore } from '../store/mockStore'
import { useShortcutActionStore } from '../store/shortcutActionStore'
import type { ConsumerLaunchState } from '../features/consumer/searchState'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getPlaybackDelay(ms: number, playMode: 'manual' | 'auto', reducedMotion: boolean): number {
  if (ms <= 0) return 0
  if (!reducedMotion) {
    return playMode === 'auto' ? Math.round(ms * 1.5) : ms
  }

  return playMode === 'auto'
    ? Math.min(520, Math.max(120, Math.round(ms * 0.42)))
    : Math.min(360, Math.max(90, Math.round(ms * 0.34)))
}

async function waitUntilRunningOrAbort(runId: number): Promise<void> {
  while (true) {
    const state = useLiveDemoStore.getState()
    if (state.runId !== runId || (state.status !== 'running' && state.status !== 'paused')) {
      throw new Error('LIVE_DEMO_ABORTED')
    }
    if (state.status === 'running') return
    await sleep(120)
  }
}

async function waitForDelay(runId: number, ms: number): Promise<void> {
  if (ms <= 0) return
  const endAt = Date.now() + ms

  while (Date.now() < endAt) {
    await waitUntilRunningOrAbort(runId)
    await sleep(Math.min(120, Math.max(40, endAt - Date.now())))
  }
}

async function waitForStepTrigger(runId: number): Promise<void> {
  const startAdvanceToken = useLiveDemoStore.getState().advanceToken

  while (true) {
    await waitUntilRunningOrAbort(runId)
    const { playMode, advanceToken } = useLiveDemoStore.getState()
    if (playMode === 'auto') return
    if (advanceToken !== startAdvanceToken) return
    await sleep(120)
  }
}

async function waitForCondition(runId: number, predicate: () => boolean): Promise<void> {
  while (!predicate()) {
    await waitUntilRunningOrAbort(runId)
    await sleep(120)
  }
}

async function waitForController(runId: number, key: LiveDemoControllerKey) {
  await waitForCondition(runId, () => Boolean(useLiveDemoStore.getState().controllers[key]))
  return useLiveDemoStore.getState().controllers[key]
}

async function showcaseRequestPanel(runId: number, reducedMotion: boolean): Promise<void> {
  const liveDemoStore = useLiveDemoStore.getState()
  const creatorActions = useShortcutActionStore.getState().creator
  const wasCollapsed = liveDemoStore.coachCollapsed

  liveDemoStore.setCoachCollapsed(true)
  creatorActions.showInfoPanel?.()
  creatorActions.setInfoPanelMode?.('request')

  await waitForDelay(runId, getPlaybackDelay(420, useLiveDemoStore.getState().playMode, reducedMotion))

  const scrollContainer = await revealLiveDemoInfoPanel(reducedMotion)
  if (!scrollContainer) {
    if (!wasCollapsed) {
      liveDemoStore.setCoachCollapsed(false)
    }
    return
  }

  scrollContainer.scrollTo({ top: 0, behavior: 'auto' })
  await waitForDelay(runId, getPlaybackDelay(260, useLiveDemoStore.getState().playMode, reducedMotion))

  const maxScrollTop = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight)
  if (maxScrollTop > 0) {
    const steps = reducedMotion ? 8 : 18
    for (let index = 0; index <= steps; index += 1) {
      await waitUntilRunningOrAbort(runId)
      const progress = index / steps
      scrollContainer.scrollTop = Math.round(maxScrollTop * progress)
      await waitForDelay(runId, reducedMotion ? 80 : 140)
    }

    await waitForDelay(runId, getPlaybackDelay(320, useLiveDemoStore.getState().playMode, reducedMotion))
    scrollContainer.scrollTo({
      top: 0,
      behavior: reducedMotion ? 'auto' : 'smooth'
    })
    await waitForDelay(runId, getPlaybackDelay(340, useLiveDemoStore.getState().playMode, reducedMotion))
  }

  if (!wasCollapsed) {
    liveDemoStore.setCoachCollapsed(false)
    await waitForDelay(runId, getPlaybackDelay(220, useLiveDemoStore.getState().playMode, reducedMotion))
  }
}

async function runCreatorStep(runId: number, step: LiveDemoStepDefinition, reducedMotion: boolean): Promise<void> {
  const liveDemo = useLiveDemoStore.getState()
  const playMode = useLiveDemoStore.getState().playMode
  if (typeof step.creatorStepIndex === 'number') {
    useCreatorStore.getState().setStep(step.creatorStepIndex)
  }

  liveDemo.setPhase('intro')
  if (playMode === 'auto') {
    await waitForDelay(runId, getPlaybackDelay(step.introDelayMs ?? 1000, playMode, reducedMotion))
  } else {
    await waitForStepTrigger(runId)
  }

  if (!step.controllerKey) return
  const controller = await waitForController(runId, step.controllerKey)
  await controller?.reveal?.()

  if (step.mode === 'fill-submit' || step.mode === 'fill-only') {
    liveDemo.setPhase('filling')
    if (controller?.fillDemo) {
      await controller.fillDemo()
    } else {
      controller?.fillMock?.()
      await waitForDelay(runId, getPlaybackDelay(650, playMode, reducedMotion))
    }
  }

  if (step.mode === 'fill-submit' || step.mode === 'submit-only') {
    liveDemo.setPhase('submitting')
    await controller?.submit?.()
  }

  if (step.id === 'bundleSubmit') {
    await waitForCondition(runId, () => Boolean(useCreatorStore.getState().bundleId))
  } else if (step.mode !== 'fill-only' && step.controllerKey) {
    const controllerKey = step.controllerKey
    await waitForCondition(runId, () => Boolean(useCreatorStore.getState().resources[controllerKey]?.id))
  }

  liveDemo.setPhase('reviewing')
  if (step.mode === 'fill-submit' || step.mode === 'submit-only') {
    await showcaseRequestPanel(runId, reducedMotion)
  }
  await waitForDelay(runId, getPlaybackDelay(step.settleDelayMs ?? 1100, playMode, reducedMotion))
}

export default function LiveDemoRunner(): null {
  const runId = useLiveDemoStore((state) => state.runId)
  const navigate = useNavigate()
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (runId === 0) return

    let disposed = false

    async function runDemo(): Promise<void> {
      try {
        const demoStore = useLiveDemoStore.getState()
        const creatorStore = useCreatorStore.getState()
        const mockStore = useMockStore.getState()
        const primaryScenarioId = getPrimaryDemoScenarioId()

        resetLoggedRequests()
        creatorStore.reset()
        mockStore.reset()
        if (primaryScenarioId) {
          mockStore.activateScenario(primaryScenarioId)
        }
        demoStore.resetConsumerSearchReady()
        navigate('/creator')
        demoStore.setPhase('preparing')
        await waitForDelay(
          runId,
          getPlaybackDelay(900, useLiveDemoStore.getState().playMode, reducedMotion)
        )

        for (const [index, step] of LIVE_DEMO_STEPS.entries()) {
          if (disposed) return
          demoStore.setCurrentStep(step.id, index, LIVE_DEMO_STEPS.length)

          if (step.id === 'consumerSearch') {
            const patientIdentifier = useCreatorStore.getState().resources.patient?.identifier?.[0]?.value
            const bundleId = useCreatorStore.getState().bundleId
            const launchState: ConsumerLaunchState = {
              prefill: patientIdentifier ? { tab: 'basic', searchBy: 'identifier', value: patientIdentifier } : undefined,
              autoSearch: patientIdentifier
                ? { mode: 'basic', identifier: patientIdentifier }
                : undefined,
              targetBundleId: bundleId
            }

            demoStore.resetConsumerSearchReady()
            demoStore.setPhase('intro')
            if (useLiveDemoStore.getState().playMode === 'auto') {
              await waitForDelay(
                runId,
                getPlaybackDelay(step.introDelayMs ?? 1000, useLiveDemoStore.getState().playMode, reducedMotion)
              )
            } else {
              await waitForStepTrigger(runId)
            }
            demoStore.setPhase('navigating')
            navigate('/consumer', { state: launchState })
            await waitForDelay(
              runId,
              getPlaybackDelay(800, useLiveDemoStore.getState().playMode, reducedMotion)
            )
            demoStore.setPhase('searching')
            await waitForCondition(runId, () => useLiveDemoStore.getState().consumerSearchReady)
            demoStore.setPhase('reviewing')
            await waitForDelay(
              runId,
              getPlaybackDelay(step.settleDelayMs ?? 1400, useLiveDemoStore.getState().playMode, reducedMotion)
            )
            continue
          }

          await runCreatorStep(runId, step, reducedMotion)
        }

        useLiveDemoStore.getState().complete()
      } catch (error) {
        if (error instanceof Error && error.message === 'LIVE_DEMO_ABORTED') return

        const locale = useAppStore.getState().locale
        useLiveDemoStore.getState().fail(
          error instanceof Error ? error.message : locale === 'en'
            ? 'Live Demo failed to complete.'
            : 'Live Demo 執行失敗。'
        )
      }
    }

    void runDemo()

    return () => {
      disposed = true
    }
  }, [navigate, reducedMotion, runId])

  return null
}
