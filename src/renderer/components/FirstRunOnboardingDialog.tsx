import { useEffect, useMemo, useState } from 'react'
import { Compass, Search, Settings2, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from './ui/dialog'
import { Button } from './ui/button'
import { useAppStore } from '../store/appStore'
import { useOnboardingStore } from '../store/onboardingStore'
import { useQuickStartActions } from '../hooks/useQuickStartActions'
import { cn } from '../lib/utils'

interface OnboardingStep {
  id: string
  icon: typeof Sparkles
  title: string
  description: string
  bullets: string[]
  actionHint: string
}

export default function FirstRunOnboardingDialog(): React.JSX.Element {
  const { t } = useTranslation('common')
  const { t: tn } = useTranslation('nav')
  const hasSeenOnboarding = useAppStore((state) => state.hasSeenOnboarding)
  const setHasSeenOnboarding = useAppStore((state) => state.setHasSeenOnboarding)
  const open = useOnboardingStore((state) => state.open)
  const requestedStepId = useOnboardingStore((state) => state.stepId)
  const openOnboarding = useOnboardingStore((state) => state.openOnboarding)
  const closeOnboarding = useOnboardingStore((state) => state.closeOnboarding)
  const { openQuickStartDialog, runScenario } = useQuickStartActions()
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    if (!hasSeenOnboarding) {
      openOnboarding('welcome')
    }
  }, [hasSeenOnboarding, openOnboarding])

  const steps = useMemo<OnboardingStep[]>(() => ([
    {
      id: 'welcome',
      icon: Sparkles,
      title: t('onboarding.steps.welcome.title'),
      description: t('onboarding.steps.welcome.description'),
      bullets: [
        t('onboarding.steps.welcome.bullets.creator'),
        t('onboarding.steps.welcome.bullets.consumer'),
        t('onboarding.steps.welcome.bullets.settings')
      ],
      actionHint: t('onboarding.actionHints.welcome')
    },
    {
      id: 'creator',
      icon: Compass,
      title: t('onboarding.steps.creator.title'),
      description: t('onboarding.steps.creator.description'),
      bullets: [
        t('onboarding.steps.creator.bullets.stepper'),
        t('onboarding.steps.creator.bullets.templates'),
        t('onboarding.steps.creator.bullets.draft')
      ],
      actionHint: t('onboarding.actionHints.creator')
    },
    {
      id: 'consumer',
      icon: Search,
      title: t('onboarding.steps.consumer.title'),
      description: t('onboarding.steps.consumer.description'),
      bullets: [
        t('onboarding.steps.consumer.bullets.search'),
        t('onboarding.steps.consumer.bullets.helpers'),
        t('onboarding.steps.consumer.bullets.detail')
      ],
      actionHint: t('onboarding.actionHints.consumer')
    },
    {
      id: 'settings',
      icon: Settings2,
      title: t('onboarding.steps.settings.title'),
      description: t('onboarding.steps.settings.description'),
      bullets: [
        t('onboarding.steps.settings.bullets.server'),
        t('onboarding.steps.settings.bullets.shortcuts'),
        t('onboarding.steps.settings.bullets.accessibility')
      ],
      actionHint: t('onboarding.actionHints.settings')
    }
  ]), [t])

  useEffect(() => {
    if (!open) return

    const matchedIndex = requestedStepId
      ? steps.findIndex((step) => step.id === requestedStepId)
      : 0

    setStepIndex(matchedIndex >= 0 ? matchedIndex : 0)
  }, [open, requestedStepId, steps])

  const isLastStep = stepIndex === steps.length - 1
  const currentStep = steps[stepIndex]
  const Icon = currentStep.icon
  const stepAction = currentStep.id === 'welcome'
    ? {
      label: t('onboarding.actions.openQuickStart'),
      run: () => openQuickStartDialog()
    }
    : currentStep.id === 'consumer'
      ? {
        label: t('quickStart.scenarios.consumer-example-query.action'),
        run: () => runScenario('consumer-example-query')
      }
      : currentStep.id === 'settings'
        ? {
          label: t('quickStart.scenarios.settings-accessibility.action'),
          run: () => runScenario('settings-accessibility')
        }
        : {
          label: t('quickStart.scenarios.creator-overview.action'),
          run: () => runScenario('creator-overview')
        }

  function finishOnboarding(): void {
    setHasSeenOnboarding(true)
    closeOnboarding()
    setStepIndex(0)
  }

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      finishOnboarding()
    }
  }

  function renderPreview(): React.JSX.Element {
    if (currentStep.id === 'welcome') {
      const modules = [
        { icon: Compass, label: tn('items.creator.label') },
        { icon: Search, label: tn('items.consumer.label') },
        { icon: Settings2, label: tn('items.settings.label') }
      ]

      return (
        <div className="grid gap-2">
          {modules.map((module, index) => {
            const ModuleIcon = module.icon
            const active = index === 0

            return (
              <div
                key={module.label}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-3 py-3',
                  active
                    ? 'border-primary/20 bg-primary/10 text-foreground'
                    : 'border-border/70 bg-background/75 text-muted-foreground'
                )}
              >
                <div
                  className={cn(
                    'rounded-xl border p-2',
                    active ? 'border-primary/20 bg-background/80 text-primary' : 'border-border/70 bg-background/80'
                  )}
                >
                  <ModuleIcon className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">{module.label}</div>
                  <div className="h-2 w-24 rounded-full bg-muted/70" />
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    if (currentStep.id === 'creator') {
      return (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/80">
          <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
            <div className="h-6 w-14 rounded-full border border-primary/15 bg-primary/10" />
            <div className="h-3 w-20 rounded-full bg-muted" />
            <div className="h-3 w-16 rounded-full bg-muted/75" />
          </div>

          <div className="space-y-3 p-3">
            <div className="rounded-xl border border-border/60 bg-background/75 p-3">
              <div className="h-3 w-20 rounded-full bg-muted" />
              <div className="mt-2 h-9 rounded-xl border border-border/70 bg-background/85" />
            </div>

            <div className="rounded-xl border border-border/60 bg-background/75 p-3">
              <div className="h-3 w-24 rounded-full bg-muted" />
              <div className="mt-2 h-9 rounded-xl border border-border/70 bg-background/85" />
              <div className="mt-2 h-2 w-28 rounded-full bg-muted/70" />
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="h-8 w-20 rounded-lg border border-border/70 bg-background/75" />
              <div className="h-8 w-24 rounded-lg border border-primary/20 bg-primary/10" />
            </div>
          </div>
        </div>
      )
    }

    if (currentStep.id === 'consumer') {
      return (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/80">
          <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
            <div className="h-6 w-14 rounded-full border border-primary/15 bg-primary/10" />
            <div className="h-6 w-20 rounded-full border border-border/70 bg-background/85" />
            <div className="ml-auto h-6 w-10 rounded-full border border-primary/20 bg-primary/12" />
          </div>

          <div className="space-y-3 p-3">
            <div className="rounded-xl border border-border/60 bg-background/75 p-3">
              <div className="h-3 w-16 rounded-full bg-muted" />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="h-8 rounded-lg border border-border/70 bg-background/85" />
                <div className="h-8 rounded-lg border border-border/70 bg-background/85" />
              </div>
            </div>

            <div className="rounded-xl border border-primary/15 bg-primary/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="h-3 w-24 rounded-full bg-muted" />
                <div className="h-5 w-10 rounded-full border border-primary/20 bg-background/80" />
              </div>
              <div className="mt-2 h-2 w-32 rounded-full bg-muted/70" />
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/80">
        <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
          <div className="h-6 w-20 rounded-full border border-primary/15 bg-primary/10" />
          <div className="h-3 w-28 rounded-full bg-muted" />
        </div>

        <div className="space-y-3 p-3">
          <div className="rounded-xl border border-border/60 bg-background/75 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="h-3 w-16 rounded-full bg-muted" />
              <div className="flex gap-1.5">
                <div className="h-6 w-10 rounded-md border border-border/70 bg-background/85" />
                <div className="h-6 w-10 rounded-md border border-primary/20 bg-primary/12" />
                <div className="h-6 w-10 rounded-md border border-border/70 bg-background/85" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/75 p-3">
            <div className="h-3 w-20 rounded-full bg-muted" />
            <div className="mt-3 h-2 rounded-full bg-muted/60">
              <div className="h-2 w-2/3 rounded-full bg-primary/60" />
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/75 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="h-3 w-24 rounded-full bg-muted" />
              <div className="h-6 w-14 rounded-full border border-primary/20 bg-primary/12" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[min(92vh,820px)] overflow-y-auto pr-14 sm:max-w-4xl sm:pr-16 [&>button]:right-5 [&>button]:top-5 [&>button]:opacity-45 [&>button]:hover:opacity-80">
        <DialogHeader className="space-y-2 pr-2">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{t('onboarding.badge')}</span>
            </div>
            <div className="text-xs font-medium text-muted-foreground">
              {t('onboarding.progress', { current: stepIndex + 1, total: steps.length })}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-xl border bg-muted/30 p-2 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl sm:text-[22px]">{currentStep.title}</DialogTitle>
              <DialogDescription className="max-w-2xl leading-relaxed">{currentStep.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {steps.map((step, index) => {
              const StepIcon = step.icon
              const active = index === stepIndex

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setStepIndex(index)}
                  className={cn(
                    'min-w-[150px] rounded-xl border px-3 py-3 text-left transition-colors',
                    active
                      ? 'border-primary/20 bg-primary/10 text-foreground shadow-sm'
                      : 'border-border/70 bg-background/70 text-muted-foreground hover:bg-muted/20'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'rounded-lg border p-1.5',
                        active ? 'border-primary/20 bg-background/80 text-primary' : 'border-border/70 bg-background/80'
                      )}
                    >
                      <StepIcon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[11px] font-medium uppercase tracking-wide opacity-75">
                      {index + 1}
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-medium leading-snug text-foreground">
                    {step.title}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
            <section className="rounded-2xl border border-border/70 bg-muted/10 p-4">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t('onboarding.preview')}
              </p>
              <div className="min-h-[220px]">
                {renderPreview()}
              </div>
            </section>

            <div className="space-y-4">
              <section className="rounded-2xl border border-border/70 bg-muted/10 p-4">
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t('onboarding.highlights')}
                </p>
                <div className="grid gap-2">
                  {currentStep.bullets.map((bullet) => (
                    <div key={bullet} className="rounded-xl border bg-background/70 px-3 py-3 text-sm leading-relaxed text-foreground/90">
                      {bullet}
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-primary/15 bg-primary/[0.05] p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t('onboarding.actionReady')}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {currentStep.actionHint}
                </p>
                <Button
                  type="button"
                  size="lg"
                  variant={currentStep.id === 'welcome' ? 'outline' : 'default'}
                  className={cn(
                    'mt-4 w-full rounded-xl text-sm font-semibold tracking-[0.01em]',
                    currentStep.id === 'welcome' && 'border-dashed border-border/80 bg-background/70 text-foreground/85 shadow-none hover:bg-background hover:text-foreground'
                  )}
                  onClick={() => {
                    stepAction.run()
                    finishOnboarding()
                  }}
                >
                  {stepAction.label}
                </Button>
              </section>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border/60 pt-4">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="ghost" className="self-start" onClick={finishOnboarding}>
              {t('onboarding.skip')}
            </Button>
            <div className="flex items-center gap-2 self-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
                disabled={stepIndex === 0}
              >
                {t('onboarding.back')}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (isLastStep) {
                    finishOnboarding()
                    return
                  }
                  setStepIndex((current) => Math.min(steps.length - 1, current + 1))
                }}
              >
                {isLastStep ? t('onboarding.finish') : t('onboarding.next')}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
