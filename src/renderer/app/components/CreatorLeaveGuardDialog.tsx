import { AlertTriangle, Loader2, Save } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../../shared/components/ui/dialog'
import { Button } from '../../shared/components/ui/button'
import { getRouteNavKey } from '../../shared/lib/routeMeta'
import { useNavigationGuardStore } from '../stores/navigationGuardStore'

export default function CreatorLeaveGuardDialog(): React.JSX.Element {
  const { t } = useTranslation('creator')
  const { t: tn } = useTranslation('nav')
  const navigate = useNavigate()
  const pendingNavigation = useNavigationGuardStore((state) => state.pendingNavigation)
  const clearNavigationRequest = useNavigationGuardStore((state) => state.clearNavigationRequest)

  const routeKey = pendingNavigation ? getRouteNavKey(pendingNavigation.to) : undefined
  const targetLabel = pendingNavigation?.label ?? (routeKey ? tn(`items.${routeKey}.label`) : undefined)

  const description = pendingNavigation?.draftStatus === 'saving'
    ? t('page.leaveGuard.savingDescription')
    : pendingNavigation?.draftStatus === 'error'
      ? t('page.leaveGuard.errorDescription')
      : t('page.leaveGuard.description')

  const Icon = pendingNavigation?.draftStatus === 'saving' ? Loader2 : pendingNavigation?.draftStatus === 'error' ? AlertTriangle : Save

  function handleConfirm(): void {
    if (!pendingNavigation) return

    navigate(pendingNavigation.to, {
      replace: pendingNavigation.replace,
      state: pendingNavigation.state
    })
    clearNavigationRequest()
  }

  return (
    <Dialog open={Boolean(pendingNavigation)} onOpenChange={(open) => !open && clearNavigationRequest()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2 text-destructive">
            <Icon className={pendingNavigation?.draftStatus === 'saving' ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            <span className="text-xs font-medium uppercase tracking-wide">
              {t('page.leaveGuard.badge')}
            </span>
          </div>
          <DialogTitle>{t('page.leaveGuard.title')}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
          {targetLabel && (
            <p className="text-sm text-muted-foreground">
              {t('page.leaveGuard.targetDescription', { page: targetLabel })}
            </p>
          )}
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={clearNavigationRequest}>
            {t('page.leaveGuard.cancel')}
          </Button>
          <Button type="button" onClick={handleConfirm}>
            {t('page.leaveGuard.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
