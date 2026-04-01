import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { useCreatorStore } from '../store/creatorStore'
import { useFeatureShowcaseStore } from '../store/featureShowcaseStore'
import { useHistoryStore } from '../store/historyStore'
import { useSearchHistoryStore } from '../store/searchHistoryStore'
import { useFhirInspectorStore } from '../store/fhirInspectorStore'
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
  history: ReturnType<typeof useHistoryStore.getState>['records']
  savedSearches: ReturnType<typeof useSearchHistoryStore.getState>['records']
  fhirRequests: {
    latest: ReturnType<typeof useFhirInspectorStore.getState>['latest']
    history: ReturnType<typeof useFhirInspectorStore.getState>['history']
  }
}

const AUTOPLAY_DURATION_MULTIPLIER = 1.6

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export default function FeatureShowcaseRunner(): null {
  const navigate = useNavigate()
  const locale = useAppStore((state) => state.locale)
  const serverUrl = useAppStore((state) => state.serverUrl)
  const runId = useFeatureShowcaseStore((state) => state.runId)
  const status = useFeatureShowcaseStore((state) => state.status)
  const autoplay = useFeatureShowcaseStore((state) => state.autoplay)
  const currentStepIndex = useFeatureShowcaseStore((state) => state.currentStepIndex)
  const backupRef = useRef<ShowcaseBackup>()

  useEffect(() => {
    if (runId === 0) return

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
      history: useHistoryStore.getState().records,
      savedSearches: useSearchHistoryStore.getState().records,
      fhirRequests: {
        latest: useFhirInspectorStore.getState().latest,
        history: useFhirInspectorStore.getState().history
      }
    }

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
      useHistoryStore.setState({ records: snapshot.recentRecords })
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
    if (status !== 'idle' || !backupRef.current) return

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
    useHistoryStore.setState({ records: backup.history })
    useSearchHistoryStore.setState({ records: backup.savedSearches })
    useFhirInspectorStore.setState({
      latest: backup.fhirRequests.latest,
      history: backup.fhirRequests.history
    })
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
      await sleep(Math.round(step.durationMs * AUTOPLAY_DURATION_MULTIPLIER))
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
  }, [autoplay, currentStepIndex, status])

  return null
}
