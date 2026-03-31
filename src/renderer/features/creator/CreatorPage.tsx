import { useMemo, useState } from 'react'
import { CheckCircle2, RotateCcw, AlertTriangle, Save } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Alert, AlertDescription } from '../../components/ui/alert'
import ResourceStepper from './ResourceStepper'
import { useCreatorStore } from '../../store/creatorStore'
import type { ConsumerLaunchState } from '../consumer/searchState'

export default function CreatorPage(): React.JSX.Element {
  const { bundleId, resources, reset, draftRestored, dismissDraftRestored, draftSavedAt, draftHydrated } = useCreatorStore()
  const { t } = useTranslation('creator')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)

  const formattedDraftTime = useMemo(() => {
    if (!draftSavedAt) return undefined
    const parsed = new Date(draftSavedAt)
    if (Number.isNaN(parsed.getTime())) return undefined
    return parsed.toLocaleString()
  }, [draftSavedAt])
  const patientIdentifier = resources.patient?.identifier?.[0]?.value

  function handleResetClick(): void {
    setConfirming(true)
  }

  function handleConfirm(): void {
    reset()
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

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background shrink-0">
        <div>
          <h1 className="text-xl font-bold">{t('page.title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('page.description')}</p>
          <p className="text-xs text-muted-foreground/80 mt-1">{t('page.draftHint')}</p>
        </div>

        {confirming ? (
          <div className="flex items-center gap-3 bg-destructive/8 border border-destructive/30 rounded-lg px-4 py-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-destructive">{t('page.resetConfirmTitle')}</p>
              <p className="text-xs text-muted-foreground">{t('page.resetConfirmDesc')}</p>
            </div>
            <div className="flex gap-2 ml-2">
              <Button size="sm" variant="destructive" onClick={handleConfirm}>
                {t('page.resetConfirmOk')}
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                {t('page.resetConfirmCancel')}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={handleResetClick}>
            <RotateCcw className="h-4 w-4" />
            {tc('buttons.reset')}
          </Button>
        )}
      </div>

      {!bundleId && draftSavedAt && (
        <div className="px-6 py-2 border-b bg-emerald-50/80 dark:bg-emerald-500/10 shrink-0">
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 text-xs text-emerald-900 dark:text-emerald-300"
          >
            <Save className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium">{t('page.draftSavedTitle')}</span>
            <span className="text-emerald-800/80 dark:text-emerald-300/80">
              {formattedDraftTime
                ? t('page.draftSavedWithTime', { time: formattedDraftTime })
                : t('page.draftSaved')}
            </span>
          </div>
        </div>
      )}

      {draftHydrated && draftRestored && (
        <div className="px-6 py-3 border-b bg-muted/30 shrink-0">
          <Alert>
            <Save className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-3">
              <div>
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
        <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-200 shrink-0">
          <Alert variant="success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-3">
              <div>
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

      {/* Stepper */}
      <div className="flex-1 overflow-hidden">
        <ResourceStepper onBundleSuccess={(id) => console.log('Bundle created:', id)} />
      </div>
    </div>
  )
}
