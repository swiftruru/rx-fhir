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

interface OnboardingStep {
  id: string
  icon: typeof Sparkles
  title: string
  description: string
  bullets: string[]
}

export default function FirstRunOnboardingDialog(): React.JSX.Element {
  const { t } = useTranslation('common')
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
      ]
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
      ]
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
      ]
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
      ]
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
          label: t('quickStart.scenarios.creator-primary-template.action'),
          run: () => runScenario('creator-primary-template')
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
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
              <DialogTitle>{currentStep.title}</DialogTitle>
              <DialogDescription>{currentStep.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-2">
            {currentStep.bullets.map((bullet) => (
              <div key={bullet} className="rounded-lg border bg-muted/20 px-3 py-2 text-sm text-foreground/90">
                {bullet}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={
                  index === stepIndex
                    ? 'h-1.5 flex-1 rounded-full bg-primary'
                    : 'h-1.5 flex-1 rounded-full bg-muted'
                }
              />
            ))}
          </div>
        </div>

        <DialogFooter>
          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={finishOnboarding}>
                {t('onboarding.skip')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  stepAction.run()
                  finishOnboarding()
                }}
              >
                {stepAction.label}
              </Button>
            </div>
            <div className="flex items-center gap-2">
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
