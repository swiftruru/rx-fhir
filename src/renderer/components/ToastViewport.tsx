import { useEffect } from 'react'
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useToastStore, type ToastItem, type ToastVariant } from '../store/toastStore'

const TOAST_VARIANTS: Record<ToastVariant, {
  container: string
  icon: typeof CheckCircle2
  iconClassName: string
}> = {
  success: {
    container: 'border-emerald-200/80 bg-emerald-50/95 text-emerald-950 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-100',
    icon: CheckCircle2,
    iconClassName: 'text-emerald-600 dark:text-emerald-300'
  },
  info: {
    container: 'border-sky-200/80 bg-sky-50/95 text-sky-950 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-100',
    icon: Info,
    iconClassName: 'text-sky-600 dark:text-sky-300'
  },
  warning: {
    container: 'border-amber-200/80 bg-amber-50/95 text-amber-950 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100',
    icon: TriangleAlert,
    iconClassName: 'text-amber-600 dark:text-amber-300'
  },
  error: {
    container: 'border-destructive/30 bg-destructive/10 text-foreground dark:bg-destructive/15',
    icon: AlertCircle,
    iconClassName: 'text-destructive'
  }
}

function ToastCard({ toast }: { toast: ToastItem }): React.JSX.Element {
  const dismissToast = useToastStore((state) => state.dismissToast)
  const markHistoryItemRead = useToastStore((state) => state.markHistoryItemRead)
  const reducedMotion = useReducedMotion()
  const { t } = useTranslation('common')
  const variant = TOAST_VARIANTS[toast.variant]
  const Icon = variant.icon

  useEffect(() => {
    const timer = window.setTimeout(() => {
      dismissToast(toast.id)
    }, toast.durationMs)

    return () => window.clearTimeout(timer)
  }, [dismissToast, toast.durationMs, toast.id])

  return (
    <div
      role={toast.variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto rounded-xl border shadow-lg backdrop-blur-sm',
        'animate-in slide-in-from-top-2 fade-in-0',
        variant.container,
        reducedMotion && '!animate-none !transition-none'
      )}
    >
      <div className="flex gap-3 p-4">
        <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', variant.iconClassName)} />
        <div className="min-w-0 flex-1 space-y-1">
          {toast.title && <p className="text-sm font-semibold leading-5">{toast.title}</p>}
          <p className="text-sm leading-5">{toast.description}</p>

          {(() => {
            const actionsToRender = toast.actions ?? (toast.action ? [toast.action] : [])
            if (actionsToRender.length === 0) return null
            return (
              <div className="flex flex-wrap gap-2 pt-1">
                {actionsToRender.map((a, i) => (
                  <Button
                    key={i}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 bg-background/70"
                    onClick={() => {
                      markHistoryItemRead(toast.id)
                      a.onAction()
                      dismissToast(toast.id)
                    }}
                  >
                    {a.label}
                  </Button>
                ))}
              </div>
            )
          })()}
        </div>

        <button
          type="button"
          onClick={() => {
            markHistoryItemRead(toast.id)
            dismissToast(toast.id)
          }}
          className="rounded-md p-1 text-foreground/60 transition-colors hover:bg-black/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:hover:bg-white/10"
          aria-label={t('buttons.close')}
          title={t('buttons.close')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default function ToastViewport(): React.JSX.Element | null {
  const toasts = useToastStore((state) => state.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed right-4 top-14 z-[120] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  )
}
