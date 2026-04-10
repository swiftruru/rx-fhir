import { Compass, Search, Settings2, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '../../shared/components/ui/dialog'
import { Button } from '../../shared/components/ui/button'
import { useQuickStartStore } from '../stores/quickStartStore'
import { useQuickStartActions } from '../hooks/useQuickStartActions'
import type { QuickStartScenarioId } from '../lib/quickStart'
import { cn } from '../../shared/lib/utils'

const SCENARIOS: Array<{
  id: QuickStartScenarioId
  icon: typeof Sparkles
}> = [
  { id: 'creator-overview', icon: Compass },
  { id: 'consumer-example-query', icon: Search },
  { id: 'settings-accessibility', icon: Settings2 }
]

export default function QuickStartScenarioDialog(): React.JSX.Element {
  const { t } = useTranslation('common')
  const open = useQuickStartStore((state) => state.open)
  const closeDialog = useQuickStartStore((state) => state.closeDialog)
  const { runScenario } = useQuickStartActions()

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && closeDialog()}>
      <DialogContent className="max-h-[min(92vh,840px)] overflow-y-auto pr-14 sm:max-w-5xl sm:pr-16 [&>button]:right-5 [&>button]:top-5 [&>button]:opacity-45 [&>button]:hover:opacity-80">
        <DialogHeader className="space-y-2 pr-2">
          <DialogTitle className="text-xl sm:text-[22px]">{t('quickStart.title')}</DialogTitle>
          <DialogDescription className="max-w-3xl leading-relaxed">
            {t('quickStart.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid items-stretch gap-4 lg:grid-cols-3 lg:gap-5">
          {SCENARIOS.map((scenario) => {
            const Icon = scenario.icon
            const isCreatorOverview = scenario.id === 'creator-overview'
            const isConsumerExampleQuery = scenario.id === 'consumer-example-query'
            const isSettingsAccessibility = scenario.id === 'settings-accessibility'
            const cardClassName = isCreatorOverview
              ? 'relative flex h-full min-h-[600px] flex-col overflow-hidden rounded-2xl border border-dashed border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(250,247,247,0.9))] p-4 shadow-sm dark:bg-[linear-gradient(180deg,rgba(34,28,30,0.92),rgba(29,24,26,0.9))] sm:p-5'
              : 'relative flex h-full min-h-[600px] flex-col overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-b from-card to-primary/[0.08] p-4 shadow-sm shadow-primary/10 sm:p-5'
            const iconClassName = isCreatorOverview
              ? 'rounded-2xl border bg-background/80 p-2 text-muted-foreground'
              : 'rounded-2xl border border-primary/20 bg-primary/12 p-2 text-primary shadow-sm'
            return (
              <article key={scenario.id} className={cardClassName}>
                {!isCreatorOverview && (
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/70 via-primary/30 to-transparent" />
                )}
                <div className="flex items-start gap-3">
                  <div className={iconClassName}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="inline-flex items-center rounded-full border border-border/80 bg-background/70 px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground">
                      {isCreatorOverview
                        ? t('quickStart.scenarios.creator-overview.badge')
                        : t('quickStart.badge')}
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {t(`quickStart.scenarios.${scenario.id}.title`)}
                    </p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {t(`quickStart.scenarios.${scenario.id}.description`)}
                    </p>
                  </div>
                </div>

                {isCreatorOverview && (
                  <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-background/70 p-3">
                    <div className="min-h-[228px] overflow-hidden rounded-2xl border border-border/60 bg-background/80 sm:min-h-[250px]">
                      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
                        <div className="h-6 w-16 rounded-full border border-primary/15 bg-primary/10" />
                        <div className="h-3 w-24 rounded-full bg-muted" />
                        <div className="h-3 w-16 rounded-full bg-muted/75" />
                      </div>

                      <div className="space-y-3 p-3">
                        <div className="rounded-xl border border-border/60 bg-background/75 p-3">
                          <div className="h-3 w-20 rounded-full bg-muted" />
                          <div className="mt-2 h-2 w-36 rounded-full bg-muted/70" />
                        </div>

                        <div className="rounded-xl border border-border/60 bg-background/75 p-3">
                          <div className="h-3 w-16 rounded-full bg-muted" />
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
                  </div>
                )}

                {isConsumerExampleQuery && (
                  <div className="mt-4 rounded-2xl border border-primary/15 bg-background/60 p-3">
                    <div className="min-h-[228px] overflow-hidden rounded-2xl border border-border/60 bg-background/80 sm:min-h-[250px]">
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
                  </div>
                )}

                {isSettingsAccessibility && (
                  <div className="mt-4 rounded-2xl border border-primary/15 bg-background/60 p-3">
                    <div className="min-h-[228px] overflow-hidden rounded-2xl border border-border/60 bg-background/80 sm:min-h-[250px]">
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
                  </div>
                )}

                <div className="mt-4 flex-1 space-y-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t('quickStart.highlights')}
                  </p>
                  <ul className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                    {[1, 2, 3].map((index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className={`mt-1.5 h-1.5 w-1.5 rounded-full ${isCreatorOverview ? 'bg-primary/60' : 'bg-primary'}`} />
                        <span>{t(`quickStart.scenarios.${scenario.id}.bullets.${index}`)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {isCreatorOverview && (
                  <div className="mt-3 rounded-xl border border-dashed border-border/80 bg-background/70 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                    {t('quickStart.scenarios.creator-overview.note')}
                  </div>
                )}

                <Button
                  type="button"
                  size="lg"
                  className={cn(
                    'mt-4 w-full rounded-xl text-sm font-semibold tracking-[0.01em]',
                    isCreatorOverview
                      ? 'border-dashed border-border/80 bg-background/70 text-foreground/85 shadow-none hover:bg-background hover:text-foreground'
                      : 'shadow-sm'
                  )}
                  variant={isCreatorOverview ? 'outline' : 'default'}
                  onClick={() => {
                    runScenario(scenario.id)
                    closeDialog()
                  }}
                >
                  {t(`quickStart.scenarios.${scenario.id}.action`)}
                </Button>
              </article>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
