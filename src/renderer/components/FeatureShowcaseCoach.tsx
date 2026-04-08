import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Presentation, Pause, Play, SkipBack, SkipForward, Square, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { useFeatureShowcaseStore } from '../store/featureShowcaseStore'
import type { FeatureShowcasePanelPlacement, FeatureShowcaseRect } from '../showcase/types'

const VIEWPORT_PADDING = 24
const PANEL_GAP = 18
const PANEL_WIDTH = 384

type CoachSide = 'right' | 'left' | 'top' | 'bottom'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}

function getFallbackStyle(placement: FeatureShowcasePanelPlacement): React.CSSProperties {
  switch (placement) {
    case 'bottom-left':
      return { left: VIEWPORT_PADDING, bottom: VIEWPORT_PADDING }
    case 'top-right':
      return { right: VIEWPORT_PADDING, top: 64 }
    case 'top-left':
      return { left: VIEWPORT_PADDING, top: 64 }
    case 'bottom-right':
    default:
      return { right: VIEWPORT_PADDING, bottom: VIEWPORT_PADDING }
  }
}

function getPreferredSides(placement: FeatureShowcasePanelPlacement): Array<'right' | 'left' | 'top' | 'bottom'> {
  switch (placement) {
    case 'top-left':
      return ['left', 'top', 'bottom', 'right']
    case 'bottom-left':
      return ['left', 'bottom', 'top', 'right']
    case 'top-right':
      return ['right', 'top', 'bottom', 'left']
    case 'bottom-right':
    default:
      return ['right', 'bottom', 'top', 'left']
  }
}

function getCoachStyle(
  target: FeatureShowcaseRect,
  placement: FeatureShowcasePanelPlacement,
  cardHeight: number,
  spotlightPadding: number
): { style: React.CSSProperties; side: CoachSide } {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const width = Math.min(PANEL_WIDTH, viewportWidth - VIEWPORT_PADDING * 2)
  const height = Math.min(cardHeight || 520, viewportHeight - VIEWPORT_PADDING * 2)
  const paddedTarget = {
    top: Math.max(0, target.top - spotlightPadding),
    left: Math.max(0, target.left - spotlightPadding),
    width: target.width + spotlightPadding * 2,
    height: target.height + spotlightPadding * 2
  }

  const room = {
    right: viewportWidth - (paddedTarget.left + paddedTarget.width) - VIEWPORT_PADDING,
    left: paddedTarget.left - VIEWPORT_PADDING,
    top: paddedTarget.top - VIEWPORT_PADDING,
    bottom: viewportHeight - (paddedTarget.top + paddedTarget.height) - VIEWPORT_PADDING
  }

  const sides = getPreferredSides(placement)
  const chosenSide =
    sides.find((side) => room[side] >= (side === 'left' || side === 'right' ? width : height) + PANEL_GAP) ??
    Object.entries(room).sort((a, b) => b[1] - a[1])[0]?.[0] as CoachSide

  switch (chosenSide) {
    case 'left':
      return {
        side: chosenSide,
        style: {
          left: clamp(
            paddedTarget.left - width - PANEL_GAP,
            VIEWPORT_PADDING,
            viewportWidth - VIEWPORT_PADDING - width
          ),
          top: clamp(
            paddedTarget.top + paddedTarget.height / 2 - height / 2,
            VIEWPORT_PADDING,
            viewportHeight - VIEWPORT_PADDING - height
          )
        }
      }
    case 'top':
      return {
        side: chosenSide,
        style: {
          left: clamp(
            paddedTarget.left + paddedTarget.width / 2 - width / 2,
            VIEWPORT_PADDING,
            viewportWidth - VIEWPORT_PADDING - width
          ),
          top: clamp(
            paddedTarget.top - height - PANEL_GAP,
            VIEWPORT_PADDING,
            viewportHeight - VIEWPORT_PADDING - height
          )
        }
      }
    case 'bottom':
      return {
        side: chosenSide,
        style: {
          left: clamp(
            paddedTarget.left + paddedTarget.width / 2 - width / 2,
            VIEWPORT_PADDING,
            viewportWidth - VIEWPORT_PADDING - width
          ),
          top: clamp(
            paddedTarget.top + paddedTarget.height + PANEL_GAP,
            VIEWPORT_PADDING,
            viewportHeight - VIEWPORT_PADDING - height
          )
        }
      }
    case 'right':
    default:
      return {
        side: chosenSide,
        style: {
          left: clamp(
            paddedTarget.left + paddedTarget.width + PANEL_GAP,
            VIEWPORT_PADDING,
            viewportWidth - VIEWPORT_PADDING - width
          ),
          top: clamp(
            paddedTarget.top + paddedTarget.height / 2 - height / 2,
            VIEWPORT_PADDING,
            viewportHeight - VIEWPORT_PADDING - height
          )
        }
      }
  }
}

