import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, RotateCcw, AlertTriangle, Save, GraduationCap, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Alert, AlertDescription } from '../../components/ui/alert'
import ResourceStepper from './ResourceStepper'
import PrescriptionTemplatePanel from './components/PrescriptionTemplatePanel'
import { RESOURCE_STEPS } from '../../types/fhir.d'
import { hasCreatorPersistableWork, useCreatorStore } from '../../store/creatorStore'
import { useMockStore } from '../../store/mockStore'
import { LIVE_DEMO_STEPS } from '../../demo/liveDemoScript'
import { useLiveDemoStore } from '../../store/liveDemoStore'
import { useFeatureShowcaseStore } from '../../store/featureShowcaseStore'
import { useShortcutActionStore } from '../../store/shortcutActionStore'
import { useToastStore } from '../../store/toastStore'
import { useAccessibilityStore } from '../../store/accessibilityStore'
import type { ConsumerLaunchState } from '../consumer/searchState'
import { diffCreatorSubmissionSnapshot } from '../../lib/creatorSubmissionDiff'

interface CreatorLaunchState {
  quickStartScenario?: 'overview'
}

export default function CreatorPage(): React.JSX.Element {
  const {
    bundleId,
    resources,
    reset,
    draftRestored,
    dismissDraftRestored,
    draftSavedAt,
    draftHydrated,
    draftStatus,
    drafts,
    lastSubmittedSnapshot,
    setStep
  } = useCreatorStore()
  const resetMockScenario = useMockStore((s) => s.reset)
  const liveDemoStatus = useLiveDemoStore((s) => s.status)
  const startLiveDemo = useLiveDemoStore((s) => s.start)
  const featureShowcaseStatus = useFeatureShowcaseStore((s) => s.status)
  const setCreatorActions = useShortcutActionStore((state) => state.setCreatorActions)
  const clearCreatorActions = useShortcutActionStore((state) => state.clearCreatorActions)
  const { t } = useTranslation('creator')
  const { t: tc } = useTranslation('common')
  const pushToast = useToastStore((state) => state.pushToast)
  const announcePolite = useAccessibilityStore((state) => state.announcePolite)
  const location = useLocation()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [templatePanelOpen, setTemplatePanelOpen] = useState(false)
  const lastAnnouncedBundleId = useRef<string | undefined>(undefined)

  const formattedDraftTime = useMemo(() => {
    if (!draftSavedAt) return undefined
    const parsed = new Date(draftSavedAt)
    if (Number.isNaN(parsed.getTime())) return undefined
    return parsed.toLocaleString()
  }, [draftSavedAt])
  const patientIdentifier = resources.patient?.identifier?.[0]?.value
  const hasDraftWork = !bundleId && hasCreatorPersistableWork(resources, drafts)
  const draftDiff = useMemo(
    () => diffCreatorSubmissionSnapshot(lastSubmittedSnapshot, drafts),
    [drafts, lastSubmittedSnapshot]
  )
  const formattedSubmittedTime = useMemo(() => {
    if (!lastSubmittedSnapshot?.submittedAt) return undefined
    const parsed = new Date(lastSubmittedSnapshot.submittedAt)
    if (Number.isNaN(parsed.getTime())) return undefined
    return parsed.toLocaleString()
  }, [lastSubmittedSnapshot?.submittedAt])
  function handleResetClick(): void {
    setConfirming(true)
  }

  function handleConfirm(): void {
    reset()
    resetMockScenario()
    setConfirming(false)
  }

  function handleCancel(): void {
    setConfirming(false)
  }

  function handleGoToConsumer(): void {
    if (!bundleId || !patientIdentifier) {
      navigate('/consumer')
      return
    }

    const launchState: ConsumerLaunchState = {
      prefill: {
        tab: 'basic',
        searchBy: 'identifier',
        value: patientIdentifier
      },
      autoSearch: {
        mode: 'basic',
        identifier: patientIdentifier
      },
      targetBundleId: bundleId
    }

    navigate('/consumer', { state: launchState })
  }

  function handleStartLiveDemo(): void {
    startLiveDemo(LIVE_DEMO_STEPS.length, 'manual')
  }

  const liveDemoActive = liveDemoStatus === 'running' || liveDemoStatus === 'paused'
  const featureShowcaseActive = featureShowcaseStatus === 'running' || featureShowcaseStatus === 'paused'

  useEffect(() => {
    setCreatorActions({
      openTemplates: () => setTemplatePanelOpen(true)
    })

    return () => {
      clearCreatorActions(['openTemplates'])
    }
  }, [clearCreatorActions, setCreatorActions])

  useEffect(() => {
    const launchState = location.state as CreatorLaunchState | null
    if (!launchState?.quickStartScenario) return

    navigate('/creator', { replace: true, state: null })

    if (launchState.quickStartScenario !== 'overview') return

    setTemplatePanelOpen(false)
    setStep(0)

    const hasExistingWork = Boolean(bundleId || hasCreatorPersistableWork(resources, drafts))
    const message = hasExistingWork
      ? t('page.quickStart.creatorOpenedWithDraft')
      : t('page.quickStart.creatorOpened')

    announcePolite(message)
    pushToast({
      variant: 'info',
      description: message
    })
  }, [announcePolite, bundleId, drafts, location.state, navigate, pushToast, resources, setStep, t])

  useEffect(() => {
    if (!bundleId || bundleId === lastAnnouncedBundleId.current) return
    lastAnnouncedBundleId.current = bundleId
    if (featureShowcaseStatus !== 'idle') return

    pushToast({
      variant: 'success',
      title: t('page.bundleToastTitle'),
      description: t('page.bundleToastDescription', { bundleId }),
      action: {
        label: t('page.goToConsumer'),
        onAction: handleGoToConsumer
      }
    })
  }, [bundleId, featureShowcaseStatus, handleGoToConsumer, pushToast, t])

  const draftStatusUi = draftStatus === 'saving'
    ? {
      title: t('page.draftStatus.savingTitle'),
      description: t('page.draftStatus.savingDescription'),
      className: 'bg-amber-50/80 text-amber-950 dark:bg-amber-500/10 dark:text-amber-100',
      detailClassName: 'text-amber-800/80 dark:text-amber-200/80',
      icon: Loader2
    }
    : draftStatus === 'error'
      ? {
        title: t('page.draftStatus.errorTitle'),
        description: t('page.draftStatus.errorDescription'),
        className: 'bg-destructive/10 text-foreground',
        detailClassName: 'text-muted-foreground',
        icon: AlertTriangle
      }
      : {
        title: t('page.draftStatus.savedTitle'),
        description: formattedDraftTime
          ? t('page.draftStatus.savedDescriptionWithTime', { time: formattedDraftTime })
          : t('page.draftStatus.savedDescription'),
        className: 'bg-emerald-50/80 text-emerald-950 dark:bg-emerald-500/10 dark:text-emerald-100',
        detailClassName: 'text-emerald-800/80 dark:text-emerald-200/80',
        icon: Save
      }

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="shrink-0 border-b bg-background px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <h1 data-page-heading="true" tabIndex={-1} className="text-xl font-bold tracking-tight outline-none">
              {t('page.title')}
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t('page.description')}</p>
            <p className="mt-1 text-xs text-muted-foreground/80">{t('page.draftHint')}</p>
          </div>

          {!confirming && (
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-xl px-4"
                onClick={handleStartLiveDemo}
                disabled={liveDemoActive || featureShowcaseActive}
              >
                <GraduationCap className="h-4 w-4" />
                {liveDemoActive ? t('liveDemo.runningButton') : t('liveDemo.startButton')}
              </Button>
              <PrescriptionTemplatePanel
                disabled={liveDemoActive || featureShowcaseActive}
                open={templatePanelOpen}
                onOpenChange={setTemplatePanelOpen}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-xl px-4"
                onClick={handleResetClick}
                disabled={liveDemoActive || featureShowcaseActive}
              >
                <RotateCcw className="h-4 w-4" />
                {tc('buttons.reset')}
              </Button>
            </div>
          )}
        </div>

        {confirming && (
          <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/8 px-4 py-3 sm:flex-row sm:items-center">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium text-destructive">{t('page.resetConfirmTitle')}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t('page.resetConfirmDesc')}</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:ml-2">
              <Button size="sm" variant="destructive" className="rounded-xl px-4" onClick={handleConfirm}>
                {t('page.resetConfirmOk')}
              </Button>
              <Button size="sm" variant="outline" className="rounded-xl px-4" onClick={handleCancel}>
                {t('page.resetConfirmCancel')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {!bundleId && hasDraftWork && (
        <div className={`border-b px-4 py-2 shrink-0 sm:px-6 ${draftStatusUi.className}`}>
          <div
            role={draftStatus === 'error' ? 'alert' : 'status'}
            aria-live={draftStatus === 'error' ? 'assertive' : 'polite'}
            className="flex flex-wrap items-center gap-2 text-xs"
          >
            <draftStatusUi.icon className={draftStatus === 'saving' ? 'h-3.5 w-3.5 shrink-0 animate-spin' : 'h-3.5 w-3.5 shrink-0'} />
            <span className="font-medium">{draftStatusUi.title}</span>
            <span className={draftStatusUi.detailClassName}>{draftStatusUi.description}</span>
          </div>
        </div>
      )}

      {draftHydrated && draftRestored && (
        <div className="px-4 py-3 border-b bg-muted/30 shrink-0 sm:px-6">
          <Alert>
            <Save className="h-4 w-4" />
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium">{t('page.draftRestoredTitle')}</p>
                <p className="text-xs text-muted-foreground">
                  {formattedDraftTime
                    ? t('page.draftRestoredDescWithTime', { time: formattedDraftTime })
                    : t('page.draftRestoredDesc')}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={dismissDraftRestored}>
                {tc('buttons.close')}
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Success banner */}
      {bundleId && (
        <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-200 shrink-0 sm:px-6">
          <Alert variant="success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                {t('page.successMessage')}{' '}
                <code className="font-mono font-bold text-sm">{bundleId}</code>
                <span className="ml-2 text-xs text-muted-foreground">
                  {t('page.successHint')}
                </span>
              </div>
              <Button size="sm" variant="outline" onClick={handleGoToConsumer}>
                {t('page.goToConsumer')}
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {bundleId && draftDiff.changedSteps.length > 0 && (
        <div className="px-4 py-3 border-b bg-amber-50/70 border-amber-200/80 shrink-0 sm:px-6">
          <div className="rounded-xl border border-amber-200/80 bg-background/85 p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">{t('page.compare.title')}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {formattedSubmittedTime
                    ? t('page.compare.descriptionWithTime', {
                      time: formattedSubmittedTime,
                      count: draftDiff.changedSteps.length,
                      fields: draftDiff.totalChangedFields
                    })
                    : t('page.compare.description', {
                      count: draftDiff.changedSteps.length,
                      fields: draftDiff.totalChangedFields
                    })}
                </p>
              </div>
              <div className="rounded-full border border-amber-200 bg-amber-100/70 px-2.5 py-1 text-[11px] font-medium text-amber-900">
                {t('page.compare.changedBadge', { count: draftDiff.changedSteps.length })}
              </div>
            </div>

            <div className="mt-4 grid gap-2 lg:grid-cols-2">
              {draftDiff.changedSteps.map((item) => {
                const stepIndex = RESOURCE_STEPS.findIndex((step) => step.key === item.key)

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => stepIndex >= 0 && setStep(stepIndex)}
                    className="rounded-xl border border-border/80 bg-card px-3 py-3 text-left transition-colors hover:border-primary/30 hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">{t(`steps.${item.key}.label`)}</p>
                      <span className="text-[11px] text-muted-foreground">
                        {t('page.compare.changedFields', { count: item.changeCount })}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <p>
                        {t('page.compare.previousLabel')}: {item.previousSummary || t('page.compare.noSummary')}
                      </p>
                      <p>
                        {t('page.compare.currentLabel')}: {item.currentSummary || t('page.compare.noSummary')}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
      {/* Stepper */}
      <div className="flex-1 overflow-hidden">
        <ResourceStepper onBundleSuccess={(id) => console.log('Bundle created:', id)} />
      </div>
    </div>
  )
}
