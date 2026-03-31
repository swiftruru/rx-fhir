import { useState } from 'react'
import { CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/button'
import { Alert, AlertDescription } from '../../components/ui/alert'
import ResourceStepper from './ResourceStepper'
import { useCreatorStore } from '../../store/creatorStore'

export default function CreatorPage(): React.JSX.Element {
  const { bundleId, reset } = useCreatorStore()
  const { t } = useTranslation('creator')
  const { t: tc } = useTranslation('common')
  const [confirming, setConfirming] = useState(false)

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

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background shrink-0">
        <div>
          <h1 className="text-xl font-bold">{t('page.title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('page.description')}</p>
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

      {/* Success banner */}
      {bundleId && (
        <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-200 shrink-0">
          <Alert variant="success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              {t('page.successMessage')}{' '}
              <code className="font-mono font-bold text-sm">{bundleId}</code>
              <span className="ml-2 text-xs text-muted-foreground">
                {t('page.successHint')}
              </span>
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