function getConnectorClass(side: CoachSide): string {
  switch (side) {
    case 'left':
      return 'right-[-18px] top-1/2 -translate-y-1/2 flex-row-reverse'
    case 'top':
      return 'bottom-[-18px] left-1/2 -translate-x-1/2 flex-col-reverse'
    case 'bottom':
      return 'top-[-18px] left-1/2 -translate-x-1/2 flex-col'
    case 'right':
    default:
      return 'left-[-18px] top-1/2 -translate-y-1/2 flex-row'
  }
}

function getConnectorLineClass(side: CoachSide): string {
  return side === 'top' || side === 'bottom'
    ? 'h-4 w-px'
    : 'h-px w-4'
}

export default function FeatureShowcaseCoach(): React.JSX.Element | null {
  const { t } = useTranslation('showcase')
  const reducedMotion = useReducedMotion()
  const status = useFeatureShowcaseStore((state) => state.status)
  const autoplay = useFeatureShowcaseStore((state) => state.autoplay)
  const currentStepId = useFeatureShowcaseStore((state) => state.currentStepId)
  const currentStepIndex = useFeatureShowcaseStore((state) => state.currentStepIndex)
  const totalSteps = useFeatureShowcaseStore((state) => state.totalSteps)
  const error = useFeatureShowcaseStore((state) => state.error)
  const placement = useFeatureShowcaseStore((state) => state.currentPanelPlacement)
  const currentTargetId = useFeatureShowcaseStore((state) => state.currentTargetId)
  const targets = useFeatureShowcaseStore((state) => state.targets)
  const spotlightPadding = useFeatureShowcaseStore((state) => state.currentSpotlightPadding)
  const pause = useFeatureShowcaseStore((state) => state.pause)
  const resume = useFeatureShowcaseStore((state) => state.resume)
  const stop = useFeatureShowcaseStore((state) => state.stop)
  const next = useFeatureShowcaseStore((state) => state.next)
  const previous = useFeatureShowcaseStore((state) => state.previous)
  const setAutoplay = useFeatureShowcaseStore((state) => state.setAutoplay)
  const dismiss = useFeatureShowcaseStore((state) => state.dismiss)
  const start = useFeatureShowcaseStore((state) => state.start)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [cardHeight, setCardHeight] = useState(520)
  const [panelAnimationKey, setPanelAnimationKey] = useState(0)

  const target = currentTargetId ? targets[currentTargetId] : undefined

  useLayoutEffect(() => {
    const element = cardRef.current
    if (!element) return
    const updateHeight = (): void => setCardHeight(element.getBoundingClientRect().height)
    updateHeight()
    const observer = new ResizeObserver(() => updateHeight())
    observer.observe(element)
    window.addEventListener('resize', updateHeight)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateHeight)
    }
  }, [currentStepId, error, status, autoplay])

  const completed = status === 'completed' && !error
  const failed = status === 'completed' && Boolean(error)
  const isPaused = status === 'paused'
  const hasStep = Boolean(currentStepId)
  const stepKey = currentStepId ? `steps.${currentStepId}` : undefined
  const stepNumber = Math.min(currentStepIndex + 1, Math.max(totalSteps, 1))
  const progressLabel = t('progress', { current: stepNumber, total: Math.max(totalSteps, 1) })
  const title = completed
    ? t('completed.title')
    : failed
      ? t('error.title')
      : hasStep
        ? t(`${stepKey}.title`)
        : t('preparing.title')
  const coachPosition = useMemo(() => {
    if (!target || completed || failed) {
      return {
        style: getFallbackStyle(placement),
        side: (placement.includes('left') ? 'left' : 'right') as CoachSide
      }
    }
    return getCoachStyle(target, placement, cardHeight, spotlightPadding)
  }, [cardHeight, completed, failed, placement, spotlightPadding, target])

  useLayoutEffect(() => {
    if (status === 'idle' || reducedMotion) return
    setPanelAnimationKey((value) => value + 1)
  }, [coachPosition.side, currentStepId, currentStepIndex, currentTargetId, reducedMotion, status])

  if (status === 'idle') return null

  const panelMotionStyle: React.CSSProperties = {
    transformOrigin:
      coachPosition.side === 'left'
        ? 'right center'
        : coachPosition.side === 'right'
          ? 'left center'
          : coachPosition.side === 'top'
            ? 'center bottom'
            : 'center top',
    ['--showcase-coach-translate-x' as any]:
      reducedMotion ? '0px' : coachPosition.side === 'left' ? '-12px' : coachPosition.side === 'right' ? '12px' : '0px',
    ['--showcase-coach-translate-y' as any]:
      reducedMotion ? '0px' : coachPosition.side === 'top' ? '-12px' : coachPosition.side === 'bottom' ? '12px' : '0px'
  }

  if (!reducedMotion) {
    panelMotionStyle.animation = 'feature-showcase-coach-shift 520ms cubic-bezier(0.22, 1, 0.36, 1)'
  }

  return (
    <div
      className={`pointer-events-none fixed z-[60] ${
        reducedMotion
          ? 'transition-[top,left,right,bottom,opacity] duration-200 ease-out'
          : 'transition-all duration-500 ease-out'
      }`}
      style={coachPosition.style}
    >
      <Card
        key={reducedMotion ? 'feature-showcase-coach-static' : panelAnimationKey}
        ref={cardRef}
        className="pointer-events-auto relative w-[24rem] max-w-[calc(100vw-3rem)] max-h-[calc(100vh-3rem)] overflow-auto border-primary/20 bg-background shadow-2xl ring-1 ring-border/60 dark:ring-border/80"
        style={panelMotionStyle}
      >
        {!completed && !failed && target && (
          <div
            className={`pointer-events-none absolute z-10 flex items-center justify-center text-primary/70 ${getConnectorClass(coachPosition.side)}`}
          >
            <div
              className={`${getConnectorLineClass(coachPosition.side)} bg-primary/50 ${
                reducedMotion ? '' : 'shadow-[0_0_8px_rgba(244,114,182,0.28)]'
              }`}
            />
            <div
              className={`h-2.5 w-2.5 rounded-full bg-primary ${
                reducedMotion
                  ? 'shadow-[0_0_0_2px_rgba(255,255,255,0.88)] dark:shadow-[0_0_0_2px_rgba(17,24,39,0.88)]'
                  : 'shadow-[0_0_0_2px_rgba(255,255,255,0.9),0_0_12px_rgba(244,114,182,0.38)] dark:shadow-[0_0_0_2px_rgba(17,24,39,0.9),0_0_12px_rgba(244,114,182,0.38)]'
              }`}
            />
          </div>
        )}
        <CardHeader className="space-y-3 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                <Presentation className="h-3.5 w-3.5" />
                <span>{t('panelTitle')}</span>
              </div>
              <CardTitle className="text-lg">{title}</CardTitle>
            </div>
            <div className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
              {progressLabel}
            </div>
          </div>

          {!completed && !failed && hasStep && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t(`${stepKey}.summary`)}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {completed ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200">
              {t('completed.description')}
            </div>
          ) : failed ? (
            <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : hasStep ? (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {t('sections.feature')}
                </p>
                <p className="mt-1 leading-relaxed text-foreground/90">{t(`${stepKey}.feature`)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {t('sections.problem')}
                </p>
                <p className="mt-1 leading-relaxed text-foreground/90">{t(`${stepKey}.problem`)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {t('sections.role')}
                </p>
                <p className="mt-1 leading-relaxed text-foreground/90">{t(`${stepKey}.role`)}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              {t('preparing.description')}
            </div>
          )}

          {reducedMotion && (
            <div className="rounded-xl border border-border/70 bg-muted/25 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
              {t('reducedMotionHint')}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            {completed || failed ? (
              <>
                <Button size="sm" onClick={() => start(totalSteps || 15)}>
                  <Sparkles className="h-4 w-4" />
                  {t('controls.replay')}
                </Button>
                <Button size="sm" variant="outline" onClick={dismiss}>
                  {t('controls.close')}
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={previous}
                  disabled={currentStepIndex === 0}
                >
                  <SkipBack className="h-4 w-4" />
                  {t('controls.previous')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (currentStepIndex >= totalSteps - 1) {
                      useFeatureShowcaseStore.getState().complete()
                    } else {
                      next()
                    }
                  }}
                >
                  <SkipForward className="h-4 w-4" />
                  {currentStepIndex >= totalSteps - 1 ? t('controls.finish') : t('controls.next')}
                </Button>
                <Button
                  size="sm"
                  variant={autoplay ? 'default' : 'outline'}
                  onClick={() => setAutoplay(!autoplay)}
                >
                  <Play className="h-4 w-4" />
                  {t('controls.autoplay')}
                </Button>
                {autoplay && (
                  <Button size="sm" variant="outline" onClick={isPaused ? resume : pause}>
                    {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    {isPaused ? t('controls.resume') : t('controls.pause')}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={stop}
                >
                  <Square className="h-4 w-4" />
                  {t('controls.stop')}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
