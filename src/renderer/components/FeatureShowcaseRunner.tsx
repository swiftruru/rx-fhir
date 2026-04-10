import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useAppStore } from '../store/appStore'
import { useCreatorStore } from '../store/creatorStore'
import { useFeatureShowcaseStore } from '../store/featureShowcaseStore'
import { useLiveDemoStore } from '../store/liveDemoStore'
import { useSearchHistoryStore } from '../store/searchHistoryStore'
import { useFhirInspectorStore } from '../store/fhirInspectorStore'
import { useToastStore } from '../store/toastStore'
import { FEATURE_SHOWCASE_STEPS } from '../showcase/featureShowcaseScript'
import { buildFeatureShowcaseSnapshot } from '../showcase/showcaseSnapshot'

interface ShowcaseBackup {
  creator: {
    currentStep: number
    resources: ReturnType<typeof useCreatorStore.getState>['resources']
    drafts: ReturnType<typeof useCreatorStore.getState>['drafts']
    feedbacks: ReturnType<typeof useCreatorStore.getState>['feedbacks']
    lastUpdatedResourceKey: ReturnType<typeof useCreatorStore.getState>['lastUpdatedResourceKey']
    draftSavedAt: ReturnType<typeof useCreatorStore.getState>['draftSavedAt']
    draftHydrated: ReturnType<typeof useCreatorStore.getState>['draftHydrated']
    draftRestored: ReturnType<typeof useCreatorStore.getState>['draftRestored']
    draftRevision: ReturnType<typeof useCreatorStore.getState>['draftRevision']
    bundleId: ReturnType<typeof useCreatorStore.getState>['bundleId']
    bundleError: ReturnType<typeof useCreatorStore.getState>['bundleError']
    submittingBundle: ReturnType<typeof useCreatorStore.getState>['submittingBundle']
  }
  savedSearches: ReturnType<typeof useSearchHistoryStore.getState>['records']
  fhirRequests: {
    latest: ReturnType<typeof useFhirInspectorStore.getState>['latest']
    history: ReturnType<typeof useFhirInspectorStore.getState>['history']
  }
  toastHistory: ReturnType<typeof useToastStore.getState>['history']
}

const AUTOPLAY_DURATION_MULTIPLIER = 1.6

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function getAutoplayDelay(ms: number, reducedMotion: boolean): number {
  if (!reducedMotion) {
    return Math.round(ms * AUTOPLAY_DURATION_MULTIPLIER)
  }

  return Math.min(1400, Math.max(420, Math.round(ms * 0.62)))
}

