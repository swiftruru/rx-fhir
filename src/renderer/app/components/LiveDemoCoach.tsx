import { GraduationCap, Pause, Play, SkipForward, Square, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from '../../shared/hooks/useReducedMotion'
import { Button } from '../../shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/components/ui/card'
import { useAppStore } from '../stores/appStore'
import { getLiveDemoNarrative } from '../../demo/liveDemoScript'
import { useLiveDemoStore } from '../stores/liveDemoStore'

export default function LiveDemoCoach(): React.JSX.Element | null {
  const { t } = useTranslation('creator')
  const locale = useAppStore((state) => state.locale)
  const reducedMotion = useReducedMotion()
  const {
    status,
    playMode,
    phase,
    currentStepId,
    currentIndex,
    totalSteps,
    error,
    coachCollapsed,
    pause,
    resume,
    stop,
    dismiss,
    requestAdvance,
    setPlayMode,
    setCoachCollapsed,
    start
  } = useLiveDemoStore()

  if (status === 'idle') return null

  const narrative = currentStepId ? getLiveDemoNarrative(currentStepId, locale) : undefined
  const phaseLabel = phase ? t(`liveDemo.phase.${phase}`) : t('liveDemo.phase.preparing')
  const isPaused = status === 'paused'
  const progressLabel = t('liveDemo.progress', {
    current: Math.min(currentIndex + 1, Math.max(totalSteps, 1)),
    total: Math.max(totalSteps, 1)
  })
  const title = status === 'completed'
    ? t('liveDemo.completedTitle')
    : status === 'error'
      ? t('liveDemo.errorTitle')
      : narrative?.title ?? t('liveDemo.preparingTitle')

  if (coachCollapsed) {
    return (
      <div className="pointer-events-none absolute bottom-6 right-3 z-50 max-w-[calc(100vw-1.5rem)]">
        <Card
          className={`pointer-events-auto w-auto border-primary/10 bg-background/80 shadow-lg ring-1 ring-black/5 dark:ring-white/5 ${
            reducedMotion
              ? 'opacity-100'
              : 'opacity-85 transition-opacity duration-200 hover:opacity-100'
          }`}
        >
          <CardContent className="flex items-center gap-2 px-2.5 py-1.5">
            <div className="flex min-w-0 items-center gap-2">
              <div className="inline-flex h-[1.625rem] w-[1.625rem] shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <GraduationCap className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold leading-none">{title}</p>
                <p className="mt-1 text-[10px] leading-none text-muted-foreground">{progressLabel}</p>
              </div>
            </div>

            <div className="ml-1 flex shrink-0 items-center gap-1">
              {status === 'completed' || status === 'error' ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-[1.625rem] w-[1.625rem] p-0"
                    onClick={() => start(totalSteps || 13, 'manual')}
                    aria-label={t('liveDemo.controls.replay')}
                    title={t('liveDemo.controls.replay')}
                  >
                    <Play className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-[1.625rem] w-[1.625rem] p-0"
                    onClick={dismiss}
                    aria-label={t('liveDemo.controls.close')}
                    title={t('liveDemo.controls.close')}
                  >
                    <Square className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  {playMode === 'manual' ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-[1.625rem] w-[1.625rem] p-0"
                        onClick={requestAdvance}
                        aria-label={t('liveDemo.controls.next')}
                        title={t('liveDemo.controls.next')}
                      >
                        <SkipForward className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        className="h-[1.625rem] w-[1.625rem] p-0"
                        onClick={() => setPlayMode('auto')}
                        aria-label={t('liveDemo.controls.enableAuto')}
                        title={t('liveDemo.controls.enableAuto')}
                      >
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        className="h-[1.625rem] w-[1.625rem] p-0"
                        onClick={isPaused ? resume : pause}
                        aria-label={isPaused ? t('liveDemo.controls.resume') : t('liveDemo.controls.pause')}
                        title={isPaused ? t('liveDemo.controls.resume') : t('liveDemo.controls.pause')}
                      >
                        {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-[1.625rem] w-[1.625rem] p-0"
                    onClick={stop}
                    aria-label={t('liveDemo.controls.stop')}
                    title={t('liveDemo.controls.stop')}
                  >
                    <Square className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-[1.625rem] w-[1.625rem] p-0"
                onClick={() => setCoachCollapsed(false)}
                title={t('liveDemo.controls.expand')}
                aria-label={t('liveDemo.controls.expand')}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="pointer-events-none absolute bottom-16 right-4 z-50 w-[390px] max-w-[calc(100vw-2rem)]">
      <Card className="pointer-events-auto border-primary/20 bg-background shadow-2xl ring-1 ring-black/5 dark:ring-white/5">
        <CardHeader className="space-y-3 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                <GraduationCap className="h-3.5 w-3.5" />
                <span>{t('liveDemo.panelTitle')}</span>
              </div>
              <CardTitle className="text-base">{title}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                {progressLabel}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => setCoachCollapsed(true)}
                title={t('liveDemo.controls.collapse')}
                aria-label={t('liveDemo.controls.collapse')}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border/70 px-2 py-0.5 font-medium">{phaseLabel}</span>
            {status === 'completed' && (
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t('liveDemo.completedBadge')}
              </span>
            )}
            {status === 'error' && (
              <span className="inline-flex items-center gap-1 text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                {t('liveDemo.errorBadge')}
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === 'completed' ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{t('liveDemo.completedDescription')}</p>
          ) : status === 'error' ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error || t('liveDemo.errorFallback')}
            </div>
          ) : narrative ? (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {t('liveDemo.sections.action')}
                </p>
                <p className="mt-1 leading-relaxed text-foreground/90">{narrative.action}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {t('liveDemo.sections.concept')}
                </p>
                <p className="mt-1 leading-relaxed text-foreground/90">{narrative.concept}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {t('liveDemo.sections.practical')}
                </p>
                <p className="mt-1 leading-relaxed text-foreground/90">{narrative.practical}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {t('liveDemo.sections.relation')}
                </p>
                <p className="mt-1 leading-relaxed text-foreground/90">{narrative.relation}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">{t('liveDemo.preparingDescription')}</p>
          )}

          {reducedMotion && (
            <div className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              {t('liveDemo.reducedMotionHint')}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            {status === 'completed' || status === 'error' ? (
              <>
                <Button size="sm" onClick={() => start(totalSteps || 13, 'manual')}>
                  <Play className="h-4 w-4" />
                  {t('liveDemo.controls.replay')}
                </Button>
                <Button size="sm" variant="outline" onClick={dismiss}>
                  {t('liveDemo.controls.close')}
                </Button>
              </>
            ) : (
              <>
                {playMode === 'manual' ? (
                  <>
                    <Button size="sm" variant="outline" onClick={requestAdvance}>
                      <SkipForward className="h-4 w-4" />
                      {t('liveDemo.controls.next')}
                    </Button>
                    <Button size="sm" onClick={() => setPlayMode('auto')}>
                      <Play className="h-4 w-4" />
                      {t('liveDemo.controls.enableAuto')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" onClick={isPaused ? resume : pause}>
                      {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                      {isPaused ? t('liveDemo.controls.resume') : t('liveDemo.controls.pause')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPlayMode('manual')}>
                      {t('liveDemo.controls.switchToManual')}
                    </Button>
                  </>
                )}
                <Button size="sm" variant="ghost" onClick={stop}>
                  <Square className="h-4 w-4" />
                  {t('liveDemo.controls.stop')}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
