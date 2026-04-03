import { useMemo } from 'react'
import { AlertCircle, Bell, CheckCircle2, Info, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from './ui/dialog'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import { useActivityCenterStore, type ActivityCenterFilter } from '../store/activityCenterStore'
import { useToastStore, type ToastHistoryItem, type ToastVariant } from '../store/toastStore'

const VARIANT_STYLES: Record<
  ToastVariant,
  {
    icon: typeof CheckCircle2
    iconClassName: string
    accentClassName: string
    badgeClassName: string
    surfaceClassName: string
  }
> = {
  success: {
    icon: CheckCircle2,
    iconClassName: 'text-emerald-600 dark:text-emerald-300',
    accentClassName: 'bg-emerald-500/80',
    badgeClassName: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
    surfaceClassName: 'border-emerald-500/15 bg-emerald-500/[0.08]'
  },
  info: {
    icon: Info,
    iconClassName: 'text-sky-600 dark:text-sky-300',
    accentClassName: 'bg-sky-500/80',
    badgeClassName: 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-200',
    surfaceClassName: 'border-sky-500/15 bg-sky-500/[0.08]'
  },
  warning: {
    icon: TriangleAlert,
    iconClassName: 'text-amber-600 dark:text-amber-300',
    accentClassName: 'bg-amber-500/80',
    badgeClassName: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-200',
    surfaceClassName: 'border-amber-500/15 bg-amber-500/[0.08]'
  },
  error: {
    icon: AlertCircle,
    iconClassName: 'text-destructive',
    accentClassName: 'bg-destructive/85',
    badgeClassName: 'border-destructive/20 bg-destructive/10 text-destructive',
    surfaceClassName: 'border-destructive/15 bg-destructive/[0.08]'
  }
}

function formatTimestamp(value: string, locale: string): string {
  const date = new Date(value)
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function ActivityItem({ item }: { item: ToastHistoryItem }): React.JSX.Element {
  const { t, i18n } = useTranslation('common')
  const markHistoryItemRead = useToastStore((state) => state.markHistoryItemRead)
  const styles = VARIANT_STYLES[item.variant]
  const Icon = styles.icon
  const timestamp = useMemo(() => formatTimestamp(item.createdAt, i18n.language), [i18n.language, item.createdAt])

  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card/80 p-4 shadow-sm transition-colors',
        item.read ? 'border-border/70' : 'border-primary/30 bg-primary/[0.04]'
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-4 left-0 w-1 rounded-full transition-opacity',
          styles.accentClassName,
          item.read ? 'opacity-50' : 'opacity-100'
        )}
      />
      <div className="flex gap-3 pl-2">
        <div
          className={cn(
            'mt-0.5 rounded-xl border p-2.5 shadow-sm',
            item.read ? 'border-border/70 bg-background/70' : styles.surfaceClassName
          )}
        >
          <Icon className={cn('h-4 w-4', styles.iconClassName)} />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold leading-5">
                  {item.title ?? t(`activityCenter.variants.${item.variant}`)}
                </p>
                <span
                  className={cn(
                    'rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                    styles.badgeClassName
                  )}
                >
                  {t(`activityCenter.variants.${item.variant}`)}
                </span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                    item.read
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-primary/15 text-primary'
                  )}
                >
                  {item.read ? t('activityCenter.status.read') : t('activityCenter.status.unread')}
                </span>
              </div>

              <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
            </div>

            <span className="shrink-0 rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">
              {timestamp}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            {!item.read && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 rounded-lg px-2 text-xs"
                onClick={() => markHistoryItemRead(item.id)}
              >
                {t('activityCenter.markRead')}
              </Button>
            )}
            {item.action && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 rounded-lg"
                onClick={() => {
                  markHistoryItemRead(item.id)
                  item.action?.onAction()
                }}
              >
                {item.action.label}
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

export default function ActivityCenterDialog(): React.JSX.Element {
  const { t } = useTranslation('common')
  const open = useActivityCenterStore((state) => state.open)
  const filter = useActivityCenterStore((state) => state.filter)
  const closeCenter = useActivityCenterStore((state) => state.closeCenter)
  const setFilter = useActivityCenterStore((state) => state.setFilter)
  const history = useToastStore((state) => state.history)
  const clearHistory = useToastStore((state) => state.clearHistory)
  const markAllHistoryRead = useToastStore((state) => state.markAllHistoryRead)

  const filterOrder = useMemo<ActivityCenterFilter[]>(
    () => ['all', 'unread', 'success', 'info', 'warning', 'error'],
    []
  )

  const filterCounts = useMemo(
    () => ({
      all: history.length,
      unread: history.filter((item) => !item.read).length,
      success: history.filter((item) => item.variant === 'success').length,
      info: history.filter((item) => item.variant === 'info').length,
      warning: history.filter((item) => item.variant === 'warning').length,
      error: history.filter((item) => item.variant === 'error').length
    }),
    [history]
  )

  const filteredHistory = useMemo(() => {
    switch (filter) {
      case 'unread':
        return history.filter((item) => !item.read)
      case 'success':
      case 'info':
      case 'warning':
      case 'error':
        return history.filter((item) => item.variant === filter)
      case 'all':
      default:
        return history
    }
  }, [filter, history])

  const unreadCount = filterCounts.unread

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && closeCenter()}>
      <DialogContent className="left-auto right-4 top-14 w-[min(30rem,calc(100vw-2rem))] max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-[26px] border bg-background/96 p-0 shadow-2xl backdrop-blur-xl">
        <DialogHeader className="border-b bg-card/75 px-5 py-4 pr-14">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <DialogTitle className="text-xl">{t('activityCenter.title')}</DialogTitle>
              <DialogDescription className="max-w-sm leading-relaxed">{t('activityCenter.description')}</DialogDescription>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {unreadCount > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-lg px-2 text-xs"
                  onClick={() => markAllHistoryRead()}
                >
                  {t('activityCenter.markAllRead')}
                </Button>
              )}
              {history.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-lg px-2 text-xs"
                  onClick={() => clearHistory()}
                >
                  {t('activityCenter.clear')}
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto px-5 py-4">
          {history.length > 0 && (
            <div className="sticky top-0 z-10 -mx-5 mb-4 border-b bg-background/95 px-5 pb-4 backdrop-blur">
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border/70 bg-card/70 px-3 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {t('activityCenter.summary.total')}
                    </p>
                    <p className="mt-1 text-xl font-semibold">{history.length}</p>
                  </div>
                  <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] px-3 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {t('activityCenter.summary.unread')}
                    </p>
                    <p className="mt-1 text-xl font-semibold text-primary">{unreadCount}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-card/70 px-3 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {t('activityCenter.summary.filter')}
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {t(`activityCenter.filters.${filter}`)}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-card/70 p-2">
                  <div className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t('activityCenter.overview')}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {filterOrder.map((option) => (
                      <Button
                        key={option}
                        type="button"
                        size="sm"
                        variant={filter === option ? 'default' : 'outline'}
                        className={cn(
                          'h-8 rounded-full px-3 text-xs',
                          filter === option
                            ? 'shadow-sm'
                            : 'border-border/70 bg-background/70 hover:bg-muted/30'
                        )}
                        onClick={() => setFilter(option)}
                      >
                        <span>{t(`activityCenter.filters.${option}`)}</span>
                        <span className="ml-2 rounded-full bg-background/70 px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
                          {filterCounts[option]}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {history.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
              <Bell className="mx-auto mb-3 h-5 w-5 text-muted-foreground/70" />
              <p>{t('activityCenter.empty')}</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
              <Bell className="mx-auto mb-3 h-5 w-5 text-muted-foreground/70" />
              <p>{t('activityCenter.emptyFiltered', { filter: t(`activityCenter.filters.${filter}`) })}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((item) => (
                <ActivityItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