export default function FeatureShowcaseRunner(): null {
  const navigate = useNavigate()
  const reducedMotion = useReducedMotion()
  const locale = useAppStore((state) => state.locale)
  const serverUrl = useAppStore((state) => state.serverUrl)
  const runId = useFeatureShowcaseStore((state) => state.runId)
  const status = useFeatureShowcaseStore((state) => state.status)
  const autoplay = useFeatureShowcaseStore((state) => state.autoplay)
  const currentStepIndex = useFeatureShowcaseStore((state) => state.currentStepIndex)
  const backupRef = useRef<ShowcaseBackup>()

  useEffect(() => {
    // Only (re)build showcase state while a showcase run is actually active.
    // After STOP, runId remains non-zero so locale/server changes must not
    // rehydrate the Creator with showcase snapshot data.
    if (runId === 0 || (status !== 'running' && status !== 'paused')) return

    // Stop Live Demo if it is running. The showcase navigates the Creator to the
    // Composition step; if Live Demo is paused mid-run its async loop would detect
    // the newly registered composition controller and auto-submit — firing a real
    // POST Composition to the FHIR server with mock patient IDs that don't exist,
    // producing 400 error toasts during the showcase.
    const liveDemoStatus = useLiveDemoStore.getState().status
    if (liveDemoStatus !== 'idle') {
      useLiveDemoStore.getState().stop()
    }

    // Only take a fresh backup when none exists yet.
    // Replay increments runId without restoring first, so we must not overwrite
    // the original backup with mock-state data that is currently in the stores.
    if (!backupRef.current) {
      const creatorState = useCreatorStore.getState()
      backupRef.current = {
        creator: {
          currentStep: creatorState.currentStep,
          resources: creatorState.resources,
          drafts: creatorState.drafts,
          feedbacks: creatorState.feedbacks,
          lastUpdatedResourceKey: creatorState.lastUpdatedResourceKey,
          draftSavedAt: creatorState.draftSavedAt,
          draftHydrated: creatorState.draftHydrated,
          draftRestored: creatorState.draftRestored,
          draftRevision: creatorState.draftRevision,
          bundleId: creatorState.bundleId,
          bundleError: creatorState.bundleError,
          submittingBundle: creatorState.submittingBundle
        },
        savedSearches: useSearchHistoryStore.getState().records,
        fhirRequests: {
          latest: useFhirInspectorStore.getState().latest,
          history: useFhirInspectorStore.getState().history
        },
        toastHistory: useToastStore.getState().history
      }
    }

    // Clear toast history so showcase runs in a clean notification state
    useToastStore.getState().clearHistory()
    try {
      const snapshot = buildFeatureShowcaseSnapshot(locale, serverUrl)
      useFeatureShowcaseStore.getState().setSnapshot(snapshot)
      useCreatorStore.setState({
        currentStep: snapshot.creator.currentStep,
        resources: snapshot.creator.resources,
        drafts: {},
        feedbacks: snapshot.creator.feedbacks,
        lastUpdatedResourceKey: snapshot.creator.lastUpdatedResourceKey,
        draftSavedAt: undefined,
        draftRestored: false,
        bundleId: snapshot.creator.bundleId,
        bundleError: undefined,
        submittingBundle: false
      })
      // historyStore is intentionally NOT overwritten — submission history must
      // always reflect real user data and must never be polluted by showcase mock records.
      useSearchHistoryStore.setState({ records: snapshot.savedSearches })
      useFhirInspectorStore.setState({
        latest: snapshot.fhirRequests.latest,
        history: snapshot.fhirRequests.history
      })
    } catch (error) {
      const fallback = locale === 'en'
        ? 'Feature Showcase failed to initialize.'
        : 'Feature Showcase 初始化失敗。'
      useFeatureShowcaseStore.getState().fail(error instanceof Error ? error.message : fallback)
    }
  }, [locale, runId, serverUrl])

  useEffect(() => {
    // Restore on both 'idle' (stopped/dismissed) and 'completed' (finished naturally).
    // Restoring on 'completed' ensures localStorage is written back to real user data
    // immediately, guarding against app-quit before the user explicitly closes the coach.
    if ((status !== 'idle' && status !== 'completed') || !backupRef.current) return

    const backup = backupRef.current
    useCreatorStore.setState({
      currentStep: backup.creator.currentStep,
      resources: backup.creator.resources,
      drafts: backup.creator.drafts,
      feedbacks: backup.creator.feedbacks,
      lastUpdatedResourceKey: backup.creator.lastUpdatedResourceKey,
      draftSavedAt: backup.creator.draftSavedAt,
      draftHydrated: backup.creator.draftHydrated,
      draftRestored: backup.creator.draftRestored,
      draftRevision: backup.creator.draftRevision,
      bundleId: backup.creator.bundleId,
      bundleError: backup.creator.bundleError,
      submittingBundle: backup.creator.submittingBundle
    })
    useSearchHistoryStore.setState({ records: backup.savedSearches })
    useFhirInspectorStore.setState({
      latest: backup.fhirRequests.latest,
      history: backup.fhirRequests.history
    })
    useToastStore.setState({ history: backup.toastHistory })
    useFeatureShowcaseStore.getState().setSnapshot(undefined)
    backupRef.current = undefined
  }, [status])

  useEffect(() => {
    if (status === 'idle' || status === 'completed') return

    const step = FEATURE_SHOWCASE_STEPS[currentStepIndex]
    if (!step) {
      useFeatureShowcaseStore.getState().complete()
      return
    }

    useFeatureShowcaseStore.getState().activateStep(step, currentStepIndex, FEATURE_SHOWCASE_STEPS.length)
    navigate(step.route)

    if (step.ui?.creator?.currentStep !== undefined) {
      useCreatorStore.setState({ currentStep: step.ui.creator.currentStep })
    }
  }, [currentStepIndex, navigate, status])

  useEffect(() => {
    if (!autoplay || status !== 'running') return

    const step = FEATURE_SHOWCASE_STEPS[currentStepIndex]
    if (!step) return

    let cancelled = false

    void (async () => {
      await sleep(getAutoplayDelay(step.durationMs, reducedMotion))
      if (cancelled) return
      if (currentStepIndex >= FEATURE_SHOWCASE_STEPS.length - 1) {
        useFeatureShowcaseStore.getState().complete()
        return
      }
      useFeatureShowcaseStore.getState().next()
    })()

    return () => {
      cancelled = true
    }
  }, [autoplay, currentStepIndex, reducedMotion, status])

  return null
}
