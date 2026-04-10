import { useEffect, useRef } from 'react'
import { hasCreatorPersistableWork, type CreatorDraftValues } from '../store/creatorStore'
import type { CreatorShortcutActions } from '../../../shared/stores/shortcutActionStore'
import type { ToastInput } from '../../../shared/stores/toastStore'
import type { CreatedResources } from '../../../types/fhir'

interface CreatorLaunchState {
  quickStartScenario?: 'overview'
}

interface UseCreatorPageEffectsArgs {
  bundleId?: string
  drafts: CreatorDraftValues
  resources: CreatedResources
  featureShowcaseStatus: string
  locationState: unknown
  setStep: (step: number) => void
  setTemplatePanelOpen: (open: boolean) => void
  setCreatorActions: (actions: Partial<CreatorShortcutActions>) => void
  clearCreatorActions: (keys?: Array<keyof CreatorShortcutActions>) => void
  navigate: (to: string, options?: { replace?: boolean; state?: unknown }) => void
  pushToast: (toast: ToastInput) => string
  announcePolite: (message: string) => void
  handleGoToConsumer: () => void
  t: (key: string, options?: Record<string, unknown>) => string
}

export function useCreatorPageEffects({
  announcePolite,
  bundleId,
  clearCreatorActions,
  drafts,
  featureShowcaseStatus,
  handleGoToConsumer,
  locationState,
  navigate,
  pushToast,
  resources,
  setCreatorActions,
  setStep,
  setTemplatePanelOpen,
  t
}: UseCreatorPageEffectsArgs): void {
  const lastAnnouncedBundleId = useRef<string | undefined>(undefined)

  useEffect(() => {
    setCreatorActions({
      openTemplates: () => setTemplatePanelOpen(true)
    })

    return () => {
      clearCreatorActions(['openTemplates'])
    }
  }, [clearCreatorActions, setCreatorActions, setTemplatePanelOpen])

  useEffect(() => {
    const launchState = locationState as CreatorLaunchState | null
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
  }, [announcePolite, bundleId, drafts, locationState, navigate, pushToast, resources, setStep, setTemplatePanelOpen, t])

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
}
